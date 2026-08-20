import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const Auth = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [authState, setAuthState] = useState('login'); // 'login', 'signup', 'forgot'
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({
    name: '',
    age: '',
    gender: 'Other',
    email: '',
    password: '',
    confirm_password: '',
    emergency_contact: '',
    preferred_language: 'English',
    music_preference: 'Piano',
    video_preference: 'Nature',
    dark_mode: true
  });
  const [forgotEmail, setForgotEmail] = useState('');

  const establishSession = (data) => {
    const { access_token: token, user } = data || {};
    if (!token || !user || !user.role) {
      throw new Error('The server returned an incomplete sign-in session.');
    }

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    onLoginSuccess(user);
    navigate(user.role === 'user' ? '/' : '/therapist', { replace: true });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const response = await api.post('/api/auth/login', loginForm);
      const data = response.data;
      
      establishSession(data);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    if (signupForm.password !== signupForm.confirm_password) {
      setErrorMsg('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        ...signupForm,
        age: parseInt(signupForm.age)
      };
      const response = await api.post('/api/auth/signup', payload);
      const data = response.data;
      
      establishSession(data);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || err.message || 'Registration failed. Check your data.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const response = await api.post('/api/auth/forgot-password', { email: forgotEmail });
      setSuccessMsg(response.data.message);
    } catch (err) {
      setErrorMsg('Error triggering password recovery.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-[#070b13] relative overflow-hidden px-4">
      {/* Background abstract glowing circles */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full pulse-glow-cyan pointer-events-none z-0"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full pulse-glow-indigo pointer-events-none z-0"></div>

      <div className="w-full max-w-xl glass-panel p-8 sm:p-10 rounded-3xl border border-white/5 shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="material-icons text-cyan-400 text-3xl">spa</span>
            <span className="text-2xl font-bold tracking-wider text-white">MindEase</span>
          </div>
          <p className="text-sm text-gray-400">Your AI-Powered Mental Health Haven</p>
        </div>

        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-350 p-4 rounded-xl text-sm mb-6 text-center">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-350 p-4 rounded-xl text-sm mb-6 text-center">
            {successMsg}
          </div>
        )}

        {/* --- LOGIN FORM --- */}
        {authState === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">Email Address</label>
              <input
                type="email"
                required
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl glass-input text-sm"
                placeholder="you@example.com"
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">Password</label>
                <button
                  type="button"
                  onClick={() => setAuthState('forgot')}
                  className="text-xs text-cyan-400 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <input
                type="password"
                required
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                className="w-full px-4 py-3 rounded-xl glass-input text-sm"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 text-white rounded-xl font-semibold shadow-lg shadow-cyan-500/15 hover:shadow-cyan-500/25 transition-all duration-200 disabled:opacity-50 mt-2"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>

            <div className="text-center pt-4">
              <span className="text-xs text-gray-400">Don't have an account? </span>
              <button
                type="button"
                onClick={() => setAuthState('signup')}
                className="text-xs text-cyan-450 font-bold hover:underline"
              >
                Create Account
              </button>
            </div>
          </form>
        )}

        {/* --- SIGNUP FORM --- */}
        {authState === 'signup' && (
          <form onSubmit={handleSignupSubmit} className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={signupForm.name}
                  onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-1.5">Age</label>
                <input
                  type="number"
                  required
                  value={signupForm.age}
                  onChange={(e) => setSignupForm({ ...signupForm, age: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
                  placeholder="25"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-1.5">Gender</label>
                <select
                  value={signupForm.gender}
                  onChange={(e) => setSignupForm({ ...signupForm, gender: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm text-gray-300"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-1.5">Preferred Language</label>
                <select
                  value={signupForm.preferred_language}
                  onChange={(e) => setSignupForm({ ...signupForm, preferred_language: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm text-gray-300"
                >
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="Hindi">Hindi</option>
                  <option value="French">French</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-1.5">Email Address</label>
              <input
                type="email"
                required
                value={signupForm.email}
                onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
                placeholder="john@example.com"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  value={signupForm.password}
                  onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-1.5">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={signupForm.confirm_password}
                  onChange={(e) => setSignupForm({ ...signupForm, confirm_password: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-1.5">Emergency Contact Details</label>
              <input
                type="text"
                required
                value={signupForm.emergency_contact}
                onChange={(e) => setSignupForm({ ...signupForm, emergency_contact: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
                placeholder="Name - Phone Number (e.g. Mary Doe - 555-0199)"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-1.5">Music Therapy Style</label>
                <select
                  value={signupForm.music_preference}
                  onChange={(e) => setSignupForm({ ...signupForm, music_preference: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm text-gray-300"
                >
                  <option value="Piano">Piano</option>
                  <option value="Rain">Rain Sounds</option>
                  <option value="LoFi">LoFi Beats</option>
                  <option value="Soft Instrumental">Soft Instrumental</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-1.5">Relaxation Video Style</label>
                <select
                  value={signupForm.video_preference}
                  onChange={(e) => setSignupForm({ ...signupForm, video_preference: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm text-gray-300"
                >
                  <option value="Ocean">Ocean Views</option>
                  <option value="Forest">Forest Walks</option>
                  <option value="Breathing">Breathing Guides</option>
                  <option value="Nature">Calming Nature</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 text-white rounded-xl font-semibold shadow-lg shadow-cyan-500/15 hover:shadow-cyan-500/25 transition-all duration-200 disabled:opacity-50 mt-3"
            >
              {loading ? 'Creating Account...' : 'Register'}
            </button>

            <div className="text-center pt-2">
              <span className="text-xs text-gray-400">Already registered? </span>
              <button
                type="button"
                onClick={() => setAuthState('login')}
                className="text-xs text-cyan-455 font-bold hover:underline"
              >
                Sign In
              </button>
            </div>
          </form>
        )}

        {/* --- FORGOT PASSWORD FORM --- */}
        {authState === 'forgot' && (
          <form onSubmit={handleForgotSubmit} className="space-y-5">
            <p className="text-xs text-gray-400 text-center leading-relaxed">
              Enter your email address and we'll send you instructions to reset your password.
            </p>
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">Email Address</label>
              <input
                type="email"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl glass-input text-sm"
                placeholder="your-registered-email@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 text-white rounded-xl font-semibold shadow-lg shadow-cyan-500/15 hover:shadow-cyan-500/25 transition-all duration-200 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Send Recovery Link'}
            </button>

            <div className="text-center pt-4">
              <button
                type="button"
                onClick={() => setAuthState('login')}
                className="text-xs text-cyan-400 hover:underline font-semibold"
              >
                Back to Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Auth;
