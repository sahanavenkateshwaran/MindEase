import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const Settings = ({ user, onUserUpdate, onLogout }) => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: user?.name || '',
    emergency_contact: user?.emergency_contact || '',
    preferred_language: user?.preferred_language || 'English',
    music_preference: user?.music_preference || 'Piano',
    video_preference: user?.video_preference || 'Nature',
    dark_mode: user?.dark_mode !== false
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await api.put('/api/users/profile', form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local storage user
      const updatedUser = { ...user, ...form };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      if (onUserUpdate) {
        onUserUpdate(updatedUser);
      }
      
      setMessage('Preferences saved successfully.');
    } catch (err) {
      console.error(err);
      setMessage('Failed to update profile settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await api.delete('/api/users/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Clean up storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      onLogout();
      navigate('/auth');
    } catch (err) {
      console.error(err);
      alert("Error deleting account.");
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <div className="glass-card rounded-3xl p-6 border border-gray-850">
        <h2 className="text-xl font-extrabold text-white">System Settings & Customization</h2>
        <p className="text-xs text-gray-400">Configure your therapist parameters, preference hooks, and layout modes</p>
      </div>

      {message && (
        <div className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 p-4 rounded-xl text-xs text-center">
          {message}
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 border border-gray-800 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">Display Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl glass-input text-xs"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">Language</label>
            <select
              value={form.preferred_language}
              onChange={(e) => setForm({ ...form, preferred_language: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl glass-input text-xs text-gray-300"
            >
              <option value="English">English</option>
              <option value="Spanish">Spanish</option>
              <option value="Hindi">Hindi</option>
              <option value="French">French</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">Music Choice</label>
            <select
              value={form.music_preference}
              onChange={(e) => setForm({ ...form, music_preference: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl glass-input text-xs text-gray-300"
            >
              <option value="Piano">Piano Solo</option>
              <option value="Rain">Rain Ambience</option>
              <option value="LoFi">LoFi Beats</option>
              <option value="Soft Instrumental">Soft Acoustic</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">Video Choice</label>
            <select
              value={form.video_preference}
              onChange={(e) => setForm({ ...form, video_preference: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl glass-input text-xs text-gray-300"
            >
              <option value="Ocean">Ocean Views</option>
              <option value="Forest">Forest Walks</option>
              <option value="Breathing">Breathing Bubble</option>
              <option value="Nature">Calming Landscapes</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">Emergency Crisis Contacts</label>
          <input
            type="text"
            value={form.emergency_contact}
            onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl glass-input text-xs"
            placeholder="Mary - 555-0199"
            required
          />
        </div>

        {/* Toggles */}
        <div className="pt-2 flex items-center justify-between border-t border-gray-850">
          <div>
            <h4 className="text-xs font-bold text-gray-200">Dark Mode layout</h4>
            <p className="text-[10px] text-gray-450 mt-0.5">Toggle default midnight styling</p>
          </div>
          <button
            type="button"
            onClick={() => setForm({ ...form, dark_mode: !form.dark_mode })}
            className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${
              form.dark_mode ? 'bg-cyan-500' : 'bg-gray-750'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform duration-300 transform ${
                form.dark_mode ? 'translate-x-6' : 'translate-x-0'
              }`}
            ></div>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4 border-t border-gray-850">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg transition-all"
          >
            {loading ? 'Saving Settings...' : 'Save Settings'}
          </button>

          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="py-2.5 px-6 border border-rose-500/30 text-rose-400 hover:bg-rose-500/5 text-xs font-bold rounded-xl transition-all"
          >
            Delete Account
          </button>
        </div>
      </form>

      {/* DELETE ACCOUNT MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/75 backdrop-blur-sm z-50 px-4">
          <div className="glass-card max-w-sm w-full p-6 rounded-2xl border border-rose-500/30 text-center space-y-4">
            <span className="material-icons text-rose-500 text-5xl">warning</span>
            <h3 className="text-sm font-bold text-gray-100">Permanently Delete Account?</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              This action cannot be undone. Your user details, chat history, diaries, behavioral scores, and voice logs will be permanently deleted from the database.
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleDeleteAccount}
                disabled={loading}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold"
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2 bg-gray-850 hover:bg-gray-800 text-gray-300 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
