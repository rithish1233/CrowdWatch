import { Link } from 'react-router-dom'
import StatusBadge from '../shared/StatusBadge'
import OccupancyBar from '../shared/OccupancyBar'
import { getStatusConfig, formatTime } from '../../utils/status'

export default function PlaceCard({ place }) {
  const cfg = getStatusConfig(place.status)

  return (
    <Link
      to={`/place/${place._id}`}
      className={`card block hover:shadow-md transition-all duration-200 overflow-hidden group border-2 ${cfg.border} animate-fade-in`}
    >
      {/* Color header strip */}
      <div className={`h-2 w-full ${cfg.dot}`} />

      <div className="p-5">
        {/* Name & status */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h3 className="font-display font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors leading-tight">
              {place.name}
            </h3>
            {place.location && (
              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                {place.location}
              </p>
            )}
          </div>
          <StatusBadge status={place.status} size="sm" />
        </div>

        {/* Occupancy bar */}
        <OccupancyBar percentage={place.occupancyPercentage} />

        {/* Stats row */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">{place.currentOccupancy}</p>
            <p className="text-xs text-gray-400">Present</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">{place.capacity - place.currentOccupancy}</p>
            <p className="text-xs text-gray-400">Available</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">{place.capacity}</p>
            <p className="text-xs text-gray-400">Capacity</p>
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-2 text-right">
          Updated {formatTime(place.lastAnalyzedAt)}
        </p>
      </div>
    </Link>
  )
}
