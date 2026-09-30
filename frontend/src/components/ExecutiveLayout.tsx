import React, { ReactNode } from 'react';
import { ProtectedRoute } from './ProtectedRoute';
import { ExecutiveNavbar } from './ExecutiveNavbar';
import { ExecutiveSidebar } from './ExecutiveSidebar';
import { useLocation } from '../context/LocationContext';
import { EmergencyAlertBanner } from './EmergencyAlertBanner';
import { SafetyPlanModal } from './SafetyPlanModal';
import { EmergencySimulatorModal } from './EmergencySimulatorModal';

interface ExecutiveLayoutProps {
  children: ReactNode;
  requiredRole?: 'EXECUTIVE' | 'ADMIN';
}

const ModalsContainer: React.FC = () => {
  const {
    showEmergencyBanner,
    showSafetyPlanModal,
    showSimulatorModal,
    activeEmergencyAlert,
    enableEmergencyAlerts,
    disableEmergencyAlerts,
    closeSafetyPlanModal,
    closeSimulatorModal
  } = useLocation();

  return (
    <>
      {showEmergencyBanner && (
        <EmergencyAlertBanner
          onAllow={enableEmergencyAlerts}
          onDeny={disableEmergencyAlerts}
        />
      )}
      {showSafetyPlanModal && (
        <SafetyPlanModal
          alertData={activeEmergencyAlert}
          onClose={closeSafetyPlanModal}
        />
      )}
      {showSimulatorModal && (
        <EmergencySimulatorModal
          onClose={closeSimulatorModal}
        />
      )}
    </>
  );
};

export const ExecutiveLayout: React.FC<ExecutiveLayoutProps> = ({ children, requiredRole = 'EXECUTIVE' }) => {
  return (
    <ProtectedRoute requiredRole={requiredRole}>
      <div className="min-h-screen flex flex-col bg-command-bg text-command-text">
        <ExecutiveNavbar />
        <div className="flex flex-1 relative">
          <ExecutiveSidebar />
          <main className="flex-1 overflow-y-auto min-h-[calc(100vh-4rem)] flex flex-col">
            {children}
          </main>
        </div>
        <ModalsContainer />
      </div>
    </ProtectedRoute>
  );
};
