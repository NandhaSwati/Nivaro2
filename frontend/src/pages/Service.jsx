import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'

export default function Service() {
  const { id } = useParams()
  const svc = useQuery({ queryKey: ['service', id], queryFn: async () => (await api.get(`/services/${id}`)).data.service })
  const helpers = useQuery({ queryKey: ['helpers', id], queryFn: async () => (await api.get(`/services/${id}/helpers`)).data.helpers })
  if (svc.isLoading) return <p>Loading service…</p>
  if (!svc.data) return <p>Service not found</p>
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-800">{svc.data.name}</h1>
      <div className="grid md:grid-cols-2 gap-4">
        {(helpers.data||[]).map(h => (
          <Link to={`/helpers/${h.id}`} key={h.id} className="block bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow">
            <div className="font-medium text-slate-800">{h.name}</div>
            <div className="text-sm text-slate-600">{h.bio}</div>
            <div className="text-sm mt-1">Fee: ${(h.fee_cents/100).toFixed(2)}</div>
            <div className="text-xs text-slate-500">Rating: {h.rating.toFixed(1)}</div>
          </Link>
        ))}
        {helpers.isLoading && <p>Loading helpers…</p>}
        {helpers.data && helpers.data.length===0 && <p className="text-gray-500">No helpers available.</p>}
      </div>
    </div>
  )
}