import { Link, NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Container from './Container'

export default function Navbar() {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  useEffect(() => {
    const refresh = () => setToken(localStorage.getItem('token'))
    window.addEventListener('storage', refresh)
    window.addEventListener('focus', refresh)
    window.addEventListener('token-updated', refresh)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('focus', refresh)
      window.removeEventListener('token-updated', refresh)
    }
  }, [])
  const logout = () => { localStorage.removeItem('token'); window.location.href = '/login' }
  let initial = 'U'
  try { initial = ((JSON.parse(atob((token||'').split('.')[1]||''))?.name) || 'U').slice(0,1).toUpperCase() } catch {}
  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-white/70 border-b border-slate-200">
      <Container>
        <div className="flex h-16 items-center gap-6">
          <Link to="/" className="font-black text-xl tracking-tight text-slate-800">
            <span className="text-blue-600">Ni</span>varo
          </Link>
          <nav className="hidden md:flex items-center gap-4 text-sm">
            <NavLink to="/" className={({isActive})=>`hover:text-blue-600 ${isActive?'text-blue-600':'text-slate-600'}`}>Home</NavLink>
            {token && <NavLink to="/bookings" className={({isActive})=>`hover:text-blue-600 ${isActive?'text-blue-600':'text-slate-600'}`}>My Bookings</NavLink>}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {!token ? (
              <>
                <Link className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-blue-600" to="/login">Log in</Link>
                <Link className="px-3 py-2 rounded-md text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700" to="/register">Sign up</Link>
              </>
            ) : (
              <>
                <Link to="/profile" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white font-bold">
                  {initial}
                </Link>
                <button className="px-3 py-2 rounded-md text-sm font-semibold bg-red-600 text-white hover:bg-red-700" onClick={logout}>Logout</button>
              </>
            )}
          </div>
        </div>
      </Container>
    </header>
  )
}
