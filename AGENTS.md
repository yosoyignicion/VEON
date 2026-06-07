# VEON — Agent Instructions

## Project

Converts animated SVG/WebP/GIF → MP4/WebM/HEVC/GIF/APNG via Puppeteer+FFmpeg.

## Quick start

```bash
./veon.sh              # both servers
node server/index.js   # API :3001
npm --prefix frontend run dev  # UI :5173
npm run dev            # both via concurrently
```

## Architecture

```
input → upload → SMIL parser (resvg-js, fast) | Puppeteer (fallback, complex SVGs)
       → frames/ → FFmpeg → output/
```

- **SMIL parser** (`server/lib/smil-parser.js`): handles `<animate>`, `<animateTransform>`. Falls back to Puppeteer for CSS `@keyframes`, `<animateMotion>`, `<set>`, `<animateColor>`, multiple anims on same attr, `begin > 0`.
- **Puppeteer** (`server/lib/puppeteer.js`): fallback, auto-detects Chrome at common paths. 10fps real-time capture.
- **VAAPI** (`server/processors/svg.js:56`): auto-tried for MP4 output via `/dev/dri/renderD128`. Falls back to software if unavailable.
- **FPS**: 10 for SVG, 24 for WebP/GIF. **Max duration**: 6s (hardcoded in processors/svg.js:29).
- **HEVC** output uses `.mp4` extension.

## Tech stack

- **Backend**: CommonJS (require), Express, better-sqlite3 (WAL mode at `server/veon.db`), Puppeteer, `@resvg/resvg-js`, `ws`
- **Frontend**: React 19, Vite 8, Tailwind CSS 4 (`@tailwindcss/vite` plugin)
- **Vite proxy** (`frontend/vite.config.js`): `/api` → `:3001`, `/ws` → `ws://:3001`

## API

| Method | Endpoint | Notes |
|--------|----------|-------|
| POST | `/api/render` | multipart field `file`, field `output` = mp4/webm/gif/hevc/apng |
| GET | `/api/status/:id` | |
| GET | `/api/download/:id` | |
| GET | `/api/thumbnail/:id` | |
| GET | `/api/list` | |
| DELETE | `/api/cleanup` | Removes jobs >1h old + files |

## Testing

No test framework. Manual via curl:
```bash
curl -F "file=@test-anim.svg" -F "output=mp4" http://localhost:3001/api/render
curl -s http://localhost:3001/api/status/<jobId>
```

## Input formats

- **SVG**: SMIL parser or Puppeteer
- **WebP**: direct FFmpeg convert (MP4) or extract frames → encode
- **GIF**: direct FFmpeg convert (MP4) or extract frames → encode

## Output format → codec mapping (`server/lib/ffmpeg.js:48-51`)

| Output | Codec | Notes |
|--------|-------|-------|
| mp4 | libx264 | CRF 23, preset medium, yuv420p |
| webm | libvpx-vp9 | CRF 30, b:v 0, yuv420p |
| hevc | libx265 | CRF 28, yuv420p, .mp4 ext |
| gif | palettegen+paletteuse | 2-pass, dither=bayer |
| apng | apng codec | |

## Key conventions

- **CommonJS** throughout server. No ESM `import` in backend.
- **Frontend uses ESM** (`"type": "module"` in its package.json).
- All paths resolve from project root (`server/processors/svg.js:7`).
- Frame cleanup happens after processing (`cleanupFrames()`).
- DB migrations via `ALTER TABLE ... ADD COLUMN` with try/catch (`server/db.js:27-29`).
