import React, { ReactNode } from 'react';
import { PublicNavbar } from './PublicNavbar';
import { useLocation } from '../context/LocationContext';
import { EmergencyAlertBanner } from './EmergencyAlertBanner';
import { SafetyPlanModal } from './SafetyPlanModal';
import { EmergencySimulatorModal } from './EmergencySimulatorModal';
import { ChangeLocationModal } from './ChangeLocationModal';

interface PublicLayoutProps {
  children: ReactNode;
}

const PublicModalsContainer: React.FC = () => {
  const {
    showEmergencyBanner,
    showSafetyPlanModal,
    showSimulatorModal,
    activeEmergencyAlert,
    enableEmergencyAlerts,
    disableEmergencyAlerts,
    closeSafetyPlanModal,
    closeSimulatorModal,
    isModalOpen,
    closeLocationModal
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
      {isModalOpen && (
        <ChangeLocationModal />
      )}
    </>
  );
};

export const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-command-bg text-command-text font-sans">
      <PublicNavbar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
      <footer className="bg-command-card border-t border-command-border py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
          <span>
            Kshema — National Disaster Risk & Safe Relocation Intelligence Platform (Public Portal)
          </span>
          <div className="flex items-center space-x-4">
            <a href="/safety" className="hover:text-slate-300 transition-colors">Emergency Helplines</a>
            <a href="/about" className="hover:text-slate-300 transition-colors">About System</a>
            <a href="/login" className="hover:text-blue-400 transition-colors font-medium">Executive Sign-In</a>
          </div>
        </div>
      </footer>
      <PublicModalsContainer />
    </div>
  );
};
