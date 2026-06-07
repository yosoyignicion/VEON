import { Routes, Route, NavLink } from 'react-router-dom'
import Home from './pages/Home.jsx'
import StatusPage from './pages/StatusPage.jsx'
import Gallery from './pages/Gallery.jsx'

export default function App() {
  const linkClass = ({ isActive }) =>
    `flex items-center gap-1.5 text-sm transition-colors px-3 py-1.5 rounded-lg ${
      isActive
        ? 'text-primary bg-primary/10'
        : 'text-text-muted hover:text-primary hover:bg-surface-700/30'
    }`

  return (
    <div className="min-h-screen bg-deep-900">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-deep-900/80 backdrop-blur-md border-b border-surface-700/50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-2 group">
            <span className="text-2xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Veon
            </span>
          </NavLink>
          <div className="flex items-center gap-1">
            <NavLink to="/" end className={linkClass}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
              Inicio
            </NavLink>
            <NavLink to="/gallery" className={linkClass}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              Galería
            </NavLink>
          </div>
        </div>
      </nav>
      <main className="pt-14 min-h-screen">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/status/:id" element={<StatusPage />} />
          <Route path="/gallery" element={<Gallery />} />
        </Routes>
      </main>
    </div>
  )
}
