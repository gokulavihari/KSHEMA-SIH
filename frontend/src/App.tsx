import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LocationProvider } from './context/LocationContext';

import { PublicLayout } from './components/PublicLayout';
import { PublicDashboardView } from './pages/PublicDashboard';
import { PublicGISMapView } from './pages/PublicGISMap';
import { PublicAboutView } from './pages/PublicAbout';
import { PublicSafetyView } from './pages/PublicSafety';
import { LoginView } from './pages/Login';

import { ExecutiveLayout } from './components/ExecutiveLayout';
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
    <AuthProvider>
      <LocationProvider>
        <BrowserRouter>
          <Routes>
            {/* PUBLIC INTERFACE ROUTES (UNAUTHENTICATED) */}
            <Route
              path="/"
              element={
                <PublicLayout>
                  <PublicDashboardView />
                </PublicLayout>
              }
            />
            <Route
              path="/dashboard"
              element={
                <PublicLayout>
                  <PublicDashboardView />
                </PublicLayout>
              }
            />
            <Route
              path="/map"
              element={
                <PublicLayout>
                  <PublicGISMapView />
                </PublicLayout>
              }
            />
            <Route
              path="/gis-map"
              element={
                <PublicLayout>
                  <PublicGISMapView />
                </PublicLayout>
              }
            />
            <Route
              path="/about"
              element={
                <PublicLayout>
                  <PublicAboutView />
                </PublicLayout>
              }
            />
            <Route
              path="/safety"
              element={
                <PublicLayout>
                  <PublicSafetyView />
                </PublicLayout>
              }
            />

            {/* AUTHORIZED EXECUTIVE LOGIN */}
            <Route path="/login" element={<LoginView />} />

            {/* LEGACY REDIRECT ROUTES */}
            <Route path="/habitations" element={<Navigate to="/executive/habitations" replace />} />
            <Route path="/habitations/:id" element={<Navigate to="/executive/habitations" replace />} />
            <Route path="/relocation-planner" element={<Navigate to="/executive/relocation-planner" replace />} />

            {/* AUTHORIZED EXECUTIVE CONSOLE ROUTES (AUTHENTICATED) */}
            <Route path="/executive" element={<Navigate to="/executive/map" replace />} />
            
            <Route
              path="/executive/dashboard"
              element={
                <ExecutiveLayout>
                  <DashboardView />
                </ExecutiveLayout>
              }
            />
            <Route
              path="/executive/map"
              element={
                <ExecutiveLayout>
                  <GISMapView />
                </ExecutiveLayout>
              }
            />
            <Route
              path="/executive/habitations"
              element={
                <ExecutiveLayout>
                  <HabitationsListView />
                </ExecutiveLayout>
              }
            />
            <Route
              path="/executive/habitations/:id"
              element={
                <ExecutiveLayout>
                  <HabitationDetailView />
                </ExecutiveLayout>
              }
            />
            <Route
              path="/executive/risk-analysis"
              element={
                <ExecutiveLayout>
                  <RiskAnalysisView />
                </ExecutiveLayout>
              }
            />
            <Route
              path="/executive/relocation-sites"
              element={
                <ExecutiveLayout>
                  <RelocationSitesView />
                </ExecutiveLayout>
              }
            />
            <Route
              path="/executive/capacity"
              element={
                <ExecutiveLayout>
                  <CapacityMatrixView />
                </ExecutiveLayout>
              }
            />
            <Route
              path="/executive/relocation-planner"
              element={
                <ExecutiveLayout>
                  <RelocationPlannerView />
                </ExecutiveLayout>
              }
            />
            <Route
              path="/executive/ai-insights"
              element={
                <ExecutiveLayout>
                  <AIInsightsView />
                </ExecutiveLayout>
              }
            />
            <Route
              path="/executive/simulation"
              element={
                <ExecutiveLayout>
                  <SimulationCommandView />
                </ExecutiveLayout>
              }
            />
            <Route
              path="/executive/alerts"
              element={
                <ExecutiveLayout>
                  <AlertsView />
                </ExecutiveLayout>
              }
            />
            <Route
              path="/executive/reports"
              element={
                <ExecutiveLayout>
                  <ReportsView />
                </ExecutiveLayout>
              }
            />
            <Route
              path="/executive/data-sources"
              element={
                <ExecutiveLayout>
                  <DataSourcesView />
                </ExecutiveLayout>
              }
            />
            <Route
              path="/executive/field-mode"
              element={
                <ExecutiveLayout>
                  <FieldModeView />
                </ExecutiveLayout>
              }
            />
            <Route
              path="/executive/audit-logs"
              element={
                <ExecutiveLayout>
                  <AuditLogsView />
                </ExecutiveLayout>
              }
            />
            <Route
              path="/executive/settings"
              element={
                <ExecutiveLayout requiredRole="ADMIN">
                  <SettingsView />
                </ExecutiveLayout>
              }
            />

            {/* Redirect legacy internal URLs to executive routes */}
            <Route path="/risk-analysis" element={<Navigate to="/executive/risk-analysis" replace />} />
            <Route path="/relocation-sites" element={<Navigate to="/executive/relocation-sites" replace />} />
            <Route path="/capacity" element={<Navigate to="/executive/capacity" replace />} />
            <Route path="/relocation-planner" element={<Navigate to="/executive/relocation-planner" replace />} />
            <Route path="/ai-insights" element={<Navigate to="/executive/ai-insights" replace />} />
            <Route path="/simulation" element={<Navigate to="/executive/simulation" replace />} />
            <Route path="/reports" element={<Navigate to="/executive/reports" replace />} />
            <Route path="/data-sources" element={<Navigate to="/executive/data-sources" replace />} />
            <Route path="/field-mode" element={<Navigate to="/executive/field-mode" replace />} />
            <Route path="/audit-logs" element={<Navigate to="/executive/audit-logs" replace />} />
            <Route path="/settings" element={<Navigate to="/executive/settings" replace />} />

            {/* Catch-all redirect to public dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </LocationProvider>
    </AuthProvider>
  );
}

export default App;
