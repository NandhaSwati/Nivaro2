import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import api from '../lib/api'
import { useNavigate, Link } from 'react-router-dom'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()
  const mut = useMutation({
    mutationFn: async () => (await api.post('/auth/login', { email, password })).data,
    onSuccess: (d) => { localStorage.setItem('token', d.token); navigate('/') }
  })
  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="text-center">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white font-bold">N</div>
        <h2 className="mt-2 text-xl font-semibold text-slate-800">Welcome back</h2>
        <p className="text-sm text-slate-500">Sign in to continue</p>
      </div>
      <div className="mt-6 space-y-3">
        <label className="block text-sm font-medium text-slate-700">Email</label>
        <input className="input" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} />
        <label className="block text-sm font-medium text-slate-700 mt-2">Password</label>
        <input type="password" className="input" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="btn w-full" onClick={()=>mut.mutate()} disabled={mut.isPending}>Sign in</button>
        {mut.isError && <p className="text-red-600 text-sm">{mut.error?.response?.data?.error || 'Login failed'}</p>}
        <p className="text-sm text-slate-600">No account? <Link className="text-blue-600" to="/register">Create one</Link></p>
      </div>
    </div>
  )
}
