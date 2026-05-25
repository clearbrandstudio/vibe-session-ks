import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import KioskPage from './pages/KioskPage'
import StagePage from './pages/StagePage'
import AdminPage from './pages/AdminPage'
import LoginPage from './pages/LoginPage'
import SuperAdminPage from './pages/SuperAdminPage'
import RafflePage from './pages/RafflePage'
import { StageErrorBoundary } from './components/StageErrorBoundary'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/kiosk" element={<KioskPage />} />
      <Route path="/stage" element={
        <StageErrorBoundary>
          <StagePage />
        </StageErrorBoundary>
      } />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/superadmin" element={<SuperAdminPage />} />
      <Route path="/raffle" element={<RafflePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
