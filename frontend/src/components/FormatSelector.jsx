const FORMATS = [
  { id: 'mp4', label: 'MP4', desc: 'Universal', icon: '🎬', color: 'from-primary to-primary' },
  { id: 'webm', label: 'WebM', desc: 'Web nativo', icon: '🌐', color: 'from-purple-500 to-pink-500' },
  { id: 'gif', label: 'GIF', desc: 'Bucles', icon: '🎞️', color: 'from-amber-500 to-orange-500' },
  { id: 'hevc', label: 'HEVC', desc: 'Alta compresión', icon: '📦', color: 'from-emerald-500 to-teal-500' },
  { id: 'apng', label: 'APNG', desc: 'Transparencia', icon: '✨', color: 'from-sky-500 to-indigo-500' },
]

export default function FormatSelector({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {FORMATS.map((f) => {
        const isSelected = value === f.id
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => onChange(f.id)}
            aria-pressed={isSelected}
            aria-label={`${f.label} - ${f.desc}`}
            className={`relative flex flex-col items-center gap-1 px-4 py-3 rounded-xl border transition-all duration-300 min-w-[80px] ${
              isSelected
                ? `border-primary bg-gradient-to-b ${f.color} text-white shadow-[0_0_20px_rgba(0,255,225,0.15)] scale-105`
                : 'border-surface-700/50 bg-surface-800/30 text-text-muted hover:border-surface-600 hover:text-text-primary hover:bg-surface-800/50'
            }`}
          >
            <span className="text-xl leading-none">{f.icon}</span>
            <span className="text-xs font-bold">{f.label}</span>
            {isSelected && (
              <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-primary rounded-full shadow-[0_0_8px_rgba(0,255,225,0.5)]" />
            )}
            <span className={`text-[10px] leading-tight ${isSelected ? 'text-white/70' : 'text-text-dim'}`}>
              {f.desc}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export { FORMATS }
