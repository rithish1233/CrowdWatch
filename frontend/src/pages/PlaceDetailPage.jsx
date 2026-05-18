import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Navbar from '../components/shared/Navbar'
import SeatGrid from '../components/public/SeatGrid'
import StatusBadge from '../components/shared/StatusBadge'
import OccupancyBar from '../components/shared/OccupancyBar'
import { useSocket } from '../context/SocketContext'
import api from '../utils/api'
import { formatTime } from '../utils/status'

export default function PlaceDetailPage() {
  const { id } = useParams()
  const { socket } = useSocket()
  const [place, setPlace] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.get(`/places/${id}`)
      .then(res => setPlace(res.data.place))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  // Subscribe to live updates for this place
  useEffect(() => {
    if (!socket) return
    socket.emit('subscribe:place', id)

    const handleUpdate = (update) => {
      if (update.placeId !== id) return
      setPlace(prev => prev ? {
        ...prev,
        status: update.status,
        statusColor: update.statusColor,
        currentOccupancy: update.currentOccupancy,
        occupancyPercentage: update.occupancyPercentage,
        seats: update.seats || prev.seats,
        mediaUrl: update.mediaUrl || prev.mediaUrl,
        lastAnalyzedAt: update.lastAnalyzedAt,
      } : prev)
    }

    socket.on('place:update', handleUpdate)
    return () => {
      socket.emit('unsubscribe:place', id)
      socket.off('place:update', handleUpdate)
    }
  }, [socket, id])

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex items-center justify-center py-32">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    </div>
  )

  if (error || !place) return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">{error || 'Place not found'}</p>
        <Link to="/" className="btn-primary mt-4 inline-block">← Back</Link>
      </div>
    </div>
  )

  const pct = place.occupancyPercentage || 0

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back */}
        <Link to="/" className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mb-6">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to all places
        </Link>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left — info & status */}
          <div className="lg:col-span-1 space-y-4">
            <div className="card p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="font-display text-2xl font-bold text-gray-900">{place.name}</h1>
                  {place.location && (
                    <p className="text-sm text-gray-400 mt-1 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      {place.location}
                    </p>
                  )}
                </div>
                <StatusBadge status={place.status} size="md" />
              </div>

              {place.description && (
                <p className="text-sm text-gray-500 mb-4">{place.description}</p>
              )}

              <OccupancyBar percentage={pct} />

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-50">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{place.currentOccupancy}</p>
                  <p className="text-xs text-gray-400">Present</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{place.capacity - place.currentOccupancy}</p>
                  <p className="text-xs text-gray-400">Available</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{place.capacity}</p>
                  <p className="text-xs text-gray-400">Capacity</p>
                </div>
              </div>

              <p className="text-xs text-gray-300 mt-3 text-center">
                Last updated: {formatTime(place.lastAnalyzedAt)}
              </p>
            </div>

            {/* Media preview */}
            {place.mediaUrl && (
              <div className="card p-4">
                <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Last captured image</p>
                <img
                  src={place.mediaUrl}
                  alt="Last detection frame"
                  className="w-full rounded-lg object-cover max-h-48"
                  onError={(e) => { e.target.style.display = 'none' }}
                />
              </div>
            )}

            {/* Status guide */}
            <div className="card p-4">
              <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">Status Guide</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 text-sm">
                  <div className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
                  <span className="text-gray-600"><strong>Free</strong> — Under 40% capacity</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm">
                  <div className="w-3 h-3 rounded-full bg-amber-400 flex-shrink-0" />
                  <span className="text-gray-600"><strong>Busy</strong> — 40–75% capacity</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm">
                  <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
                  <span className="text-gray-600"><strong>Full</strong> — Over 75% capacity</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right — seat grid */}
          <div className="lg:col-span-2">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display font-semibold text-gray-900">Seating Layout</h2>
                <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded">
                  Live • updates automatically
                </span>
              </div>
              <SeatGrid
                seats={place.seats}
                rows={place.rows || 5}
                cols={place.cols || 10}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
