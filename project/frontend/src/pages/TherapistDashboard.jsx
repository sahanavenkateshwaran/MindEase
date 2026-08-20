import React, { useState, useEffect } from 'react';
import api from '../api';

const TherapistDashboard = () => {
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [patientLoading, setPatientLoading] = useState(false);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await api.get('/api/therapist/patients', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPatients(response.data);
      if (response.data.length > 0) {
        setSelectedPatientId(response.data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientReport = async (patientId) => {
    if (!patientId) return;
    setPatientLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await api.get(`/api/therapist/patient/${patientId}/report`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReport(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setPatientLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    fetchPatientReport(selectedPatientId);
  }, [selectedPatientId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] text-cyan-400 gap-3">
        <span className="material-icons animate-spin text-4xl">sync</span>
        <span className="text-sm font-semibold uppercase tracking-wider">Syncing patients registry...</span>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* Left Patient List Sidebar */}
      <div className="lg:col-span-1 glass-card rounded-2xl p-5 border border-gray-800 flex flex-col h-[calc(100vh-160px)]">
        <h3 className="text-sm font-bold text-gray-100 mb-4 flex items-center gap-2">
          <span className="material-icons text-cyan-400 text-lg">people</span>
          Patient Registry ({patients.length})
        </h3>
        
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {patients.map((pat) => (
            <button
              key={pat.id}
              onClick={() => setSelectedPatientId(pat.id)}
              className={`w-full text-left p-3.5 rounded-xl border text-xs flex flex-col justify-between transition-all ${
                selectedPatientId === pat.id
                  ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                  : 'bg-transparent text-gray-300 border-transparent hover:bg-gray-800/40'
              }`}
            >
              <span className="font-bold truncate">{pat.name}</span>
              <span className="text-[10px] opacity-60 mt-1 truncate">{pat.email}</span>
            </button>
          ))}
          {patients.length === 0 && (
            <p className="text-xs text-gray-500 text-center py-10">No patients registered on the platform.</p>
          )}
        </div>
      </div>

      {/* Right Detailed Clinical Analysis Panel */}
      <div className="lg:col-span-3 space-y-6 overflow-y-auto max-h-[calc(100vh-160px)] pr-2">
        {patientLoading ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-cyan-400 gap-3">
            <span className="material-icons animate-spin text-3xl">sync</span>
            <span className="text-xs">Generating analytical profile...</span>
          </div>
        ) : report ? (
          <div className="space-y-6">
            {/* Patient Header Details */}
            <div className="glass-card rounded-2xl p-6 border border-gray-850 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-[9px] text-gray-400 font-bold uppercase">Patient Name</p>
                <h3 className="text-base font-bold text-white mt-1">{report.patient.name}</h3>
                <p className="text-[10px] text-gray-400">{report.patient.email}</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-400 font-bold uppercase">Demographics</p>
                <h4 className="text-xs text-gray-200 mt-1">Age: {report.patient.age}</h4>
                <h4 className="text-xs text-gray-200">Gender: {report.patient.gender}</h4>
              </div>
              <div>
                <p className="text-[9px] text-gray-400 font-bold uppercase">Emergency Crisis Contact</p>
                <h4 className="text-xs text-rose-350 font-bold mt-1">{report.patient.emergency_contact}</h4>
              </div>
            </div>

            {/* Visual metrics summaries */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Webcam logs */}
              <div className="glass-card rounded-2xl p-5 border border-gray-800 space-y-4">
                <h4 className="text-xs font-bold text-gray-100 flex items-center gap-1.5">
                  <span className="material-icons text-cyan-400 text-sm">visibility</span>
                  Aesthetic behavior analytics (Video)
                </h4>
                <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1">
                  {report.behavior_history.map((beh, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs p-2.5 bg-gray-900/20 border border-gray-850 rounded-xl">
                      <div>
                        <p className="text-[9px] text-gray-450 font-bold">
                          {new Date(beh.timestamp).toLocaleDateString()} {new Date(beh.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                        <div className="flex gap-2 mt-1">
                          {beh.poor_posture && <span className="text-[9px] text-amber-300">Poor Posture</span>}
                          {beh.sleeping && <span className="text-[9px] text-rose-300">Sleeping</span>}
                          {beh.yawning && <span className="text-[9px] text-indigo-300">Yawning</span>}
                          {!beh.sleeping && !beh.yawning && !beh.poor_posture && <span className="text-[9px] text-emerald-300">Compliant</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-cyan-400 font-bold">Focus: {beh.concentration_score}%</span>
                        <p className="text-[9px] text-gray-450">Fatigue: {beh.fatigue_score}%</p>
                      </div>
                    </div>
                  ))}
                  {report.behavior_history.length === 0 && (
                    <p className="text-xs text-gray-500 text-center py-6">No camera behavior data logged.</p>
                  )}
                </div>
              </div>

              {/* Voice logs */}
              <div className="glass-card rounded-2xl p-5 border border-gray-800 space-y-4">
                <h4 className="text-xs font-bold text-gray-100 flex items-center gap-1.5">
                  <span className="material-icons text-cyan-400 text-sm">mic</span>
                  Acoustic Voice Spectrography
                </h4>
                <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1">
                  {report.voice_history.map((vc, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs p-2.5 bg-gray-900/20 border border-gray-850 rounded-xl">
                      <div>
                        <p className="text-[9px] text-gray-455 font-bold">
                          {new Date(vc.timestamp).toLocaleDateString()} {new Date(vc.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                        <p className="text-[10px] text-indigo-300 mt-0.5">Tone: {vc.detected_emotion}</p>
                      </div>
                      <div className="text-right text-[10px]">
                        <p className="text-gray-300 font-medium">Pitch: {vc.pitch} Hz</p>
                        <p className="text-gray-450 mt-0.5">Vol: {vc.volume} dB | Speed: {vc.speaking_speed} syll/s</p>
                      </div>
                    </div>
                  ))}
                  {report.voice_history.length === 0 && (
                    <p className="text-xs text-gray-500 text-center py-6">No voice recordings analysed.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Journal History summaries */}
            <div className="glass-card rounded-2xl p-5 border border-gray-800 space-y-4">
              <h4 className="text-xs font-bold text-gray-100 flex items-center gap-1.5">
                <span className="material-icons text-cyan-400 text-sm">book</span>
                Clinical Journal Reflections
              </h4>
              <div className="space-y-4 max-h-[260px] overflow-y-auto pr-1">
                {report.journals_history.map((j, idx) => (
                  <div key={idx} className="p-4 bg-gray-900/25 border border-gray-850 rounded-xl space-y-2.5">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-850/80">
                      <span className="text-[10px] text-gray-400 font-bold">
                        {new Date(j.created_at).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}
                      </span>
                      <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded border border-cyan-500/20">
                        {j.emotion}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-[9px] text-gray-450 font-bold uppercase">Raw Entry</p>
                        <p className="text-xs text-gray-300 italic leading-relaxed mt-1">"{j.text}"</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-cyan-455 font-bold uppercase">AI Diagnostic Summary</p>
                        <p className="text-xs text-cyan-300 leading-relaxed mt-1">"{j.summary}"</p>
                      </div>
                    </div>
                  </div>
                ))}
                {report.journals_history.length === 0 && (
                  <p className="text-xs text-gray-500 text-center py-6">No journal reflections recorded.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-card rounded-2xl p-12 text-center text-gray-500">
            <span className="material-icons text-5xl mb-3">folder_open</span>
            <p className="text-xs">Please select a patient from the left register to analyze their profile.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TherapistDashboard;
