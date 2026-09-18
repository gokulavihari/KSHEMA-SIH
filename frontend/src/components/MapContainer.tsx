import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Habitation, CandidateSite, LocationAssessment } from '../types';

interface MapProps {
  userLocation?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    displayName: string;
    source?: string;
  };
  assessment?: LocationAssessment | null;
  habitations?: Habitation[];
  candidateSites?: CandidateSite[];
  redZonesGeoJSON?: any;
  riversGeoJSON?: any;
  roadsGeoJSON?: any;
  infrastructure?: {
    hospitals?: any[];
    schools?: any[];
    emergency_centres?: any[];
  };
  selectedHabitationId?: string;
  onSelectHabitation?: (hab: Habitation) => void;
  onSelectSite?: (site: CandidateSite) => void;
  onMapClick?: (lat: number, lon: number) => void;
  onSelectAssessmentArea?: () => void;
  onViewFullAssessment?: () => void;
  showRedZones?: boolean;
  showSites?: boolean;
  showRivers?: boolean;
  showRoads?: boolean;
  showHospitals?: boolean;
  showSchools?: boolean;
  showEmergencyCentres?: boolean;
  activeRelocationRoute?: {
    from: { latitude: number; longitude: number; label: string };
    to: { latitude: number; longitude: number; label: string };
  };
}

const getRiskColor = (level?: string | null, score?: number | null) => {
  if (level) {
    const lvl = level.toUpperCase();
    if (lvl === 'LOW') return { stroke: '#059669', fill: '#10b981', label: 'LOW' };
    if (lvl === 'MODERATE') return { stroke: '#d97706', fill: '#f59e0b', label: 'MODERATE' };
    if (lvl === 'HIGH') return { stroke: '#ea580c', fill: '#f97316', label: 'HIGH' };
    if (lvl === 'VERY HIGH') return { stroke: '#dc2626', fill: '#ef4444', label: 'VERY HIGH' };
    if (lvl === 'CRITICAL') return { stroke: '#7f1d1d', fill: '#991b1b', label: 'CRITICAL' };
    if (lvl === 'UNKNOWN' || lvl === 'INSUFFICIENT_EVIDENCE') return { stroke: '#4b5563', fill: '#6b7280', label: 'INSUFFICIENT EVIDENCE' };
  }
  if (score !== null && score !== undefined) {
    if (score <= 20) return { stroke: '#059669', fill: '#10b981', label: 'LOW' };
    if (score <= 40) return { stroke: '#d97706', fill: '#f59e0b', label: 'MODERATE' };
    if (score <= 60) return { stroke: '#ea580c', fill: '#f97316', label: 'HIGH' };
    if (score <= 80) return { stroke: '#dc2626', fill: '#ef4444', label: 'VERY HIGH' };
    return { stroke: '#7f1d1d', fill: '#991b1b', label: 'CRITICAL' };
  }
  return { stroke: '#4b5563', fill: '#6b7280', label: 'INSUFFICIENT EVIDENCE' };
};

