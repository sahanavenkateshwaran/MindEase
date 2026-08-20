import React, { useState, useEffect } from 'react';
import api from '../api';

const Journal = () => {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('write'); // 'write' or 'history'
  
  // Results details for the newly submitted entry
  const [result, setResult] = useState(null);

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.get('/api/journal/history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistory(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleJournalSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const token = localStorage.getItem('token');
      const response = await api.post('/api/journal/create',
        { text: inputText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setResult(response.data);
      setInputText('');
      fetchHistory();
    } catch (err) {
      console.error(err);
      alert("Failed to submit journal entry");
    } finally {
      setLoading(false);
    }
  };

  const emotionColor = {
    Happy: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    Neutral: 'text-gray-300 bg-gray-700/20 border-gray-600/30',
    Stress: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
    Anxiety: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    Fear: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    Sad: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    Angry: 'text-rose-450 bg-rose-500/10 border-rose-500/30',
    'Depression Indicator': 'text-rose-600 bg-rose-900/15 border-rose-900/30'
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header Tabs */}
      <div className="glass-card rounded-3xl p-4 border border-gray-850 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-extrabold text-white">AI Reflection Journal</h2>
          <p className="text-xs text-gray-400">Pour your thoughts, let Llama summarize and guide you</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('write')}
            className={`py-1.5 px-4 rounded-xl text-xs font-semibold border transition-all duration-200 ${
              activeTab === 'write'
                ? 'bg-cyan-500 hover:bg-cyan-600 text-white border-cyan-500 shadow'
                : 'bg-gray-850 hover:bg-gray-800 text-gray-300 border-gray-800'
            }`}
          >
            Write Entry
          </button>
          <button
            onClick={() => {
              setActiveTab('history');
              fetchHistory();
            }}
            className={`py-1.5 px-4 rounded-xl text-xs font-semibold border transition-all duration-200 ${
              activeTab === 'history'
                ? 'bg-cyan-500 hover:bg-cyan-600 text-white border-cyan-500 shadow'
                : 'bg-gray-850 hover:bg-gray-800 text-gray-300 border-gray-800'
            }`}
          >
            Reflection Logs ({history.length})
          </button>
        </div>
      </div>

      {/* WRITE TAB */}
      {activeTab === 'write' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="glass-card rounded-2xl p-6 border border-gray-800 lg:col-span-2 space-y-5">
            <form onSubmit={handleJournalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                  What is on your mind today?
                </label>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  required
                  rows="8"
                  className="w-full px-4 py-3 rounded-xl glass-input text-xs leading-relaxed"
                  placeholder="Today felt a bit hectic. I had a busy morning but took a walk later..."
                  disabled={loading}
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={loading || !inputText.trim()}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/10 transition-all duration-200 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="material-icons animate-spin text-sm">sync</span>
                    Generating Llama Summaries & Insights...
                  </>
                ) : (
                  <>
                    <span className="material-icons text-sm">auto_awesome</span>
                    Analyze Journal Entry
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Newly submitted analysis dashboard */}
          <div className="glass-card rounded-2xl p-6 border border-gray-800">
            <h3 className="text-base font-bold text-gray-100 mb-4 flex items-center gap-2">
              <span className="material-icons text-cyan-400 text-[20px]">insights</span>
              AI Journal Insights
            </h3>

            {result ? (
              <div className="space-y-5">
                <div>
                  <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">Detected Emotion</p>
                  <span className={`inline-block mt-2 text-xs font-bold px-3 py-1 rounded-full border ${emotionColor[result.emotion]}`}>
                    {result.emotion}
                  </span>
                </div>

                <div>
                  <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">AI Summary</p>
                  <p className="text-xs text-gray-350 leading-relaxed mt-2 italic bg-gray-900/20 p-3 rounded-xl border border-gray-850">
                    "{result.summary}"
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-2">Recommended Steps</p>
                  {result.insights.map((insight, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-gray-300">
                      <span className="material-icons text-emerald-450 text-[14px] mt-0.5">check_circle</span>
                      <p className="leading-relaxed">{insight}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 space-y-2">
                <span className="material-icons text-4xl text-gray-650">auto_awesome</span>
                <p className="text-xs max-w-[180px] mx-auto leading-relaxed">
                  Your AI summarized notes, emotional scores, and clinical recommendations will show up here after submit.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* HISTORY LOGS TAB */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {history.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center text-gray-500">
              <span className="material-icons text-5xl text-gray-650 mb-3">edit_note</span>
              <h4 className="text-sm font-bold">No Records Found</h4>
              <p className="text-xs max-w-xs mx-auto mt-1 leading-relaxed">
                You haven't written any reflections yet. Go to the "Write Entry" tab to log your first diary notes.
              </p>
            </div>
          ) : (
            history.map((doc) => (
              <div key={doc._id} className="glass-card rounded-2xl p-6 border border-gray-800 space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-gray-850">
                  <div className="flex items-center gap-3">
                    <span className="material-icons text-cyan-400 text-lg">event</span>
                    <span className="text-xs text-gray-300 font-bold">
                      {new Date(doc.created_at).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <span className={`text-xs font-bold px-3 py-0.5 rounded-full border ${emotionColor[doc.emotion]}`}>
                    {doc.emotion}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
                  {/* Diary notes */}
                  <div className="space-y-2">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Your Entry</p>
                    <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap max-h-[140px] overflow-y-auto pr-1">
                      {doc.text}
                    </p>
                  </div>

                  {/* Summary and tips */}
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] text-cyan-455 font-bold uppercase">Llama 3 Summary</p>
                      <p className="text-xs text-gray-350 mt-1.5 italic bg-gray-900/30 p-2.5 rounded-xl border border-gray-850">
                        "{doc.summary}"
                      </p>
                    </div>

                    {doc.insights && doc.insights.length > 0 && (
                      <div>
                        <p className="text-[10px] text-emerald-455 font-bold uppercase mb-2">Wellness Tips</p>
                        <div className="space-y-1.5">
                          {doc.insights.map((ins, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-gray-300">
                              <span className="material-icons text-emerald-400 text-[12px] mt-1">check_circle</span>
                              <span>{ins}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Journal;
