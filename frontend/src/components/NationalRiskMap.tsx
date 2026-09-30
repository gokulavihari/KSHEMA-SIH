import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { NationalGISLocation, RiskSeverity } from '../types';

interface NationalRiskMapProps {
  locations: NationalGISLocation[];
  stateBoundariesGeoJSON?: any;
  selectedState: string;
  selectedDistrict: string;
  selectedLocation: NationalGISLocation | null;
  onSelectLocation: (loc: NationalGISLocation | null) => void;
  onSelectState: (state: string) => void;
  onInspectSpatialIntelligence?: (loc: NationalGISLocation) => void;
  focusTarget?: { lat: number; lng: number; zoom?: number; timestamp?: number } | null;
  activeLayers: {
    riskLocations: boolean;
    riskZones: boolean;
    relocationSites: boolean;
    stateBoundaries: boolean;
    riskDensity: boolean;
  };
  onMapReset?: () => void;
}

const isValidCoordinate = (lat: any, lon: any): boolean => {
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    !isNaN(lat) &&
    !isNaN(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
};

const getSeverityPalette = (level: RiskSeverity | string) => {
  switch (level?.toUpperCase()) {
    case 'CRITICAL':
      return {
        fill: '#991b1b',
        border: '#f87171',
        glow: 'rgba(239, 68, 68, 0.50)',
        label: 'CRITICAL',
        badgeBg: '#450a0a',
        badgeBorder: '#991b1b',
        badgeText: '#fca5a5',
      };
    case 'EXTREMELY HIGH':
    case 'VERY HIGH':
      return {
        fill: '#ea580c',
        border: '#fb923c',
        glow: 'rgba(234, 88, 12, 0.45)',
        label: 'EXTREMELY HIGH',
        badgeBg: '#431407',
        badgeBorder: '#c2410c',
        badgeText: '#fdba74',
      };
    case 'HIGH':
      return {
        fill: '#f97316',
        border: '#fdba74',
        glow: 'rgba(249, 115, 22, 0.35)',
        label: 'HIGH',
        badgeBg: '#451a03',
        badgeBorder: '#d97706',
        badgeText: '#fde68a',
      };
    case 'MODERATE':
    default:
      return {
        fill: '#f59e0b',
        border: '#fef08a',
        glow: 'rgba(245, 158, 11, 0.30)',
        label: 'MODERATE',
        badgeBg: '#451a03',
        badgeBorder: '#b45309',
        badgeText: '#fef08a',
      };
  }
};

export const NationalRiskMap: React.FC<NationalRiskMapProps> = ({
  locations = [],
  stateBoundariesGeoJSON,
  selectedState,
  selectedDistrict,
  selectedLocation,
  onSelectLocation,
  onSelectState,
  onInspectSpatialIntelligence,
  focusTarget,
  activeLayers,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const boundariesLayerRef = useRef<L.GeoJSON | null>(null);
  const dataLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const selectedFocusLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const markersByIdRef = useRef<Map<string, L.Marker>>(new Map());

  const [currentZoom, setCurrentZoom] = useState<number>(5);

  const onSelectLocationRef = useRef(onSelectLocation);
  onSelectLocationRef.current = onSelectLocation;

  const onSelectStateRef = useRef(onSelectState);
  onSelectStateRef.current = onSelectState;

  const onInspectSpatialIntelligenceRef = useRef(onInspectSpatialIntelligence);
  onInspectSpatialIntelligenceRef.current = onInspectSpatialIntelligence;

  // Safe array normalization
  const safeLocations = useMemo(() => {
    return Array.isArray(locations) ? locations.filter((l) => isValidCoordinate(l.latitude, l.longitude)) : [];
  }, [locations]);

  // 1. Initialize Map Container once
  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return;
    if ((containerRef.current as any)._leaflet_id) return;

    // Center over geographic India
    const map = L.map(containerRef.current, {
      center: [22.8, 80.5],
      zoom: 5,
      minZoom: 4,
      maxZoom: 18,
      zoomControl: false,
    });

    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors | KSHEMA SDMA GIS',
      maxZoom: 19,
      className: 'dark-map-tiles',
    });
    tileLayer.addTo(map);

    L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);

    // Create Dedicated Panes to enforce correct administrative GIS layer stacking order:
    // Base Tiles -> Boundaries (250) -> Risk Density / Extent (300) -> Evacuation Routes (350) -> Markers (600)
    if (!map.getPane('boundariesPane')) {
      const bPane = map.createPane('boundariesPane');
      bPane.style.zIndex = '250';
    }
    if (!map.getPane('riskRadiusPane')) {
      const rPane = map.createPane('riskRadiusPane');
      rPane.style.zIndex = '300';
    }
    if (!map.getPane('routePane')) {
      const rtPane = map.createPane('routePane');
      rtPane.style.zIndex = '350';
    }

    dataLayerGroupRef.current = L.layerGroup().addTo(map);
    selectedFocusLayerGroupRef.current = L.layerGroup().addTo(map);

    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom());
    });

    mapRef.current = map;

    // Size invalidations to guarantee viewport calculation
    const timer1 = setTimeout(() => map.invalidateSize(), 60);
    const timer2 = setTimeout(() => map.invalidateSize(), 300);
    const timer3 = setTimeout(() => map.invalidateSize(), 700);

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 2. Render State Boundary Polygons
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (boundariesLayerRef.current) {
      map.removeLayer(boundariesLayerRef.current);
      boundariesLayerRef.current = null;
    }

    if (!activeLayers.stateBoundaries || !stateBoundariesGeoJSON?.features) return;

    try {
      const boundariesLayer = L.geoJSON(stateBoundariesGeoJSON, {
        pane: 'boundariesPane',
        style: (feature: any) => {
          const stateName = feature?.properties?.name;
          const isSelected =
            selectedState &&
            selectedState !== 'ALL' &&
            selectedState.toLowerCase() === stateName?.toLowerCase();

          return {
            color: isSelected ? '#38bdf8' : '#0284c7',
            weight: isSelected ? 2.8 : 1.2,
            opacity: isSelected ? 0.95 : 0.45,
            fillColor: isSelected ? '#0284c7' : '#0369a1',
            fillOpacity: isSelected ? 0.16 : 0.04,
            dashArray: isSelected ? undefined : '3, 3',
          };
        },
        onEachFeature: (feature, layer) => {
          const stateName = feature?.properties?.name;
          const stateCode = feature?.properties?.state_code || '';
          const districtsCount = feature?.properties?.districts_count || 0;

          // Compute assessed locations breakdown in this state
          const stLocs = safeLocations.filter(
            (l) => l.state?.toLowerCase() === stateName?.toLowerCase()
          );
          const totalLocs = stLocs.length;
          const critCount = stLocs.filter((l) => (l.risk_level as string) === 'CRITICAL').length;
          const extCount = stLocs.filter((l) => (l.risk_level as string) === 'EXTREMELY HIGH' || (l.risk_level as string) === 'VERY HIGH').length;
          const highCount = stLocs.filter((l) => (l.risk_level as string) === 'HIGH').length;
          const modCount = stLocs.filter((l) => (l.risk_level as string) === 'MODERATE').length;

          let tooltipHtml = '';
          if (totalLocs > 0) {
            tooltipHtml = `
              <div style="font-family: inherit; font-size: 11px; padding: 4px 6px; color: #f8fafc; min-width: 140px; background: rgba(15, 23, 42, 0.95); border: 1px solid #38bdf8; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
                <div style="font-weight: bold; border-bottom: 1px solid rgba(56, 189, 248, 0.3); padding-bottom: 2px; margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-size: 12px;">🇮🇳 ${stateName}</span>
                  <span style="color: #38bdf8; font-size: 10px; font-weight: bold;">${stateCode}</span>
                </div>
                <div style="font-size: 10px; color: #94a3b8; margin-bottom: 3px;">
                  Assessed Locations: <strong style="color: #f1f5f9;">${totalLocs}</strong>
                </div>
                <div style="font-size: 9px; display: flex; gap: 5px; font-weight: bold; font-family: monospace;">
                  ${critCount > 0 ? `<span style="color: #f87171;">Crit: ${critCount}</span>` : ''}
                  ${extCount > 0 ? `<span style="color: #fb923c;">Extr: ${extCount}</span>` : ''}
                  ${highCount > 0 ? `<span style="color: #fde047;">High: ${highCount}</span>` : ''}
                  ${modCount > 0 ? `<span style="color: #6ee7b7;">Mod: ${modCount}</span>` : ''}
                </div>
                <div style="font-size: 8.5px; color: #38bdf8; margin-top: 4px; font-family: monospace;">
                  Click to Focus State & Filter Priority
                </div>
              </div>
            `;
          } else {
            tooltipHtml = `
              <div style="font-family: inherit; font-size: 11px; padding: 4px 6px; color: #f8fafc; min-width: 160px; background: rgba(15, 23, 42, 0.95); border: 1px solid #475569; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
                <div style="font-weight: bold; border-bottom: 1px solid rgba(148, 163, 184, 0.2); padding-bottom: 2px; margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-size: 12px;">🇮🇳 ${stateName}</span>
                  <span style="color: #94a3b8; font-size: 10px; font-weight: bold;">${stateCode}</span>
                </div>
                <div style="font-size: 9.5px; color: #f59e0b; font-weight: bold; font-family: monospace;">
                  NO ASSESSED LOCATIONS AVAILABLE
                </div>
                <div style="font-size: 8.5px; color: #64748b; margin-top: 1px;">
                  0 assessed risk locations in current dataset
                </div>
                <div style="font-size: 8.5px; color: #38bdf8; margin-top: 4px; font-family: monospace;">
                  ${districtsCount} Districts • Click to Focus State
                </div>
              </div>
            `;
          }

          layer.bindTooltip(tooltipHtml, { permanent: false, direction: 'center', opacity: 0.95 });

          layer.on({
            mouseover: (e) => {
              const l = e.target;
              const isSelected =
                selectedState &&
                selectedState !== 'ALL' &&
                selectedState.toLowerCase() === stateName?.toLowerCase();
              if (!isSelected) {
                l.setStyle({
                  weight: 2.2,
                  color: '#38bdf8',
                  opacity: 0.9,
                  fillOpacity: 0.12,
                });
              }
            },
            mouseout: (e) => {
              const l = e.target;
              const isSelected =
                selectedState &&
                selectedState !== 'ALL' &&
                selectedState.toLowerCase() === stateName?.toLowerCase();
              if (!isSelected) {
                boundariesLayer.resetStyle(l);
              }
            },
            click: () => {
              if (stateName) {
                onSelectStateRef.current(stateName);
              }
            },
          });
        },
      });

      boundariesLayer.addTo(map);
      boundariesLayerRef.current = boundariesLayer;
    } catch (e) {
      console.warn('Non-fatal error rendering boundary GeoJSON:', e);
    }
  }, [stateBoundariesGeoJSON, selectedState, activeLayers.stateBoundaries, safeLocations]);

  // 3. Zoom / Pan Map when Selected State Changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!selectedState || selectedState === 'ALL') {
      map.flyTo([22.8, 80.5], 5, { duration: 1.1 });
      return;
    }

    if (stateBoundariesGeoJSON?.features) {
      const match = stateBoundariesGeoJSON.features.find(
        (f: any) => f.properties?.name?.toLowerCase() === selectedState.toLowerCase()
      );
      if (match) {
        try {
          const tempLayer = L.geoJSON(match);
          const bounds = tempLayer.getBounds();
          if (bounds.isValid()) {
            map.flyToBounds(bounds, {
              padding: [40, 40],
              duration: 1.2,
              maxZoom: match.properties?.default_zoom || 8,
            });
            return;
          }
        } catch (e) {
          console.warn('Could not compute state bounds:', e);
        }
      }
    }

    const stateLocations = safeLocations.filter(
      (l) => l.state?.toLowerCase() === selectedState.toLowerCase()
    );
    if (stateLocations.length > 0) {
      const markers = stateLocations.map((l) => L.marker([l.latitude, l.longitude]));
      const group = L.featureGroup(markers);
      map.flyToBounds(group.getBounds(), { padding: [50, 50], duration: 1.2 });
    }
  }, [selectedState, stateBoundariesGeoJSON, safeLocations]);

  // 4. Render Risk Markers & Clusters
  useEffect(() => {
    const layerGroup = dataLayerGroupRef.current;
    const map = mapRef.current;
    if (!layerGroup || !map) return;

    layerGroup.clearLayers();
    markersByIdRef.current.clear();

    if (!activeLayers.riskLocations && !activeLayers.riskDensity) return;

    // A) Density / Heatmap overlay (if active)
    if (activeLayers.riskDensity && safeLocations.length > 0) {
      safeLocations.forEach((loc) => {
        const palette = getSeverityPalette(loc.risk_level);
        const radiusM = (loc.risk_radius_km || 3.0) * 1600;
        const densityCircle = L.circle([loc.latitude, loc.longitude], {
          radius: radiusM,
          color: palette.border,
          fillColor: palette.fill,
          fillOpacity: 0.16,
          weight: 1,
          interactive: false,
        });
        densityCircle.addTo(layerGroup);
      });
    }

    if (!activeLayers.riskLocations) return;

    // B) Zoom-Aware Visualization Strategy:
    // If zoomed out to national level (zoom <= 5) and viewing All India, cluster by state
    const isNationalZoom = currentZoom <= 5 && (!selectedState || selectedState === 'ALL');

    if (isNationalZoom) {
      // Group locations by state to form clean administrative clusters
      const stateClusters: Record<string, NationalGISLocation[]> = {};
      safeLocations.forEach((loc) => {
        const st = loc.state || 'Other';
        if (!stateClusters[st]) stateClusters[st] = [];
        stateClusters[st].push(loc);
      });

      Object.entries(stateClusters).forEach(([stName, locs]) => {
        const count = locs.length;
        const hasCritical = locs.some((l) => (l.risk_level as string) === 'CRITICAL');
        const hasExtremelyHigh = locs.some((l) => (l.risk_level as string) === 'EXTREMELY HIGH' || (l.risk_level as string) === 'VERY HIGH');
        const clusterColor = hasCritical ? '#991b1b' : hasExtremelyHigh ? '#ea580c' : '#f59e0b';
        const clusterBorder = hasCritical ? '#f87171' : hasExtremelyHigh ? '#fb923c' : '#fef08a';

        // Approximate cluster centroid
        const avgLat = locs.reduce((s, l) => s + l.latitude, 0) / count;
        const avgLng = locs.reduce((s, l) => s + l.longitude, 0) / count;

        const clusterIcon = L.divIcon({
          className: 'raksha-cluster-marker',
          html: `
            <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              ${hasCritical ? `<div style="position: absolute; width: 44px; height: 44px; background: rgba(239, 68, 68, 0.4); border-radius: 50%; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>` : ''}
              <div style="position: absolute; width: 32px; height: 32px; background: ${clusterColor}; border: 2.5px solid ${clusterBorder}; border-radius: 50%; box-shadow: 0 4px 14px rgba(0,0,0,0.7); display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <span style="font-size: 11px; font-weight: 900; color: #ffffff; font-family: monospace;">${count}</span>
              </div>
              <div style="position: absolute; bottom: -18px; background: rgba(15,23,42,0.95); border: 1px solid #38bdf8; color: #f8fafc; font-size: 9px; font-weight: bold; padding: 1px 5px; border-radius: 3px; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.6);">
                ${stName}
              </div>
            </div>
          `,
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        });

        const clusterMarker = L.marker([avgLat, avgLng], {
          icon: clusterIcon,
          zIndexOffset: 800,
          title: `${stName}: ${count} Assessed Locations`,
        });

        clusterMarker.on('click', () => {
          onSelectStateRef.current(stName);
        });

        clusterMarker.addTo(layerGroup);
      });
    } else {
      // Individual Location Markers at State, District, and Detailed zoom
      safeLocations.forEach((loc) => {
        const isSelected = selectedLocation?.id === loc.id;
        const palette = getSeverityPalette(loc.risk_level);
        const isCritical = loc.risk_level === 'CRITICAL';

        const markerIcon = L.divIcon({
          className: `raksha-risk-marker raksha-marker-${loc.id}`,
          html: `
            <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              ${
                isCritical
                  ? `<div style="position: absolute; width: 34px; height: 34px; background: ${palette.glow}; border-radius: 50%; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
                  : ''
              }
              ${
                isSelected
                  ? `<div style="position: absolute; width: 36px; height: 36px; border: 2px dashed #38bdf8; border-radius: 50%; animation: spin 8s linear infinite;"></div>`
                  : ''
              }
              <div style="position: absolute; width: ${isSelected ? '22px' : '18px'}; height: ${
            isSelected ? '22px' : '18px'
          }; background: ${palette.fill}; border: 2.5px solid #ffffff; border-radius: 50%; box-shadow: 0 0 14px ${palette.fill}; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 8px; font-weight: 900; color: #ffffff; font-family: monospace;">
                  ${loc.risk_score ? Math.round(loc.risk_score) : '!'}
                </span>
              </div>
            </div>
          `,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });

        const marker = L.marker([loc.latitude, loc.longitude], {
          icon: markerIcon,
          zIndexOffset: isSelected ? 1500 : isCritical ? 1000 : 500,
          title: `${palette.label} Risk: ${loc.location_name}, ${loc.district}, ${loc.state}`,
        });

        const popupDiv = document.createElement('div');
        popupDiv.style.padding = '4px 6px';
        popupDiv.style.fontFamily = 'inherit';
        popupDiv.style.color = '#f1f5f9';
        popupDiv.style.minWidth = '220px';

        popupDiv.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.12); padding-bottom:5px; margin-bottom:6px;">
            <span style="font-size:9px; font-weight:bold; background:${palette.badgeBg}; color:${palette.badgeText}; border:1px solid ${palette.badgeBorder}; padding:1px 6px; border-radius:3px; letter-spacing:0.04em;">
              ${palette.label} RISK
            </span>
            <span style="font-size:10px; font-weight:bold; color:#38bdf8; font-family:monospace;">
              ${loc.risk_score ? loc.risk_score.toFixed(1) : 'N/A'} / 100
            </span>
          </div>

          <div style="font-size:13px; font-weight:bold; color:#f8fafc; margin-bottom:2px;">
            📍 ${loc.location_name}
          </div>
          <div style="font-size:10px; color:#94a3b8; margin-bottom:6px;">
            ${loc.district}, ${loc.state}
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px; background:rgba(15,23,42,0.8); border:1px solid rgba(255,255,255,0.08); padding:6px; border-radius:4px; margin-bottom:8px; font-size:10px;">
            <div>
              <span style="color:#64748b; display:block; font-size:9px;">POPULATION</span>
              <strong style="color:#f1f5f9; font-size:11px;">${loc.population ? loc.population.toLocaleString('en-IN') : 'N/A'}</strong>
            </div>
            <div>
              <span style="color:#64748b; display:block; font-size:9px;">PRIMARY HAZARD</span>
              <strong style="color:#f59e0b; font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block;" title="${loc.primary_hazard}">
                ${loc.primary_hazard}
              </strong>
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; font-size:9px; color:#64748b; margin-bottom:8px;">
            <span>Last Assessed: <b style="color:#94a3b8;">${loc.assessment_date || 'Recent'}</b></span>
            <span>Radius: <b style="color:#38bdf8;">${loc.risk_radius_km ? `${loc.risk_radius_km} km` : 'Point'}</b></span>
          </div>

          <button id="btn-inspect-loc-${loc.id}" style="width:100%; background:#0284c7; color:#ffffff; border:none; padding:6px 8px; border-radius:4px; font-size:11px; font-weight:bold; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px;">
            <span>INSPECT SPATIAL INTELLIGENCE</span> →
          </button>
        `;

        const popup = L.popup({
          offset: [0, -14],
          closeButton: false,
          className: 'raksha-custom-popup',
        }).setContent(popupDiv);

        marker.bindPopup(popup);

        marker.on('click', () => {
          marker.openPopup();
          onSelectLocationRef.current(loc);
        });

        marker.on('popupopen', () => {
          const btn = popupDiv.querySelector(`#btn-inspect-loc-${loc.id}`) as HTMLButtonElement | null;
          if (btn) {
            btn.onclick = (e) => {
              e.preventDefault();
              e.stopPropagation();
              marker.closePopup();
              if (onInspectSpatialIntelligenceRef.current) {
                onInspectSpatialIntelligenceRef.current(loc);
              } else {
                onSelectLocationRef.current(loc);
              }
            };
          }
        });

        marker.addTo(layerGroup);
        markersByIdRef.current.set(loc.id, marker);
      });
    }
  }, [safeLocations, activeLayers.riskLocations, activeLayers.riskDensity, currentZoom, selectedState]);

  // Handle focusTarget changes (programmatic map zoom/pan)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusTarget) return;
    map.flyTo([focusTarget.lat, focusTarget.lng], focusTarget.zoom || 13, { duration: 1.2 });
  }, [focusTarget]);

  // 5. Render Selected Location Details (Radius, Safe Site Marker, Route Corridor)
  useEffect(() => {
    const focusGroup = selectedFocusLayerGroupRef.current;
    const map = mapRef.current;
    if (!focusGroup || !map) return;

    focusGroup.clearLayers();

    if (!selectedLocation || !isValidCoordinate(selectedLocation.latitude, selectedLocation.longitude)) return;

    const loc = selectedLocation;
    const palette = getSeverityPalette(loc.risk_level);

    map.flyTo([loc.latitude, loc.longitude], Math.max(map.getZoom(), 12), { duration: 0.8 });

    const targetMarker = markersByIdRef.current.get(loc.id);
    if (targetMarker) {
      map.once('moveend', () => {
        targetMarker.openPopup();
      });
      setTimeout(() => {
        targetMarker.openPopup();
      }, 300);
    }

    // A) Risk Radius Circle / Footprint
    if (activeLayers.riskZones && loc.risk_radius_km && loc.risk_radius_km > 0) {
      const radiusMeters = loc.risk_radius_km * 1000;

      const riskCircle = L.circle([loc.latitude, loc.longitude], {
        radius: radiusMeters,
        color: palette.border,
        fillColor: palette.fill,
        fillOpacity: 0.18,
        weight: 2.2,
        dashArray: '6, 6',
      });

      riskCircle.bindTooltip(
        `<div style="font-family: inherit; font-size: 10px; color: #f8fafc; font-weight: bold;">
          ⚠️ ${loc.location_name} Hazard Perimeter (${loc.risk_radius_km} km)
          <div style="font-size: 9px; color: #94a3b8; font-weight: normal;">
            Assessed Primary Hazard: ${loc.primary_hazard}
          </div>
        </div>`,
        { permanent: false, direction: 'top' }
      );
      riskCircle.addTo(focusGroup);

      const northLat = loc.latitude + radiusMeters / 111320.0;
      const radiusTag = L.divIcon({
        className: 'raksha-radius-tag',
        html: `
          <div style="background: rgba(15, 23, 42, 0.95); border: 1px solid ${palette.border}; color: ${palette.badgeText}; font-size: 9px; font-weight: bold; padding: 2px 6px; border-radius: 4px; white-space: nowrap; box-shadow: 0 4px 10px rgba(0,0,0,0.6); display: flex; align-items: center; gap: 4px;">
            <span>⚠️ ${loc.risk_radius_km} KM HAZARD EXTENT</span>
          </div>
        `,
        iconSize: [160, 20],
        iconAnchor: [80, 10],
      });
      L.marker([northLat, loc.longitude], { icon: radiusTag, interactive: false }).addTo(focusGroup);
    }

    // B) Safe Relocation Site Marker & Route Corridor
    if (activeLayers.relocationSites && loc.recommended_safe_site) {
      const site = loc.recommended_safe_site;
      if (isValidCoordinate(site.latitude, site.longitude)) {
        const safeIcon = L.divIcon({
          className: 'raksha-safe-site-marker',
          html: `
            <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              <div style="position: absolute; width: 34px; height: 34px; background: rgba(16, 185, 129, 0.35); border-radius: 50%; animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;"></div>
              <div style="position: absolute; width: 22px; height: 22px; background: #10b981; border: 2.5px solid #ffffff; border-radius: 6px; box-shadow: 0 0 14px #10b981; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 11px;">🛡️</span>
              </div>
            </div>
          `,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });

        const safeMarker = L.marker([site.latitude, site.longitude], {
          icon: safeIcon,
          zIndexOffset: 1200,
          title: `Safe Relocation Hub: ${site.name}`,
        });

        const googleNavUrl = `https://www.google.com/maps/dir/?api=1&origin=${loc.latitude},${loc.longitude}&destination=${site.latitude},${site.longitude}`;

        const safePopupHtml = `
          <div style="padding: 4px 6px; font-family: inherit; color: #f1f5f9; min-width: 230px;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.12); padding-bottom:5px; margin-bottom:6px;">
              <span style="font-size:9px; font-weight:bold; background:#064e3b; color:#6ee7b7; border:1px solid #059669; padding:1px 6px; border-radius:3px;">
                RECOMMENDED SAFE SITE
              </span>
              <span style="font-size:10px; font-weight:bold; color:#10b981;">
                Safety ${site.safety_score}%
              </span>
            </div>

            <div style="font-size:13px; font-weight:bold; color:#f8fafc; margin-bottom:2px;">
              🛡️ ${site.name}
            </div>
            <div style="font-size:10px; color:#94a3b8; margin-bottom:6px;">
              ${site.district}, ${site.state}
            </div>

            <div style="background:rgba(15,23,42,0.8); border:1px solid rgba(255,255,255,0.08); padding:6px; border-radius:4px; margin-bottom:8px; font-size:10px; space-y:4px;">
              <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
                <span style="color:#94a3b8;">Available Capacity:</span>
                <strong style="color:#6ee7b7;">${site.capacity_available?.toLocaleString('en-IN') || 0} / ${site.capacity_total?.toLocaleString('en-IN') || 0} spaces</strong>
              </div>
              <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
                <span style="color:#94a3b8;">Occupancy:</span>
                <strong style="color:#fde047;">${site.capacity_utilization_pct || 0}% occupied</strong>
              </div>
              <div style="display:flex; justify-content:space-between;">
                <span style="color:#94a3b8;">Distance / Direction:</span>
                <strong style="color:#38bdf8;">${site.distance_km} km ${site.direction}</strong>
              </div>
            </div>

            <a href="${googleNavUrl}" target="_blank" rel="noopener noreferrer" style="display:block; text-align:center; background:#059669; color:#ffffff; text-decoration:none; padding:6px 8px; border-radius:4px; font-size:11px; font-weight:bold; margin-top:6px;">
              GET DIRECTIONS (MAPS) 🗺️
            </a>
          </div>
        `;

        safeMarker.bindPopup(safePopupHtml);
        safeMarker.addTo(focusGroup);

        const routeLine = L.polyline(
          [
            [loc.latitude, loc.longitude],
            [site.latitude, site.longitude],
          ],
          {
            color: '#10b981',
            weight: 3.5,
            dashArray: '8, 8',
            opacity: 0.95,
          }
        );

        routeLine.bindTooltip(
          `<div style="font-family: inherit; font-size: 10px; font-weight: bold; color: #6ee7b7;">
            SAFE EVACUATION CORRIDOR
            <div style="color: #f1f5f9; font-weight: normal; font-size: 9px;">
              ${site.distance_km} km ${site.direction} (${site.bearing_degrees}°) to ${site.name}
            </div>
          </div>`,
          { permanent: false, direction: 'center' }
        );

        routeLine.addTo(focusGroup);
      }
    }
  }, [selectedLocation, activeLayers.riskZones, activeLayers.relocationSites]);

  return (
    <div
      className="relative w-full h-full min-h-[520px] select-none"
      style={{ width: '100%', height: '100%', minHeight: '520px' }}
    >
      <div
        ref={containerRef}
        className="w-full h-full min-h-[520px] bg-slate-950"
        style={{ width: '100%', height: '100%', minHeight: '520px' }}
      />
    </div>
  );
};
