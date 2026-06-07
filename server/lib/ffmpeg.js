const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

function runFFmpeg(args, onLog = () => {}) {
  return new Promise((resolve, reject) => {
    onLog(`ffmpeg ${args.slice(0, 4).join(' ')} ...`);
    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      const lines = stderr.split('\n');
      for (const line of lines.slice(-3)) {
        const match = line.match(/frame=\s*(\d+)/);
        if (match) onLog(`FFmpeg: frame ${match[1]}`);
      }
    });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-500)}`));
    });
    proc.on('error', reject);
  });
}

async function framesToVideo(framesDir, outputPath, format, fps = 24, onLog = () => {}) {
  const inputPattern = path.join(framesDir, 'frame_%04d.png');
  onLog(`Encoding frames to ${format}: ${outputPath}`);

  if (format === 'gif') {
    const palettePath = path.join(framesDir, 'palette.png');
    await runFFmpeg([
      '-y', '-framerate', String(fps), '-i', inputPattern,
      '-vf', `fps=${fps},palettegen=stats_mode=diff`,
      palettePath,
    ], onLog);
    await runFFmpeg([
      '-y', '-framerate', String(fps), '-i', inputPattern,
      '-i', palettePath,
      '-lavfi', `fps=${fps},paletteuse=dither=bayer:bayer_scale=5`,
      outputPath,
    ], onLog);
    try { fs.unlinkSync(palettePath); } catch {}
    return;
  }

  const codecArgs = {
    mp4: ['-c:v', 'libx264', '-crf', '23', '-preset', 'medium', '-pix_fmt', 'yuv420p'],
    webm: ['-c:v', 'libvpx-vp9', '-crf', '30', '-b:v', '0', '-pix_fmt', 'yuv420p'],
    hevc: ['-c:v', 'libx265', '-crf', '28', '-pix_fmt', 'yuv420p'],
    apng: ['-c:v', 'apng', '-f', 'apng'],
  };

  const args = codecArgs[format];
  if (!args) throw new Error(`Unsupported output format: ${format}`);

  await runFFmpeg([
    '-y', '-framerate', String(fps), '-i', inputPattern,
    ...args,
    outputPath,
  ], onLog);

  onLog(`${format.toUpperCase()} encoded: ${outputPath}`);
}

async function encodeWithVAAPI(framesDir, outputPath, fps = 24, onLog = () => {}) {
  const inputPattern = path.join(framesDir, 'frame_%04d.png');
  onLog(`Trying VAAPI encode: ${outputPath}`);
  try {
    await runFFmpeg([
      '-y', '-vaapi_device', '/dev/dri/renderD128',
      '-framerate', String(fps), '-i', inputPattern,
      '-vf', 'format=nv12,hwupload',
      '-c:v', 'h264_vaapi', '-rc_mode', 'CQP', '-qp', '23',
      outputPath,
    ], onLog);
    onLog(`VAAPI encode done: ${outputPath}`);
  } catch (err) {
    onLog(`VAAPI failed (${err.message}), falling back to software`);
    await framesToVideo(framesDir, outputPath, 'mp4', fps, onLog);
  }
}

async function generateThumbnail(videoPath, thumbPath, onLog = () => {}) {
  onLog(`Generating thumbnail: ${thumbPath}`);
  await runFFmpeg([
    '-y', '-i', videoPath,
    '-vframes', '1', '-q:v', '2',
    thumbPath,
  ], onLog);
  onLog(`Thumbnail done: ${thumbPath}`);
}

async function directConvert(inputPath, outputPath, onLog = () => {}) {
  onLog(`Direct convert: ${inputPath} -> ${outputPath}`);
  await runFFmpeg([
    '-y', '-i', inputPath,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
    outputPath,
  ], onLog);
  onLog(`Convert done: ${outputPath}`);
}

async function extractFrames(inputPath, framesDir, onLog = () => {}) {
  fs.mkdirSync(framesDir, { recursive: true });
  const framePattern = path.join(framesDir, 'frame_%04d.png');
  onLog(`Extracting frames: ${inputPath}`);
  await runFFmpeg([
    '-y', '-i', inputPath,
    framePattern,
  ], onLog);
  onLog(`Frames extracted to ${framesDir}`);
}

module.exports = { framesToVideo, encodeWithVAAPI, generateThumbnail, directConvert, extractFrames };
