import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { useNavigate } from 'react-router-dom'
import ServiceCard from '../components/ServiceCard'
import { useEffect, useMemo, useState } from 'react'

export default function Home() {
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: async () => (await api.get('/services')).data.services
  })
  const qc = useQueryClient()
  const token = localStorage.getItem('token')
  const role = useMemo(()=>{ try { return JSON.parse(atob((token||'').split('.')[1]||''))?.role || null } catch { return null } }, [token])
  const helper = useQuery({
    queryKey: ['helper-me'],
    enabled: role === 'helper',
    queryFn: async () => (await api.get('/helpers/me')).data.helper,
    retry: 1
  })

  // User location editors
  const [addr, setAddr] = useState('')
  const saveAddr = useMutation({ mutationFn: async () => (await api.put('/users/me', { address: addr })).data.user })
  const useGPS = useMutation({ mutationFn: async () => new Promise((resolve, reject)=>{
    if (!navigator.geolocation) return reject(new Error('Geolocation not supported'))
    navigator.geolocation.getCurrentPosition(async (pos)=>{
      await api.put('/users/me', { location_lat: pos.coords.latitude, location_lng: pos.coords.longitude }); resolve(true)
    }, reject)
  }), onSuccess: ()=> qc.invalidateQueries({ queryKey: ['me'] }) })

  // Listings feed
  const listings = useQuery({ queryKey: ['listings'], queryFn: async () => (await api.get('/listings')).data.listings })

  // Services list (for helper form)
  const svcList = useQuery({ queryKey: ['services'], queryFn: async () => (await api.get('/services')).data.services })

  // Helper post job form
  const [job, setJob] = useState({ title:'', service_id:'', price:'', description:'', location_text:'' })
  const postJob = useMutation({
    mutationFn: async () => (await api.post('/listings', { title: job.title, service_id: parseInt(job.service_id), price_cents: Math.round(parseFloat(job.price||'0')*100), description: job.description, location_text: job.location_text })).data.listing,
    onSuccess: ()=> { setJob({ title:'', service_id:'', price:'', description:'', location_text:'' }); qc.invalidateQueries({ queryKey: ['listings'] }) }
  })

  // Ask for location once after login/registration for user role
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    let role = null
    try { role = JSON.parse(atob(token.split('.')[1]||''))?.role } catch {}
    if (role !== 'user') return
    if (localStorage.getItem('askedLocationV2') === '1') return

    const ask = async () => {
      const choice = window.prompt('Set your location: type "gps" to use current location, "saved" to keep existing, or enter your address manually.')
      if (!choice) return localStorage.setItem('askedLocationV2','1')
      if (choice.toLowerCase() === 'gps') {
        if (!navigator.geolocation) return
        navigator.geolocation.getCurrentPosition(async (pos)=>{
          try { await api.put('/users/me', { location_lat: pos.coords.latitude, location_lng: pos.coords.longitude }) } catch {}
          localStorage.setItem('askedLocationV2','1')
        })
      } else if (choice.toLowerCase() === 'saved') {
        localStorage.setItem('askedLocationV2','1')
      } else {
        try { await api.put('/users/me', { address: choice }) } catch {}
        localStorage.setItem('askedLocationV2','1')
      }
    }
    ask()
  }, [])
  return (
    <div className="space-y-10">
      <section className="rounded-2xl bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 text-white p-8 md:p-12 shadow">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">All your home services in one place</h1>
        <p className="mt-3 text-white/90 max-w-2xl">Book vetted plumbers, carpenters, cleaners, salon experts and more. Instant or scheduled—transparent pricing and reliable pros.</p>
        <div className="mt-6 flex gap-3">
          <button className="btn bg-white text-blue-700 hover:bg-slate-100" onClick={()=>navigate('/bookings')}>Book a service</button>
          <a className="btn bg-blue-700/70 hover:bg-blue-800" href="#services">Browse services</a>
        </div>
      </section>

      {role === 'user' && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold">Your location</h2>
          <div className="mt-3 flex gap-2">
            <input className="input flex-1" placeholder="Enter address" value={addr} onChange={e=>setAddr(e.target.value)} />
            <button className="btn" onClick={()=>saveAddr.mutate()} disabled={saveAddr.isPending || !addr}>Save</button>
            <button className="btn" onClick={()=>useGPS.mutate()} disabled={useGPS.isPending}>Use my location</button>
          </div>
        </section>
      )}

      {role === 'helper' && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-3">Post a job</h2>
          <div className="grid md:grid-cols-2 gap-3">
            <input className="input" placeholder="Title" value={job.title} onChange={e=>setJob({...job, title:e.target.value})} />
            <select className="input" value={job.service_id} onChange={e=>setJob({...job, service_id: parseInt(e.target.value, 10) || ''})}>
              <option value="">Select service…</option>
              {svcList.isLoading && <option disabled>Loading services…</option>}
              {(svcList.data||[]).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              {!svcList.isLoading && (!svcList.data || svcList.data.length===0) && <option disabled>No services available</option>}
            </select>
            <input className="input" placeholder="Location (text)" value={job.location_text} onChange={e=>setJob({...job, location_text:e.target.value})} />
            <input className="input" type="number" placeholder="Price (₹)" value={job.price} onChange={e=>setJob({...job, price:e.target.value})} />
            <textarea className="input md:col-span-2" rows="3" placeholder="Description" value={job.description} onChange={e=>setJob({...job, description:e.target.value})} />
            <button className="btn md:col-span-2" onClick={()=>postJob.mutate()} disabled={postJob.isPending || !(job.title.trim() && Number(job.service_id) > 0 && Number(job.price) > 0)}>Post</button>
          </div>
        </section>
      )}

      <section id="feed">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-800">Available jobs</h2>
          {!listings.isLoading && <span className="text-sm text-slate-500">{(listings.data||[]).length} posted</span>}
        </div>
        {listings.isLoading && <p>Loading jobs…</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(listings.data||[]).map(l => (
            <div key={l.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="font-semibold text-slate-800">{l.title}</div>
              <div className="text-sm text-slate-600">{l.service_name} • by {l.helper_name}</div>
              {l.location_text && <div className="text-sm">📍 {l.location_text}</div>}
              <div className="text-sm mt-1">₹{(l.price_cents/100).toFixed(2)}</div>
              {role === 'user' && <button className="btn mt-2" onClick={()=>navigate('/helpers/'+l.helper_id)}>View</button>}
            </div>
          ))}
        </div>
      </section>

      <section id="services">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-800">Popular services</h2>
          {!isLoading && <span className="text-sm text-slate-500">{(data||[]).length} available</span>}
        </div>
        {isLoading && <p>Loading services…</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {(data || []).map(s => (
            <ServiceCard key={s.id}
              name={s.name}
              description={`Skilled ${s.name.toLowerCase()}s near you.`}
              onClick={()=>navigate(`/services/${s.id}`)}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
