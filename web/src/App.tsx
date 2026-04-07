import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { DashboardDataProvider } from './context/DashboardDataContext'
import { AppShell } from './layouts/AppShell'
import { OverviewPage } from './pages/OverviewPage'
import { ClientsPage } from './pages/ClientsPage'
import { TimePage } from './pages/TimePage'
import { EquipmentPage } from './pages/EquipmentPage'
import { CalendarPage } from './pages/CalendarPage'
import { StatusPage } from './pages/StatusPage'
import { PresentationPage } from './pages/PresentationPage'

export default function App() {
  return (
    <BrowserRouter>
      <DashboardDataProvider>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/clientes" element={<ClientsPage />} />
            <Route path="/tempo" element={<TimePage />} />
            <Route path="/equipamentos" element={<EquipmentPage />} />
            <Route path="/calendario" element={<CalendarPage />} />
            <Route path="/status" element={<StatusPage />} />
          </Route>
          <Route path="/apresentacao" element={<PresentationPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </DashboardDataProvider>
    </BrowserRouter>
  )
}
