import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import { inr } from '../lib/format'

export default function Helper() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({ queryKey: ['helper', id], queryFn: async () => (await api.get(`/helpers/${id}`)).data.helper })
  if (isLoading) return <p>Loading…</p>
  if (!data) return <p>Not found</p>
  return (
    <div className="max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <h1 className="text-2xl font-bold text-slate-800">{data.name}</h1>
      <p className="text-slate-600 mt-1">{data.bio}</p>
      <div className="mt-3 text-sm">
        <div>Service: {data.service_name}</div>
        <div>Fee: {inr(data.fee_cents/100)}</div>
        <div>Rating: {data.rating.toFixed(1)}</div>
        {typeof data.experience_years !== 'undefined' && <div>Experience: {data.experience_years} years</div>}
        {data.location_text && <div>Location: {data.location_text}</div>}
      </div>
      <button className="btn mt-4" onClick={()=>navigate('/bookings', { state: { service_id: data.service_id, helper_id: data.id } })}>Book this helper</button>
    </div>
  )
}