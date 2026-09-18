import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { UserLocationState, LocationAssessment } from '../types';
import { assessLocation, resolveLocation, checkBackendHealth } from '../services/api';

export interface PreResolvedLocationMeta {
  locality?: string;
  district?: string;
  state?: string;
  country?: string;
  pincode?: string;
  displayName?: string;
}

interface LocationContextType {
  locationState: UserLocationState;
  assessment: LocationAssessment | null;
  assessmentRadiusM: number;
  loading: boolean;
  error: string | null;
  backendUnavailable: { isUnavailable: boolean; url: string; reason: string } | null;
  isModalOpen: boolean;
  isMapSelectionMode: boolean;
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
}

const DEFAULT_LOCATION: UserLocationState = {
  source: 'GPS',
  latitude: 30.4852,
  longitude: 79.6914,
  accuracy: 18.0,
  accuracyQuality: 'HIGH',
  timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  displayName: 'Raini Village, Chamoli, Uttarakhand',
  locality: 'Raini Village',
  district: 'Chamoli',
  state: 'Uttarakhand',
  country: 'India',
  pincode: '246443',
  locationVersion: 1,
  permissionState: 'PROMPT',
  demoMode: false
};

const STORAGE_KEY = 'aashray_selected_location';

const LocationContext = createContext<LocationContextType | undefined>(undefined);

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

  const currentVersionRef = useRef<number>(locationState.locationVersion || 1);

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
    const requestVersion = ++currentVersionRef.current;
    
    // Clear old assessment immediately to prevent showing stale data (Phase 18)
    setAssessment(null);
    setLoading(true);
    setError(null);

    // 1. Connectivity health check before assessment
    const health = await checkBackendHealth();
    if (requestVersion !== currentVersionRef.current) return;

    if (!health.healthy) {
      setBackendUnavailable({
        isUnavailable: true,
        url: health.url,
        reason: health.error || 'Connection failed'
      });
      setAssessment(null);
      setLoading(false);
      return;
    }

    setBackendUnavailable(null);
    try {
      const data = await assessLocation(loc.latitude, loc.longitude, loc.accuracy, loc.source, radiusM);
      if (requestVersion === currentVersionRef.current) {
        setAssessment(data);
      }
    } catch (err: any) {
      if (requestVersion === currentVersionRef.current) {
        console.error('Error fetching location assessment:', err);
        setError(err.message || 'Failed to retrieve location hazard assessment');
      }
    } finally {
      if (requestVersion === currentVersionRef.current) {
        setLoading(false);
      }
    }
  };

  const requestGpsLocation = async () => {
    if (!navigator.geolocation) {
      const updatedLoc: UserLocationState = {
        ...locationState,
        source: 'GPS',
        permissionState: 'UNAVAILABLE',
        locationVersion: (locationState.locationVersion || 0) + 1
      };
      setLocationState(updatedLoc);
      persistLocation(updatedLoc);
      fetchAssessmentForLocation(updatedLoc);
      return;
    }

    // Immediately set loading and clear old assessment
    setAssessment(null);
    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const acc = pos.coords.accuracy || 15.0;
        const quality = calculateQuality(acc);
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
            accuracyQuality: quality,
            timestamp: timeStr,
            displayName: geoRes.display_name || `${geoRes.locality || 'Current Location'}, ${geoRes.district || 'District'}`,
            locality: geoRes.locality || 'Current Location',
            district: geoRes.district || 'District Region',
            state: geoRes.state || 'Uttarakhand',
            country: geoRes.country || 'India',
            pincode: geoRes.pincode,
            locationVersion: nextVersion,
            permissionState: 'GRANTED',
            demoMode: locationState.demoMode
          };
        } catch {
          const isTelangana = (15.5 <= lat && lat <= 19.8 && 77.0 <= lon && lon <= 81.0);
          const isChamoli = (29.5 <= lat && lat <= 31.5 && 78.5 <= lon && lon <= 80.5);
          const distFallback = isTelangana ? 'Medchal-Malkajgiri' : (isChamoli ? 'Chamoli' : 'District Region');
          const stateFallback = isTelangana ? 'Telangana' : (isChamoli ? 'Uttarakhand' : 'State Region');
          const locFallback = isTelangana ? 'Atevelle' : (isChamoli ? 'Raini Village' : 'Detected GPS Location');

          newLoc = {
            source: 'GPS',
            latitude: lat,
            longitude: lon,
            accuracy: acc,
            accuracyQuality: quality,
            timestamp: timeStr,
            displayName: `${locFallback}, ${distFallback}, ${stateFallback}`,
            locality: locFallback,
            district: distFallback,
            state: stateFallback,
            country: 'India',
            locationVersion: nextVersion,
            permissionState: 'GRANTED',
            demoMode: locationState.demoMode
          };
        }

        setLocationState(newLoc);
        persistLocation(newLoc);
        await fetchAssessmentForLocation(newLoc);
      },
      (err) => {
        console.warn('GPS position acquisition failed or denied:', err.message);
        const permState = err.code === err.PERMISSION_DENIED ? 'DENIED' : 'UNAVAILABLE';
        const errMsg = err.code === err.PERMISSION_DENIED
          ? 'Location access was not granted. You can search for a place, enter coordinates, or select a point on the map.'
          : 'Location position acquisition timed out or unavailable.';
        
        const fallbackLoc: UserLocationState = {
          ...locationState,
          permissionState: permState,
          permissionErrorMessage: errMsg,
          locationVersion: (locationState.locationVersion || 0) + 1
        };
        setLocationState(fallbackLoc);
        persistLocation(fallbackLoc);
        fetchAssessmentForLocation(fallbackLoc);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  const setManualLocation = async (
    lat: number,
    lon: number,
    name?: string,
    rawSource: string = 'SEARCH',
    preResolvedMeta?: PreResolvedLocationMeta
  ) => {
    const upperSource = (rawSource || 'SEARCH').toUpperCase();
    const cleanSource: 'GPS' | 'SEARCH' | 'MAP' | 'COORDINATES' | 'PRESET' | string = 
      upperSource.includes('GPS') ? 'GPS' :
      upperSource.includes('MAP') ? 'MAP' :
      upperSource.includes('COORD') ? 'COORDINATES' :
      upperSource.includes('PRESET') ? 'PRESET' :
      upperSource.includes('SEARCH') ? 'SEARCH' : upperSource;

    // Clear old assessment immediately to prevent stale UI (Phase 18)
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
        state: preResolvedMeta.state || 'Uttarakhand',
        country: preResolvedMeta.country || 'India',
        pincode: preResolvedMeta.pincode,
        locationVersion: nextVersion,
        permissionState: locationState.permissionState,
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
          state: geoRes.state || 'Uttarakhand',
          country: geoRes.country || 'India',
          pincode: geoRes.pincode,
          locationVersion: nextVersion,
          permissionState: locationState.permissionState,
          permissionErrorMessage: undefined,
          demoMode: locationState.demoMode
        };
      } catch {
        const isTelangana = (15.5 <= lat && lat <= 19.8 && 77.0 <= lon && lon <= 81.0);
        const isChamoli = (29.5 <= lat && lat <= 31.5 && 78.5 <= lon && lon <= 80.5);
        const distFallback = isTelangana ? 'Medchal-Malkajgiri' : (isChamoli ? 'Chamoli' : 'District Region');
        const stateFallback = isTelangana ? 'Telangana' : (isChamoli ? 'Uttarakhand' : 'State Region');
        const locFallback = isTelangana ? 'Atevelle' : (isChamoli ? 'Raini Village' : `Coordinate (${lat.toFixed(4)}°, ${lon.toFixed(4)}°)`);

        newLoc = {
          source: cleanSource,
          latitude: lat,
          longitude: lon,
          accuracy: cleanSource === 'GPS' ? locationState.accuracy : 10.0,
          accuracyQuality: 'HIGH',
          timestamp: timeStr,
          displayName: name || `${locFallback}, ${distFallback}, ${stateFallback}`,
          locality: name || locFallback,
          district: distFallback,
          state: stateFallback,
          country: 'India',
          locationVersion: nextVersion,
          permissionState: locationState.permissionState,
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

  useEffect(() => {
    // On mount, if saved location exists in storage, restore it and assess; otherwise request GPS
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      fetchAssessmentForLocation(locationState);
    } else {
      requestGpsLocation();
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
      openLocationModal: () => setIsModalOpen(true),
      closeLocationModal: () => setIsModalOpen(false),
      enableMapSelectionMode: () => setIsMapSelectionMode(true),
      disableMapSelectionMode: () => setIsMapSelectionMode(false),
      requestGpsLocation,
      setManualLocation,
      setAssessmentRadiusM,
      toggleDemoMode,
      refreshAssessment
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
