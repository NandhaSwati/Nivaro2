import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

export default function Profile() {
  const qc = useQueryClient()
  const me = useQuery({ queryKey: ['me'], queryFn: async () => (await api.get('/users/me')).data.user })
  const bookings = useQuery({ queryKey: ['bookings'], queryFn: async () => (await api.get('/bookings')).data.bookings })

  const save = useMutation({
    mutationFn: async (payload) => (await api.put('/users/me', payload)).data.user,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['me'] }) }
  })

  const useMyLocation = async () => {
    if (!navigator.geolocation) return alert('Geolocation not supported')
    navigator.geolocation.getCurrentPosition(async (pos)=>{
      await save.mutateAsync({ location_lat: pos.coords.latitude, location_lng: pos.coords.longitude })
    }, ()=> alert('Could not fetch location'))
  }

  const helper = useQuery({
    queryKey: ['helper-me'],
    enabled: !!me.data && me.data.role === 'helper',
    queryFn: async () => (await api.get('/helpers/me')).data.helper
  })
  const svcList = useQuery({ queryKey: ['services'], queryFn: async () => (await api.get('/services')).data.services })
  const saveHelper = useMutation({
    mutationFn: async (payload) => (await api.put('/helpers/me', payload)).data.helper,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['helper-me'] }) }
  })

  if (me.isLoading) return <p>Loading…</p>
  if (!me.data) return <p>Not found</p>
  let addr = me.data.address || ''

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white font-bold">
            {me.data.name?.slice(0,1)?.toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="text-xl font-semibold text-slate-800">{me.data.name}</div>
            <div className="text-sm text-slate-600">{me.data.email}</div>
            {me.data.role === 'user' && (
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <input className="input" defaultValue={addr} placeholder="Address" onBlur={e=>save.mutate({ address: e.target.value })} />
                <div className="flex items-center gap-2">
                  <button className="btn" onClick={useMyLocation}>Use my location</button>
                  {(me.data.location_lat && me.data.location_lng) && <span className="text-xs text-slate-500">Lat: {me.data.location_lat?.toFixed ? me.data.location_lat.toFixed(4) : me.data.location_lat}, Lng: {me.data.location_lng?.toFixed ? me.data.location_lng.toFixed(4) : me.data.location_lng}</span>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {me.data.role === 'helper' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-3">Provider settings</h2>
          <div className="grid md:grid-cols-2 gap-3">
            <select className="input" defaultValue={helper.data?.service_id || ''} onChange={e=>saveHelper.mutate({ service_id: parseInt(e.target.value), name: helper.data?.name || me.data.name, fee_cents: helper.data?.fee_cents || 3000 })}>
              <option value="">Select service…</option>
              {(svcList.data||[]).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input className="input" placeholder="Display name" defaultValue={helper.data?.name || me.data.name} onBlur={e=>saveHelper.mutate({ name: e.target.value, service_id: helper.data?.service_id || (svcList.data?.[0]?.id) })} />
            <input className="input" type="number" placeholder="Fee (₹)" defaultValue={(helper.data?.fee_cents||3000)/100} onBlur={e=>saveHelper.mutate({ fee_cents: Math.round(parseFloat(e.target.value||'0')*100), service_id: helper.data?.service_id || (svcList.data?.[0]?.id), name: helper.data?.name || me.data.name })} />
            <input className="input" placeholder="Location (text)" defaultValue={helper.data?.location_text || ''} onBlur={e=>saveHelper.mutate({ location_text: e.target.value, service_id: helper.data?.service_id || (svcList.data?.[0]?.id), name: helper.data?.name || me.data.name })} />
            <textarea className="input md:col-span-2" rows="3" placeholder="Bio" defaultValue={helper.data?.bio || ''} onBlur={e=>saveHelper.mutate({ bio: e.target.value, service_id: helper.data?.service_id || (svcList.data?.[0]?.id), name: helper.data?.name || me.data.name })} />
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-2">My bookings</h2>
        <div className="space-y-3">
          {(bookings.data||[]).map(b => (
            <div key={b.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="font-medium text-slate-800">{b.service_name}{b.helper_name ? ` — ${b.helper_name}` : ''}</div>
              <div className="text-sm text-slate-600">{new Date(b.scheduled_at).toLocaleString()}</div>
              {b.notes && <div className="text-sm mt-1">{b.notes}</div>}
              <div className="text-xs text-slate-400 mt-2">Status: {b.status}</div>
            </div>
          ))}
          {bookings.isLoading && <p>Loading bookings…</p>}
          {bookings.data && bookings.data.length===0 && <p className="text-gray-500">No bookings yet.</p>}
        </div>
      </div>
    </div>
  )
}
