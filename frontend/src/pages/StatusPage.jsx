import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import Preview from '../components/Preview.jsx'

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20' },
  running: { label: 'Renderizando', color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
  done: { label: 'Completado', color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
  failed: { label: 'Falló', color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20' },
}

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

function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return ''
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function getInputFormat(name) {
  const ext = name?.split('.').pop()?.toLowerCase() || ''
  if (ext === 'svg' || ext === 'svgz') return 'svg'
  if (ext === 'webp') return 'webp'
  if (ext === 'gif') return 'gif'
  return 'svg'
}

export default function StatusPage() {
  const { id } = useParams()
  const [job, setJob] = useState(null)
  const [logs, setLogs] = useState([])
  const [wsStatus, setWsStatus] = useState('connecting')
  const logEndRef = useRef(null)
  const wsRef = useRef(null)

  const addLog = useCallback((msg, type = 'info') => {
    setLogs((prev) => [...prev, { text: msg, type, ts: new Date().toLocaleTimeString() }])
  }, [])

  useEffect(() => {
    fetch(`/api/status/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Job no encontrado')
        return r.json()
      })
      .then((data) => {
        setJob(data)
        if (data.logs) {
          data.logs.forEach((l) => addLog(l, 'info'))
        }
        addLog(`Estado inicial: ${data.status}`, 'system')
      })
      .catch((err) => {
        addLog(`Error: ${err.message}`, 'error')
        setJob({ status: 'failed' })
      })
  }, [id, addLog])

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const wsUrl = `${protocol}//${host}/ws`

    let reconnectTimer
    let closed = false

    function connect() {
      if (closed) return
      setWsStatus('connecting')
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setWsStatus('connected')
        addLog('WebSocket conectado', 'system')
        ws.send(JSON.stringify({ type: 'subscribe', jobId: id }))
      }

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          if (msg.type === 'job_update' && msg.jobId === id) {
            setJob((prev) => ({ ...prev, ...msg.data }))
            if (msg.data.status) {
              addLog(`Estado: ${msg.data.status}`, 'system')
            }
          } else if (msg.type === 'log') {
            addLog(msg.message || msg.text || JSON.stringify(msg), 'info')
          } else if (msg.type === 'error') {
            addLog(msg.message || 'Error del servidor', 'error')
          }
        } catch {
          addLog(typeof e.data === 'string' ? e.data : 'Mensaje no parseable', 'info')
        }
      }

      ws.onclose = () => {
        setWsStatus('disconnected')
        if (!closed) {
          reconnectTimer = setTimeout(connect, 3000)
        }
      }

      ws.onerror = () => {
        ws.close()
      }
    }

    connect()

    return () => {
      closed = true
      clearTimeout(reconnectTimer)
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [id, addLog])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const config = STATUS_CONFIG[job?.status] || STATUS_CONFIG.pending
  const progress = job?.progress ?? 0
  const inputFormat = getInputFormat(job?.filename || job?.original_name || '')
  const outputFormat = (job?.output_format || 'mp4').toLowerCase()
  const inputGrad = INPUT_COLORS[inputFormat] || INPUT_COLORS.svg
  const outputGrad = OUTPUT_COLORS[outputFormat] || OUTPUT_COLORS.mp4
  const downloadUrl = `/api/download/${id}`

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-primary transition-colors group"
      >
        <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Volver
      </Link>

      <div className="rounded-xl bg-surface-800/30 border border-surface-700/50 p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-text-primary truncate">
              {job?.filename || job?.original_name || 'Renderizando...'}
            </h1>
            <p className="text-xs text-text-dim mt-1 font-mono">ID: {id}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium border shrink-0 ${config.bg} ${config.color} ${config.border}`}>
            {config.label}
          </span>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-dim">Entrada:</span>
            <span className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded bg-gradient-to-r ${inputGrad} text-white`}>
              {inputFormat}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-dim">Salida:</span>
            <span className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded bg-gradient-to-r ${outputGrad} text-white`}>
              {outputFormat}
            </span>
          </div>
          <span className={`flex items-center gap-1.5 text-xs ${
            wsStatus === 'connected' ? 'text-emerald-400' :
            wsStatus === 'connecting' ? 'text-amber-400' : 'text-red-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              wsStatus === 'connected' ? 'bg-emerald-400 animate-pulse' :
              wsStatus === 'connecting' ? 'bg-amber-400 animate-pulse' : 'bg-red-400'
            }`} />
            {wsStatus === 'connected' ? 'En vivo' :
             wsStatus === 'connecting' ? 'Conectando...' : 'Desconectado'}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-text-muted">
            <span>Progreso</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-3 bg-surface-700/50 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out animate-gradient"
              style={{
                width: `${Math.max(0, Math.min(100, progress))}%`,
                background: 'linear-gradient(90deg, #00ffe1, #6600ff, #00ffe1)',
                backgroundSize: '200% 100%',
              }}
            />
          </div>
        </div>

        {(job?.duration || job?.output_size) && job?.status === 'done' && (
          <div className="flex gap-4 text-xs text-text-muted">
            {job.duration && (
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Duración: {formatDuration(job.duration)}
              </div>
            )}
            {job.output_size && (
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Tamaño: {formatFileSize(job.output_size)}
              </div>
            )}
          </div>
        )}
      </div>

      {job?.status === 'done' && (
        <div className="space-y-4">
          <Preview
            src={downloadUrl}
            title={job.filename || job.original_name}
            outputFormat={outputFormat}
          />
          <div className="flex justify-center">
            <a
              href={downloadUrl}
              download
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-deep-900 font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Descargar video
            </a>
          </div>
        </div>
      )}

      {job?.status === 'failed' && (
        <div className="rounded-xl bg-red-400/5 border border-red-400/20 p-8 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-red-400/10 flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <p className="text-red-400 font-medium">El renderizado falló</p>
          {job?.error && (
            <p className="text-sm text-red-300/70 max-w-md mx-auto">{job.error}</p>
          )}
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-primary transition-colors mt-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Volver e intentar de nuevo
          </Link>
        </div>
      )}

      <div className="rounded-xl bg-surface-800/30 border border-surface-700/50 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-surface-700/50 flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500/80" />
          <span className="w-3 h-3 rounded-full bg-amber-500/80" />
          <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
          <span className="text-xs text-text-muted ml-2 font-mono">Logs</span>
          <span className="text-xs text-text-dim ml-auto">{logs.length} líneas</span>
        </div>
        <div className="p-4 max-h-80 overflow-y-auto font-mono text-sm leading-relaxed" style={{ background: '#0a0e1a' }}>
          {logs.length === 0 ? (
            <p className="text-text-muted italic">Esperando logs...</p>
          ) : (
            logs.map((log, i) => (
              <div key={i} className={`${
                log.type === 'error' ? 'text-red-400' :
                log.type === 'system' ? 'text-primary' :
                log.text.includes('ffmpeg') || log.text.includes('puppeteer') ? 'text-amber-300' :
                'text-emerald-300'
              }`}>
                <span className="text-text-dim">[{log.ts}] </span>
                {log.text}
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  )
}
