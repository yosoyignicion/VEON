import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import FormatSelector from './FormatSelector.jsx'

const ALLOWED_TYPES = ['image/svg+xml', 'image/webp', 'image/gif']
const ALLOWED_EXTS = ['.svg', '.webp', '.gif']

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

export default function UploadZone() {
  const [state, setState] = useState('idle')
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const [fileSize, setFileSize] = useState(0)
  const [format, setFormat] = useState('mp4')
  const inputRef = useRef(null)
  const navigate = useNavigate()

  const validate = useCallback((file) => {
    const ext = '.' + file.name.split('.').pop().toLowerCase()
    if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXTS.includes(ext)) {
      setError('Solo SVG, WebP y GIF son aceptados.')
      return false
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('El archivo supera los 50 MB.')
      return false
    }
    setError('')
    return true
  }, [])

  const upload = useCallback(async (file, outputFormat) => {
    setState('uploading')
    setFileName(file.name)
    setFileSize(file.size)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('output', outputFormat)
      const res = await fetch('/api/render', { method: 'POST', body: form })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error del servidor' }))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      navigate(`/status/${data.jobId}`)
    } catch (err) {
      setError(err.message)
      setState('idle')
    }
  }, [navigate])

  const handleFile = useCallback((file) => {
    if (!validate(file)) return
    upload(file, format)
  }, [validate, format, upload])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setState('dragging')
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setState('idle')
  }, [])

  const handleClick = () => {
    if (state !== 'uploading') inputRef.current?.click()
  }

  const handleInputChange = (e) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const isDragging = state === 'dragging'
  const isUploading = state === 'uploading'

  return (
    <div className="flex flex-col gap-6">
      <div
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 ${
          isDragging
            ? 'border-primary bg-primary/5 shadow-[0_0_50px_rgba(0,255,225,0.12)] scale-[1.01]'
            : isUploading
            ? 'border-secondary/50 bg-surface-800/30'
            : 'border-surface-700/50 bg-surface-800/20 hover:border-surface-600 hover:bg-surface-800/30'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !isUploading) handleClick() }}
      >
        <div className="absolute inset-0 bg-grid opacity-50 pointer-events-none rounded-2xl" />
        <input
          ref={inputRef}
          type="file"
          accept=".svg,.webp,.gif"
          className="hidden"
          onChange={handleInputChange}
        />
        <div className="relative flex flex-col items-center justify-center py-16 px-8 gap-4">
          {isUploading ? (
            <>
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 animate-spin" viewBox="0 0 50 50">
                  <circle cx="25" cy="25" r="20" fill="none" stroke="#1a2040" strokeWidth="4"/>
                  <circle cx="25" cy="25" r="20" fill="none" stroke="url(#upload-grad)" strokeWidth="4"
                    strokeLinecap="round" strokeDasharray="126" strokeDashoffset="40"/>
                  <defs>
                    <linearGradient id="upload-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#00ffe1"/>
                      <stop offset="100%" stopColor="#6600ff"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div className="text-center">
                <p className="text-text-muted text-sm">Subiendo {fileName}...</p>
                {fileSize > 0 && (
                  <p className="text-text-dim text-xs mt-1">{formatFileSize(fileSize)}</p>
                )}
              </div>
            </>
          ) : (
            <>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                isDragging ? 'bg-primary/20 scale-110' : 'bg-surface-700/50 group-hover:bg-surface-700'
              }`}>
                <svg className={`w-8 h-8 transition-colors duration-300 ${
                  isDragging ? 'text-primary' : 'text-text-muted'
                }`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-text-primary">
                  {isDragging ? 'Suelta tu archivo aquí' : 'Arrastra tu SVG, WebP o GIF'}
                </p>
                <p className="text-sm text-text-muted mt-1">
                  {isDragging ? 'Suelta para comenzar' : 'o haz clic para seleccionar'}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-text-dim">
                <span>SVG</span>
                <span className="w-1 h-1 rounded-full bg-text-dim" />
                <span>WebP</span>
                <span className="w-1 h-1 rounded-full bg-text-dim" />
                <span>GIF</span>
                <span className="w-1 h-1 rounded-full bg-text-dim" />
                <span>Hasta 50 MB</span>
              </div>
            </>
          )}
          {error && (
            <p className="text-red-400 text-sm bg-red-400/10 px-4 py-2 rounded-lg border border-red-400/20">
              {error}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-text-dim text-center tracking-wider uppercase">Formato de salida</p>
        <FormatSelector value={format} onChange={setFormat} />
      </div>
    </div>
  )
}