export const MapContainer: React.FC<MapProps> = ({
  userLocation,
  assessment,
  habitations = [],
  candidateSites = [],
  redZonesGeoJSON,
  riversGeoJSON,
  roadsGeoJSON,
  infrastructure,
  selectedHabitationId,
  onSelectHabitation,
  onSelectSite,
  onMapClick,
  onSelectAssessmentArea,
  onViewFullAssessment,
  showRedZones = true,
  showSites = true,
  showRivers = true,
  showRoads = true,
  showHospitals = true,
  showSchools = true,
  showEmergencyCentres = true,
  activeRelocationRoute,
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const onMapClickRef = useRef(onMapClick);
  const scaleControlRef = useRef<L.Control.Scale | null>(null);

  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!mapRef.current) {
      // Initialize Leaflet Map
      const map = L.map(containerRef.current, {
        center: [userLocation?.latitude || 30.45, userLocation?.longitude || 79.45],
        zoom: 12,
        zoomControl: true,
      });

      // Map click listener for coordinate selection with confirmation card
      map.on('click', (e: L.LeafletMouseEvent) => {
        const clickedLat = e.latlng.lat;
        const clickedLon = e.latlng.lng;

        const popupDiv = document.createElement('div');
        popupDiv.className = 'p-1 text-slate-900 font-sans';
        popupDiv.style.minWidth = '210px';
        popupDiv.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:4px; margin-bottom:6px;">
            <span style="font-size:10px; font-weight:bold; background:#dbeafe; color:#1e40af; padding:1px 6px; border-radius:3px;">MAP SELECTION</span>
            <span style="font-size:10px; color:#64748b;">Source: <b>MAP</b></span>
          </div>
          <strong style="color:#0f172a; font-size:12px; display:block;">📍 Selected Map Location</strong>
          <div style="font-family:monospace; font-size:11px; color:#334155; margin-top:2px;">
            ${clickedLat.toFixed(6)}° N, ${clickedLon.toFixed(6)}° E
          </div>
          <div style="display:flex; gap:6px; margin-top:8px;">
            <button id="btn-confirm-map-assess" style="flex:1; background:#2563eb; color:white; border:none; border-radius:4px; padding:6px 10px; font-size:11px; font-weight:bold; cursor:pointer;">
              ASSESS THIS LOCATION
            </button>
            <button id="btn-cancel-map-assess" style="background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; border-radius:4px; padding:6px 8px; font-size:11px; font-weight:bold; cursor:pointer;">
              CANCEL
            </button>
          </div>
        `;

        const clickPopup = L.popup({ closeButton: false, offset: [0, -5] })
          .setLatLng(e.latlng)
          .setContent(popupDiv)
          .openOn(map);

        setTimeout(() => {
          const btnAssess = popupDiv.querySelector('#btn-confirm-map-assess') as HTMLButtonElement | null;
          const btnCancel = popupDiv.querySelector('#btn-cancel-map-assess') as HTMLButtonElement | null;

          if (btnAssess) {
            btnAssess.onclick = () => {
              map.closePopup(clickPopup);
              if (onMapClickRef.current) {
                onMapClickRef.current(clickedLat, clickedLon);
              }
            };
          }
          if (btnCancel) {
            btnCancel.onclick = () => {
              map.closePopup(clickPopup);
            };
          }
        }, 50);
      });

      // OpenStreetMap Tile Layer with Command Center Dark Styling
      const osmTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | AASHRAY GIS',
        maxZoom: 19,
        className: 'dark-map-tiles',
      });

      osmTileLayer.on('tileerror', (e) => {
        console.warn('OSM tile load warning (non-fatal, map vector overlays intact):', e);
      });

      osmTileLayer.addTo(map);

      // Add GIS Scale Bar (Metric meters / km)
      scaleControlRef.current = L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);

      layerGroupRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
    }

    const map = mapRef.current;
    const layerGroup = layerGroupRef.current;

    if (!layerGroup) return;
    layerGroup.clearLayers();

    // 0. Render Base Environmental GeoJSON Layers (Rivers & Roads)
    if (showRivers && riversGeoJSON && riversGeoJSON.features) {
      L.geoJSON(riversGeoJSON, {
        style: {
          color: '#38bdf8',
          weight: 3,
          opacity: 0.85,
        },
        onEachFeature: (feature, layer) => {
          layer.bindTooltip(
            `<b>RIVER DRAINAGE: ${feature.properties.name}</b><br/>Type: ${feature.properties.type}`,
            { permanent: false, direction: 'top' }
          );
        },
      }).addTo(layerGroup);
    }

    if (showRoads && roadsGeoJSON && roadsGeoJSON.features) {
      L.geoJSON(roadsGeoJSON, {
        style: {
          color: '#f59e0b',
          weight: 2.5,
          dashArray: '6, 4',
          opacity: 0.8,
        },
        onEachFeature: (feature, layer) => {
          layer.bindTooltip(
            `<b>ROAD NETWORK: ${feature.properties.name}</b><br/>Category: ${feature.properties.type}`,
            { permanent: false, direction: 'top' }
          );
        },
      }).addTo(layerGroup);
    }

    // 1. Render Official Hazard Red-Zone Polygons (Distinct from Local Assessment Area)
    if (showRedZones && redZonesGeoJSON && redZonesGeoJSON.features) {
      L.geoJSON(redZonesGeoJSON, {
        style: () => ({
          color: '#ef4444',
          weight: 2,
          opacity: 0.8,
          dashArray: '5, 5',
          fillColor: '#dc2626',
          fillOpacity: 0.25,
        }),
        onEachFeature: (feature, layer) => {
          layer.bindTooltip(
            `<b>OFFICIAL HAZARD RED ZONE</b><br/>Habitation: ${feature.properties.habitation_name}<br/>Risk Score: ${feature.properties.risk_score}`,
            { permanent: false, direction: 'top' }
          );
        },
      }).addTo(layerGroup);
    }

    // 2. Render Selected Location Risk Assessment Area & Markers
    if (userLocation && userLocation.latitude && userLocation.longitude) {
      const lat = userLocation.latitude;
      const lon = userLocation.longitude;

      map.setView([lat, lon], map.getZoom() < 11 ? 12 : map.getZoom());

      const radiusM = assessment?.assessment_radius_m || 1000;
      const radiusKm = (radiusM / 1000).toFixed(1);
      const riskColor = getRiskColor(assessment?.risk_level, assessment?.risk_score);

      const coveragePct = assessment?.coverage_percentage ?? assessment?.evidence_coverage ?? 100;
      const isPartial = assessment?.assessment_mode === 'PARTIAL_EVIDENCE' || (coveragePct < 40);
      const isUnknown = assessment?.risk_level === 'UNKNOWN' || assessment?.risk_score === null || assessment?.risk_score === undefined;

      const areaTitle = isUnknown
        ? 'INSUFFICIENT EVIDENCE — ASSESSMENT AREA'
        : (isPartial ? 'PARTIAL EVIDENCE — ASSESSMENT AREA' : 'LOCAL ASSESSMENT AREA');

      // A) Data-Driven Model Assessment Radius Circle
      const assessmentCircle = L.circle([lat, lon], {
        radius: radiusM,
        color: riskColor.stroke,
        fillColor: riskColor.fill,
        fillOpacity: isPartial || isUnknown ? 0.12 : 0.20,
        weight: isPartial ? 2 : 2.5,
        dashArray: isPartial ? '6, 4' : undefined,
        interactive: true,
      });

      assessmentCircle.addTo(layerGroup);

      // B) Separate GPS Accuracy Circle (Blue dashed, non-blocking)
      if (userLocation.accuracy && userLocation.accuracy > 0) {
        const accuracyCircle = L.circle([lat, lon], {
          radius: Math.max(50, userLocation.accuracy),
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.12,
          weight: 1.5,
          dashArray: '4, 4',
          interactive: false,
        });

        accuracyCircle.addTo(layerGroup);
      }

      // C) Radius Distance Text Label on Map Edge
      const northLat = lat + (radiusM / 111320.0);
      const radiusLabelIcon = L.divIcon({
        className: 'custom-radius-label',
        html: `
          <div style="background: rgba(15, 23, 42, 0.92); color: ${riskColor.fill}; border: 1px solid ${riskColor.stroke}; border-radius: 4px; padding: 3px 8px; font-size: 10px; font-weight: bold; white-space: nowrap; font-family: sans-serif; box-shadow: 0 2px 8px rgba(0,0,0,0.7); text-align: center;">
            ${areaTitle} (${radiusKm} km)
          </div>
        `,
        iconSize: [220, 24],
        iconAnchor: [110, 12]
      });
      L.marker([northLat, lon], { icon: radiusLabelIcon, interactive: false }).addTo(layerGroup);

      // D) Prominent Selected Location Marker with Pulse Effect
      const rawSource = userLocation.source || 'GPS';
      const sourceTag = rawSource.includes('GPS') ? 'GPS LOCATION' : (rawSource.includes('MAP') ? 'MAP LOCATION' : 'MANUAL LOCATION');

      const userIcon = L.divIcon({
        className: 'custom-user-location-marker',
        html: `
          <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 32px; height: 32px; background: ${riskColor.fill}45; border-radius: 50%; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: absolute; top: 6px; left: 6px; width: 20px; height: 20px; background: ${riskColor.fill}; border: 3px solid #ffffff; border-radius: 50%; box-shadow: 0 0 12px ${riskColor.fill}ee;"></div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const hasOverlaps = assessment?.hazard_overlaps && assessment.hazard_overlaps.length > 0;
      const overlapsNotice = hasOverlaps
        ? `<div style="margin-top:6px; background:#450a0a; border:1px solid #dc2626; color:#fca5a5; padding:4px 6px; border-radius:4px; font-size:11px;">
            ⚠️ <b>HAZARD OVERLAP DETECTED</b><br/>${assessment.hazard_overlaps!.map(h => h.name).join(', ')}
           </div>`
        : `<div style="margin-top:4px; color:#64748b; font-size:10px;">No mapped hazard polygon overlap detected in available datasets.</div>`;

      const markerPopupContainer = document.createElement('div');
      markerPopupContainer.style.padding = '4px';
      markerPopupContainer.style.fontSize = '12px';
      markerPopupContainer.style.maxWidth = '260px';
      markerPopupContainer.style.color = '#0f172a';
      markerPopupContainer.style.fontFamily = 'sans-serif';

      markerPopupContainer.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #cbd5e1; padding-bottom:4px; margin-bottom:6px;">
          <span style="font-size:10px; font-weight:bold; background:#e2e8f0; color:#334155; padding:1px 5px; border-radius:3px;">${sourceTag}</span>
          <span style="font-size:10px; color:#64748b;">${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <strong style="color: #0f172a; font-size: 13px; display:block;">📍 ${userLocation.displayName}</strong>
        <div style="font-size:11px; color:#475569; margin-top:2px;">${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E</div>
        
        <div style="margin-top:8px; display:grid; grid-template-columns: 1fr 1fr; gap:4px; background:#f8fafc; padding:6px; border-radius:6px; border:1px solid #e2e8f0;">
          <div>
            <span style="font-size:9px; color:#64748b; font-weight:bold; display:block; text-transform:uppercase;">RISK ASSESSMENT</span>
            <b style="color:${riskColor.stroke}; font-size:13px;">${assessment?.risk_score !== null && assessment?.risk_score !== undefined ? `${assessment.risk_score} / 100` : 'N/A'}</b>
            <span style="display:block; font-size:10px; font-weight:bold; color:${riskColor.stroke};">${riskColor.label}</span>
          </div>
          <div>
            <span style="font-size:9px; color:#64748b; font-weight:bold; display:block; text-transform:uppercase;">VULNERABILITY</span>
            <b style="color:#2563eb; font-size:13px;">${assessment?.vulnerability_score !== null && assessment?.vulnerability_score !== undefined ? `${assessment.vulnerability_score} / 100` : 'N/A'}</b>
            <span style="display:block; font-size:10px; font-weight:bold; color:#2563eb;">${assessment?.vulnerability_level || 'N/A'}</span>
          </div>
        </div>

        <div style="margin-top:6px; font-size:11px;">
          <span style="color:#64748b;">Dominant Hazard:</span> <b style="color:#0f172a;">${assessment?.dominant_hazard || 'Slope instability'}</b>
        </div>
        
        <div style="margin-top:4px; display:flex; justify-content:space-between; font-size:10px; color:#475569; background:#f1f5f9; padding:4px 6px; border-radius:4px;">
          <span>Assessment Area: <b>${radiusKm} km</b></span>
          <span>GPS Accuracy: <b>±${Math.round(userLocation.accuracy)} m</b></span>
        </div>

        <div style="margin-top:4px; display:flex; justify-content:space-between; font-size:10px; color:#475569;">
          <span>Evidence Coverage: <b>${coveragePct}%</b></span>
          <span>Confidence: <b>${assessment?.confidence || 0}%</b></span>
        </div>

        ${overlapsNotice}
      `;

      if (onViewFullAssessment) {
        const btn = document.createElement('button');
        btn.innerText = 'VIEW FULL ASSESSMENT';
        btn.style.marginTop = '8px';
        btn.style.width = '100%';
        btn.style.backgroundColor = '#1e40af';
        btn.style.color = '#ffffff';
        btn.style.border = 'none';
        btn.style.borderRadius = '4px';
        btn.style.padding = '6px 10px';
        btn.style.fontSize = '11px';
        btn.style.fontWeight = 'bold';
        btn.style.cursor = 'pointer';
        btn.onclick = () => onViewFullAssessment();
        markerPopupContainer.appendChild(btn);
      }

      const marker = L.marker([lat, lon], { icon: userIcon });
      marker.bindPopup(markerPopupContainer);
      assessmentCircle.bindPopup(markerPopupContainer);
      marker.addTo(layerGroup);
    }

    // 3. Render Infrastructure Facilities
    if (showHospitals && infrastructure?.hospitals) {
      infrastructure.hospitals.forEach((h) => {
        const marker = L.circleMarker([h.latitude, h.longitude], {
          radius: 6,
          fillColor: '#ec4899',
          color: '#ffffff',
          weight: 1.5,
          opacity: 1,
          fillOpacity: 0.9,
        });
        marker.bindTooltip(`<b>HOSPITAL: ${h.name}</b><br/>Beds: ${h.beds} | ICU: ${h.icu_available ? 'Yes' : 'No'}`);
        marker.addTo(layerGroup);
      });
    }

    if (showSchools && infrastructure?.schools) {
      infrastructure.schools.forEach((sch) => {
        const marker = L.circleMarker([sch.latitude, sch.longitude], {
          radius: 6,
          fillColor: '#a855f7',
          color: '#ffffff',
          weight: 1.5,
          opacity: 1,
          fillOpacity: 0.9,
        });
        marker.bindTooltip(`<b>SCHOOL: ${sch.name}</b><br/>Student Cap: ${sch.capacity}`);
        marker.addTo(layerGroup);
      });
    }

    if (showEmergencyCentres && infrastructure?.emergency_centres) {
      infrastructure.emergency_centres.forEach((em) => {
        const marker = L.circleMarker([em.latitude, em.longitude], {
          radius: 7,
          fillColor: '#6366f1',
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
        });
        marker.bindTooltip(`<b>EMERGENCY HUB: ${em.name}</b><br/>Teams Deployed: ${em.teams_deployed}`);
        marker.addTo(layerGroup);
      });
    }

    // 4. Render Candidate Relocation Sites (Safe vs Rejected)
    if (showSites && candidateSites.length > 0) {
      candidateSites.forEach((site) => {
        const isSafe = site.is_safe;
        const color = isSafe ? '#10b981' : '#f43f5e';

        const siteMarker = L.circleMarker([site.latitude, site.longitude], {
          radius: 9,
          fillColor: color,
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.85,
        });

        const popupHtml = `
          <div style="font-size:12px; font-family:sans-serif; padding:4px;">
            <div style="font-weight:bold; color:${color}; font-size:13px;">${site.name}</div>
            <div style="margin-top:2px; color:#cbd5e1;">Type: <b>${site.site_type}</b></div>
            <div style="margin-top:2px;">Status: <b>${isSafe ? 'ELIGIBLE SAFE SITE' : 'REJECTED (UNSAFE)'}</b></div>
            ${isSafe ? `
              <div style="margin-top:4px; color:#34d399;">Effective Capacity: <b>${site.capacity?.effective_capacity || 0} persons</b></div>
              <div style="margin-top:2px; color:#fbbf24;">Bottleneck: <b>${site.capacity?.bottleneck || 'None'}</b></div>
              <div style="margin-top:2px;">Safety Score: <b>${site.safety_score}/100</b></div>
            ` : `
              <div style="margin-top:4px; color:#f87171; font-weight:bold;">${site.rejection_reason || 'Unsafe Hazard Zone'}</div>
            `}
          </div>
        `;

        siteMarker.bindPopup(popupHtml);
        siteMarker.on('click', () => {
          if (onSelectSite) onSelectSite(site);
        });
        siteMarker.addTo(layerGroup);
      });
    }

    // 5. Render Habitations
    habitations.forEach((hab) => {
      let color = '#22c55e'; // LOW
      if (hab.risk_score >= 81.0) color = '#ef4444'; // CRITICAL
      else if (hab.risk_score >= 61.0) color = '#f97316'; // VERY HIGH
      else if (hab.risk_score >= 41.0) color = '#f59e0b'; // HIGH
      else if (hab.risk_score >= 21.0) color = '#eab308'; // MODERATE

      const isSelected = hab.id === selectedHabitationId;
      const marker = L.circleMarker([hab.latitude, hab.longitude], {
        radius: isSelected ? 12 : 8,
        fillColor: color,
        color: isSelected ? '#ffffff' : '#000000',
        weight: isSelected ? 3 : 1.5,
        opacity: 1,
        fillOpacity: 0.9,
      });

      const popupContent = document.createElement('div');
      popupContent.style.padding = '4px';
      popupContent.style.fontSize = '12px';
      popupContent.innerHTML = `
        <div style="font-weight:bold; font-size:14px; color:#f8fafc; border-bottom:1px solid #334155; padding-bottom:4px;">
          ${hab.name}
        </div>
        <div style="margin-top:6px; display:flex; justify-content:space-between;">
          <span style="color:#94a3b8;">Population:</span>
          <b style="color:#f8fafc;">${hab.population} residents</b>
        </div>
        <div style="margin-top:2px; display:flex; justify-content:space-between;">
          <span style="color:#94a3b8;">Risk Score:</span>
          <b style="color:${color};">${hab.risk_score}/100 (${hab.risk_level})</b>
        </div>
        <div style="margin-top:2px; display:flex; justify-content:space-between;">
          <span style="color:#94a3b8;">Relocation Priority:</span>
          <b style="color:${hab.relocation_priority === 'IMMEDIATE' ? '#ef4444' : '#f59e0b'};">${hab.relocation_priority}</b>
        </div>
        <div style="margin-top:2px; display:flex; justify-content:space-between;">
          <span style="color:#94a3b8;">Dominant Hazard:</span>
          <b style="color:#cbd5e1;">${hab.dominant_hazard}</b>
        </div>
      `;

      const btn = document.createElement('button');
      btn.innerText = 'SELECT & GENERATE RELOCATION';
      btn.style.marginTop = '8px';
      btn.style.width = '100%';
      btn.style.backgroundColor = '#2563eb';
      btn.style.color = '#ffffff';
      btn.style.border = 'none';
      btn.style.borderRadius = '4px';
      btn.style.padding = '6px 10px';
      btn.style.fontWeight = 'bold';
      btn.style.cursor = 'pointer';
      btn.onclick = () => {
        if (onSelectHabitation) onSelectHabitation(hab);
      };

      popupContent.appendChild(btn);
      marker.bindPopup(popupContent);
      marker.addTo(layerGroup);
    });

    // 6. Render Active Polyline for Recommended Relocation Route
    if (activeRelocationRoute && activeRelocationRoute.from && activeRelocationRoute.to) {
      const latlngs: L.LatLngExpression[] = [
        [activeRelocationRoute.from.latitude, activeRelocationRoute.from.longitude],
        [activeRelocationRoute.to.latitude, activeRelocationRoute.to.longitude]
      ];
      const routeLine = L.polyline(latlngs, {
        color: '#10b981',
        weight: 3.5,
        dashArray: '8, 8',
        opacity: 0.95
      }).addTo(layerGroup);

      routeLine.bindTooltip(`<b>RELOCATION ROUTE</b><br/>From: ${activeRelocationRoute.from.label}<br/>To: ${activeRelocationRoute.to.label}`, {
        permanent: false,
        direction: 'center'
      });
    }

  }, [
    userLocation, assessment, habitations, candidateSites, redZonesGeoJSON, riversGeoJSON, roadsGeoJSON,
    infrastructure, selectedHabitationId, showRedZones, showSites, showRivers,
    showRoads, showHospitals, showSchools, showEmergencyCentres,
    activeRelocationRoute, onSelectSite, onSelectHabitation, onSelectAssessmentArea, onViewFullAssessment
  ]);

  return (
    <div className="relative w-full h-full min-h-[450px]">
      <div ref={containerRef} className="w-full h-full rounded-lg overflow-hidden border border-command-border shadow-inner" />
    </div>
  );
};
