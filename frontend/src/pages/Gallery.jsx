import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import VideoCard from '../components/VideoCard.jsx'

export default function Gallery() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchJobs = () => {
    setLoading(true)
    setError('')
    fetch('/api/list')
      .then((r) => {
        if (!r.ok) throw new Error('Error al obtener la galería')
        return r.json()
      })
      .then((data) => {
        setJobs(Array.isArray(data) ? data : data.jobs || [])
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const ac = new AbortController()
    fetchJobs()
    return () => ac.abort()
  }, [])

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Galería
            </span>
          </h1>
          <p className="text-sm text-text-muted mt-1">Historial de renders</p>
        </div>
        {!loading && (
          <div className="flex items-center gap-2">
            <button
              onClick={fetchJobs}
              className="p-2 rounded-lg text-text-muted hover:text-primary hover:bg-surface-700/50 transition-all"
              title="Actualizar"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
            </button>
            <span className="text-sm text-text-dim bg-surface-800/30 px-3 py-1 rounded-lg border border-surface-700/50">
              {jobs.length} {jobs.length === 1 ? 'render' : 'renders'}
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="relative w-12 h-12">
            <svg className="w-12 h-12 animate-spin" viewBox="0 0 50 50">
              <circle cx="25" cy="25" r="20" fill="none" stroke="#1a2040" strokeWidth="4"/>
              <circle cx="25" cy="25" r="20" fill="none" stroke="url(#gal-grad)" strokeWidth="4"
                strokeLinecap="round" strokeDasharray="126" strokeDashoffset="40"/>
              <defs>
                <linearGradient id="gal-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#00ffe1"/>
                  <stop offset="100%" stopColor="#6600ff"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <p className="text-text-muted text-sm">Cargando galería...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-14 h-14 rounded-full bg-red-400/10 flex items-center justify-center">
            <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <p className="text-red-400 font-medium">{error}</p>
          <button
            onClick={fetchJobs}
            className="px-5 py-2 rounded-xl bg-surface-700 text-text-primary hover:bg-surface-600 transition-all text-sm border border-surface-600"
          >
            Reintentar
          </button>
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-20 h-20 rounded-2xl bg-surface-800/50 border border-surface-700/50 flex items-center justify-center">
            <svg className="w-10 h-10 text-surface-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-lg text-text-muted">No hay renders aún</p>
            <p className="text-sm text-text-dim mt-1">Sube tu primer archivo para empezar</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="mt-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-deep-900 font-semibold hover:opacity-90 transition-opacity text-sm shadow-lg shadow-primary/20"
          >
            Subir archivo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job) => (
            <VideoCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  )
}
