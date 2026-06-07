import UploadZone from '../components/UploadZone.jsx'

const SUPPORTED = [
  { ext: 'SVG', desc: 'Animaciones vectoriales escalables', icon: '✧', color: 'from-emerald-500/20 to-cyan-500/20', border: 'border-emerald-500/20', text: 'text-emerald-400' },
  { ext: 'WebP', desc: 'Imágenes animadas con compresión', icon: '◈', color: 'from-purple-500/20 to-pink-500/20', border: 'border-purple-500/20', text: 'text-purple-400' },
  { ext: 'GIF', desc: 'Bucles clásicos compatibles', icon: '◆', color: 'from-amber-500/20 to-orange-500/20', border: 'border-amber-500/20', text: 'text-amber-400' },
]

function Particle({ index }) {
  const size = 2 + (index % 3) * 2
  const left = (index * 7 + 13) % 100
  const delay = (index * 1.7) % 12
  const duration = 10 + (index % 5) * 3
  return (
    <div
      className="absolute rounded-full bg-primary/10 animate-particle"
      style={{
        width: size + 'px',
        height: size + 'px',
        left: left + '%',
        bottom: '-10px',
        animationDelay: delay + 's',
        animationDuration: duration + 's',
      }}
    />
  )
}

export default function Home() {
  return (
    <div className="relative flex flex-col items-center min-h-[calc(100vh-3.5rem)] overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 12 }).map((_, i) => (
          <Particle key={i} index={i} />
        ))}
      </div>

      <div className="relative max-w-3xl mx-auto px-4 pt-16 pb-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-primary text-xs mb-6">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Conversión de medios
        </div>
        <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-tight">
          <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent animate-gradient-slow">
            Renderiza tus animaciones
          </span>
        </h1>
        <p className="text-text-muted text-lg max-w-xl mx-auto leading-relaxed">
          Convierte SVGs animados, WebPs y GIFs en videos listos para compartir.
          Elige entre múltiples formatos de salida con un solo clic.
        </p>
      </div>

      <div className="relative w-full max-w-3xl mx-auto px-4 pb-8 flex flex-col">
        <UploadZone />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 pb-16 w-full">
        <p className="text-xs text-text-dim text-center tracking-wider uppercase mb-4">Formatos soportados</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SUPPORTED.map((f) => (
            <div
              key={f.ext}
              className={`rounded-xl bg-gradient-to-br ${f.color} border ${f.border} p-4 text-center backdrop-blur-sm hover:scale-[1.02] transition-transform duration-300`}
            >
              <p className={`text-2xl mb-1 ${f.text}`}>{f.icon}</p>
              <p className="text-sm font-bold text-text-primary">{f.ext}</p>
              <p className="text-xs text-text-muted mt-1">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
