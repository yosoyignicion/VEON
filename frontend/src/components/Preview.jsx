export default function Preview({ src, title, outputFormat }) {
  const formatColors = {
    mp4: 'from-primary to-primary-dark',
    webm: 'from-purple-500 to-pink-500',
    gif: 'from-amber-500 to-orange-500',
    hevc: 'from-emerald-500 to-teal-500',
    apng: 'from-sky-500 to-indigo-500',
  }
  const grad = formatColors[outputFormat] || formatColors.mp4
  const isVideo = outputFormat === 'mp4' || outputFormat === 'webm' || outputFormat === 'hevc'

  return (
    <div className="relative rounded-xl overflow-hidden bg-surface-800/50 backdrop-blur-sm border border-surface-700/50 group shadow-xl">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
      {isVideo ? (
        <video
          src={src}
          controls
          title={title}
          className="w-full aspect-video object-contain relative z-10"
          preload="metadata"
        >
          Tu navegador no soporta la reproducción de video.
        </video>
      ) : (
        <img
          src={src}
          alt={title || 'preview'}
          className="w-full aspect-video object-contain relative z-10 bg-deep-900"
        />
      )}

      <span className={`absolute top-3 right-3 text-[11px] font-bold uppercase px-2.5 py-1 rounded z-20 bg-gradient-to-r ${grad} text-white shadow-lg backdrop-blur-sm`}>
        {outputFormat || 'mp4'}
      </span>

      {title && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-deep-900/80 to-transparent pointer-events-none z-20">
          <p className="text-sm font-medium text-text-primary truncate">{title}</p>
        </div>
      )}
    </div>
  )
}
