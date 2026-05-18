import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'

// Pages
import PublicDashboard from './pages/PublicDashboard'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ManagerDashboard from './pages/ManagerDashboard'
import PlaceDetailPage from './pages/PlaceDetailPage'
import AddPlacePage from './pages/AddPlacePage'
import EditPlacePage from './pages/EditPlacePage'
import NotFoundPage from './pages/NotFoundPage'

function ManagerRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'manager') return <Navigate to="/" replace />
  return children
}

function Spinner() {
  return (
    <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
  )
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<PublicDashboard />} />
      <Route path="/place/:id" element={<PlaceDetailPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Manager-only */}
      <Route path="/manager" element={<ManagerRoute><ManagerDashboard /></ManagerRoute>} />
      <Route path="/manager/places/new" element={<ManagerRoute><AddPlacePage /></ManagerRoute>} />
      <Route path="/manager/places/:id/edit" element={<ManagerRoute><EditPlacePage /></ManagerRoute>} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppRoutes />
      </SocketProvider>
    </AuthProvider>
  )
}
