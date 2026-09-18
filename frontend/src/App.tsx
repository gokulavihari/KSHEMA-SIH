import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LocationProvider } from './context/LocationContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';

import { DashboardView } from './pages/Dashboard';
import { GISMapView } from './pages/GISMap';
import { HabitationsListView } from './pages/HabitationsList';
import { HabitationDetailView } from './pages/HabitationDetail';
import { RiskAnalysisView } from './pages/RiskAnalysis';
import { RelocationSitesView } from './pages/RelocationSites';
import { CapacityMatrixView } from './pages/CapacityMatrix';
import { RelocationPlannerView } from './pages/RelocationPlanner';
import { AIInsightsView } from './pages/AIInsights';
import { SimulationCommandView } from './pages/SimulationCommand';
import { AlertsView } from './pages/AlertsView';
import { ReportsView } from './pages/ReportsView';
import { DataSourcesView } from './pages/DataSourcesView';
import { FieldModeView } from './pages/FieldModeView';
import { AuditLogsView } from './pages/AuditLogsView';
import { SettingsView } from './pages/SettingsView';

export function App() {
  return (
    <LocationProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-command-bg text-command-text">
          <Navbar />
          <div className="flex flex-1 relative">
            <Sidebar />
            <main className="flex-1 overflow-y-auto min-h-[calc(100vh-4rem)]">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardView />} />
                <Route path="/map" element={<GISMapView />} />
                <Route path="/gis-map" element={<GISMapView />} />
                <Route path="/habitations" element={<HabitationsListView />} />
                <Route path="/habitations/:id" element={<HabitationDetailView />} />
                <Route path="/risk-analysis" element={<RiskAnalysisView />} />
                <Route path="/relocation-sites" element={<RelocationSitesView />} />
                <Route path="/capacity" element={<CapacityMatrixView />} />
                <Route path="/relocation-planner" element={<RelocationPlannerView />} />
                <Route path="/ai-insights" element={<AIInsightsView />} />
                <Route path="/simulation" element={<SimulationCommandView />} />
                <Route path="/alerts" element={<AlertsView />} />
                <Route path="/reports" element={<ReportsView />} />
                <Route path="/data-sources" element={<DataSourcesView />} />
                <Route path="/field-mode" element={<FieldModeView />} />
                <Route path="/audit-logs" element={<AuditLogsView />} />
                <Route path="/settings" element={<SettingsView />} />
              </Routes>
            </main>
          </div>
        </div>
      </BrowserRouter>
    </LocationProvider>
  );
}

export default App;
