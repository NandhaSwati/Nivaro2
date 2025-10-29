import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

export default function Bookings() {
  const qc = useQueryClient()
  const location = useLocation()
  const preselect = location.state?.service_id || null
  const { data: services } = useQuery({ queryKey: ['services'], queryFn: async () => (await api.get('/services')).data.services })
  const { data: bookings } = useQuery({ queryKey: ['bookings'], queryFn: async () => (await api.get('/bookings')).data.bookings })
  const [serviceId, setServiceId] = useState(preselect)
  const [helperId, setHelperId] = useState(location.state?.helper_id || null)
  const [when, setWhen] = useState('')
  const [notes, setNotes] = useState('')
  const helpersQuery = useQuery({ queryKey: ['helpers', serviceId], enabled: !!serviceId, queryFn: async () => (await api.get(`/services/${serviceId}/helpers`)).data.helpers })
  const mut = useMutation({
    mutationFn: async () => (await api.post('/bookings', { service_id: serviceId, helper_id: helperId, scheduled_at: when, notes })).data,
    onSuccess: () => { setNotes(''); setWhen(''); setHelperId(null); qc.invalidateQueries({ queryKey: ['bookings'] }) }
  })

  useEffect(()=>{ if (preselect) setServiceId(preselect) }, [preselect])

  const canSubmit = useMemo(()=> serviceId && when, [serviceId, when])

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-3">New booking</h2>
        <p className="text-sm text-slate-500 mb-3">Choose a service and schedule your preferred time.</p>
        <div className="space-y-3">
          <select className="input" value={serviceId || ''} onChange={e=>{ const v=e.target.value?parseInt(e.target.value):null; setServiceId(v); setHelperId(null); }}>
            <option value="">Select service…</option>
            {(services||[]).map(s=> <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="input" value={helperId || ''} onChange={e=>setHelperId(e.target.value?parseInt(e.target.value):null)} disabled={!serviceId || helpersQuery.isLoading}>
            <option value="">Select helper…</option>
            {(helpersQuery.data||[]).map(h=> <option key={h.id} value={h.id}>{h.name} — ${(h.fee_cents/100).toFixed(2)}$</option>)}
          </select>
          <input className="input" type="datetime-local" value={when} onChange={e=>setWhen(e.target.value)} />
          <textarea className="input" rows="3" placeholder="Notes (optional)" value={notes} onChange={e=>setNotes(e.target.value)} />
          <button className="btn" disabled={!serviceId || !helperId || !when || mut.isPending} onClick={()=>mut.mutate()}>Book service</button>
          {mut.isError && <p className="text-red-600 text-sm">{mut.error?.response?.data?.error || 'Failed to book'}</p>}
          {mut.isSuccess && <p className="text-green-600 text-sm">Booking created!</p>}
        </div>
      </div>
      <div>
        <h2 className="text-lg font-semibold mb-3">My bookings</h2>
        <div className="space-y-3">
          {(bookings||[]).map(b=> (
            <div key={b.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="font-medium text-slate-800">{b.service_name}</div>
              <div className="text-sm text-slate-600">{new Date(b.scheduled_at).toLocaleString()}</div>
              {b.notes && <div className="text-sm mt-1">{b.notes}</div>}
              <div className="text-xs text-slate-400 mt-2">Status: {b.status}</div>
            </div>
          ))}
          {(!bookings || bookings.length===0) && <p className="text-gray-500">No bookings yet.</p>}
        </div>
      </div>
    </div>
  )
}
