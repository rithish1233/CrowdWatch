import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Navbar from '../components/shared/Navbar'
import api from '../utils/api'
import toast from 'react-hot-toast'

export default function AddPlacePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    description: '',
    location: '',
    capacity: '',
    rows: '5',
    cols: '10',
  })
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const seatPreview = parseInt(form.rows || 0) * parseInt(form.cols || 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await api.post('/places', form)
      toast.success(`"${res.data.place.name}" created with ${seatPreview} seats!`)
      navigate('/manager')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-10">
        <Link to="/manager" className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mb-6">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to dashboard
        </Link>

        <h1 className="font-display text-2xl font-bold text-gray-900 mb-6">Add New Place</h1>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Basic info */}
            <div>
              <label className="label">Place name *</label>
              <input required className="input" placeholder="e.g. Main Cafeteria, Library Hall A" value={form.name} onChange={set('name')} />
            </div>
            <div>
              <label className="label">Location / Floor</label>
              <input className="input" placeholder="e.g. Ground Floor, Block B" value={form.location} onChange={set('location')} />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input resize-none" rows={3} placeholder="Brief description of this place..." value={form.description} onChange={set('description')} />
            </div>
            <div>
              <label className="label">Total capacity *</label>
              <input required type="number" min={1} className="input" placeholder="e.g. 50" value={form.capacity} onChange={set('capacity')} />
            </div>

            {/* Seating grid config */}
            <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
              <h3 className="font-medium text-gray-800 mb-3 text-sm">Seating Grid Layout</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Rows</label>
                  <input type="number" min={1} max={50} className="input" value={form.rows} onChange={set('rows')} />
                </div>
                <div>
                  <label className="label">Columns</label>
                  <input type="number" min={1} max={50} className="input" value={form.cols} onChange={set('cols')} />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                This creates a <strong>{form.rows || 0} × {form.cols || 0}</strong> grid = <strong>{seatPreview} seats</strong> for visual display.
              </p>

              {/* Mini grid preview */}
              {seatPreview > 0 && seatPreview <= 200 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {Array.from({ length: Math.min(seatPreview, 80) }).map((_, i) => (
                    <div key={i} className="w-4 h-4 rounded-sm bg-green-200 border border-green-300" />
                  ))}
                  {seatPreview > 80 && (
                    <div className="w-4 h-4 rounded-sm bg-gray-200 flex items-center justify-center text-gray-400" style={{fontSize: 8}}>
                      +{seatPreview - 80}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={loading} className="btn-primary flex-1">
                {loading ? 'Creating...' : 'Create Place'}
              </button>
              <Link to="/manager" className="btn-secondary">Cancel</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
