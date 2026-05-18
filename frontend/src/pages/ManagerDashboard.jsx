import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/shared/Navbar'
import StatusBadge from '../components/shared/StatusBadge'
import OccupancyBar from '../components/shared/OccupancyBar'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import api from '../utils/api'
import { formatTime } from '../utils/status'
import toast from 'react-hot-toast'

export default function ManagerDashboard() {
  const { user } = useAuth()
  const { socket } = useSocket()
  const [places, setPlaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploadingId, setUploadingId] = useState(null)
  const [streamingPlaces, setStreamingPlaces] = useState(new Set())
  const [streamModal, setStreamModal] = useState(null)
  const [streamUrl, setStreamUrl] = useState('')
  const [streamType, setStreamType] = useState('ip_stream')
  const [manualModal, setManualModal] = useState(null)
  const [manualCount, setManualCount] = useState('')
  const [liveModal, setLiveModal] = useState(null) // placeId for webcam modal
  const fileInputRef = useRef({})

  // Webcam refs — used inside the live modal
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)       // MediaStream from getUserMedia
  const intervalRef = useRef(null)     // setInterval id

  const fetchPlaces = async () => {
    try {
      const res = await api.get('/places/manager/my')
      setPlaces(res.data.places)
    } catch (err) {
      toast.error('Failed to load places')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPlaces() }, [])

  useEffect(() => {
    if (!socket) return
    const handleUpdate = (update) => {
      setPlaces(prev => prev.map(p =>
        p._id === update.placeId ? { ...p, ...update, _id: p._id } : p
      ))
    }
    socket.on('place:update', handleUpdate)
    return () => socket.off('place:update', handleUpdate)
  }, [socket])

  // ── Webcam helpers ──────────────────────────────────────────────

  // Start browser webcam and begin sending frames every 3s
  const startWebcamStream = useCallback(async (placeId) => {
    try {
      // Ask browser for webcam access
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      })
      streamRef.current = mediaStream

      // Attach to video element (rendered in modal)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        await videoRef.current.play()
      }

      setStreamingPlaces(prev => new Set([...prev, placeId]))
      toast.success('Live webcam started — analyzing every 3 seconds!')

      // Capture + send frame every 3 seconds
      intervalRef.current = setInterval(() => captureAndSend(placeId), 3000)

      // Send first frame immediately
      setTimeout(() => captureAndSend(placeId), 500)

    } catch (err) {
      toast.error('Camera access denied. Please allow camera in your browser.')
      console.error('getUserMedia error:', err)
    }
  }, [])

  const captureAndSend = async (placeId) => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Convert canvas to JPEG blob
    canvas.toBlob(async (blob) => {
      if (!blob) return
      try {
        const formData = new FormData()
        formData.append('media', blob, 'webcam-frame.jpg')
        const res = await api.post(`/media/upload/${placeId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        console.log(`[Webcam] ${res.data.detectedCount} people, ${res.data.status}`)
      } catch (err) {
        console.error('[Webcam] Frame send error:', err.message)
      }
    }, 'image/jpeg', 0.85)
  }

  const stopWebcamStream = useCallback((placeId) => {
    // Stop interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setStreamingPlaces(prev => {
      const next = new Set(prev)
      next.delete(placeId)
      return next
    })
    setLiveModal(null)
    toast.success('Live stream stopped')
  }, [])

  // Stop stream when modal is closed
  const handleCloseLiveModal = () => {
    if (liveModal) stopWebcamStream(liveModal)
    setLiveModal(null)
  }

  // ── Other handlers ──────────────────────────────────────────────

  const handleFileUpload = async (placeId, file) => {
    if (!file) return
    const formData = new FormData()
    formData.append('media', file)
    setUploadingId(placeId)
    try {
      const res = await api.post(`/media/upload/${placeId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success(`Detected ${res.data.detectedCount} people — ${res.data.occupancyPercentage}% full`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploadingId(null)
    }
  }

  const handleStreamSubmit = async () => {
    if (!streamUrl || !streamModal) return
    try {
      const res = await api.post(`/media/stream/${streamModal}`, { streamUrl, mediaType: streamType })
      toast.success(`Stream analyzed — ${res.data.detectedCount} people`)
      setStreamModal(null)
      setStreamUrl('')
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleManualSubmit = async () => {
    if (!manualModal || manualCount === '') return
    try {
      await api.post(`/status/${manualModal}/manual`, { count: parseInt(manualCount) })
      toast.success('Status updated manually')
      setManualModal(null)
      setManualCount('')
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleDeletePlace = async (id) => {
    if (!confirm('Deactivate this place?')) return
    try {
      await api.delete(`/places/${id}`)
      setPlaces(prev => prev.filter(p => p._id !== id))
      toast.success('Place deactivated')
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900">Manager Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">Welcome, {user?.name} — manage your monitored locations</p>
          </div>
          <Link to="/manager/places/new" className="btn-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Place
          </Link>
        </div>

        {streamingPlaces.size > 0 && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
            <p className="text-sm text-green-800 font-medium">
              {streamingPlaces.size} place{streamingPlaces.size > 1 ? 's' : ''} live streaming — YOLO analyzing every 3 seconds
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Total Places', value: places.length, color: 'text-gray-800' },
            { label: 'Free', value: places.filter(p => p.status === 'free').length, color: 'text-green-700' },
            { label: 'Busy', value: places.filter(p => p.status === 'busy').length, color: 'text-amber-700' },
            { label: 'Full', value: places.filter(p => p.status === 'full').length, color: 'text-red-700' },
          ].map(item => (
            <div key={item.label} className="card px-4 py-3 text-center">
              <p className={`text-3xl font-display font-bold ${item.color}`}>{item.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : places.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-5xl mb-4">🏛️</div>
            <h3 className="font-semibold text-gray-900 mb-1">No places yet</h3>
            <p className="text-gray-400 text-sm mb-4">Add your first location to start monitoring</p>
            <Link to="/manager/places/new" className="btn-primary inline-block">Add your first place</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {places.map((place) => (
              <PlaceManagerRow
                key={place._id}
                place={place}
                uploadingId={uploadingId}
                isStreaming={streamingPlaces.has(place._id)}
                fileInputRef={fileInputRef}
                onFileChange={(file) => handleFileUpload(place._id, file)}
                onStream={() => setStreamModal(place._id)}
                onStartLive={() => { setLiveModal(place._id) }}
                onStopLive={() => stopWebcamStream(place._id)}
                onManual={() => { setManualModal(place._id); setManualCount(place.currentOccupancy) }}
                onDelete={() => handleDeletePlace(place._id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Live Webcam Modal ── */}
      {liveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="card w-full max-w-lg p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display font-semibold text-gray-900">Live Webcam Stream</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {streamingPlaces.has(liveModal)
                    ? 'Streaming — YOLO analyzing every 3 seconds'
                    : 'Click Start to begin streaming'}
                </p>
              </div>
              <button onClick={handleCloseLiveModal} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Video preview */}
            <div className="relative bg-gray-900 rounded-xl overflow-hidden mb-4" style={{aspectRatio:'4/3'}}>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                muted
                playsInline
              />
              {/* hidden canvas for frame capture */}
              <canvas ref={canvasRef} className="hidden" />

              {!streamingPlaces.has(liveModal) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <svg className="w-12 h-12 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm opacity-60">Camera preview will appear here</p>
                </div>
              )}

              {streamingPlaces.has(liveModal) && (
                <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  LIVE
                </div>
              )}
            </div>

            <div className="flex gap-3">
              {!streamingPlaces.has(liveModal) ? (
                <button
                  onClick={() => startWebcamStream(liveModal)}
                  className="flex-1 btn-primary flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Start Live Stream
                </button>
              ) : (
                <button
                  onClick={() => stopWebcamStream(liveModal)}
                  className="flex-1 btn-danger flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                  Stop Stream
                </button>
              )}
              <button onClick={handleCloseLiveModal} className="btn-secondary px-4">
                Close
              </button>
            </div>

            <p className="text-xs text-gray-400 mt-3 text-center">
              Browser captures frame → sends to YOLO → updates live status for all viewers
            </p>
          </div>
        </div>
      )}

      {/* Stream URL Modal */}
      {streamModal && (
        <Modal title="Set IP Stream Source" onClose={() => setStreamModal(null)}>
          <div className="space-y-4">
            <div>
              <label className="label">Stream Type</label>
              <select className="input" value={streamType} onChange={e => setStreamType(e.target.value)}>
                <option value="ip_stream">IP Camera / RTSP Stream</option>
                <option value="video">Video URL (HTTP)</option>
              </select>
            </div>
            <div>
              <label className="label">URL / Address</label>
              <input className="input"
                placeholder="rtsp://192.168.1.100:554/stream or http://..."
                value={streamUrl} onChange={e => setStreamUrl(e.target.value)} />
            </div>
            <div className="flex gap-2 justify-end">
              <button className="btn-secondary" onClick={() => setStreamModal(null)}>Cancel</button>
              <button className="btn-primary" onClick={handleStreamSubmit}>Analyze</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Manual Count Modal */}
      {manualModal && (
        <Modal title="Set Occupancy Manually" onClose={() => setManualModal(null)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Override the detected count with a manual value.</p>
            <div>
              <label className="label">Number of people present</label>
              <input type="number" min={0} className="input" value={manualCount}
                onChange={e => setManualCount(e.target.value)} />
            </div>
            <div className="flex gap-2 justify-end">
              <button className="btn-secondary" onClick={() => setManualModal(null)}>Cancel</button>
              <button className="btn-primary" onClick={handleManualSubmit}>Update Status</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function PlaceManagerRow({ place, uploadingId, isStreaming, fileInputRef, onFileChange, onStream, onStartLive, onStopLive, onManual, onDelete }) {
  const isUploading = uploadingId === place._id

  return (
    <div className={`card p-5 animate-fade-in transition-all duration-300 ${isStreaming ? 'ring-2 ring-green-400 ring-offset-1' : ''}`}>
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-display font-semibold text-gray-900">{place.name}</h3>
            <StatusBadge status={place.status} size="sm" />
            {isStreaming && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-800">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                LIVE
              </span>
            )}
          </div>
          {place.location && <p className="text-xs text-gray-400 mb-2">{place.location}</p>}
          <OccupancyBar percentage={place.occupancyPercentage} />
          <div className="flex gap-4 mt-2 text-xs text-gray-500 flex-wrap">
            <span>{place.currentOccupancy} / {place.capacity} people</span>
            <span>Last: {formatTime(place.lastAnalyzedAt)}</span>
            {isStreaming && <span className="text-green-600 font-medium animate-pulse">● Updating every 3s</span>}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-start">

          <div>
            <input type="file" accept="image/*,video/*" className="hidden"
              ref={el => fileInputRef.current[place._id] = el}
              onChange={e => onFileChange(e.target.files[0])} />
            <button disabled={isUploading || isStreaming}
              onClick={() => fileInputRef.current[place._id]?.click()}
              className="btn-secondary text-sm flex items-center gap-1.5 disabled:opacity-40">
              {isUploading
                ? <><div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />Analyzing...</>
                : <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>Upload</>
              }
            </button>
          </div>

          {isStreaming ? (
            <button onClick={onStopLive}
              className="text-sm flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors font-medium">
              <span className="w-2 h-2 rounded-sm bg-red-500" />
              Stop Live
            </button>
          ) : (
            <button onClick={onStartLive}
              className="text-sm flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors font-medium">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Start Live
            </button>
          )}

          <button onClick={onStream} disabled={isStreaming}
            className="btn-secondary text-sm flex items-center gap-1.5 disabled:opacity-40">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
            IP Stream
          </button>

          <button onClick={onManual} className="btn-secondary text-sm flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Manual
          </button>

          <Link to={`/manager/places/${place._id}/edit`} className="btn-secondary text-sm flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            </svg>
            Edit
          </Link>

          <Link to={`/place/${place._id}`} target="_blank" className="btn-secondary text-sm flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            View
          </Link>

          <button onClick={onDelete} disabled={isStreaming}
            className="btn-danger text-sm flex items-center gap-1.5 disabled:opacity-40">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="card w-full max-w-md p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
