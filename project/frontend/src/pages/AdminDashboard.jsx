import React, { useState, useEffect } from 'react';
import api from '../api';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Video Form state
  const [newVideo, setNewVideo] = useState({
    title: '',
    url: '',
    category: 'Breathing',
    emotion: 'Stress'
  });
  const [videoMsg, setVideoMsg] = useState('');

  const fetchAdminData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [usersRes, analRes, vidsRes] = await Promise.all([
        api.get('/api/admin/users', { headers }),
        api.get('/api/admin/analytics', { headers }),
        api.get('/api/admin/content/videos', { headers })
      ]);

      setUsers(usersRes.data);
      setAnalytics(analRes.data);
      setVideos(vidsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to permanently delete this user and all their mental health files?")) return;
    try {
      const token = localStorage.getItem('token');
      await api.delete(`/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAdminData();
    } catch (err) {
      alert("Error deleting user profile.");
    }
  };

  const handleAddVideo = async (e) => {
    e.preventDefault();
    setVideoMsg('');
    try {
      const token = localStorage.getItem('token');
      await api.post('/api/admin/content/videos', newVideo, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVideoMsg('Video added successfully.');
      setNewVideo({ title: '', url: '', category: 'Breathing', emotion: 'Stress' });
      fetchAdminData();
    } catch (err) {
      setVideoMsg('Error adding video.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] text-cyan-400 gap-3">
        <span className="material-icons animate-spin text-4xl">sync</span>
        <span className="text-sm font-semibold uppercase tracking-wider">Syncing control center...</span>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header Panel */}
      <div className="glass-card rounded-3xl p-6 border border-gray-850">
        <h2 className="text-xl font-extrabold text-white">Administrative Control Panel</h2>
        <p className="text-xs text-gray-400">Monitor database states, manage user registries, and update relaxation video libraries</p>
      </div>

      {/* Counters Summary */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="glass-card p-5 rounded-2xl border border-gray-800 text-center">
            <span className="material-icons text-cyan-400 text-3xl mb-1">people</span>
            <p className="text-[10px] text-gray-400 uppercase font-semibold">Total Accounts</p>
            <h3 className="text-3xl font-extrabold text-white mt-1">{analytics.total_users}</h3>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-gray-800 text-center">
            <span className="material-icons text-indigo-400 text-3xl mb-1">query_stats</span>
            <p className="text-[10px] text-gray-400 uppercase font-semibold">Platform Logs</p>
            <h3 className="text-3xl font-extrabold text-white mt-1">{analytics.total_emotion_logs}</h3>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-gray-800 text-center">
            <span className="material-icons text-emerald-400 text-3xl mb-1">menu_book</span>
            <p className="text-[10px] text-gray-400 uppercase font-semibold">Total Reflections</p>
            <h3 className="text-3xl font-extrabold text-white mt-1">{analytics.total_journals}</h3>
          </div>
        </div>
      )}

      {/* Middle row: Users registry & Video insertion */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User list */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6 border border-gray-800 space-y-4">
          <h3 className="text-sm font-bold text-gray-150 flex items-center gap-2">
            <span className="material-icons text-cyan-400 text-[18px]">people</span>
            System Users Registry
          </h3>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {users.map((u) => (
              <div key={u.id} className="flex justify-between items-center p-3.5 bg-gray-900/20 border border-gray-850 rounded-xl text-xs">
                <div>
                  <h4 className="font-bold text-gray-100">{u.name}</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">{u.email}</p>
                  <span className="inline-block mt-2 text-[9px] font-bold text-cyan-455 capitalize bg-cyan-400/5 px-2 py-0.5 rounded border border-cyan-455/15">
                    Role: {u.role}
                  </span>
                </div>

                <div className="flex gap-3 items-center">
                  <span className="text-[10px] text-gray-400">Age: {u.age}</span>
                  {u.role !== 'admin' && (
                    <button
                      onClick={() => handleDeleteUser(u.id)}
                      className="w-8 h-8 rounded-full bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 flex items-center justify-center text-rose-400 transition"
                    >
                      <span className="material-icons text-[16px]">delete</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Video Library form */}
        <div className="glass-card rounded-2xl p-6 border border-gray-800 space-y-4">
          <h3 className="text-sm font-bold text-gray-150 flex items-center gap-2">
            <span className="material-icons text-cyan-400 text-[18px]">video_library</span>
            Seed Wellness Library
          </h3>
          
          {videoMsg && (
            <p className="bg-gray-800 p-2 text-[10px] text-cyan-400 border border-gray-700 text-center rounded">
              {videoMsg}
            </p>
          )}

          <form onSubmit={handleAddVideo} className="space-y-3.5">
            <div>
              <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Video Title</label>
              <input
                type="text"
                required
                value={newVideo.title}
                onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                className="w-full px-3 py-2 rounded-lg glass-input text-xs"
                placeholder="Guided Breathing Visualizer"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">YouTube Embed URL</label>
              <input
                type="url"
                required
                value={newVideo.url}
                onChange={(e) => setNewVideo({ ...newVideo, url: e.target.value })}
                className="w-full px-3 py-2 rounded-lg glass-input text-xs"
                placeholder="https://www.youtube.com/embed/XXXXX"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Category</label>
                <select
                  value={newVideo.category}
                  onChange={(e) => setNewVideo({ ...newVideo, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg glass-input text-xs text-gray-300"
                >
                  <option value="Breathing">Breathing</option>
                  <option value="Meditation">Meditation</option>
                  <option value="Yoga">Yoga</option>
                  <option value="Nature">Nature</option>
                  <option value="Motivational">Motivational</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Target Mood</label>
                <select
                  value={newVideo.emotion}
                  onChange={(e) => setNewVideo({ ...newVideo, emotion: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg glass-input text-xs text-gray-300"
                >
                  <option value="Stress">Stress</option>
                  <option value="Sad">Sad</option>
                  <option value="Angry">Angry</option>
                  <option value="Happy">Happy</option>
                  <option value="Anxiety">Anxiety</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 text-white text-xs font-bold rounded-lg mt-2"
            >
              Add Video
            </button>
          </form>
        </div>
      </div>

      {/* Video list panel */}
      <div className="glass-card rounded-2xl p-6 border border-gray-800 space-y-4">
        <h3 className="text-sm font-bold text-gray-150 flex items-center gap-2">
          <span className="material-icons text-cyan-400 text-[18px]">playlist_play</span>
          Wellness Video Library ({videos.length})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 max-h-[300px] overflow-y-auto pr-1">
          {videos.map((vid) => (
            <div key={vid._id} className="p-3 bg-gray-900/25 border border-gray-850 rounded-xl space-y-2 text-xs">
              <h4 className="font-bold text-gray-100 truncate" title={vid.title}>{vid.title}</h4>
              <p className="text-[10px] text-gray-450 truncate">{vid.url}</p>
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                <span className="text-[9px] bg-cyan-500/10 text-cyan-300 px-2 py-0.5 rounded font-bold">
                  {vid.category}
                </span>
                <span className="text-[9px] bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded font-bold">
                  Mood: {vid.emotion}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
