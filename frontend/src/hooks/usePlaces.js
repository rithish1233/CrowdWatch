import { useState, useEffect, useCallback } from 'react'
import api from '../utils/api'

/**
 * usePlaces — fetches all places and patches them live via WebSocket.
 * @param {object} socket — socket.io client instance
 */
export function usePlaces(socket) {
  const [places, setPlaces] = useState([])
  const [summary, setSummary] = useState({ total: 0, free: 0, busy: 0, full: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchPlaces = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get('/status')
      setPlaces(res.data.places)
      setSummary(res.data.summary)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPlaces()
  }, [fetchPlaces])

  // Listen for live WebSocket updates
  useEffect(() => {
    if (!socket) return

    const handleUpdate = (update) => {
      setPlaces((prev) => {
        const idx = prev.findIndex((p) => p._id === update.placeId)
        if (idx === -1) return prev
        const updated = [...prev]
        updated[idx] = {
          ...updated[idx],
          status: update.status,
          statusColor: update.statusColor,
          currentOccupancy: update.currentOccupancy,
          occupancyPercentage: update.occupancyPercentage,
          seats: update.seats || updated[idx].seats,
          lastAnalyzedAt: update.lastAnalyzedAt,
          mediaUrl: update.mediaUrl || updated[idx].mediaUrl,
        }
        return updated
      })

      // Recompute summary
      setSummary((prev) => {
        // Re-derive from state would require access to latest places — simpler to refetch summary lightly
        return prev // will be accurate on next full fetch
      })
    }

    const handleAllStatus = ({ places: allPlaces }) => {
      if (allPlaces) setPlaces(allPlaces)
    }

    socket.on('place:update', handleUpdate)
    socket.on('status:all', handleAllStatus)

    return () => {
      socket.off('place:update', handleUpdate)
      socket.off('status:all', handleAllStatus)
    }
  }, [socket])

  return { places, summary, loading, error, refetch: fetchPlaces }
}
