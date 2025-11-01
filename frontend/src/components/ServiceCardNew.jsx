import { WrenchScrewdriverIcon, SparklesIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

export default function ServiceCardNew({ name, description, onClick }) {
  const isSalon = (name||'').toLowerCase().includes('salon') || (name||'').toLowerCase().includes('beaut')
  return (
    <button onClick={onClick} className="group text-left rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-lg transition-transform hover:-translate-y-1">
      <div className="flex items-start gap-3">
        <div className={`rounded-lg p-2 ${isSalon ? 'bg-pink-50 text-pink-600' : 'bg-blue-50 text-blue-600'}`}>
          {isSalon ? (
            <SparklesIcon className="h-6 w-6" />
          ) : (
            <WrenchScrewdriverIcon className="h-6 w-6" />
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-slate-800 group-hover:text-blue-700">{name}</h3>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <div className="flex items-center">
          <ChevronRightIcon className="h-5 w-5 text-slate-400 group-hover:text-blue-500" />
        </div>
      </div>
    </button>
  )
}
