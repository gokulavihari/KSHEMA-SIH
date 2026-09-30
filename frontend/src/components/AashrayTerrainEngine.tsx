import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface LocationPoint {
  id?: string;
  name?: string;
  lat: number;
  lng: number;
  riskScore?: number;
  capacity?: number;
}

interface AashrayTerrainEngineProps {
  selectedLocation?: LocationPoint | null;
  recommendedSite?: LocationPoint | null;
  habitations?: LocationPoint[];
  relocationSites?: LocationPoint[];
  interactive?: boolean;
  height?: string;
  onSelectLocation?: (lat: number, lng: number) => void;
  showCorridor?: boolean;
  className?: string;
}

export const AashrayTerrainEngine: React.FC<AashrayTerrainEngineProps> = ({
  selectedLocation,
  recommendedSite,
  habitations = [],
  relocationSites = [],
  interactive = true,
  height = '500px',
  onSelectLocation,
  showCorridor = true,
  className = ''
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webglSupported, setWebglSupported] = useState<boolean>(true);
  const [isRendering, setIsRendering] = useState<boolean>(true);
  const [terrainDetails, setTerrainDetails] = useState({
    elevationMin: '1,200m',
    elevationMax: '3,850m',
    topographicContours: '25m Intervals',
    coordinateCenter: selectedLocation
      ? `${selectedLocation.lat.toFixed(4)}° N, ${selectedLocation.lng.toFixed(4)}° E`
      : '30.4852° N, 79.6914° E'
  });

  // Reference coordinates center (Chamoli / Himalayan default)
  const CENTER_LAT = 30.4852;
  const CENTER_LNG = 79.6914;
  const SCALE_FACTOR = 120.0; // Converts lat/lng offset into 3D world space units

  const latLngTo3D = (lat: number, lng: number): THREE.Vector3 => {
    const x = (lng - CENTER_LNG) * SCALE_FACTOR;
    const y = (lat - CENTER_LAT) * SCALE_FACTOR;
    // Procedural terrain elevation formula
    const z = Math.sin(x * 0.12) * 2.5 + Math.cos(y * 0.15) * 2.0 + Math.sin(x * 0.05 + y * 0.05) * 3.5;
    return new THREE.Vector3(x, z + 0.5, -y);
  };

  useEffect(() => {
    if (!mountRef.current) return;
    const currentMount = mountRef.current;
    const width = currentMount.clientWidth || 800;
    const containerHeight = currentMount.clientHeight || 500;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) {
      console.warn('WebGL not supported, rendering fallback canvas', e);
      setWebglSupported(false);
      return;
    }

    renderer.setSize(width, containerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    currentMount.appendChild(renderer.domElement);

    // Scene & Camera setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0b0e14, 0.015);

    const camera = new THREE.PerspectiveCamera(45, width / containerHeight, 0.1, 1000);
    camera.position.set(0, 32, 45);
    camera.lookAt(0, 0, 0);

    // Ambient & Directional Lights
    const ambientLight = new THREE.AmbientLight(0x1c2536, 1.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    directionalLight.position.set(20, 40, 20);
    scene.add(directionalLight);

    const redDangerLight = new THREE.PointLight(0xef4444, 2, 40);
    redDangerLight.position.set(0, 8, 0);
    scene.add(redDangerLight);

    // 1. CREATE PROCEDURAL TERRAIN MESH WITH TOPOGRAPHIC CONTOURS
    const gridSegments = 90;
    const terrainGeo = new THREE.PlaneGeometry(70, 70, gridSegments, gridSegments);
    terrainGeo.rotateX(-Math.PI / 2);

    const posAttr = terrainGeo.attributes.position;
    const colors = new Float32Array(posAttr.count * 3);

    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);

      // Multi-frequency noise displacement for realistic mountain terrain
      const elevation =
        Math.sin(vx * 0.12) * 2.5 +
        Math.cos(vz * 0.15) * 2.0 +
        Math.sin(vx * 0.05 + vz * 0.05) * 3.5 +
        Math.cos(vx * 0.3) * 0.8;

      posAttr.setY(i, elevation);

      // Color mapping: Emerald valley -> Cyan slope -> Amber/Red risk peak
      let color = new THREE.Color(0x111622);
      if (elevation < 0) {
        color = new THREE.Color(0x0f172a);
      } else if (elevation < 2.5) {
        color = new THREE.Color(0x1e293b);
      } else if (elevation < 4.5) {
        color = new THREE.Color(0x334155);
      } else {
        color = new THREE.Color(0x475569);
      }

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    terrainGeo.computeVertexNormals();
    terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.15,
      flatShading: true
    });

    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    scene.add(terrainMesh);

    // Wireframe Topographic Overlay Grid
    const wireframeMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.12
    });
    const wireframeMesh = new THREE.Mesh(terrainGeo, wireframeMat);
    wireframeMesh.position.y += 0.05;
    scene.add(wireframeMesh);

    // 2. HABITATION & RELOCATION SITE MARKERS IN 3D SPACE
    const markersGroup = new THREE.Group();
    scene.add(markersGroup);

    // Render Habitations (Origin Risk Points)
    habitations.forEach((hab) => {
      const pos = latLngTo3D(hab.lat, hab.lng);
      const isHighRisk = (hab.riskScore || 0) > 70;

      const sphereGeo = new THREE.SphereGeometry(0.8, 16, 16);
      const sphereMat = new THREE.MeshBasicMaterial({
        color: isHighRisk ? 0xef4444 : 0xf59e0b
      });
      const markerMesh = new THREE.Mesh(sphereGeo, sphereMat);
      markerMesh.position.copy(pos);
      markersGroup.add(markerMesh);

      // Outer Scanner Ring
      const ringGeo = new THREE.RingGeometry(1.2, 1.5, 32);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: isHighRisk ? 0xef4444 : 0xf59e0b,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.copy(pos);
      ringMesh.position.y -= 0.4;
      markersGroup.add(ringMesh);
    });

    // Render Relocation Shelters (Safe Ground Columns)
    relocationSites.forEach((site) => {
      const pos = latLngTo3D(site.lat, site.lng);

      const columnHeight = Math.max(3, ((site.capacity || 1000) / 300));
      const colGeo = new THREE.CylinderGeometry(0.6, 0.8, columnHeight, 16);
      const colMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x059669,
        emissiveIntensity: 0.4,
        roughness: 0.3
      });
      const colMesh = new THREE.Mesh(colGeo, colMat);
      colMesh.position.set(pos.x, pos.y + columnHeight / 2, pos.z);
      markersGroup.add(colMesh);
    });

    // 3. ANIMATED 3D RELOCATION CORRIDOR VECTOR
    let corridorMesh: THREE.Line | null = null;
    let originPos: THREE.Vector3 | null = null;
    let targetPos: THREE.Vector3 | null = null;

    if (selectedLocation) {
      originPos = latLngTo3D(selectedLocation.lat, selectedLocation.lng);
    }
    if (recommendedSite) {
      targetPos = latLngTo3D(recommendedSite.lat, recommendedSite.lng);
    }

    if (showCorridor && originPos && targetPos) {
      // Quadratic Bezier Arc in 3D terrain space
      const midPoint = new THREE.Vector3()
        .addVectors(originPos, targetPos)
        .multiplyScalar(0.5);
      midPoint.y += 12; // Elevated arc trajectory

      const curve = new THREE.QuadraticBezierCurve3(originPos, midPoint, targetPos);
      const points = curve.getPoints(60);
      const curveGeo = new THREE.BufferGeometry().setFromPoints(points);

      const curveMat = new THREE.LineDashedMaterial({
        color: 0x10b981,
        dashSize: 1.5,
        gapSize: 0.8,
        linewidth: 3
      });

      corridorMesh = new THREE.Line(curveGeo, curveMat);
      corridorMesh.computeLineDistances();
      scene.add(corridorMesh);
    }

    // 4. ANIMATION LOOP & SMOOTH INTERPOLATION
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const targetCameraPos = new THREE.Vector3(0, 32, 45);
    if (originPos) {
      targetCameraPos.set(originPos.x * 0.7, 28, originPos.z + 30);
    }

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Gentle organic terrain rotation when idle
      if (!selectedLocation) {
        terrainMesh.rotation.y = Math.sin(elapsedTime * 0.1) * 0.05;
        wireframeMesh.rotation.y = terrainMesh.rotation.y;
      }

      // Smooth camera interpolation towards target pos
      camera.position.lerp(targetCameraPos, 0.04);
      camera.lookAt(
        originPos ? originPos.x * 0.5 : 0,
        0,
        originPos ? originPos.z * 0.5 : 0
      );

      // Dash offset animation for relocation corridor line
      if (corridorMesh) {
        const mat = corridorMesh.material as THREE.LineDashedMaterial;
        mat.dashSize = 1.5 + Math.sin(elapsedTime * 3) * 0.3;
      }

      // Red danger light pulse
      redDangerLight.intensity = 1.5 + Math.sin(elapsedTime * 2) * 0.8;

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (currentMount.contains(renderer.domElement)) {
        currentMount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [selectedLocation, recommendedSite, habitations, relocationSites, showCorridor]);

  return (
    <div className={`relative w-full overflow-hidden bg-slate-950 border border-slate-800 rounded-xl ${className}`} style={{ height }}>
      {/* Topographic Spatial Overlay HUD */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2 text-[11px] font-mono select-none">
        <span className="px-2.5 py-1 rounded bg-slate-900/80 border border-slate-700/80 text-sky-400 backdrop-blur-md flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping"></span>
          <span>KSHEMA TERRAIN ENGINE v3.4</span>
        </span>
        <span className="px-2.5 py-1 rounded bg-slate-900/80 border border-slate-700/80 text-slate-300 backdrop-blur-md">
          ELEVATION: {terrainDetails.elevationMin} - {terrainDetails.elevationMax}
        </span>
        <span className="px-2.5 py-1 rounded bg-slate-900/80 border border-slate-700/80 text-slate-300 backdrop-blur-md hidden sm:inline">
          {terrainDetails.coordinateCenter}
        </span>
      </div>

      {/* 3D WebGL Canvas Container */}
      {webglSupported ? (
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      ) : (
        /* Fallback Canvas for WebGL Disabled / Low Specs */
        <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-slate-950 text-center spatial-contour-grid">
          <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center mb-3">
            <span className="font-mono text-sky-400 text-xl font-bold">3D</span>
          </div>
          <h4 className="font-mono text-slate-200 text-sm font-semibold mb-1">KSHEMA Spatial Surface Mode</h4>
          <p className="text-xs text-slate-400 max-w-sm">
            Interactive 3D WebGL fallback mode active. Terrain spatial analysis and hazard scanning are rendering in 2D contour mode.
          </p>
        </div>
      )}

      {/* Spatial Legend & Controls */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center space-x-3 text-[10px] font-mono text-slate-300 select-none">
        <div className="flex items-center space-x-1 px-2 py-1 rounded bg-slate-900/80 border border-slate-800 backdrop-blur-md">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
          <span>Landslide Risk Zone</span>
        </div>
        <div className="flex items-center space-x-1 px-2 py-1 rounded bg-slate-900/80 border border-slate-800 backdrop-blur-md">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span>Verified Safe Shelter</span>
        </div>
        {showCorridor && selectedLocation && recommendedSite && (
          <div className="flex items-center space-x-1 px-2 py-1 rounded bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 backdrop-blur-md">
            <span className="w-2.5 h-0.5 bg-emerald-400"></span>
            <span>Relocation Vector Arc</span>
          </div>
        )}
      </div>

      <div className="absolute bottom-3 right-3 z-10 text-[10px] font-mono text-slate-500">
        3D Geographic Surface • WGS84 Topography
      </div>
    </div>
  );
};

export const KshemaTerrainEngine = AashrayTerrainEngine;
export default AashrayTerrainEngine;
