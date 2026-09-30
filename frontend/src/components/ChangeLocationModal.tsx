import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from '../context/LocationContext';
import { resolveLocation, searchLocation } from '../services/api';
import { Search, MapPin, Crosshair, X, Check, Loader2, Map as MapIcon, Compass } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const PRESET_LOCATIONS = [
  { name: 'Kullu, Himachal Pradesh', lat: 31.9579, lon: 77.1095, tag: 'Himalayan River Valley', locality: 'Kullu', district: 'Kullu', state: 'Himachal Pradesh' },
  { name: 'Hyderabad, Telangana', lat: 17.3850, lon: 78.4867, tag: 'Metropolitan Region', locality: 'Hyderabad', district: 'Hyderabad', state: 'Telangana' },
  { name: 'Kochi, Kerala', lat: 9.9312, lon: 76.2673, tag: 'Coastal Inundation Zone', locality: 'Kochi', district: 'Ernakulam', state: 'Kerala' },
  { name: 'Mumbai, Maharashtra', lat: 19.0760, lon: 72.8777, tag: 'West Coast Coastal Urban', locality: 'Mumbai', district: 'Mumbai City', state: 'Maharashtra' },
  { name: 'Chennai, Tamil Nadu', lat: 13.0827, lon: 80.2707, tag: 'East Coast Surge Prone', locality: 'Chennai', district: 'Chennai', state: 'Tamil Nadu' },
  { name: 'Raini Village, Chamoli', lat: 30.4852, lon: 79.6914, tag: 'High Landslide & Flash Flood', locality: 'Raini Village', district: 'Chamoli', state: 'Uttarakhand' },
  { name: 'Joshimath Town, Chamoli', lat: 30.5564, lon: 79.5642, tag: 'Active Subsidence Zone', locality: 'Joshimath', district: 'Chamoli', state: 'Uttarakhand' },
  { name: 'Wayanad, Kerala', lat: 11.6854, lon: 76.1320, tag: 'Western Ghats Slope Hazard', locality: 'Wayanad', district: 'Wayanad', state: 'Kerala' },
];

interface SearchResultItem {
  displayName: string;
  locality: string;
  district: string;
  state: string;
  country: string;
  pincode?: string;
  latitude: number;
  longitude: number;
  source: string;
}

interface SelectedPointState {
  lat: number;
  lon: number;
  displayName: string;
  locality?: string;
  district?: string;
  state?: string;
  country?: string;
  pincode?: string;
  source: 'GPS' | 'SEARCH' | 'MAP' | 'COORDINATES' | 'PRESET' | string;
}

