import { useState } from 'react'
import Navbar from '../components/shared/Navbar'
import PlaceCard from '../components/public/PlaceCard'
import SummaryBar from '../components/public/SummaryBar'
import { usePlaces } from '../hooks/usePlaces'
import { useSocket } from '../context/SocketContext'

export default function PublicDashboard() {
  const { socket } = useSocket()
  const { places, summary, loading, error } = usePlaces(socket)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [view, setView] = useState('grid') // grid | list

  const filtered = places.filter((p) => {
    const matchStatus = filter === 'all' || p.status === filter
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.location || '').toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <h1 className="font-display text-3xl font-bold text-gray-900">
            Live Occupancy Status
          </h1>
          <p className="text-gray-500 mt-1.5">
            Real-time crowd levels across all monitored locations
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary cards */}
        <SummaryBar summary={summary} />

        {/* Filters + search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            placeholder="Search places..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input max-w-xs"
          />

          <div className="flex gap-2 flex-wrap">
            {['all', 'free', 'busy', 'full'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                  filter === f
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* View toggle */}
          <div className="sm:ml-auto flex border border-gray-200 rounded-lg overflow-hidden bg-white">
            <button
              onClick={() => setView('grid')}
              className={`px-3 py-1.5 text-sm transition-colors ${view === 'grid' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1.5 text-sm transition-colors ${view === 'list' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="card p-8 text-center text-red-600">
            <p>Failed to load places: {error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-5xl mb-3">📍</div>
            <p className="text-gray-500">No places found</p>
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((place) => (
              <PlaceCard key={place._id} place={place} />
            ))}
          </div>
        ) : (
          /* List view */
          <div className="space-y-3">
            {filtered.map((place) => (
              <ListRow key={place._id} place={place} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ListRow({ place }) {
  const pct = place.occupancyPercentage || 0
  const color = pct < 40 ? 'bg-green-500' : pct < 75 ? 'bg-amber-400' : 'bg-red-500'
  const statusLabel = place.status === 'free' ? 'Free' : place.status === 'busy' ? 'Busy' : 'Full'
  const statusCls = place.status === 'free'
    ? 'bg-green-100 text-green-700'
    : place.status === 'busy'
    ? 'bg-amber-100 text-amber-700'
    : 'bg-red-100 text-red-700'

  return (
    <a href={`/place/${place._id}`} className="card flex items-center gap-4 px-5 py-4 hover:shadow-md transition-shadow">
      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${color} animate-pulse`} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate">{place.name}</p>
        {place.location && <p className="text-xs text-gray-400 truncate">{place.location}</p>}
      </div>
      <div className="w-32 hidden sm:block">
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-gray-400 mt-0.5 text-right">{pct}%</p>
      </div>
      <div className="text-right hidden md:block">
        <p className="text-sm font-semibold text-gray-700">{place.currentOccupancy} / {place.capacity}</p>
        <p className="text-xs text-gray-400">people</p>
      </div>
      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusCls}`}>{statusLabel}</span>
    </a>
  )
}
