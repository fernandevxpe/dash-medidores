import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { DashboardDataProvider } from './context/DashboardDataContext'
import { AppShell } from './layouts/AppShell'
import { OverviewPage } from './pages/OverviewPage'
import { ClientsPage } from './pages/ClientsPage'
import { TimePage } from './pages/TimePage'
import { EquipmentPage } from './pages/EquipmentPage'
import { CalendarPage } from './pages/CalendarPage'
import { PresentationPage } from './pages/PresentationPage'
import { IndicatorsPage } from './pages/IndicatorsPage'
import { OpportunitiesPage } from './pages/OpportunitiesPage'

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
            <Route path="/indicadores" element={<IndicatorsPage />} />
            <Route path="/oportunidades" element={<OpportunitiesPage />} />
            <Route path="/calendario" element={<CalendarPage />} />
            <Route path="/status" element={<Navigate to="/equipamentos" replace />} />
          </Route>
          <Route path="/apresentacao" element={<PresentationPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </DashboardDataProvider>
    </BrowserRouter>
  )
}
