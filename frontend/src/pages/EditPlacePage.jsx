import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Navbar from '../components/shared/Navbar'
import api from '../utils/api'
import toast from 'react-hot-toast'

export default function EditPlacePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get(`/places/${id}`)
      .then(res => {
        const p = res.data.place
        setForm({
          name: p.name || '',
          description: p.description || '',
          location: p.location || '',
          capacity: p.capacity || '',
          streamUrl: p.streamUrl || '',
        })
      })
      .catch(() => toast.error('Failed to load place'))
      .finally(() => setLoading(false))
  }, [id])

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put(`/places/${id}`, form)
      toast.success('Place updated!')
      navigate('/manager')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    </div>
  )

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

        <h1 className="font-display text-2xl font-bold text-gray-900 mb-6">Edit Place</h1>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Place name</label>
              <input required className="input" value={form.name} onChange={set('name')} />
            </div>
            <div>
              <label className="label">Location</label>
              <input className="input" value={form.location} onChange={set('location')} />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input resize-none" rows={3} value={form.description} onChange={set('description')} />
            </div>
            <div>
              <label className="label">Capacity</label>
              <input type="number" min={1} required className="input" value={form.capacity} onChange={set('capacity')} />
            </div>
            <div>
              <label className="label">Default stream URL (optional)</label>
              <input className="input" placeholder="rtsp://... or http://..." value={form.streamUrl} onChange={set('streamUrl')} />
              <p className="text-xs text-gray-400 mt-1">Leave blank if you'll upload media manually.</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <Link to="/manager" className="btn-secondary">Cancel</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
