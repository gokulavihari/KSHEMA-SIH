import React, { useEffect, useState } from 'react';
import { fetchFieldReports, submitFieldReport } from '../services/api';
import { FieldReport } from '../types';
import { LocationHeader } from '../components/LocationHeader';
import { ChangeLocationModal } from '../components/ChangeLocationModal';
import { useLocation } from '../context/LocationContext';
import { Smartphone, Send, MapPin, AlertTriangle, ShieldCheck, Camera, CheckCircle2, Clock } from 'lucide-react';

export const FieldModeView: React.FC = () => {
  const { locationState, requestGpsLocation } = useLocation();
  const [reports, setReports] = useState<FieldReport[]>([]);
  const [issueType, setIssueType] = useState<string>('Slope Cracks / Tension Fractures Detected');
  const [severity, setSeverity] = useState<string>('HIGH');
  const [locationName, setLocationName] = useState<string>(locationState.displayName);
  const [description, setDescription] = useState<string>('Active tension cracks observed 40m above residential cluster. Water seepage visible on slope face.');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    setLocationName(locationState.displayName);
  }, [locationState.displayName]);

  useEffect(() => {
    fetchFieldReports().then(setReports).catch(console.error);
  }, []);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPhotoPreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    submitFieldReport({
      location: locationName,
      severity,
      issue_type: issueType,
      description,
      latitude: locationState.latitude,
      longitude: locationState.longitude,
      officer_id: 'NDRF-FIELD-OFFICER-09'
    })
      .then(() => {
        setSubmitting(false);
        setMsg('✓ Field observation logged successfully to central server with GPS coordinates & timestamp.');
        fetchFieldReports().then(setReports);
      })
      .catch((err) => {
        console.error(err);
        setSubmitting(false);
      });
  };

  return (
    <div className="min-h-screen bg-command-bg pb-12">
      <LocationHeader />
      <ChangeLocationModal />

      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center space-x-3">
            <Smartphone className="w-6 h-6 text-emerald-400" />
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">Field Officer Mobile Briefing & Intelligence Reporting</h1>
              <p className="text-xs text-gray-400">Ground telemetry, GPS photo tagging, & field hazard observation logging for NDRF/SDMA teams.</p>
            </div>
          </div>
          <span className="text-xs px-3 py-1 bg-emerald-950 border border-emerald-700 text-emerald-300 font-bold rounded">
            FIELD OBSERVATION MODE (HUMAN VERIFIED)
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Column */}
          <div className="lg:col-span-6 bg-command-card border border-command-border p-5 rounded-xl space-y-4 shadow-lg">
            <h3 className="text-sm font-bold text-white border-b border-command-border pb-2.5 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-command-accent" />
                <span>Submit Ground Field Observation</span>
              </span>
              <button
                type="button"
                onClick={requestGpsLocation}
                className="text-[11px] px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 rounded transition-colors font-medium"
              >
                Acquire Device GPS
              </button>
            </h3>

            {msg && (
              <div className="p-3 bg-emerald-950 border border-emerald-800 text-emerald-200 text-xs rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{msg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-400 mb-1 font-medium">Field Location Name</label>
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white font-medium focus:outline-none focus:border-command-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1 font-medium">GPS Latitude (°N)</label>
                  <input
                    type="text"
                    readOnly
                    value={locationState.latitude.toFixed(6)}
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-gray-300 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1 font-medium">GPS Longitude (°E)</label>
                  <input
                    type="text"
                    readOnly
                    value={locationState.longitude.toFixed(6)}
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-gray-300 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-medium">Observation / Issue Category</label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white font-medium focus:outline-none focus:border-command-accent"
                >
                  <option value="Slope Cracks / Tension Fractures Detected">Slope Cracks / Tension Fractures Detected</option>
                  <option value="Flash Flood / Debris Accumulation">Flash Flood / Debris Accumulation</option>
                  <option value="Road Blockage / Landslide Runout">Road Blockage / Landslide Runout</option>
                  <option value="Building Structural Failure">Building Structural Failure</option>
                  <option value="Water Seepage / Drainage Surge">Water Seepage / Drainage Surge</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-medium">Severity Level</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white font-medium focus:outline-none focus:border-command-accent"
                >
                  <option value="CRITICAL">CRITICAL (Immediate hazard threat)</option>
                  <option value="HIGH">HIGH (Elevated risk requiring monitoring)</option>
                  <option value="MODERATE">MODERATE (Caution condition)</option>
                  <option value="LOW">LOW (Informational field update)</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-medium">Detailed Observation Notes</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-command-accent"
                />
              </div>

              {/* Optional Photograph Attachment */}
              <div>
                <label className="block text-gray-400 mb-1 font-medium">Attach GPS Field Photo (Optional)</label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-xs font-semibold text-gray-200 flex items-center gap-2 transition-colors">
                    <Camera className="w-4 h-4 text-command-accent" />
                    <span>Upload Photograph</span>
                    <input type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
                  </label>
                  {photoPreview && (
                    <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Photo Attached</span>
                    </span>
                  )}
                </div>
                {photoPreview && (
                  <div className="mt-2 relative w-32 h-24 rounded-lg overflow-hidden border border-gray-700">
                    <img src={photoPreview} alt="Field preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-lg transition-all shadow flex items-center justify-center gap-2 mt-2"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? 'TRANSMITTING REPORT...' : 'SUBMIT FIELD REPORT TO CENTRAL SERVER'}</span>
              </button>
            </form>
          </div>

          {/* Logged Reports Feed Column */}
          <div className="lg:col-span-6 space-y-4">
            <h3 className="text-sm font-bold text-white tracking-wide uppercase flex items-center justify-between border-b border-command-border pb-2.5">
              <span>Verified Field Observation Feed ({reports.length})</span>
              <span className="text-[10px] text-gray-400 font-mono">SOURCE: HUMAN / FIELD OFFICER</span>
            </h3>

            <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
              {reports.map((rpt) => (
                <div key={rpt.id} className="bg-command-card border border-command-border p-4 rounded-xl space-y-2 shadow">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-white">{rpt.location}</div>
                      <div className="text-[11px] text-command-accent font-semibold">{rpt.issue_type}</div>
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                      rpt.severity === 'CRITICAL' || rpt.severity === 'HIGH'
                        ? 'bg-rose-950 text-rose-300 border-rose-700'
                        : 'bg-amber-950 text-amber-300 border-amber-700'
                    }`}>
                      {rpt.severity}
                    </span>
                  </div>

                  <p className="text-xs text-gray-300 bg-gray-950/60 p-2.5 rounded-lg border border-gray-850">
                    "{rpt.description}"
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-500" />
                      {rpt.timestamp}
                    </span>
                    <span>Officer: <strong className="text-gray-300">{rpt.officer_id}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
