import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import api from '../lib/api'
import { useNavigate, Link } from 'react-router-dom'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('user')
  const [address, setAddress] = useState('')
  const navigate = useNavigate()
  const mut = useMutation({
    mutationFn: async () => (await api.post('/auth/register', { name, email, password, role, address })).data,
    onSuccess: (d) => { localStorage.setItem('token', d.token); window.dispatchEvent(new Event('token-updated')); navigate('/') }
  })
  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="text-center">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white font-bold">N</div>
        <h2 className="mt-2 text-xl font-semibold text-slate-800">Create your account</h2>
        <p className="text-sm text-slate-500">Book services faster with Nivaro</p>
      </div>
      <div className="mt-6 space-y-3">
        <label className="block text-sm font-medium text-slate-700">Full name</label>
        <input className="input" placeholder="Jane Doe" value={name} onChange={e=>setName(e.target.value)} />
        <label className="block text-sm font-medium text-slate-700 mt-2">Email</label>
        <input className="input" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} />
        <label className="block text-sm font-medium text-slate-700 mt-2">Password</label>
        <input type="password" className="input" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} />
        <label className="block text-sm font-medium text-slate-700 mt-2">Address (optional)</label>
        <input className="input" placeholder="123 Main St, City" value={address} onChange={e=>setAddress(e.target.value)} />
        <div className="text-sm text-slate-700 mt-2">I am a:
          <label className="ml-2"><input type="radio" checked={role==='user'} onChange={()=>setRole('user')} /> User</label>
          <label className="ml-4"><input type="radio" checked={role==='helper'} onChange={()=>setRole('helper')} /> Helper</label>
        </div>
        <button className="btn w-full" onClick={()=>mut.mutate()} disabled={mut.isPending}>Create account</button>
        {mut.isError && <p className="text-red-600 text-sm">{mut.error?.response?.data?.error || 'Registration failed'}</p>}
        <p className="text-sm text-slate-600">Have an account? <Link className="text-blue-600" to="/login">Sign in</Link></p>
      </div>
    </div>
  )
}
