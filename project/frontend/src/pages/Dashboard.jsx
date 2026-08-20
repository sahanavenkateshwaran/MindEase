import React, { useEffect, useRef, useState } from 'react';
import api from '../api';
import DashboardCharts from '../components/DashboardCharts';
import BreathingExercise from '../components/BreathingExercise';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [logMedMinutes, setLogMedMinutes] = useState(5);
  const [logExeMinutes, setLogExeMinutes] = useState(10);
  const [isLoggingMed, setIsLoggingMed] = useState(false);
  const [isLoggingExe, setIsLoggingExe] = useState(false);
  const [plannerState, setPlannerState] = useState([]);
  const [manualMood, setManualMood] = useState('');
  const [isSavingMood, setIsSavingMood] = useState(false);
  const [moodSaveError, setMoodSaveError] = useState(null);
  const summaryRequestRef = useRef(0);

  const fetchSummary = async () => {
    const requestId = ++summaryRequestRef.current;
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await api.get('/api/dashboard/summary', { headers });
      if (requestId === summaryRequestRef.current) {
        setData(response.data);
        setError(null);
      }
    } catch (err) {
      console.error(err);
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (requestId !== summaryRequestRef.current) return;
      setData({
        welcome_user: storedUser.name || 'there',
        current_emotion: 'Not detected yet',
        mood_icon: '😐',
        mood_confidence: null,
        mood_source: null,
        mood_confirmed: false,
        last_updated: null,
        stress_level: 30,
        previous_stress: 35,
        stress_trend: 'Stable',
        wellness_score: 70,
        wellness_status: 'Stable',
        meditation_minutes: 0,
        exercise_minutes: 0,
        breathing_minutes: 0,
        relaxation_sessions: 0,
        streak_count: 0,
        badges: [],
        quote: 'Take a calm breath and begin your day gently.',
        recent_journal: 'No journal written today. Let this be your first reflection.',
        recommended_session: null,
        trends: [],
        heatmap: { Mon: 1, Tue: 1, Wed: 1, Thu: 1, Fri: 1, Sat: 1, Sun: 1 },
        stress_history: [
          { label: 'Mon', value: 40 }, { label: 'Tue', value: 38 }, { label: 'Wed', value: 44 },
          { label: 'Thu', value: 35 }, { label: 'Fri', value: 30 }, { label: 'Sat', value: 28 }, { label: 'Sun', value: 30 }
        ],
        mood_history: [],
        recent_mood_events: [],
        average_mood_confidence: 0,
        most_frequent_mood: 'Not detected yet',
        ai_insight: 'Your routine is steady. A short mindful reset could help you keep your energy calm and balanced.',
        weekly_summary: {
          average_wellness: 72,
          average_stress: 32,
          most_frequent_mood: 'Neutral',
          meditation_minutes: 0,
          exercise_minutes: 0,
          relaxation_sessions: 0,
          journal_entries: 0,
          wellness_streak: 0,
        },
        daily_planner: [
          { time: '08:00 AM', task: '🌬 4-4-6 Breathing', completed: false },
          { time: '11:30 AM', task: '💬 AI Check-in', completed: false },
          { time: '03:00 PM', task: '🧘 Relaxation', completed: false },
          { time: '08:30 PM', task: '📓 Journal', completed: false }
        ]
      });
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    const intervalId = setInterval(() => {
      fetchSummary();
    }, 8000);
    return () => clearInterval(intervalId);
  }, []);

  const handleTrackMeditation = async () => {
    setIsLoggingMed(true);
    try {
      const token = localStorage.getItem('token');
      await api.post('/api/dashboard/track-meditation',
        { minutes: logMedMinutes },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchSummary();
    } catch (err) {
      alert('Error tracking meditation');
    } finally {
      setIsLoggingMed(false);
    }
  };

  const handleTrackExercise = async () => {
    setIsLoggingExe(true);
    try {
      const token = localStorage.getItem('token');
      await api.post('/api/dashboard/track-exercise',
        { minutes: logExeMinutes },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchSummary();
    } catch (err) {
      alert('Error tracking exercise');
    } finally {
      setIsLoggingExe(false);
    }
  };

  const safeData = data || {
    welcome_user: 'there',
    current_emotion: 'Not detected yet',
    mood_icon: '😐',
    mood_confidence: null,
    mood_source: null,
    mood_confirmed: false,
    last_updated: null,
    stress_level: 30,
    previous_stress: 35,
    stress_trend: 'Stable',
    wellness_score: 70,
    wellness_status: 'Stable',
    meditation_minutes: 0,
    exercise_minutes: 0,
    breathing_minutes: 0,
    relaxation_sessions: 0,
    streak_count: 0,
    badges: [],
    quote: 'Take a calm breath and begin your day gently.',
    recent_journal: 'No journal written today. Let this be your first reflection.',
    recommended_session: null,
    trends: [],
    heatmap: { Mon: 1, Tue: 1, Wed: 1, Thu: 1, Fri: 1, Sat: 1, Sun: 1 },
    stress_history: [
      { label: 'Mon', value: 40 }, { label: 'Tue', value: 38 }, { label: 'Wed', value: 44 },
      { label: 'Thu', value: 35 }, { label: 'Fri', value: 30 }, { label: 'Sat', value: 28 }, { label: 'Sun', value: 30 }
    ],
    mood_history: [],
    recent_mood_events: [],
    average_mood_confidence: 0,
    most_frequent_mood: 'Not detected yet',
    ai_insight: 'Your routine is steady. A short mindful reset could help you keep your energy calm and balanced.',
    weekly_summary: {
      average_wellness: 72,
      average_stress: 32,
      most_frequent_mood: 'Neutral',
      meditation_minutes: 0,
      exercise_minutes: 0,
      relaxation_sessions: 0,
      journal_entries: 0,
      wellness_streak: 0,
    },
    daily_planner: []
  };

  const safeRecommendedSession = safeData?.recommended_session || null;
  const safeDailyPlanner = Array.isArray(safeData?.daily_planner) ? safeData.daily_planner : [];
  const safeHeatmap = safeData?.heatmap || { Mon: 1, Tue: 1, Wed: 1, Thu: 1, Fri: 1, Sat: 1, Sun: 1 };
  const safeBadges = Array.isArray(safeData?.badges) ? safeData.badges : [];
  const recentMoodEvents = Array.isArray(safeData?.recent_mood_events) ? safeData.recent_mood_events : [];
  const moodJourney = Array.isArray(safeData?.mood_journey) ? safeData.mood_journey : [];
  const safeStressHistory = Array.isArray(safeData?.stress_history) && safeData.stress_history.length
    ? safeData.stress_history
    : [
        { label: 'Mon', value: 40 }, { label: 'Tue', value: 38 }, { label: 'Wed', value: 44 },
        { label: 'Thu', value: 35 }, { label: 'Fri', value: 30 }, { label: 'Sat', value: 28 }, { label: 'Sun', value: 30 }
      ];

  const lastUpdated = (() => {
    if (!safeData.last_updated) return null;
    const iso = safeData.last_updated;
    const diffMinutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    const hours = Math.floor(diffMinutes / 60);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  })();

  const emotionColor = {
    Happy: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    Joy: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    Neutral: 'text-gray-300 bg-gray-700/20 border-gray-600/30',
    Stress: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
    Anxiety: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    Fear: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    Sad: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    Angry: 'text-rose-450 bg-rose-500/10 border-rose-500/30',
    Surprise: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
    'Depression Indicator': 'text-rose-600 bg-rose-900/15 border-rose-900/30'
  };

  const emotionIconMap = {
    Happy: '😊', Joy: '😁', Sad: '😢', Angry: '😠', Neutral: '😐', Fear: '😨', Surprise: '😮', Anxiety: '😟', Stress: '😵'
  };

  const currentMood = safeData.current_emotion || 'Not detected yet';
  const currentMoodLabel = currentMood in emotionIconMap ? currentMood : null;
  const currentMoodIcon = safeData.mood_icon || emotionIconMap[currentMoodLabel] || '😐';
  const confidence = Number.isFinite(Number(safeData.mood_confidence)) ? Number(safeData.mood_confidence) : null;
  const stressTrend = safeData.stress_trend || (Number(safeData.stress_level) > Number(safeData.previous_stress) ? '↑' : Number(safeData.stress_level) < Number(safeData.previous_stress) ? '↓' : 'Stable');
  const wellnessStatus = safeData.wellness_status || 'Stable';

  const recommendedRecommendations = {
    Happy: 'Try a gratitude activity to extend this positive momentum.',
    Joy: 'Try a gratitude activity to extend this positive momentum.',
    Sad: 'Try a calming meditation and a gentle reset break.',
    Angry: 'Try progressive muscle relaxation to release the tension.',
    Anxiety: 'Try 5-4-3-2-1 grounding to settle your nervous system.',
    Fear: 'Try 5-4-3-2-1 grounding and focus on one safe next action.',
    Stress: 'Try 4-4-6 breathing and a short reset break.',
    Neutral: 'Try a mindfulness or focus exercise to stay grounded.',
    Surprise: 'Try a short breathing pause and slow your pace.'
  };

  const personalizedRecommendation = recommendedRecommendations[currentMoodLabel] || recommendedRecommendations.Neutral;

  const sourceDetails = {
    video: { icon: 'Video', label: 'Detected from Video Analysis' },
    chat: { icon: 'Chat', label: 'Based on Chat' },
    journal: { icon: 'Journal', label: 'Based on Journal' },
    voice: { icon: 'Voice', label: 'Based on Voice' },
    manual: { icon: 'You', label: 'Confirmed by You' },
  };
  const moodSource = sourceDetails[safeData.mood_source];
  const relativeTime = (timestamp) => {
    if (!timestamp) return '';
    const minutes = Math.max(0, Math.round((Date.now() - new Date(timestamp).getTime()) / 60000));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  };
  const handleManualMood = async () => {
    if (!manualMood) return;
    setIsSavingMood(true);
    setMoodSaveError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await api.post('/api/dashboard/current-mood', { mood: manualMood }, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const event = response.data;
      setData((previous) => ({
        ...(previous || {}),
        current_emotion: event.mood,
        mood_icon: emotionIconMap[event.mood] || '',
        mood_confidence: Math.round(Number(event.confidence || 0) * 100),
        mood_source: event.source,
        mood_confirmed: event.confirmed,
        last_updated: event.timestamp,
        recent_mood_events: [event, ...((previous?.recent_mood_events || []).filter((item) => item.timestamp !== event.timestamp))].slice(0, 6),
      }));
      setManualMood('');
      fetchSummary();
    } catch (err) {
      console.error('Unable to save confirmed mood', err);
      setMoodSaveError(err.response?.data?.detail || 'Your mood could not be saved. Please check the backend connection and try again.');
    } finally {
      setIsSavingMood(false);
    }
  };

  const progressCards = [
    { label: 'Meditation', value: Number(safeData.meditation_minutes || 0), goal: 20, unit: 'min', icon: 'self_improvement', tone: 'cyan' },
    { label: 'Breathing', value: Number(safeData.breathing_minutes || 0), goal: 10, unit: 'min', icon: 'air', tone: 'indigo' },
    { label: 'Exercise', value: Number(safeData.exercise_minutes || 0), goal: 20, unit: 'min', icon: 'directions_run', tone: 'purple' },
    { label: 'Journal', value: safeData.journal_activity ? 1 : 0, goal: 1, unit: 'entry', icon: 'book', tone: 'amber' },
    { label: 'Relaxation', value: Number(safeData.relaxation_sessions || 0), goal: 2, unit: 'session', icon: 'spa', tone: 'pink' },
    { label: 'Mindfulness', value: Number(safeData.meditation_minutes || 0) + Number(safeData.breathing_minutes || 0), goal: 25, unit: 'min', icon: 'psychology', tone: 'emerald' }
  ];

  const handlePlannerToggle = (index) => {
    setPlannerState(prev => {
      const next = [...(prev.length ? prev : safeDailyPlanner.map(item => Boolean(item.completed)))];
      next[index] = !next[index];
      return next;
    });
  };

  useEffect(() => {
    setPlannerState(safeDailyPlanner.map(item => Boolean(item.completed)));
  }, [safeData.daily_planner]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] text-cyan-400 gap-3">
        <span className="material-icons animate-spin text-4xl">sync</span>
        <span className="text-sm font-semibold uppercase tracking-wider">Syncing mental logs...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-amber-300">
        <span className="material-icons text-5xl mb-2">warning</span>
        <p className="text-sm">{error}</p>
        <button onClick={fetchSummary} className="mt-4 px-4 py-2 bg-gray-800 rounded-xl text-xs text-cyan-400 border border-gray-700">
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Welcome Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card md:col-span-2 rounded-3xl p-6 border border-gray-850 flex flex-col justify-between min-h-[160px] relative overflow-hidden bg-gradient-to-r from-gray-900/70 to-indigo-950/20">
          <div className="absolute top-0 right-0 w-44 h-full pulse-glow-indigo pointer-events-none"></div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white">
              Welcome Back, {safeData.welcome_user}! ✨
            </h2>
            <p className="text-xs text-gray-400 mt-1 max-w-md">
              "{safeData.quote}"
            </p>
          </div>
          <div className="mt-4 space-y-2 relative">
            <div className="flex flex-wrap gap-3 items-center">
              <span className="text-xs text-gray-300">Your state of mind is:</span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full border ${emotionColor[currentMoodLabel] || 'text-gray-300 bg-gray-800'}`}>
                {currentMoodLabel && currentMoodIcon && `${currentMoodIcon} `}{currentMood}
              </span>
              {moodSource && <span className="text-[10px] text-gray-400">{moodSource.icon} {moodSource.label}</span>}
              {confidence !== null && <span className="text-[10px] text-gray-500">Confidence: {Math.round(confidence)}%</span>}
              {lastUpdated && <span className="text-[10px] text-gray-500">Updated: {lastUpdated}</span>}
            </div>
            {!moodSource && <p className="text-[10px] text-gray-500">Check in to discover your current state.</p>}
            <div className="flex flex-wrap gap-2 items-center">
              <label className="text-[10px] text-gray-400">How are you actually feeling?</label>
              <select value={manualMood} onChange={(event) => setManualMood(event.target.value)} className="bg-gray-950/70 border border-gray-700 rounded-lg px-2 py-1 text-[10px] text-gray-200">
                <option value="">Select mood</option>
                {['Happy', 'Sad', 'Neutral', 'Angry', 'Anxiety', 'Stress', 'Fear', 'Surprise'].map((mood) => <option key={mood} value={mood}>{mood}</option>)}
              </select>
              <button onClick={handleManualMood} disabled={!manualMood || isSavingMood} className="text-[10px] px-2 py-1 rounded-lg border border-cyan-500/30 text-cyan-300 disabled:opacity-50">
                Confirm
              </button>
            </div>
            {moodSaveError && <p className="text-[10px] text-rose-300">{moodSaveError}</p>}
            {recentMoodEvents.length > 0 && (
              <div className="text-[10px] text-gray-500">
                <span className="font-bold uppercase mr-2">Recent Mood</span>
                {recentMoodEvents.slice(0, 3).map((event, index) => (
                  <span key={`${event.timestamp}-${index}`} className="mr-2">{event.mood} — {sourceDetails[event.source]?.label || event.source} — {relativeTime(event.timestamp)}</span>
                ))}
              </div>
            )}
            {moodJourney.length > 0 && (
              <div className="text-[10px] text-gray-500">
                <span className="font-bold uppercase mr-2">Mood Journey</span>
                {moodJourney.map((step, index) => <span key={`${step.timestamp}-${index}`} className="mr-1">{index > 0 && '→'} {step.type === 'activity' ? 'Relaxation' : step.label}</span>)}
              </div>
            )}
            {safeData.streak_count > 0 && (
              <span className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full flex items-center gap-1 font-bold">
                <span className="material-icons text-sm text-amber-400">local_fire_department</span>
                {safeData.streak_count}-Day Streak
              </span>
            )}
          </div>
        </div>

        {/* Dynamic score summary */}
        <div className="glass-card rounded-3xl p-6 border border-gray-850 grid grid-cols-2 gap-4">
          <div className="text-center flex flex-col justify-center">
            <p className="text-[10px] text-gray-400 uppercase font-semibold">Stress Level</p>
            <h3 className="text-3xl font-extrabold text-indigo-400 mt-1.5">{safeData.stress_level}%</h3>
          </div>
          <div className="text-center flex flex-col justify-center border-l border-gray-800/80">
            <p className="text-[10px] text-gray-400 uppercase font-semibold">Wellness Score</p>
            <h3 className="text-3xl font-extrabold text-cyan-400 mt-1.5">{safeData.wellness_score}%</h3>
          </div>
        </div>
      </div>

      {/* Main interactive widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trackers widget */}
        <div className="glass-card rounded-2xl p-6 border border-gray-800 space-y-6">
          <h3 className="text-base font-bold text-gray-100 flex items-center gap-2">
            <span className="material-icons text-cyan-455 text-[20px]">self_improvement</span>
            Wellness Logs
          </h3>
          
          {/* Meditation tracker */}
          <div className="space-y-3 bg-gray-900/20 p-4 rounded-xl border border-gray-850">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-300 font-semibold">Today's Meditation</span>
              <span className="text-cyan-400 font-extrabold">{safeData.meditation_minutes} mins</span>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                max="120"
                value={logMedMinutes}
                onChange={(e) => setLogMedMinutes(parseInt(e.target.value) || 0)}
                className="w-16 px-2 py-1 bg-gray-950 border border-gray-800 rounded-lg text-xs text-center text-white"
              />
              <button
                onClick={handleTrackMeditation}
                disabled={isLoggingMed}
                className="flex-1 py-1 px-3 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 hover:border-cyan-500/40 text-cyan-300 font-semibold rounded-lg text-xs transition-all duration-200"
              >
                Log Minutes
              </button>
            </div>
          </div>

          {/* Exercise tracker */}
          <div className="space-y-3 bg-gray-900/20 p-4 rounded-xl border border-gray-850">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-300 font-semibold">Today's Exercise</span>
              <span className="text-indigo-400 font-extrabold">{safeData.exercise_minutes} mins</span>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                max="120"
                value={logExeMinutes}
                onChange={(e) => setLogExeMinutes(parseInt(e.target.value) || 0)}
                className="w-16 px-2 py-1 bg-gray-950 border border-gray-800 rounded-lg text-xs text-center text-white"
              />
              <button
                onClick={handleTrackExercise}
                disabled={isLoggingExe}
                className="flex-1 py-1 px-3 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/40 text-indigo-300 font-semibold rounded-lg text-xs transition-all duration-200"
              >
                Log Minutes
              </button>
            </div>
          </div>
        </div>

        {/* Breathing Exercise widget */}
        <BreathingExercise />

        {/* Daily planner and Heatmap */}
        <div className="glass-card rounded-2xl p-6 border border-gray-800 flex flex-col justify-between">
          <h3 className="text-base font-bold text-gray-100 mb-4 flex items-center gap-2">
            <span className="material-icons text-cyan-400 text-[20px]">calendar_today</span>
            Daily Planner
          </h3>
          <div className="space-y-3 flex-1 overflow-y-auto max-h-[160px] pr-1">
            {safeData.daily_planner.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 p-2 bg-gray-900/20 border border-gray-850 rounded-xl">
                <span className={`material-icons text-sm ${item.completed ? 'text-emerald-400' : 'text-gray-500'}`}>
                  {item.completed ? 'check_circle' : 'radio_button_unchecked'}
                </span>
                <div className="overflow-hidden">
                  <p className="text-[10px] text-gray-400 font-bold">{item.time}</p>
                  <p className={`text-xs text-gray-200 truncate ${item.completed ? 'line-through opacity-50' : ''}`}>
                    {item.task}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-850">
            <p className="text-[10px] text-gray-400 font-bold uppercase mb-2">Weekly Mood Frequency</p>
            <div className="flex gap-2 justify-between">
              {Object.entries(safeHeatmap).map(([day, val]) => (
                <div key={day} className="flex flex-col items-center flex-1">
                  <div
                    style={{ opacity: 0.2 + (val * 0.15) }}
                    className="w-full aspect-square bg-cyan-400 rounded-md border border-cyan-400/30"
                    title={`${val} interactions`}
                  ></div>
                  <span className="text-[9px] text-gray-400 mt-1">{day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mood History Charting graphs */}
      <DashboardCharts trends={safeData.trends} />

      {/* Recommendations & Recent Journal summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recommended Sessions */}
        <div className="glass-card lg:col-span-2 rounded-2xl p-6 border border-gray-800 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-gray-100 flex items-center gap-2">
              <span className="material-icons text-cyan-400 text-[20px]">recommend</span>
              Personalized Wellness Session
            </h3>
            <span className="text-[10px] font-bold text-gray-400 capitalize">Aligned with {safeData.current_emotion}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-900/30 rounded-xl border border-gray-850">
              <p className="text-[10px] text-cyan-400 font-extrabold uppercase flex items-center gap-1.5">
                <span className="material-icons text-sm">self_improvement</span>
                Meditation Routine
              </p>
              <h4 className="text-xs font-bold text-gray-200 mt-2">{safeRecommendedSession?.meditation?.title || 'Gentle reset session'}</h4>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                {safeRecommendedSession?.meditation?.instruction || 'A calming routine tailored to your current mood.'}
              </p>
              <span className="inline-block mt-3 text-[10px] text-cyan-300 font-bold bg-cyan-500/10 px-2 py-0.5 rounded">
                ⏱️ {safeRecommendedSession?.meditation?.duration_minutes || 10} Mins
              </span>
            </div>

            <div className="p-4 bg-gray-900/30 rounded-xl border border-gray-850">
              <p className="text-[10px] text-indigo-400 font-extrabold uppercase flex items-center gap-1.5">
                <span className="material-icons text-sm">directions_run</span>
                Daily Exercise
              </p>
              <h4 className="text-xs font-bold text-gray-200 mt-2">{safeRecommendedSession?.exercise?.title || 'Restorative movement'}</h4>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                {safeRecommendedSession?.exercise?.instruction || 'A gentle movement flow to ease tension and restore balance.'}
              </p>
              <div className="flex gap-2 mt-3">
                <span className="text-[10px] text-indigo-300 font-bold bg-indigo-500/10 px-2 py-0.5 rounded">
                  ⏱️ {safeRecommendedSession?.exercise?.duration_minutes || 15} Mins
                </span>
                <span className="text-[10px] text-indigo-300 font-bold bg-indigo-500/10 px-2 py-0.5 rounded">
                  {safeRecommendedSession?.exercise?.intensity || 'Low'} Intensity
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Journal summary */}
        <div className="glass-card rounded-2xl p-6 border border-gray-800 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-100 mb-3 flex items-center gap-2">
              <span className="material-icons text-cyan-400 text-[20px]">book</span>
              Latest Reflection
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed italic">
              "{safeData.recent_journal}"
            </p>
          </div>
          
          {safeBadges.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-850">
              <p className="text-[10px] text-gray-400 font-bold uppercase mb-2">Badges Earned</p>
              <div className="flex gap-2">
                {safeBadges.map((badge, idx) => (
                  <div key={idx} className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center relative group" title={`${badge.name}: ${badge.desc}`}>
                    <span className="material-icons text-cyan-400 text-lg">{badge.icon}</span>
                    {/* Tooltip */}
                    <div className="absolute bottom-12 hidden group-hover:block bg-gray-900 text-[10px] text-gray-200 p-2 rounded shadow border border-gray-800 w-32 text-center pointer-events-none">
                      <p className="font-bold">{badge.name}</p>
                      <p className="opacity-70 mt-0.5">{badge.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