// Embedded Interactive Leaflet Map for Location Selection Modal
const ModalEmbeddedMap: React.FC<{
  lat: number;
  lon: number;
  displayName: string;
  onMapClick: (lat: number, lon: number) => void;
}> = ({ lat, lon, displayName, onMapClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!mapRef.current) {
      const map = L.map(containerRef.current, {
        center: [lat, lon],
        zoom: 12,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap | KSHEMA GIS',
        maxZoom: 19,
        className: 'dark-map-tiles',
      }).addTo(map);

      map.on('click', (e: L.LeafletMouseEvent) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });

      const userIcon = L.divIcon({
        className: 'modal-selected-location-marker',
        html: `
          <div style="position: relative; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 30px; height: 30px; background: rgba(59, 130, 246, 0.35); border-radius: 50%; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: absolute; width: 18px; height: 18px; background: #2563eb; border: 3px solid #ffffff; border-radius: 50%; box-shadow: 0 0 12px rgba(37, 99, 235, 0.8);"></div>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      markerRef.current = L.marker([lat, lon], { icon: userIcon }).addTo(map);
      mapRef.current = map;
    } else {
      mapRef.current.setView([lat, lon], mapRef.current.getZoom() < 11 ? 12 : mapRef.current.getZoom());
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lon]);
      }
    }

    const timer = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [lat, lon, onMapClick]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full rounded-lg overflow-hidden border border-command-border shadow-inner" />
      <div className="absolute top-2 left-2 z-10 bg-slate-900/90 border border-slate-700/80 rounded px-2.5 py-1 text-[10px] text-blue-300 font-semibold shadow">
        Click anywhere on the map to place selection marker
      </div>
    </div>
  );
};

export const ChangeLocationModal: React.FC = () => {
  const {
    isModalOpen,
    closeLocationModal,
    setManualLocation,
    requestGpsLocation,
    locationState,
    loading
  } = useLocation();

  const [activeTab, setActiveTab] = useState<'search' | 'coords' | 'map' | 'presets'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);

  const [inputLat, setInputLat] = useState('');
  const [inputLon, setInputLon] = useState('');

  const [selectedPoint, setSelectedPoint] = useState<SelectedPointState>({
    lat: locationState.latitude,
    lon: locationState.longitude,
    displayName: locationState.displayName,
    locality: locationState.locality,
    district: locationState.district,
    state: locationState.state,
    country: locationState.country,
    source: locationState.source || 'GPS'
  });

  const [resolvingState, setResolvingState] = useState<'IDLE' | 'RESOLVING' | 'ASSESSING'>('IDLE');
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    if (isModalOpen) {
      setSelectedPoint({
        lat: locationState.latitude,
        lon: locationState.longitude,
        displayName: locationState.displayName,
        locality: locationState.locality,
        district: locationState.district,
        state: locationState.state,
        country: locationState.country,
        source: locationState.source || 'GPS'
      });
      setInputLat(locationState.latitude.toFixed(6));
      setInputLon(locationState.longitude.toFixed(6));
    }
  }, [isModalOpen, locationState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        closeLocationModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, closeLocationModal]);

  if (!isModalOpen) return null;

  // Handle Search Submission (Method A)
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setResolvingState('RESOLVING');
    setModalError(null);
    setSearchResults([]);

    try {
      const results = await searchLocation(searchQuery.trim());
      if (Array.isArray(results) && results.length > 0) {
        const items: SearchResultItem[] = results.map((res: any) => ({
          displayName: res.display_name || `${res.locality || res.name}, ${res.district || 'District'}, ${res.state || 'State'}, India`,
          locality: res.locality || res.name || searchQuery,
          district: res.district || 'District',
          state: res.state || 'State',
          country: res.country || 'India',
          pincode: res.pincode,
          latitude: res.latitude,
          longitude: res.longitude,
          source: 'SEARCH'
        }));
        setSearchResults(items);
        handleSelectSearchResult(items[0]);
      } else {
        setModalError('Location not found. Please select a location from the search results.');
      }
    } catch (err: any) {
      setModalError('Location not found. Please select a location from the search results.');
    } finally {
      setResolvingState('IDLE');
    }
  };

  const handleSelectSearchResult = (item: SearchResultItem) => {
    setSelectedPoint({
      lat: item.latitude,
      lon: item.longitude,
      displayName: item.displayName,
      locality: item.locality,
      district: item.district,
      state: item.state,
      country: item.country,
      pincode: item.pincode,
      source: 'SEARCH'
    });
  };

  // Handle Coordinate Validation (Method B)
  const isCoordsValid = () => {
    const lat = parseFloat(inputLat);
    const lon = parseFloat(inputLon);
    return !isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
  };

  const handleApplyCoordsPreview = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(inputLat);
    const lon = parseFloat(inputLon);

    if (!isCoordsValid()) {
      setModalError('Please enter valid latitude (-90 to 90) and longitude (-180 to 180).');
      return;
    }

    setModalError(null);
    setSelectedPoint({
      lat,
      lon,
      displayName: `Coordinate (${lat.toFixed(6)}°, ${lon.toFixed(6)}°)`,
      locality: 'Custom Coordinate',
      district: 'District Region',
      state: 'State Region',
      country: 'India',
      source: 'COORDINATES'
    });
  };

  // Handle Map Click Selection (Method C)
  const handleMapClickSelection = async (clickedLat: number, clickedLon: number) => {
    setModalError(null);
    setInputLat(clickedLat.toFixed(6));
    setInputLon(clickedLon.toFixed(6));

    const tempPoint: SelectedPointState = {
      lat: clickedLat,
      lon: clickedLon,
      displayName: `Map Point (${clickedLat.toFixed(6)}° N, ${clickedLon.toFixed(6)}° E)`,
      locality: 'Map Selected Point',
      district: 'District Region',
      state: 'State Region',
      country: 'India',
      source: 'MAP'
    };
    setSelectedPoint(tempPoint);

    // Background reverse geocode attempt
    try {
      const geoRes = await resolveLocation({ latitude: clickedLat, longitude: clickedLon });
      if (geoRes) {
        setSelectedPoint({
          lat: clickedLat,
          lon: clickedLon,
          displayName: geoRes.display_name || `${geoRes.locality || 'Map Point'}, ${geoRes.district || 'District'}`,
          locality: geoRes.locality || 'Map Selected Point',
          district: geoRes.district || 'District Region',
          state: geoRes.state || 'State Region',
          country: geoRes.country || 'India',
          pincode: geoRes.pincode,
          source: 'MAP'
        });
      }
    } catch {
      // Keep fallback map point label if reverse geocode fails
    }
  };

  // Handle Preset Selection
  const handleSelectPreset = (preset: typeof PRESET_LOCATIONS[0]) => {
    setModalError(null);
    setSelectedPoint({
      lat: preset.lat,
      lon: preset.lon,
      displayName: preset.name,
      locality: preset.locality,
      district: preset.district,
      state: preset.state,
      country: 'India',
      source: 'PRESET'
    });
    setInputLat(preset.lat.toFixed(6));
    setInputLon(preset.lon.toFixed(6));
  };

  // Handle Device GPS
  const handleUseGps = async () => {
    setResolvingState('ASSESSING');
    setModalError(null);
    try {
      await requestGpsLocation();
      closeLocationModal();
    } catch (err: any) {
      setModalError(err.message || 'GPS acquisition failed.');
    } finally {
      setResolvingState('IDLE');
    }
  };

  // Final Confirmation: Apply Selected Location to Global State
  const handleConfirmSelectedLocation = async () => {
    if (!selectedPoint) return;
    setResolvingState('ASSESSING');
    setModalError(null);
    try {
      await setManualLocation(
        selectedPoint.lat,
        selectedPoint.lon,
        selectedPoint.displayName,
        selectedPoint.source,
        {
          locality: selectedPoint.locality,
          district: selectedPoint.district,
          state: selectedPoint.state,
          country: selectedPoint.country,
          pincode: selectedPoint.pincode,
          displayName: selectedPoint.displayName
        }
      );
      closeLocationModal();
    } catch (err: any) {
      setModalError(err.message || 'Location assessment failed. Please retry.');
    } finally {
      setResolvingState('IDLE');
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) closeLocationModal();
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto"
    >
      <div className="bg-command-card border border-command-border rounded-xl max-w-2xl w-full p-5 shadow-2xl relative space-y-4 max-h-[92vh] flex flex-col z-10 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-command-border pb-3 shrink-0">
          <div className="flex items-center gap-2.5 text-command-accent">
            <MapPin className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="text-base font-extrabold text-white">Select Location for Hazard Assessment</h3>
              <p className="text-xs text-gray-400">Search place, enter coordinates, or click point directly on map</p>
            </div>
          </div>
          <button
            onClick={closeLocationModal}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {modalError && (
          <div className="p-3 text-xs bg-rose-950/90 border border-rose-700 text-rose-200 rounded-lg flex items-start gap-2 shrink-0">
            <X className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{modalError}</span>
          </div>
        )}

        {/* Quick Location Actions */}
        <div className="grid grid-cols-2 gap-2 shrink-0">
          <button
            type="button"
            onClick={handleUseGps}
            disabled={resolvingState !== 'IDLE' || loading}
            className="py-2 px-3 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/80 text-emerald-200 text-xs font-semibold flex items-center justify-center gap-2 transition shadow"
          >
            {resolvingState === 'ASSESSING' ? <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> : <Crosshair className="w-4 h-4 text-emerald-400" />}
            <span>Device GPS Location</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('map')}
            className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition shadow ${
              activeTab === 'map' ? 'bg-blue-900 border-blue-500 text-white' : 'bg-blue-950/80 hover:bg-blue-900 border-blue-700/80 text-blue-200'
            }`}
          >
            <MapIcon className="w-4 h-4 text-blue-400" />
            <span>Map Click Selection</span>
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-command-border text-xs font-semibold shrink-0">
          <button
            onClick={() => setActiveTab('search')}
            className={`pb-2 px-3 border-b-2 transition-colors ${
              activeTab === 'search'
                ? 'border-command-accent text-command-accent'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Search Place
          </button>
          <button
            onClick={() => setActiveTab('coords')}
            className={`pb-2 px-3 border-b-2 transition-colors ${
              activeTab === 'coords'
                ? 'border-command-accent text-command-accent'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Enter Lat / Lon
          </button>
          <button
            onClick={() => setActiveTab('map')}
            className={`pb-2 px-3 border-b-2 transition-colors ${
              activeTab === 'map'
                ? 'border-command-accent text-command-accent'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Map Selection
          </button>
          <button
            onClick={() => setActiveTab('presets')}
            className={`pb-2 px-3 border-b-2 transition-colors ${
              activeTab === 'presets'
                ? 'border-command-accent text-command-accent'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            High-Risk Presets
          </button>
        </div>

        {/* INPUT CONTROLS SECTION */}
        <div className="shrink-0 space-y-2">
          {/* TAB 1: SEARCH */}
          {activeTab === 'search' && (
            <div className="space-y-2">
              <form onSubmit={handleSearchSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search for a location in India (e.g., Kullu, Hyderabad, Kochi, Wayanad, Mumbai...)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-xs text-white focus:outline-none focus:border-command-accent"
                  />
                </div>
                <button
                  type="submit"
                  disabled={resolvingState === 'RESOLVING' || !searchQuery.trim()}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-bold text-slate-200 flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {resolvingState === 'RESOLVING' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  <span>SEARCH</span>
                </button>
              </form>

              {searchResults.length > 0 && (
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {searchResults.map((res, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectSearchResult(res)}
                      className={`p-2 rounded border cursor-pointer text-xs flex justify-between items-center ${
                        selectedPoint.lat === res.latitude && selectedPoint.lon === res.longitude
                          ? 'bg-blue-950 border-blue-500 text-white'
                          : 'bg-gray-900 border-gray-800 hover:border-gray-700 text-gray-300'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-white text-xs">{res.locality || res.displayName.split(',')[0]}</div>
                        <div className="text-[11px] text-blue-300">{res.district}, {res.state}, {res.country}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{res.latitude.toFixed(6)}° N, {res.longitude.toFixed(6)}° E</div>
                      </div>
                      <span className="text-[10px] font-bold text-blue-400 border border-blue-800 px-2 py-1 rounded bg-blue-950/80">SELECT</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DIRECT COORDINATES */}
          {activeTab === 'coords' && (
            <form onSubmit={handleApplyCoordsPreview} className="flex items-center gap-2">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="any"
                  placeholder="Latitude (-90 to 90)"
                  value={inputLat}
                  onChange={(e) => setInputLat(e.target.value)}
                  className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-xs text-white focus:outline-none focus:border-command-accent font-mono"
                />
                <input
                  type="number"
                  step="any"
                  placeholder="Longitude (-180 to 180)"
                  value={inputLon}
                  onChange={(e) => setInputLon(e.target.value)}
                  className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-xs text-white focus:outline-none focus:border-command-accent font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={!isCoordsValid()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-bold text-slate-200 transition disabled:opacity-50"
              >
                PREVIEW
              </button>
            </form>
          )}

          {/* TAB 3: MAP SELECTION */}
          {activeTab === 'map' && (
            <div className="p-2 bg-blue-950/60 border border-blue-800 rounded-lg text-xs text-blue-200 flex items-center justify-between">
              <span>Click anywhere on the map container below to choose exact coordinates.</span>
              <span className="font-mono text-[11px] font-bold text-blue-400">{selectedPoint.lat.toFixed(6)}°, {selectedPoint.lon.toFixed(6)}°</span>
            </div>
          )}

          {/* TAB 4: PRESET LOCATIONS */}
          {activeTab === 'presets' && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 max-h-24 scrollbar-thin">
              {PRESET_LOCATIONS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`p-2 rounded-lg border text-left shrink-0 transition-all ${
                    selectedPoint.lat === preset.lat && selectedPoint.lon === preset.lon
                      ? 'bg-blue-950 border-blue-500 text-white'
                      : 'bg-gray-900 border-gray-800 hover:border-gray-700 text-gray-300'
                  }`}
                >
                  <div className="text-xs font-bold truncate max-w-[150px]">{preset.name}</div>
                  <div className="text-[10px] text-gray-400 font-mono">{preset.lat}° N, {preset.lon}° E</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* EMBEDDED MAP CONTAINER (Strictly Bounded Height & Scoped z-index) */}
        <div className="relative w-full h-[280px] shrink-0 rounded-lg overflow-hidden border border-command-border z-0">
          <ModalEmbeddedMap
            lat={selectedPoint.lat}
            lon={selectedPoint.lon}
            displayName={selectedPoint.displayName}
            onMapClick={handleMapClickSelection}
          />
        </div>

        {/* SELECTED LOCATION PREVIEW CARD */}
        <div className="p-3 bg-slate-900 border border-blue-500/50 rounded-lg text-xs flex items-center justify-between shrink-0">
          <div className="space-y-0.5 max-w-[75%]">
            <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>SELECTED POINT PREVIEW</span>
              <span className="px-1.5 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-800 font-mono text-[9px]">
                SOURCE: {selectedPoint.source}
              </span>
            </div>
            <div className="font-extrabold text-white text-xs truncate">{selectedPoint.displayName}</div>
            <div className="font-mono text-gray-400 text-[11px]">
              {selectedPoint.lat.toFixed(6)}° N, {selectedPoint.lon.toFixed(6)}° E
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-700 text-[10px] font-bold shrink-0">
            READY TO ASSESS
          </span>
        </div>

        {/* MODAL FOOTER */}
        <div className="pt-2 border-t border-command-border flex items-center justify-between shrink-0">
          <span className="text-[11px] text-gray-400">Target Backend: <strong className="text-gray-200">http://127.0.0.1:8010</strong></span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeLocationModal}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold rounded-lg border border-gray-700 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmSelectedLocation}
              disabled={resolvingState === 'ASSESSING'}
              className="px-5 py-2 bg-command-accent hover:bg-command-accent/90 text-white text-xs font-extrabold rounded-lg shadow-lg flex items-center gap-1.5 transition disabled:opacity-50"
            >
              {resolvingState === 'ASSESSING' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>{resolvingState === 'ASSESSING' ? 'ASSESSING LOCATION...' : 'USE THIS LOCATION'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
