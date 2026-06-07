const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { createJob, updateJob, getJob, listJobs, getDB } = require('../db');
const { processSvg } = require('../processors/svg');
const { processWebp } = require('../processors/webp');
const { processGif } = require('../processors/gif');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const VALID_OUTPUTS = ['mp4', 'webm', 'gif', 'hevc', 'apng'];
const EXT_MAP = { mp4: '.mp4', webm: '.webm', gif: '.gif', hevc: '.mp4', apng: '.png' };

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}${ext}`);
  },
});

const upload = multer({ storage });

let wss;

function setWSS(wsServer) {
  wss = wsServer;
}

function broadcastLog(jobId, message) {
  if (!wss) return;
  const payload = JSON.stringify({ jobId, type: 'log', message });
  wss.clients.forEach((client) => {
    try { if (client.readyState === 1) client.send(payload); } catch {}
  });
}

function broadcastJobUpdate(job) {
  if (!wss) return;
  const payload = JSON.stringify({ type: 'job_update', job });
  wss.clients.forEach((client) => {
    try { if (client.readyState === 1) client.send(payload); } catch {}
  });
}

const PROCESSORS = {
  svg: processSvg,
  webp: processWebp,
  gif: processGif,
};

router.post('/render', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Use field name "file".' });
  }

  const ext = path.extname(req.file.originalname).toLowerCase().replace('.', '');
  const formatMap = { svg: 'svg', webp: 'webp', gif: 'gif' };
  const format = formatMap[ext];

  if (!format) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: `Unsupported format: ${ext}. Use SVG, WebP, or GIF.` });
  }

  const outputFormat = req.body.output || 'mp4';
  if (!VALID_OUTPUTS.includes(outputFormat)) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: `Invalid output format: ${outputFormat}. Valid: ${VALID_OUTPUTS.join(', ')}` });
  }

  const jobId = uuidv4();
  const originalName = req.file.filename;

  createJob({ id: jobId, originalName, format, outputFormat });

  const onLog = (msg) => broadcastLog(jobId, msg);
  const onUpdate = () => {
    const job = getJob(jobId);
    broadcastJobUpdate(job);
  };
  const processor = PROCESSORS[format];

  setImmediate(() => {
    processor({ id: jobId, original_name: originalName, output_format: outputFormat }, onLog, onUpdate)
      .catch((err) => {
        console.error(`Job ${jobId} fatal:`, err);
        broadcastLog(jobId, `Fatal error: ${err.message}`);
      });
  });

  res.json({ jobId });
});

router.get('/status/:id', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

router.get('/download/:id', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (job.status !== 'done' || !job.output_path) {
    return res.status(404).json({ error: 'Output not available' });
  }
  if (!fs.existsSync(job.output_path)) {
    return res.status(404).json({ error: 'Output file not found on disk' });
  }
  const outExt = EXT_MAP[job.output_format] || '.mp4';
  const baseName = path.basename(job.original_name, path.extname(job.original_name));
  const filename = `${baseName}${outExt}`;
  res.download(job.output_path, filename);
});

router.get('/thumbnail/:id', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (!job.thumbnail_path || !fs.existsSync(job.thumbnail_path)) {
    return res.status(404).json({ error: 'Thumbnail not available' });
  }
  res.sendFile(job.thumbnail_path);
});

router.get('/list', (req, res) => {
  const jobs = listJobs();
  res.json(jobs);
});

router.delete('/cleanup', (req, res) => {
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
  const oldJobs = getDB().prepare('SELECT * FROM jobs WHERE created_at < ?').all(oneHourAgo);
  for (const job of oldJobs) {
    if (job.output_path && fs.existsSync(job.output_path)) fs.unlinkSync(job.output_path);
    if (job.thumbnail_path && fs.existsSync(job.thumbnail_path)) fs.unlinkSync(job.thumbnail_path);
    const framesDir = path.join(PROJECT_ROOT, 'frames', job.id);
    if (fs.existsSync(framesDir)) {
      const entries = fs.readdirSync(framesDir);
      for (const e of entries) fs.unlinkSync(path.join(framesDir, e));
      fs.rmdirSync(framesDir);
    }
    const uploadPath = path.join(UPLOADS_DIR, job.original_name);
    if (fs.existsSync(uploadPath)) fs.unlinkSync(uploadPath);
  }
  const info = getDB().prepare('DELETE FROM jobs WHERE created_at < ?').run(oneHourAgo);
  res.json({ deleted: info.changes });
});

module.exports = { router, setWSS };
