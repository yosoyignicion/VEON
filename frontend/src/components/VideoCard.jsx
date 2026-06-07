import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const INPUT_COLORS = {
  svg: 'from-emerald-500 to-cyan-500',
  webp: 'from-purple-500 to-pink-500',
  gif: 'from-amber-500 to-orange-500',
}

const OUTPUT_COLORS = {
  mp4: 'from-primary to-primary-dark',
  webm: 'from-purple-500 to-pink-500',
  gif: 'from-amber-500 to-orange-500',
  hevc: 'from-emerald-500 to-teal-500',
  apng: 'from-sky-500 to-indigo-500',
}

function getInputFormat(name) {
  const ext = name?.split('.').pop()?.toLowerCase() || ''
  if (ext === 'svg' || ext === 'svgz') return 'svg'
  if (ext === 'webp') return 'webp'
  if (ext === 'gif') return 'gif'
  return 'svg'
}

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return ''
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

export default function VideoCard({ job }) {
  const navigate = useNavigate()
  const [thumbError, setThumbError] = useState(false)
  const [thumbLoaded, setThumbLoaded] = useState(false)

  const inputFormat = getInputFormat(job.filename || job.original_name || '')
  const outputFormat = (job.output_format || 'mp4').toLowerCase()
  const inputGrad = INPUT_COLORS[inputFormat] || INPUT_COLORS.svg
  const outputGrad = OUTPUT_COLORS[outputFormat] || OUTPUT_COLORS.mp4
  const name = job.filename || job.original_name || 'Sin nombre'
  const status = job.status || 'pending'
  const thumbUrl = `/api/thumbnail/${job.id}`

  const statusConfig = {
    done: { icon: '✓', color: 'bg-emerald-500/90 text-white', label: 'Completado' },
    failed: { icon: '✕', color: 'bg-red-500/90 text-white', label: 'Falló' },
    pending: { icon: '⋯', color: 'bg-amber-500/90 text-white', label: 'Pendiente' },
    running: { icon: '◌', color: 'bg-primary/90 text-deep-900', label: 'Renderizando' },
  }
  const st = statusConfig[status] || statusConfig.pending

  return (
    <div
      onClick={() => navigate(`/status/${job.id}`)}
      onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/status/${job.id}`) }}
      role="button"
      tabIndex={0}
      className="group cursor-pointer rounded-xl overflow-hidden bg-surface-800/30 border border-surface-700/50 hover:border-primary/40 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(0,255,225,0.1)]"
    >
      <div className="relative aspect-video bg-deep-900 overflow-hidden">
        {!thumbError && status === 'done' ? (
          <>
            <img
              src={thumbUrl}
              alt={name}
              onLoad={() => setThumbLoaded(true)}
              onError={() => setThumbError(true)}
              className={`w-full h-full object-cover transition-opacity duration-500 ${thumbLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
            {!thumbLoaded && (
              <div className={`absolute inset-0 bg-gradient-to-br ${inputGrad} opacity-30`} />
            )}
          </>
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${inputGrad} flex items-center justify-center`}>
            <div className="absolute inset-0 bg-deep-900/40 group-hover:bg-deep-900/20 transition-colors duration-300" />
            <svg className="w-12 h-12 text-white/50 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
            </svg>
          </div>
        )}

        <span className={`absolute top-2 left-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded z-10 backdrop-blur-sm bg-gradient-to-r ${inputGrad} text-white shadow-lg`}>
          {inputFormat}
        </span>

        <span className={`absolute top-2 right-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded z-10 backdrop-blur-sm bg-gradient-to-r ${outputGrad} text-white shadow-lg`}>
          {outputFormat}
        </span>

        <span className={`absolute bottom-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-20 backdrop-blur-sm shadow-lg ${st.color}`}
          title={st.label}>
          {st.icon}
        </span>

        {job.duration && (
          <span className="absolute bottom-2 right-2 text-[11px] text-white/90 bg-deep-900/70 px-2 py-0.5 rounded z-10 backdrop-blur-sm flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {formatDuration(job.duration)}
          </span>
        )}
      </div>

      <div className="p-3 space-y-1.5">
        <p className="text-sm font-medium text-text-primary truncate group-hover:text-primary transition-colors">
          {name}
        </p>
        <div className="flex items-center justify-between text-[11px] text-text-dim">
          <span>
            {job.created_at || job.createdAt
              ? new Date(job.created_at || job.createdAt).toLocaleDateString('es-ES', {
                  day: 'numeric', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })
              : ''}
          </span>
          <span>{formatFileSize(job.output_size)}</span>
        </div>
      </div>
    </div>
  )
}
