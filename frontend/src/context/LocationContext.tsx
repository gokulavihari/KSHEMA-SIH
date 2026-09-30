import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { UserLocationState, LocationAssessment } from '../types';
import {
  assessLocation,
  resolveLocation,
  checkBackendHealth,
  fetchVapidPublicKey,
  subscribeWebPush,
  unsubscribeWebPush,
  checkEmergencyLocationRisk
} from '../services/api';

export interface PreResolvedLocationMeta {
  locality?: string;
  district?: string;
  state?: string;
  country?: string;
  pincode?: string;
  displayName?: string;
}

export type ConsentState = 'granted' | 'denied' | 'unset';

interface LocationContextType {
  locationState: UserLocationState;
  assessment: LocationAssessment | null;
  assessmentRadiusM: number;
  loading: boolean;
  error: string | null;
  backendUnavailable: { isUnavailable: boolean; url: string; reason: string } | null;
  isModalOpen: boolean;
  isMapSelectionMode: boolean;
  
  // Emergency Risk Alert State & Controls
  emergencyConsent: ConsentState;
  emergencyNotificationsEnabled: boolean;
  locationMonitoringActive: boolean;
  activeEmergencyAlert: any | null;
  showEmergencyBanner: boolean;
  showSafetyPlanModal: boolean;
  showSimulatorModal: boolean;

  openLocationModal: () => void;
  closeLocationModal: () => void;
  enableMapSelectionMode: () => void;
  disableMapSelectionMode: () => void;
  requestGpsLocation: () => Promise<void>;
  setManualLocation: (
    lat: number,
    lon: number,
    name?: string,
    source?: 'MANUAL' | 'MAP' | 'GPS' | string,
    preResolvedMeta?: PreResolvedLocationMeta
  ) => Promise<void>;
  setAssessmentRadiusM: (radiusM: number) => Promise<void>;
  toggleDemoMode: () => void;
  refreshAssessment: () => Promise<void>;

  // Emergency Safety Actions
  enableEmergencyAlerts: () => Promise<void>;
  disableEmergencyAlerts: () => Promise<void>;
  stopLocationMonitoring: () => void;
  closeSafetyPlanModal: () => void;
  openSimulatorModal: () => void;
  closeSimulatorModal: () => void;
  openSafetyPlanForAlert: (alertData: any) => void;
}

const DEFAULT_LOCATION: UserLocationState = {
  source: 'GPS',
  latitude: 30.4852,
  longitude: 79.6914,
  accuracy: 18.0,
  accuracyQuality: 'HIGH',
  timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  displayName: 'Active Coordinate (30.4852° N, 79.6914° E)',
  locality: 'Raini Cluster',
  district: 'Chamoli',
  state: 'Uttarakhand',
  country: 'India',
  pincode: '246443',
  locationVersion: 1,
  permissionState: 'PROMPT',
  demoMode: false
};

const STORAGE_KEY = 'aashray_selected_location';
const CONSENT_STORAGE_KEY = 'aashray_emergency_consent';

