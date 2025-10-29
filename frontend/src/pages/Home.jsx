import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import { useNavigate } from 'react-router-dom'
import ServiceCard from '../components/ServiceCard'

export default function Home() {
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: async () => (await api.get('/services')).data.services
  })
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
