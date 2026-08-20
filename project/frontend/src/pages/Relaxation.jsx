import React, { useState, useEffect, useRef } from 'react';
import api from '../api';

// Public royalty free audio tracks for local music therapy play
const MUSIC_LIBRARY = [
  { name: 'Soothing Classical Piano', tag: 'Piano', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { name: 'Gentle Rain Shower Ambient', tag: 'Rain', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { name: 'Distant Ocean Surf Waves', tag: 'Ocean', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
  { name: 'Lo-Fi Study Chill Beats', tag: 'LoFi', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
  { name: 'Soft Acoustic Relaxation', tag: 'Soft Instrumental', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3' },
  { name: 'Morning Hope Ambient', tag: 'Hope Music', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3' },
  { name: 'Morning Yoga Meditation Wind', tag: 'Meditation Music', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3' },
  { name: 'Energetic Gym Beat Workout', tag: 'Workout Music', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3' },
];

const FALLBACK_RECOMMENDATIONS = {
  Stress: {
    videos: [
      { title: '10-Minute Guided Meditation for Stress & Anxiety', url: 'https://www.youtube.com/embed/tuPW7oOudVc', category: 'Stress Relief', description: 'A gentle guided meditation to slow down and reduce stress.', duration: '10 min', icon: 'self_improvement' },
      { title: '10-Minute Meditation for Stress', url: 'https://www.youtube.com/embed/z6X5oEIg6Ak', category: 'Meditation', description: 'A short calming meditation for an overwhelmed mind.', duration: '10 min', icon: 'spa' },
      { title: 'Guided Meditation for Stress Relief', url: 'https://www.youtube.com/embed/o94tvFUttco', category: 'Relaxation', description: 'A visual guided session designed to help stress soften.', duration: 'Guided session', icon: 'self_improvement' },
      { title: 'Ocean Waves for Deep Calm', url: 'https://www.youtube.com/embed/d1_vKv3lTYM', category: 'Nature Sounds', description: 'Slow ocean sounds for quiet reflection and relaxation.', duration: 'Live ambience', icon: 'waves' },
    ],
    music: [
      { title: 'Clair de Lune (Piano Classic)', artist: 'Debussy', tag: 'Piano' },
      { title: 'Raindrops on Glass', artist: 'Nature Soundscapes', tag: 'Rain' },
    ]
  },
  Sad: {
    videos: [
      { title: 'Positive Energy Guided Meditation', url: 'https://www.youtube.com/embed/DSP9nksqdFE', category: 'Emotional Uplift', description: 'A kind meditation for inviting ease and positive energy.', duration: '10 min', icon: 'wb_sunny' },
      { title: 'Morning Positive Affirmations', url: 'https://www.youtube.com/embed/PdtSrwwBkeE', category: 'Affirmations', description: 'Gentle affirmations for a brighter, more hopeful mood.', duration: 'Morning session', icon: 'favorite' },
      { title: 'Positive Mindset Meditation', url: 'https://www.youtube.com/embed/rUNaAIeosXk', category: 'Mindfulness', description: 'A guided reset that encourages optimism and self-care.', duration: '10 min', icon: 'lightbulb' },
      { title: 'Gratitude Meditation', url: 'https://www.youtube.com/embed/3mFVCX2wmqw', category: 'Self-Care', description: 'A quiet gratitude practice for supportive moments.', duration: 'Guided session', icon: 'volunteer_activism' },
    ],
    music: [
      { title: 'Soft Instrumental Acoustic', artist: 'Acoustic Dreams', tag: 'Soft Instrumental' },
      { title: 'Hope Resonates', artist: 'Therapeutic Sound', tag: 'Hope Music' },
    ]
  },
  Angry: {
    videos: [
      { title: 'Box Breathing for Emotional Reset', url: 'https://www.youtube.com/embed/XGKnQN7zUmw', category: 'Breathing', description: 'A paced breathing practice to create space before reacting.', duration: '10 min', icon: 'air' },
      { title: 'Full-Body Stretch for Tension Release', url: 'https://www.youtube.com/embed/ZiFMgIWi5vM', category: 'Stretching', description: 'A low-intensity stretch to release physical tension safely.', duration: '10 min', icon: 'accessibility_new' },
      { title: 'Guided Meditation for Stress Release', url: 'https://www.youtube.com/embed/KBWqBDMPMvk', category: 'Meditation', description: 'A calming visualization to settle a heated mind.', duration: 'Guided session', icon: 'self_improvement' },
      { title: 'Guided Meditation for Finding Peace', url: 'https://www.youtube.com/embed/W19PdslW7iw', category: 'Emotional Regulation', description: 'A steady meditation for returning to calm.', duration: '15 min', icon: 'spa' },
    ],
    music: [
      { title: 'Deep Mindful Relaxation', artist: 'Zen Master', tag: 'Meditation Music' },
      { title: 'Whispering Forest Wind', artist: 'Nature Sounds', tag: 'Nature Sounds' },
    ]
  },
  Happy: {
    videos: [
      { title: 'Feel-Good Afrobeat Mix', url: 'https://www.youtube.com/embed/aO8CbSn_-bs', category: 'Good Vibes Music', description: 'Warm, uplifting rhythms for a positive moment.', duration: 'Music mix', icon: 'music_note' },
      { title: 'Happy Day Positive Chill Mix', url: 'https://www.youtube.com/embed/G-99nSj4iIA', category: 'Positive Music', description: 'Bright music to maintain an upbeat mood.', duration: 'Music mix', icon: 'sentiment_very_satisfied' },
      { title: 'Start the Day with Gratitude', url: 'https://www.youtube.com/embed/ECAHPNdeD_o', category: 'Gratitude', description: 'A gratitude practice to savor the present moment.', duration: '13 min', icon: 'wb_sunny' },
      { title: 'Positive Gratitude Affirmations', url: 'https://www.youtube.com/embed/mxpTngbunN4', category: 'Positive Mindset', description: 'Positive affirmations for an optimistic outlook.', duration: '12 min', icon: 'favorite' },
    ],
    music: [
      { title: 'Summer Vibes Workout', artist: 'Dance Club', tag: 'Workout Music' },
      { title: 'Electric Motivation', artist: 'Pop Beats', tag: 'Energetic Music' },
    ]
  },
  Anxiety: {
    videos: [
      { title: 'Guided Meditation for Anxiety Relief', url: 'https://www.youtube.com/embed/8_jcEpwKQXc', category: 'Anxiety Relief', description: 'A reassuring guided visualization for anxious thoughts.', duration: 'Guided session', icon: 'self_improvement' },
      { title: '10-Minute Meditation for Anxiety', url: 'https://www.youtube.com/embed/O-6f5wQXSu8', category: 'Calming', description: 'A low-stimulation meditation for feeling settled.', duration: '10 min', icon: 'spa' },
      { title: '5-4-3-2-1 Grounding Exercise', url: 'https://www.youtube.com/embed/30VMIEmA114', category: 'Grounding', description: 'A sensory exercise for returning to the present.', duration: 'Short exercise', icon: 'my_location' },
      { title: 'Safe Sleep Meditation for Anxiety', url: 'https://www.youtube.com/embed/YGXvgqoaIDI', category: 'Comfort', description: 'A gentle session focused on safety and calm.', duration: 'Sleep meditation', icon: 'bedtime' },
    ],
    music: [
      { title: 'Deep Mindful Relaxation', artist: 'Zen Master', tag: 'Meditation Music' },
      { title: 'Whispering Forest Wind', artist: 'Nature Sounds', tag: 'Nature Sounds' },
    ]
  },
  Neutral: {
    videos: [
      { title: '10-Minute Meditation for Beginners', url: 'https://www.youtube.com/embed/U9YKY7fdwyg', category: 'Mindfulness', description: 'A balanced mindfulness practice for the present.', duration: '10 min', icon: 'self_improvement' },
      { title: '5-Minute Meditation Anywhere', url: 'https://www.youtube.com/embed/inpok4MKVLM', category: 'Focus', description: 'A short guided pause to reset attention.', duration: '5 min', icon: 'timer' },
      { title: 'One-Moment Mindfulness Exercise', url: 'https://www.youtube.com/embed/F6eFFCi12v8', category: 'Mindfulness', description: 'A simple practice for one calm focused moment.', duration: 'Short exercise', icon: 'center_focus_strong' },
      { title: 'Lo-Fi Music for Focus', url: 'https://www.youtube.com/embed/5qap5aO4i9A', category: 'Focus Music', description: 'A low-key soundscape for concentration and balance.', duration: 'Live ambience', icon: 'music_note' },
    ],
    music: [
      { title: 'Soft Instrumental Acoustic', artist: 'Acoustic Dreams', tag: 'Soft Instrumental' },
      { title: 'Clair de Lune (Piano Classic)', artist: 'Debussy', tag: 'Piano' },
    ]
  },
};

const Relaxation = () => {
  const [selectedEmotion, setSelectedEmotion] = useState('Neutral');
  const [videos, setVideos] = useState([]);
  const [musicTracks, setMusicTracks] = useState([]);
  const [recommendationExplanation, setRecommendationExplanation] = useState('');
  const [activeActivity, setActiveActivity] = useState(null);
  const [activityResult, setActivityResult] = useState(null);
  
  // Local Player state
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(MUSIC_LIBRARY[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const emotionsList = ['Stress', 'Sad', 'Angry', 'Happy', 'Anxiety', 'Neutral'];

  const applyFallbackRecommendations = (emotion) => {
    const normalizedEmotion = emotion === 'Fear' ? 'Anxiety' : (FALLBACK_RECOMMENDATIONS[emotion] ? emotion : 'Neutral');
    const fallback = FALLBACK_RECOMMENDATIONS[normalizedEmotion] || FALLBACK_RECOMMENDATIONS.Neutral;

    setVideos(fallback.videos.filter(video => video && video.url && video.url.includes('youtube.com/embed/')));
    setMusicTracks(fallback.music);
    setSelectedEmotion(normalizedEmotion);
    setCurrentTrack(MUSIC_LIBRARY.find(track =>
      fallback.music.some(music => (music.tag || '').toLowerCase().includes((track.tag || '').toLowerCase()))
    ) || MUSIC_LIBRARY[0]);
    setRecommendationExplanation(`You selected ${normalizedEmotion}, so these activities were chosen to support a calm, intentional reset.`);
  };

  const fetchRecommendations = async () => {
    const fallback = FALLBACK_RECOMMENDATIONS.Neutral;

    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const summaryResponse = await api.get('/api/dashboard/summary', { headers });
      const latestMood = summaryResponse?.data?.current_emotion || normalizedEmotion;
      setSelectedEmotion(latestMood);

      const response = await api.get('/api/dashboard/recommendations', { headers });
      const recs = response.data || {};
      const mood = recs.mood || latestMood || normalizedEmotion;
      const recommendedVideos = ((recs.videos && recs.videos.length) ? recs.videos : fallback.videos)
        .filter(video => video && video.url && video.url.includes('youtube.com/embed/'));
      const recommendedMusic = (recs.music && recs.music.length) ? recs.music : fallback.music;
      setRecommendationExplanation(recs.explanation || `Your current mood is ${mood}, so these activities were selected to support a calm, intentional reset.`);

      setVideos(recommendedVideos.length ? recommendedVideos : fallback.videos.filter(v => v.url && v.url.includes('youtube.com/embed/')));
      setMusicTracks(recommendedMusic);

      const matchedTrack = MUSIC_LIBRARY.find(track =>
        recommendedMusic.some(m => {
          const trackTag = (track.tag || '').toLowerCase();
          const moodTag = (m.tag || '').toLowerCase();
          return moodTag.includes(trackTag) || trackTag.includes(moodTag);
        })
      ) || MUSIC_LIBRARY[0];

      setCurrentTrack(matchedTrack);
      setSelectedEmotion(mood);
    } catch (err) {
      console.warn('Falling back to local relaxation recommendations.', err);
      applyFallbackRecommendations('Neutral');
    }
  };

  const startActivity = async (title) => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.post('/api/dashboard/relaxation-activity/start', { title }, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      setActiveActivity(response.data);
      setActivityResult(null);
    } catch (err) {
      console.error('Unable to record activity start', err);
    }
  };

  const completeActivity = async () => {
    if (!activeActivity?._id) return;
    try {
      const token = localStorage.getItem('token');
      const response = await api.post('/api/dashboard/relaxation-activity/complete', { activity_id: activeActivity._id }, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      setActivityResult(response.data);
      setActiveActivity(null);
    } catch (err) {
      console.error('Unable to record activity completion', err);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  // Audio actions
  const handleMusicToggle = () => {
    if (musicEnabled) {
      // Disable
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      setMusicEnabled(false);
    } else {
      // Enable
      setMusicEnabled(true);
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play()
            .then(() => setIsPlaying(true))
            .catch(e => console.error("Play failed:", e));
        }
      }, 100);
    }
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(e => console.error("Play failed:", e));
    }
  };

  const handleTrackChange = (track) => {
    setCurrentTrack(track);
    setIsPlaying(false);
    setTimeout(() => {
      if (audioRef.current && musicEnabled) {
        audioRef.current.load();
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(e => console.error("Play failed:", e));
      }
    }, 100);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header section with emotion selector */}
      <div className="glass-card rounded-3xl p-6 border border-gray-850 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white">Relaxation & Music Therapy Center</h2>
          <p className="text-xs text-gray-400">Select how you feel to filter wellness exercises and ambient soundscapes</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {emotionsList.map(em => (
            <button
              key={em}
              onClick={() => applyFallbackRecommendations(em)}
              className={`py-1.5 px-4 rounded-xl text-xs font-semibold border transition-all duration-200 ${
                selectedEmotion === em
                  ? 'bg-cyan-500 hover:bg-cyan-600 text-white border-cyan-500 shadow-md shadow-cyan-500/10'
                  : 'bg-gray-800/40 hover:bg-gray-800 text-gray-300 border-gray-700/60'
              }`}
            >
              {em}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* --- MUSIC THERAPY PLAYER --- */}
        <div className="glass-card rounded-2xl p-6 border border-gray-800 flex flex-col justify-between h-fit space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-gray-100 flex items-center gap-2">
              <span className="material-icons text-cyan-400 text-[20px]">music_note</span>
              Music Therapy
            </h3>
            
            {/* Toggle Button */}
            <button
              onClick={handleMusicToggle}
              className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${
                musicEnabled ? 'bg-cyan-500' : 'bg-gray-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform duration-300 transform ${
                  musicEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              ></div>
            </button>
          </div>

          {musicEnabled ? (
            <div className="space-y-4">
              {/* Audio controller element */}
              <audio
                ref={audioRef}
                src={currentTrack.url}
                loop
                className="hidden"
              />

              <div className="p-4 bg-gray-900/40 rounded-xl border border-gray-850 flex items-center justify-between gap-3">
                <div className="overflow-hidden">
                  <p className="text-[10px] text-cyan-455 font-bold uppercase tracking-wider">Now Playing</p>
                  <h4 className="text-xs font-bold text-gray-100 truncate mt-1">{currentTrack.name}</h4>
                  <span className="text-[9px] text-gray-400 bg-gray-850 px-2 py-0.5 rounded mt-2 inline-block font-semibold">
                    Genre: {currentTrack.tag}
                  </span>
                </div>

                <button
                  onClick={handlePlayPause}
                  className="w-10 h-10 rounded-full bg-cyan-500 hover:bg-cyan-600 flex items-center justify-center text-white shadow shadow-cyan-500/10 active:scale-95 transition-all duration-200"
                >
                  <span className="material-icons text-xl">
                    {isPlaying ? 'pause' : 'play_arrow'}
                  </span>
                </button>
              </div>

              {/* Local Track list selection */}
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                <p className="text-[10px] text-gray-400 font-bold uppercase">Tracks Available</p>
                {MUSIC_LIBRARY.map((track, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleTrackChange(track)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs border transition-all duration-150 ${
                      currentTrack.name === track.name
                        ? 'bg-cyan-500/5 text-cyan-300 border-cyan-500/25'
                        : 'bg-transparent border-transparent hover:bg-gray-800/40 text-gray-300'
                    }`}
                  >
                    <span>{track.name}</span>
                    <span className="text-[10px] opacity-60 italic">{track.tag}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-gray-500 space-y-3">
              <span className="material-icons text-4xl text-gray-600">music_off</span>
              <p className="text-xs leading-relaxed max-w-[200px] mx-auto">
                Music therapy is disabled. Toggle above to play healing ambient music.
              </p>
            </div>
          )}
        </div>

        {/* --- RELAXATION VIDEO EMBEDS --- */}
        <div className="glass-card lg:col-span-2 rounded-2xl p-6 border border-gray-800 space-y-6">
          <h3 className="text-base font-bold text-gray-100 flex items-center gap-2">
            <span className="material-icons text-cyan-400 text-[20px]">smart_display</span>
            Recommended Guided Media
          </h3>
          <div className="rounded-xl border border-gray-850 bg-gray-900/20 p-3 text-xs text-gray-400">
            <p className="text-[10px] font-bold uppercase text-cyan-400 mb-1">Why this recommendation?</p>
            <p>{recommendationExplanation}</p>
          </div>
          {activeActivity && (
            <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-300">
              <span>Before activity: {activeActivity.before?.mood} · Stress {activeActivity.before?.stress_level}% · Wellness {activeActivity.before?.wellness_score}%</span>
              <button onClick={completeActivity} className="px-3 py-1.5 rounded-lg bg-cyan-500 text-white text-[10px] font-bold">Complete activity</button>
            </div>
          )}
          {activityResult && (
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3 text-xs text-gray-300">
              <p className="font-bold text-emerald-300">Activity result</p>
              <p>Stress indicator changed by {activityResult.result?.stress_indicator_changed_by ?? 0}% · Wellness score changed by {activityResult.result?.wellness_score_changed_by ?? 0}%.</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {videos.length === 0 ? (
              <div className="sm:col-span-2 text-center py-12 text-gray-500">
                <span className="material-icons text-4xl mb-2 text-gray-600">video_library</span>
                <p className="text-xs">No media recommendations loaded yet.</p>
              </div>
            ) : (
              videos.map((vid, index) => (
                <div key={index} className="space-y-2 border border-gray-850 p-3 rounded-xl bg-gray-900/10">
                  <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black">
                    {/* Embedded iFrame for YouTube */}
                    <iframe
                      src={vid.url}
                      title={vid.title}
                      className="absolute inset-0 w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      border="0"
                    ></iframe>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-100 truncate" title={vid.title}>
                      {vid.title}
                    </h4>
                    <span className="inline-block text-[9px] text-cyan-400 bg-cyan-400/5 px-2 py-0.5 border border-cyan-455/15 rounded mt-1.5 font-bold uppercase">
                      {vid.category}
                    </span>
                    <button
                      onClick={() => startActivity(vid.title)}
                      disabled={Boolean(activeActivity)}
                      className="ml-2 text-[9px] px-2 py-0.5 rounded border border-cyan-500/25 text-cyan-300 disabled:opacity-50"
                    >
                      Start activity
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Relaxation;
