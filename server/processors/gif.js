const path = require('path');
const fs = require('fs');
const { framesToVideo, generateThumbnail, directConvert, extractFrames } = require('../lib/ffmpeg');
const { updateJob } = require('../db');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

const EXT_MAP = { mp4: '.mp4', webm: '.webm', gif: '.gif', hevc: '.mp4', apng: '.png' };

async function processGif(job, onLog = () => {}, onUpdate = () => {}) {
  const jobId = job.id;
  const outputFormat = job.output_format || 'mp4';
  const ext = EXT_MAP[outputFormat] || '.mp4';
  const framesDir = path.join(PROJECT_ROOT, 'frames', jobId);
  const outputPath = path.join(PROJECT_ROOT, 'output', `${jobId}${ext}`);
  const thumbPath = path.join(PROJECT_ROOT, 'output', `${jobId}_thumb.jpg`);
  const inputPath = path.join(PROJECT_ROOT, 'server', 'uploads', path.basename(job.original_name));

  fs.mkdirSync(path.join(PROJECT_ROOT, 'output'), { recursive: true });

  try {
    updateJob({ id: jobId, status: 'processing' });
    onUpdate();
    onLog(`[${jobId}] Processing GIF: ${job.original_name} -> ${outputFormat}`);

    if (outputFormat === 'mp4') {
      await directConvert(inputPath, outputPath, onLog);
    } else {
      const fps = 24;
      fs.mkdirSync(framesDir, { recursive: true });
      await extractFrames(inputPath, framesDir, onLog);
      await framesToVideo(framesDir, outputPath, outputFormat, fps, onLog);
      cleanupFrames(framesDir);
    }

    await generateThumbnail(outputPath, thumbPath, onLog);

    const stat = fs.statSync(outputPath);
    updateJob({ id: jobId, status: 'done', outputPath, outputSize: stat.size, thumbnailPath: thumbPath });
    onUpdate();
    onLog(`[${jobId}] Done. Size: ${stat.size} bytes`);
  } catch (err) {
    onLog(`[${jobId}] FAILED: ${err.message}`);
    updateJob({ id: jobId, status: 'failed', error: err.message });
    onUpdate();
    cleanupFrames(framesDir);
  }
}

function cleanupFrames(dir) {
  try {
    if (fs.existsSync(dir)) {
      const entries = fs.readdirSync(dir);
      for (const entry of entries) fs.unlinkSync(path.join(dir, entry));
      fs.rmdirSync(dir);
    }
  } catch {}
}

module.exports = { processGif };