const LocationContext = createContext<LocationContextType | undefined>(undefined);

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const LocationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [locationState, setLocationState] = useState<UserLocationState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
          return {
            ...DEFAULT_LOCATION,
            ...parsed,
            locationVersion: (parsed.locationVersion || 1) + 1
          };
        }
      }
    } catch {
      // Ignore storage read error
    }
    return DEFAULT_LOCATION;
  });

  const [assessment, setAssessment] = useState<LocationAssessment | null>(null);
  const [assessmentRadiusM, setAssessmentRadiusMState] = useState<number>(1000);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [backendUnavailable, setBackendUnavailable] = useState<{ isUnavailable: boolean; url: string; reason: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isMapSelectionMode, setIsMapSelectionMode] = useState<boolean>(false);

  // Emergency Alert States
  const [emergencyConsent, setEmergencyConsent] = useState<ConsentState>(() => {
    return (localStorage.getItem(CONSENT_STORAGE_KEY) as ConsentState) || 'unset';
  });
  const [emergencyNotificationsEnabled, setEmergencyNotificationsEnabled] = useState<boolean>(false);
  const [locationMonitoringActive, setLocationMonitoringActive] = useState<boolean>(false);
  const [activeEmergencyAlert, setActiveEmergencyAlert] = useState<any | null>(null);
  const [showEmergencyBanner, setShowEmergencyBanner] = useState<boolean>(emergencyConsent === 'unset');
  const [showSafetyPlanModal, setShowSafetyPlanModal] = useState<boolean>(false);
  const [showSimulatorModal, setShowSimulatorModal] = useState<boolean>(false);

  const watchIdRef = useRef<number | null>(null);
  const currentVersionRef = useRef<number>(locationState.locationVersion || 1);
  const pushSubscriptionRef = useRef<PushSubscription | null>(null);

  const calculateQuality = (acc: number): 'HIGH' | 'MEDIUM' | 'LOW' => {
    if (acc <= 20) return 'HIGH';
    if (acc <= 100) return 'MEDIUM';
    return 'LOW';
  };

  const persistLocation = (loc: UserLocationState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
    } catch {
      // Ignore storage write error
    }
  };

  const fetchAssessmentForLocation = async (loc: UserLocationState, radiusM: number = assessmentRadiusM) => {
    const versionAtStart = loc.locationVersion || 1;
    currentVersionRef.current = versionAtStart;
    setLoading(true);
    setError(null);

    try {
      const data = await assessLocation(
        loc.latitude,
        loc.longitude,
        loc.accuracy || 15.0,
        loc.source || 'GPS',
        radiusM
      );

      if (currentVersionRef.current === versionAtStart) {
        setAssessment(data);
        setBackendUnavailable(null);
      }
    } catch (err: any) {
      if (currentVersionRef.current === versionAtStart) {
        setError(err.message || 'Failed to fetch location risk assessment.');
        try {
          const health = await checkBackendHealth();
          setBackendUnavailable(health.healthy ? null : {
            isUnavailable: true,
            url: health.url,
            reason: health.error || 'Backend service is unavailable.'
          });
        } catch {
          setBackendUnavailable({
            isUnavailable: true,
            url: 'http://localhost:8000',
            reason: 'Backend server process is unreachable.'
          });
        }
      }
    } finally {
      if (currentVersionRef.current === versionAtStart) {
        setLoading(false);
      }
    }
  };

  // Register Service Worker & Web Push
  const registerServiceWorkerAndPush = async (): Promise<boolean> => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Web Push is not supported by this browser.');
      return false;
    }

    try {
      const reg = await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service Worker registered successfully:', reg.scope);

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setEmergencyNotificationsEnabled(false);
        return false;
      }

      setEmergencyNotificationsEnabled(true);

      const vapidPublicKey = await fetchVapidPublicKey();
      if (!vapidPublicKey) return false;

      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      let sub = await reg.pushManager.getSubscription();

      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey
        });
      }

      pushSubscriptionRef.current = sub;
      await subscribeWebPush(sub.toJSON());
      return true;
    } catch (err) {
      console.error('Failed to register Web Push:', err);
      return false;
    }
  };

  const enableEmergencyAlerts = async () => {
    setEmergencyConsent('granted');
    localStorage.setItem(CONSENT_STORAGE_KEY, 'granted');
    setShowEmergencyBanner(false);

    const pushSuccess = await registerServiceWorkerAndPush();
    startLocationMonitoring();
  };

  const disableEmergencyAlerts = async () => {
    setEmergencyConsent('denied');
    localStorage.setItem(CONSENT_STORAGE_KEY, 'denied');
    setShowEmergencyBanner(false);
    setEmergencyNotificationsEnabled(false);
    stopLocationMonitoring();

    if (pushSubscriptionRef.current) {
      try {
        await unsubscribeWebPush(pushSubscriptionRef.current.endpoint);
        await pushSubscriptionRef.current.unsubscribe();
      } catch {
        // ignore unsubscribe error
      }
      pushSubscriptionRef.current = null;
    }
  };

  const startLocationMonitoring = () => {
    if (!('geolocation' in navigator)) return;
    if (watchIdRef.current !== null) return;

    setLocationMonitoringActive(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        // Post GPS location update for emergency risk evaluation
        try {
          const alertRes = await checkEmergencyLocationRisk(latitude, longitude, accuracy);
          if (alertRes && (alertRes.alert_required || alertRes.risk_level === 'CRITICAL' || alertRes.risk_level === 'HIGH')) {
            setActiveEmergencyAlert(alertRes);
            if (alertRes.risk_level === 'CRITICAL') {
              setShowSafetyPlanModal(true);
            }
          }
        } catch (e) {
          console.warn('Emergency location check error:', e);
        }
      },
      (err) => {
        console.warn('GPS watchPosition error:', err.message);
      },
      {
        enableHighAccuracy: false, // battery efficient
        timeout: 30000,
        maximumAge: 60000
      }
    );
  };

  const stopLocationMonitoring = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setLocationMonitoringActive(false);
  };

  const requestGpsLocation = async () => {
    if (!('geolocation' in navigator)) {
      const msg = 'Geolocation is not supported by your browser.';
      setError(msg);
      setLocationState(prev => ({
        ...prev,
        permissionState: 'UNAVAILABLE',
        permissionErrorMessage: msg
      }));
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const acc = pos.coords.accuracy || 15.0;
        const timeStr = new Date(pos.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        const nextVersion = (currentVersionRef.current || 0) + 1;
        let newLoc: UserLocationState;

        try {
          const geoRes = await resolveLocation({ latitude: lat, longitude: lon });
          newLoc = {
            source: 'GPS',
            latitude: lat,
            longitude: lon,
            accuracy: acc,
            accuracyQuality: calculateQuality(acc),
            timestamp: timeStr,
            displayName: geoRes.display_name || `${geoRes.locality}, ${geoRes.district}`,
            locality: geoRes.locality || 'GPS Location',
            district: geoRes.district || 'District Region',
            state: geoRes.state || 'State',
            country: geoRes.country || 'India',
            pincode: geoRes.pincode,
            locationVersion: nextVersion,
            permissionState: 'GRANTED',
            permissionErrorMessage: undefined,
            demoMode: locationState.demoMode
          };
        } catch {
          newLoc = {
            source: 'GPS',
            latitude: lat,
            longitude: lon,
            accuracy: acc,
            accuracyQuality: calculateQuality(acc),
            timestamp: timeStr,
            displayName: `GPS Coordinate (${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E)`,
            locality: `Point (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`,
            district: 'Indian Sector',
            state: 'Indian Region',
            country: 'India',
            locationVersion: nextVersion,
            permissionState: 'GRANTED',
            permissionErrorMessage: undefined,
            demoMode: locationState.demoMode
          };
        }

        setLocationState(newLoc);
        persistLocation(newLoc);
        await fetchAssessmentForLocation(newLoc);

        // Also run emergency location check on explicit GPS fix
        if (emergencyConsent === 'granted') {
          try {
            const alertRes = await checkEmergencyLocationRisk(lat, lon, acc);
            if (alertRes && alertRes.risk_level === 'CRITICAL') {
              setActiveEmergencyAlert(alertRes);
              setShowSafetyPlanModal(true);
            }
          } catch {
            // ignore
          }
        }
      },
      (err) => {
        let errorMsg = 'Failed to retrieve GPS location.';
        if (err.code === err.PERMISSION_DENIED) errorMsg = 'GPS location permission was denied.';
        else if (err.code === err.POSITION_UNAVAILABLE) errorMsg = 'GPS location position unavailable.';
        else if (err.code === err.TIMEOUT) errorMsg = 'GPS location request timed out.';

        setError(errorMsg);
        setLocationState(prev => ({
          ...prev,
          permissionState: err.code === err.PERMISSION_DENIED ? 'DENIED' : 'UNAVAILABLE',
          permissionErrorMessage: errorMsg
        }));
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const setManualLocation = async (
    lat: number,
    lon: number,
    name?: string,
    rawSource?: 'MANUAL' | 'MAP' | 'GPS' | string,
    preResolvedMeta?: PreResolvedLocationMeta
  ) => {
    const upperSource = (rawSource || 'SEARCH').toUpperCase();
    const cleanSource: 'GPS' | 'SEARCH' | 'MAP' | 'COORDINATES' | 'PRESET' | string = 
      upperSource.includes('GPS') ? 'GPS' :
      upperSource.includes('MAP') ? 'MAP' :
      upperSource.includes('COORD') ? 'COORDINATES' :
      upperSource.includes('PRESET') ? 'PRESET' :
      upperSource.includes('SEARCH') ? 'SEARCH' : upperSource;

    setAssessment(null);
    setLoading(true);

    const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const nextVersion = (currentVersionRef.current || 0) + 1;

    let newLoc: UserLocationState;

    if (preResolvedMeta && (preResolvedMeta.locality || preResolvedMeta.displayName)) {
      newLoc = {
        source: cleanSource,
        latitude: lat,
        longitude: lon,
        accuracy: cleanSource === 'GPS' ? locationState.accuracy : 10.0,
        accuracyQuality: 'HIGH',
        timestamp: timeStr,
        displayName: preResolvedMeta.displayName || name || `${preResolvedMeta.locality}, ${preResolvedMeta.district}`,
        locality: preResolvedMeta.locality || name || 'Selected Location',
        district: preResolvedMeta.district || 'District Region',
        state: preResolvedMeta.state || 'State',
        country: preResolvedMeta.country || 'India',
        pincode: preResolvedMeta.pincode,
        locationVersion: nextVersion,
        permissionState: 'GRANTED',
        permissionErrorMessage: undefined,
        demoMode: locationState.demoMode
      };
    } else {
      try {
        const geoRes = await resolveLocation({ latitude: lat, longitude: lon });
        newLoc = {
          source: cleanSource,
          latitude: lat,
          longitude: lon,
          accuracy: cleanSource === 'GPS' ? locationState.accuracy : 10.0,
          accuracyQuality: 'HIGH',
          timestamp: timeStr,
          displayName: name || geoRes.display_name || `${geoRes.locality}, ${geoRes.district}`,
          locality: geoRes.locality || name || 'Selected Location',
          district: geoRes.district || 'District Region',
          state: geoRes.state || 'State',
          country: geoRes.country || 'India',
          pincode: geoRes.pincode,
          locationVersion: nextVersion,
          permissionState: 'GRANTED',
          permissionErrorMessage: undefined,
          demoMode: locationState.demoMode
        };
      } catch {
        newLoc = {
          source: cleanSource,
          latitude: lat,
          longitude: lon,
          accuracy: cleanSource === 'GPS' ? locationState.accuracy : 10.0,
          accuracyQuality: 'HIGH',
          timestamp: timeStr,
          displayName: name || `Coordinate (${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E)`,
          locality: name || `Point (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`,
          district: 'Indian Sector',
          state: 'Indian Region',
          country: 'India',
          locationVersion: nextVersion,
          permissionState: 'GRANTED',
          permissionErrorMessage: undefined,
          demoMode: locationState.demoMode
        };
      }
    }

    setLocationState(newLoc);
    persistLocation(newLoc);
    await fetchAssessmentForLocation(newLoc);
  };

  const setAssessmentRadiusM = async (radiusM: number) => {
    setAssessmentRadiusMState(radiusM);
    await fetchAssessmentForLocation(locationState, radiusM);
  };

  const toggleDemoMode = () => {
    setLocationState(prev => {
      const updated = { ...prev, demoMode: !prev.demoMode };
      persistLocation(updated);
      return updated;
    });
  };

  const refreshAssessment = async () => {
    await fetchAssessmentForLocation(locationState, assessmentRadiusM);
  };

  // Handle service worker postMessage for notification clicks
  useEffect(() => {
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'KSHEMA_NOTIFICATION_CLICKED') {
        const payload = event.data.payload;
        setActiveEmergencyAlert(payload);
        setShowSafetyPlanModal(true);
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleSWMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
    };
  }, []);

  // Check URL query parameters for deep-linked safety plan
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'safety-plan') {
      setShowSafetyPlanModal(true);
    }
  }, []);

  useEffect(() => {
    // Restore or initial assessment
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      fetchAssessmentForLocation(locationState);
    } else {
      requestGpsLocation();
    }

    // Auto-start monitoring if consent granted
    if (emergencyConsent === 'granted') {
      startLocationMonitoring();
      registerServiceWorkerAndPush();
    }
  }, []);

  return (
    <LocationContext.Provider value={{
      locationState,
      assessment,
      assessmentRadiusM,
      loading,
      error,
      backendUnavailable,
      isModalOpen,
      isMapSelectionMode,
      emergencyConsent,
      emergencyNotificationsEnabled,
      locationMonitoringActive,
      activeEmergencyAlert,
      showEmergencyBanner,
      showSafetyPlanModal,
      showSimulatorModal,
      openLocationModal: () => setIsModalOpen(true),
      closeLocationModal: () => setIsModalOpen(false),
      enableMapSelectionMode: () => setIsMapSelectionMode(true),
      disableMapSelectionMode: () => setIsMapSelectionMode(false),
      requestGpsLocation,
      setManualLocation,
      setAssessmentRadiusM,
      toggleDemoMode,
      refreshAssessment,
      enableEmergencyAlerts,
      disableEmergencyAlerts,
      stopLocationMonitoring,
      closeSafetyPlanModal: () => setShowSafetyPlanModal(false),
      openSimulatorModal: () => setShowSimulatorModal(true),
      closeSimulatorModal: () => setShowSimulatorModal(false),
      openSafetyPlanForAlert: (alertData: any) => {
        setActiveEmergencyAlert(alertData);
        setShowSafetyPlanModal(true);
      }
    }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = (): LocationContextType => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};
