const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const { execSync } = require('child_process');

function findChrome() {
  const candidates = [
    '/usr/bin/google-chrome-stable','/usr/bin/google-chrome',
    '/usr/bin/chromium-browser','/usr/bin/chromium',
  ];
  for (const c of candidates) { if (fs.existsSync(c)) return c; }
  try {
    return execSync('which google-chrome-stable google-chrome chromium chromium-browser 2>/dev/null',{encoding:'utf8'}).split('\n')[0].trim()||undefined;
  } catch { return undefined; }
}

async function renderSvgToFrames(svgPath, framesDir, fps = 10, maxDuration = 6, onLog = () => {}) {
  const totalFrames = fps * maxDuration;
  fs.mkdirSync(framesDir, { recursive: true });

  onLog(`Launching headless Chrome...`);
  const launchOptions = {
    headless: true,
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-gpu'],
    timeout: 15000,
  };
  const chromePath = findChrome();
  if (chromePath) { launchOptions.executablePath = chromePath; onLog(`Chrome: ${chromePath}`); }

  const browser = await puppeteer.launch(launchOptions);
  try {
    const page = await browser.newPage();
    const fileUrl = pathToFileURL(svgPath).href;
    await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 15000 });
    await page.setViewport({ width: 500, height: 500, deviceScaleFactor: 1 });

    onLog(`Capturing ${totalFrames} frames at ${fps} FPS...`);
    const framePaths = [];
    const intervalMs = 1000 / fps;

    for (let i = 0; i < totalFrames; i++) {
      const framePath = path.join(framesDir, `frame_${String(i).padStart(4, '0')}.png`);
      await page.screenshot({ path: framePath, type: 'png' });
      framePaths.push(framePath);
      if (i % fps === 0 || i === totalFrames - 1) onLog(`Frame ${i + 1}/${totalFrames}`);
      await new Promise(r => setTimeout(r, intervalMs));
    }

    onLog(`Done: ${totalFrames} frames.`);
    return framePaths;
  } finally {
    await browser.close();
  }
}

module.exports = { renderSvgToFrames };
