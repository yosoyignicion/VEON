const path = require('path');
const fs = require('fs');
const { renderSvgToFrames } = require('../lib/puppeteer');
const { framesToVideo, encodeWithVAAPI, generateThumbnail } = require('../lib/ffmpeg');
const { updateJob } = require('../db');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

let smilParser;
try { smilParser = require('../lib/smil-parser'); } catch (e) {
  console.warn('SMIL parser not loaded:', e.message);
}

const EXT_MAP = { mp4: '.mp4', webm: '.webm', gif: '.gif', hevc: '.mp4', apng: '.png' };

async function processSvg(job, onLog = () => {}, onUpdate = () => {}) {
  const jobId = job.id;
  const outputFormat = job.output_format || 'mp4';
  const ext = EXT_MAP[outputFormat] || '.mp4';
  const framesDir = path.join(PROJECT_ROOT, 'frames', jobId);
  const outputPath = path.join(PROJECT_ROOT, 'output', `${jobId}${ext}`);
  const thumbPath = path.join(PROJECT_ROOT, 'output', `${jobId}_thumb.jpg`);

  fs.mkdirSync(path.join(PROJECT_ROOT, 'output'), { recursive: true });

  try {
    updateJob({ id: jobId, status: 'processing' });
    onUpdate();

    onLog(`[${jobId}] Processing SVG: ${job.original_name} -> ${outputFormat}`);

    const fps = 10;
    const maxDuration = 6;

    const uploadPath = path.join(PROJECT_ROOT, 'server', 'uploads', path.basename(job.original_name));
    const svgPath = fs.existsSync(uploadPath) ? uploadPath : null;

    if (!svgPath) throw new Error(`Uploaded file not found for job ${jobId}`);

    let framesOk = false;
    if (smilParser && typeof smilParser.parseAndRender === 'function') {
      onLog('Using SMIL parser');
      try {
        const result = await smilParser.parseAndRender(svgPath, framesDir, fps, maxDuration);
        if (result && result.success) {
          framesOk = true;
          onLog(`SMIL parser: ${result.framePaths.length} frames`);
        } else {
          onLog(`SMIL parser fallback (${result?.reason || 'unknown'}), using Puppeteer`);
        }
      } catch (err) {
        onLog(`SMIL parser error (${err.message}), using Puppeteer`);
      }
    }
    if (!framesOk) {
      onLog('Using Puppeteer renderer');
      await renderSvgToFrames(svgPath, framesDir, fps, maxDuration, onLog);
    }

    if (outputFormat === 'mp4') {
      await encodeWithVAAPI(framesDir, outputPath, fps, onLog);
    } else {
      await framesToVideo(framesDir, outputPath, outputFormat, fps, onLog);
    }

    await generateThumbnail(outputPath, thumbPath, onLog);

    const stat = fs.statSync(outputPath);
    updateJob({ id: jobId, status: 'done', outputPath, outputSize: stat.size, thumbnailPath: thumbPath });
    onUpdate();
    onLog(`[${jobId}] Done. Size: ${stat.size} bytes`);

    cleanupFrames(framesDir);
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

module.exports = { processSvg };
