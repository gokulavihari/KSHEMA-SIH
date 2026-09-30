import React, { useState, useEffect, useRef } from 'react';
import {
  fetchPublicMap,
  fetchPublicLocationRisk,
  resolveLocation,
  searchLocation,
  checkPublicLocationAlerts
} from '../services/api';
import {
  Search,
  MapPin,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  Info,
  Loader2,
  Navigation,
  Bell,
  BellOff,
  RefreshCw,
  Compass,
  Check,
  Layers,
  Box
} from 'lucide-react';
import { MapContainer } from '../components/MapContainer';
import { AashrayTerrainEngine } from '../components/AashrayTerrainEngine';

type GpsState =
  | 'NOT_ENABLED'
  | 'REQUESTING'
  | 'ACTIVE'
  | 'DENIED'
  | 'UNAVAILABLE'
  | 'LOW_ACCURACY';

interface LocationSelection {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  source: 'GPS' | 'SEARCH' | 'MAP_CLICK' | 'PRESET';
  displayName: string;
  district?: string;
  state?: string;
}

export const PublicGISMapView: React.FC = () => {
  const [mapData, setMapData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [viewMode, setViewMode] = useState<'2D' | '3D'>('3D');

  // GPS State Management
  const [gpsState, setGpsState] = useState<GpsState>('NOT_ENABLED');
  const [gpsErrorMsg, setGpsErrorMsg] = useState<string | null>(null);
  const [realGpsCoords, setRealGpsCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
    displayName?: string;
    timestamp: number;
  } | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const [isMonitoringActive, setIsMonitoringActive] = useState(false);

  // Unified Selected Location
  const [selectedLocation, setSelectedLocation] = useState<LocationSelection | null>(null);
  const [assessmentResult, setAssessmentResult] = useState<any>(null);
  const [selectedFeature, setSelectedFeature] = useState<any>(null);

  // UI Toggles & Alerts
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [loadingMap, setLoadingMap] = useState(true);
  const [assessingPoint, setAssessingPoint] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [activeLocationAlert, setActiveLocationAlert] = useState<any>(null);

  useEffect(() => {
    loadMapData();

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const loadMapData = (search?: string) => {
    setLoadingMap(true);
    fetchPublicMap(search)
      .then((res) => {
        setMapData(res);
        if (res.features && res.features.length > 0 && !selectedLocation) {
          const first = res.features[0];
          setSelectedFeature(first);
        }
        setLoadingMap(false);
      })
      .catch((err) => {
        console.error('Failed to load public map:', err);
        setLoadingMap(false);
      });
  };

  const processLocationSelection = async (selection: LocationSelection) => {
    setAssessingPoint(true);
    setSelectedLocation(selection);
    setSelectedFeature(null);

    try {
      const riskData = await fetchPublicLocationRisk(
        selection.latitude,
        selection.longitude,
        selection.accuracyMeters,
        selection.source
      );

      let resolvedMeta: any = null;
      try {
        resolvedMeta = await resolveLocation({
          latitude: selection.latitude,
          longitude: selection.longitude
        });
      } catch {
        resolvedMeta = null;
      }

      const placeName =
        selection.displayName ||
        resolvedMeta?.displayName ||
        resolvedMeta?.locality ||
        riskData?.place?.display_name ||
        `Current Location (${selection.latitude.toFixed(4)}°, ${selection.longitude.toFixed(4)}°)`;

      const updatedSelection = {
        ...selection,
        displayName: placeName,
        district: resolvedMeta?.district || riskData?.place?.district || 'Regional District',
        state: resolvedMeta?.state || riskData?.place?.state || 'State Region'
      };

      setSelectedLocation(updatedSelection);
      setAssessmentResult(riskData);

      if (alertsEnabled) {
        evaluateLocationAlerts(selection.latitude, selection.longitude, selection.accuracyMeters);
      }
    } catch (err: any) {
      console.error('Failed to process location risk pipeline:', err);
    } finally {
      setAssessingPoint(false);
    }
  };

  const evaluateLocationAlerts = async (lat: number, lon: number, accuracy: number) => {
    try {
      const alertEval = await checkPublicLocationAlerts(lat, lon, accuracy);
      if (alertEval && alertEval.risk_level && ['HIGH', 'CRITICAL', 'VERY HIGH'].includes(alertEval.risk_level)) {
        setActiveLocationAlert({
          title: `⚠️ LOCATION RISK ALERT: ${alertEval.risk_level}`,
          hazardType: alertEval.hazard_type || 'SLOPE / FLOOD EXPOSURE',
          reason: alertEval.reason || 'Elevated natural hazard risk detected at your location.',
          validUntil: 'Active Monsoon Watch',
          severity: alertEval.risk_level
        });
      } else {
        setActiveLocationAlert(null);
      }
    } catch (err) {
      console.warn('Location alert evaluation warning:', err);
    }
  };

  const handleRequestDeviceLocation = () => {
    if (!('geolocation' in navigator)) {
      setGpsState('UNAVAILABLE');
      setGpsErrorMsg('Browser does not support HTML5 Geolocation API.');
      return;
    }

    setGpsState('REQUESTING');
    setGpsErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const timestamp = pos.timestamp;

        const isLowAccuracy = accuracy > 100;
        setGpsState(isLowAccuracy ? 'LOW_ACCURACY' : 'ACTIVE');

        setRealGpsCoords({
          latitude,
          longitude,
          accuracy,
          displayName: 'Current Device GPS Location',
          timestamp
        });

        processLocationSelection({
          latitude,
          longitude,
          accuracyMeters: accuracy,
          source: 'GPS',
          displayName: 'Current Device Location'
        });
      },
      (err) => {
        console.warn('Geolocation error:', err);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsState('DENIED');
          setGpsErrorMsg('Location permission was denied. You can search your location manually.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setGpsState('UNAVAILABLE');
          setGpsErrorMsg('Your device could not determine its current location.');
        } else if (err.code === err.TIMEOUT) {
          setGpsState('UNAVAILABLE');
          setGpsErrorMsg('Location detection timed out. Please try again.');
        } else {
          setGpsState('UNAVAILABLE');
          setGpsErrorMsg('Unable to determine location.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0
      }
    );
  };

  const toggleLocationMonitoring = () => {
    if (isMonitoringActive) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsMonitoringActive(false);
      return;
    }

    if (!('geolocation' in navigator)) return;

    setIsMonitoringActive(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setRealGpsCoords({
          latitude,
          longitude,
          accuracy,
          displayName: 'Live Monitored Location',
          timestamp: pos.timestamp
        });

        if (alertsEnabled) {
          evaluateLocationAlerts(latitude, longitude, accuracy);
        }
      },
      (err) => console.warn('WatchPosition error:', err),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 }
    );
  };

  const handleSearchInputChange = async (val: string) => {
    setSearchQuery(val);
    if (val.trim().length >= 3) {
      setIsSearching(true);
      setShowSearchResults(true);
      try {
        const results = await searchLocation(val.trim());
        setSearchResults(results || []);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  const handleSelectSearchResult = (result: any) => {
    setShowSearchResults(false);
    setSearchQuery(result.display_name || result.name);

    processLocationSelection({
      latitude: result.latitude,
      longitude: result.longitude,
      accuracyMeters: 15.0,
      source: 'SEARCH',
      displayName: result.display_name || result.name,
      district: result.district,
      state: result.state
    });
  };

  const handleMapClick = (lat: number, lon: number) => {
    processLocationSelection({
      latitude: lat,
      longitude: lon,
      accuracyMeters: 15.0,
      source: 'MAP_CLICK',
      displayName: `Selected Location (${lat.toFixed(4)}°, ${lon.toFixed(4)}°)`
    });
  };

  const toggleAlerts = () => {
    const nextState = !alertsEnabled;
    setAlertsEnabled(nextState);

    if (nextState) {
      if (selectedLocation) {
        evaluateLocationAlerts(
          selectedLocation.latitude,
          selectedLocation.longitude,
          selectedLocation.accuracyMeters
        );
      } else if (realGpsCoords) {
        evaluateLocationAlerts(
          realGpsCoords.latitude,
          realGpsCoords.longitude,
          realGpsCoords.accuracy
        );
      } else {
        handleRequestDeviceLocation();
      }
    } else {
      setActiveLocationAlert(null);
    }
  };

  const activeOrigin = selectedLocation ? {
    lat: selectedLocation.latitude,
    lng: selectedLocation.longitude,
    name: selectedLocation.displayName
  } : selectedFeature ? {
    lat: selectedFeature.latitude,
    lng: selectedFeature.longitude,
    name: selectedFeature.name
  } : {
    lat: 30.4852,
    lng: 79.6914,
    name: 'Raini Village'
  };

  const activeDestination = assessmentResult?.relocation?.recommended_site ? {
    lat: assessmentResult.relocation.recommended_site.latitude || 30.5612,
    lng: assessmentResult.relocation.recommended_site.longitude || 79.5780,
    name: assessmentResult.relocation.recommended_site.name || 'Relocation Site'
  } : {
    lat: 30.5612,
    lng: 79.5780,
    name: 'Joshimath Army Staging Hub'
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col md:flex-row relative bg-slate-950 overflow-hidden font-sans select-none">
      {/* Sidebar Controls & Public Risk Panel */}
      <div className="w-full md:w-[440px] bg-slate-950 border-r border-slate-800 flex flex-col h-full z-10 shadow-xl overflow-y-auto">
        {/* Top View Toggle & Search */}
        <div className="p-4 border-b border-slate-800 space-y-3 bg-slate-950">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Compass className="w-5 h-5 text-sky-400" />
              <h2 className="font-bold font-mono text-sm text-slate-100">KSHEMA Spatial Workspace</h2>
            </div>

            {/* 2D / 3D Canvas View Toggle */}
            <div className="flex items-center space-x-1 p-1 bg-slate-900 border border-slate-800 rounded-md font-mono text-xs">
              <button
                onClick={() => setViewMode('3D')}
                className={`px-2.5 py-1 rounded flex items-center space-x-1 transition-all ${
                  viewMode === '3D' ? 'bg-sky-500/20 text-sky-400 font-bold border border-sky-500/40' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                <span>3D Terrain</span>
              </button>
              <button
                onClick={() => setViewMode('2D')}
                className={`px-2.5 py-1 rounded flex items-center space-x-1 transition-all ${
                  viewMode === '2D' ? 'bg-sky-500/20 text-sky-400 font-bold border border-sky-500/40' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>2D Map</span>
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchInputChange(e.target.value)}
              placeholder="Search settlement, city, or coordinates..."
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />

            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-slate-950 border border-slate-800 rounded shadow-2xl z-50 max-h-60 overflow-y-auto font-mono text-xs">
                {searchResults.map((res, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectSearchResult(res)}
                    className="w-full text-left p-2.5 hover:bg-slate-900 border-b border-slate-800/60 last:border-0 text-slate-200 transition-colors"
                  >
                    <div className="font-bold text-sky-400">{res.display_name}</div>
                    <div className="text-[10px] text-slate-500">
                      {res.district ? `${res.district}, ` : ''}{res.state}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* GPS Button */}
          <button
            onClick={handleRequestDeviceLocation}
            disabled={gpsState === 'REQUESTING'}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-sky-600 hover:bg-sky-500 text-slate-950 rounded text-xs font-mono font-bold transition-all"
          >
            <Navigation className={`w-3.5 h-3.5 ${gpsState === 'REQUESTING' ? 'animate-spin' : ''}`} />
            <span>LOCATE CURRENT GPS TERRAIN</span>
          </button>
        </div>

        {/* Selected Location Card */}
        {selectedLocation || selectedFeature ? (
          <div className="p-4 space-y-4 font-mono text-xs border-b border-slate-800">
            <div className="space-y-1">
              <span className="text-[10px] text-sky-400">SELECTED TERRAIN COORDINATES</span>
              <h3 className="text-base font-bold text-slate-100">
                {selectedLocation?.displayName || selectedFeature?.name}
              </h3>
              <p className="text-[11px] text-slate-400">
                {selectedLocation?.district || selectedFeature?.district}, {selectedLocation?.state || selectedFeature?.state}
              </p>
            </div>

            <div className="p-3 bg-slate-900 rounded border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block">RISK SCORE</span>
                <span className="text-xl font-bold text-slate-100">
                  {assessmentResult?.risk_score?.toFixed(1) || selectedFeature?.risk_score?.toFixed(1) || '78.5'} / 100
                </span>
              </div>
              <span className="px-2.5 py-1 rounded bg-red-950 border border-red-800 text-red-400 font-bold uppercase text-[10px]">
                {assessmentResult?.risk_level || selectedFeature?.risk_level || 'HIGH'} RISK
              </span>
            </div>
          </div>
        ) : null}

        {/* Monitored Locations List */}
        <div className="p-3 space-y-2 flex-1 font-mono text-xs">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest block px-1">
            REGISTERED REGIONAL SETTLEMENTS ({mapData?.features?.length || 0})
          </span>

          {mapData?.features?.map((feat: any) => (
            <button
              key={feat.id}
              onClick={() => {
                setSelectedFeature(feat);
                setSelectedLocation(null);
              }}
              className={`w-full text-left p-3 rounded border transition-all ${
                selectedFeature?.id === feat.id && !selectedLocation
                  ? 'bg-sky-500/10 border-sky-500/50 text-slate-100 font-bold'
                  : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{feat.name}</span>
                <span className="text-[10px] font-bold text-amber-400">{feat.risk_score?.toFixed(1)}</span>
              </div>
              <span className="text-[10px] text-slate-500 block">{feat.district}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Workspace Canvas (3D Surface or 2D Leaflet Map) */}
      <div className="flex-1 h-full relative">
        {viewMode === '3D' ? (
          <AashrayTerrainEngine
            selectedLocation={activeOrigin}
            recommendedSite={activeDestination}
            habitations={mapData?.features || []}
            height="100%"
            showCorridor={true}
          />
        ) : (
          <MapContainer
            habitations={mapData?.features || []}
            candidateSites={[]}
            gpsUserLocation={realGpsCoords || undefined}
            userLocation={
              selectedLocation
                ? {
                    latitude: selectedLocation.latitude,
                    longitude: selectedLocation.longitude,
                    accuracy: selectedLocation.accuracyMeters,
                    displayName: selectedLocation.displayName,
                    source: selectedLocation.source
                  }
                : selectedFeature
                ? {
                    latitude: selectedFeature.latitude,
                    longitude: selectedFeature.longitude,
                    accuracy: 15.0,
                    displayName: selectedFeature.name,
                    source: 'MONITORED_LOCATION'
                  }
                : undefined
            }
            assessment={assessmentResult}
            onSelectHabitation={(hab) => {
              setSelectedFeature(hab);
              setSelectedLocation(null);
            }}
            onMapClick={(lat, lon) => handleMapClick(lat, lon)}
          />
        )}
      </div>
    </div>
  );
};
