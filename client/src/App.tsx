import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import AthleteDashboard from './pages/athlete/AthleteDashboard'
import CoachDashboard from './pages/coach/CoachDashboard'

const ProtectedRoute = ({ children, role }: { children: React.ReactNode; role?: 'athlete' | 'coach' }) => {
  const { user, isLoading } = useAuth()
  if (isLoading) return <div className="flex items-center justify-center h-screen text-slate-400">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to="/" replace />
  return <>{children}</>
}

const RoleRedirect = () => {
  const { user, isLoading } = useAuth()
  if (isLoading) return null
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={user.role === 'coach' ? '/coach' : '/athlete'} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RoleRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/athlete" element={
            <ProtectedRoute role="athlete"><AthleteDashboard /></ProtectedRoute>
          } />
          <Route path="/coach" element={
            <ProtectedRoute role="coach"><CoachDashboard /></ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
