import { Routes, Route, Navigate } from 'react-router-dom'
import KioskPage from './pages/KioskPage'
import StagePage from './pages/StagePage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/kiosk" replace />} />
      <Route path="/kiosk" element={<KioskPage />} />
      <Route path="/stage" element={<StagePage />} />
    </Routes>
  )
}
