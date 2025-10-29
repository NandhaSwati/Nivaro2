import { WrenchScrewdriverIcon, SparklesIcon } from '@heroicons/react/24/outline'

export default function ServiceCard({ name, description, onClick }) {
  return (
    <button onClick={onClick} className="group text-left rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition hover:border-blue-200">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
          {name.toLowerCase().includes('salon') ? (
            <SparklesIcon className="h-6 w-6" />
          ) : (
            <WrenchScrewdriverIcon className="h-6 w-6" />
          )}
        </div>
        <div>
          <h3 className="font-semibold text-slate-800 group-hover:text-blue-700">{name}</h3>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>
    </button>
  )
}
