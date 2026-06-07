# ⚡ VEON — Animated SVG/WebP/GIF to Video Converter

> **VI**deo + **E**l**E**ctr**ON** · Convierte animaciones vectoriales en video con calidad profesional.

[![Node](https://img.shields.io/badge/node-%3E%3D18-00ffe1?style=flat-square)](https://nodejs.org)
[![FFmpeg](https://img.shields.io/badge/ffmpeg-%3E%3D4.4-6600ff?style=flat-square)](https://ffmpeg.org)
[![License](https://img.shields.io/badge/license-MIT-ff00aa?style=flat-square)](LICENSE)

---

## ✨ Características

| | Formato | Codec | Uso |
|---|---------|-------|-----|
| 🎬 | **MP4** | H.264 (libx264) | Universal, mejor compatibilidad |
| 🌐 | **WebM** | VP9 (libvpx-vp9) | Web nativo, calidad superior |
| 🎞️ | **GIF** | Palette optimizada | Bucles, legacy (256 colores) |
| 📦 | **HEVC** | H.265 (libx265) | Alta compresión (~40% sobre H.264) |
| ✨ | **APNG** | PNG animado | Transparencia perfecta, lossless |

**Entrada:** SVG animado (SMIL/CSS) · WebP animado · GIF

---

## 🚀 Inicio rápido

```bash
git clone https://github.com/tu-usuario/veon.git
cd veon
npm install
./veon.sh
# → Abre http://localhost:5173
```

O en dos terminales:

```bash
# Terminal 1 — API
node server/index.js

# Terminal 2 — Frontend
npm --prefix frontend run dev
```

---

## ⚙️ Stack tecnológico

```
Frontend   React 19 · Vite · Tailwind CSS
Backend    Node.js · Express · better-sqlite3
Renderer   Puppeteer (Chrome headless) · resvg-js (SMIL parser)
Video      FFmpeg (libx264 · libvpx-vp9 · libx265 · apng)
Tiempo real WebSocket (ws) · logs de progreso
BD         SQLite (jobs, metadatos, thumbnails)
```

## 📦 Dependencias del sistema

| Paquete | Obligatorio | Notas |
|---------|-------------|-------|
| Node.js ≥18 | ✅ | Runtime |
| FFmpeg ≥4.4 | ✅ | Codificación de video |
| Chrome/Chromium | ⚠️ Solo SVGs complejos | Auto-detectado |
| GPU con VAAPI | 🚀 Opcional (10x encode) | AMD/Intel |
| librsvg2-bin | 🚀 Opcional (SMIL parser) | SVG más rápido sin Chrome |

```bash
# Ubuntu/Debian
sudo apt install ffmpeg librsvg2-bin

# Arch Linux
sudo pacman -S ffmpeg librsvg

# Termux (Android)
pkg install ffmpeg chromium

# macOS
brew install ffmpeg chromium
```

---

## 📐 API REST

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/render` | POST | Subir archivo + seleccionar formato |
| `/api/status/:id` | GET | Estado del trabajo |
| `/api/download/:id` | GET | Descargar video resultante |
| `/api/thumbnail/:id` | GET | Miniatura del video |
| `/api/list` | GET | Historial de trabajos |
| `/api/cleanup` | DELETE | Limpiar trabajos antiguos (>1h) |

**Ejemplo de subida:**
```bash
curl -F "file=@animacion.svg" -F "output=webm" http://localhost:3001/api/render
# → {"jobId":"abc-123"}
```

---

## 🏗️ Arquitectura

```
                    ┌──────────────────┐
                    │   Frontend       │
                    │  React + Vite    │
                    │  :5173           │
                    └────────┬─────────┘
                             │ /api /ws
                    ┌────────▼─────────┐
                    │  API Server      │
                    │  Express + WS    │
                    │  :3001           │
                    └────────┬─────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  SMIL Parser  │   │   Puppeteer   │   │    FFmpeg     │
│  (SVG simple) │   │ (SVG complejo)│   │  codificación │
│  resvg-js     │   │ Chrome Head.  │   │  libx264/VP9  │
│  → PNG frames │   │ → PNG frames  │   │  → MP4/WebM   │
└───────────────┘   └───────────────┘   └───────────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             ▼
                    ┌──────────────────┐
                    │    SQLite DB     │
                    │  jobs + metadatos│
                    └──────────────────┘
```

---

## ❓ FAQ / Preguntas frecuentes

**¿Qué formatos de entrada soporta?** SVG animado (SMIL + CSS), WebP animado, GIF.

**¿Qué formatos de salida genera?** MP4 (H.264), WebM (VP9), HEVC (H.265), GIF optimizado, APNG.

**¿Necesito Chrome instalado?** Solo para SVGs con animaciones CSS complejas o
`<animateMotion>`. Para SVGs con `<animate>`/`<animateTransform` simples, VEON
usa su propio parser SMIL que es 100x más rápido y no necesita navegador.

**¿Por qué mi video no tiene audio?** VEON procesa animaciones visuales sin
pista de audio. Si necesitas sonido, puedes añadirlo después con FFmpeg:
`ffmpeg -i video.mp4 -i audio.mp3 -c:v copy -c:a aac output.mp4`

**¿Hay límite de duración?** Por defecto 6 segundos para respuestas rápidas.
Puedes cambiarlo en el código (server/processors/svg.js, variable maxDuration).

**¿Puedo usarlo desde terminal sin interfaz gráfica?** Sí, la API REST es
completa. Ejemplo: `curl -F "file=@logo.svg" -F "output=mp4" http://localhost:3001/api/render`

**¿Cómo se llama esta tecnología?** El proceso combina Puppeteer (renderizado
headless), resvg-js (parser SMIL), FFmpeg (codificación), y mejoras como
VAAPI (aceleración por hardware) y pipe streaming.

---

## 🧪 Tests

```bash
# Servidor
node server/index.js

# Subir SVG de prueba
curl -s -F "file=@test-anim.svg" http://localhost:3001/api/render

# Consultar estado
curl -s http://localhost:3001/api/status/<jobId>

# Listar trabajos
curl -s http://localhost:3001/api/list
```

---

## 📄 Licencia

MIT © 2026 Ignición · Inanimux. Ver [LICENSE](LICENSE).

---

## 🙏 Agradecimientos

- A Inanimux, la Hechicera Suprema que concibió este sistema entre
  conjuros de TypeScript y runas de C++26.
- A Puppeteer, por domar a Chrome headless.
- A FFmpeg, por ser la navaja suiza del video.
- A la comunidad open source, por cada biblioteca que hizo esto posible.

---

<p align="center">
  <sub>Hecho con ⚡ por Inanimux · Que el compilador nos guíe.</sub>
</p>
