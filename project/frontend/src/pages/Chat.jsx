import React, { useState, useEffect, useRef } from 'react';
import api from '../api';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [detectedEmotion, setDetectedEmotion] = useState('Neutral');
  const [emergencyWarning, setEmergencyWarning] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const messagesEndRef = useRef(null);

  const fetchChatHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.get('/api/chat/history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data.messages);
      // Determine latest emotion
      const lastUserMsg = [...response.data.messages].reverse().find(m => m.sender === 'user');
      if (lastUserMsg && lastUserMsg.emotion) {
        setDetectedEmotion(lastUserMsg.emotion);
        if (lastUserMsg.emotion === 'Depression Indicator') {
          setEmergencyWarning(true);
        }
      }
    } catch (err) {
      console.error("Failed to load chat history:", err);
    }
  };

  const fetchEmergencyContacts = async () => {
    try {
      const response = await api.get('/api/emergency-contacts');
      setEmergencyContacts(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchChatHistory();
    fetchEmergencyContacts();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userText = inputText;
    setInputText('');
    setLoading(true);

    // Optimistically push user message
    const tempUserMsg = {
      sender: 'user',
      text: userText,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const token = localStorage.getItem('token');
      const response = await api.post('/api/chat/message',
        { text: userText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const data = response.data;
      setDetectedEmotion(data.emotion);
      
      if (data.emergency_warning) {
        setEmergencyWarning(true);
      }

      setMessages(prev => [
        ...prev.filter(m => m !== tempUserMsg),
        { sender: 'user', text: userText, emotion: data.emotion, timestamp: new Date().toISOString() },
        { sender: 'ai', text: data.reply, timestamp: new Date().toISOString() }
      ]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        { sender: 'ai', text: err.response?.data?.detail || 'Unable to reach MindEase AI right now. Please check your connection and try again.', timestamp: new Date().toISOString() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 h-[calc(100vh-80px)] flex flex-col justify-between">
      {/* Header Info */}
      <div className="flex justify-between items-center bg-[#111928]/40 border border-gray-800 p-4 rounded-2xl">
        <div>
          <h2 className="text-base font-bold text-gray-100 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
            Empathetic AI Companion
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Powered by Llama 3 • Secure, empathetic, private</p>
        </div>

        {detectedEmotion && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 font-semibold uppercase">Text Emotion:</span>
            <span className="text-xs font-bold text-cyan-400 px-3 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/25">
              {detectedEmotion}
            </span>
          </div>
        )}
      </div>

      {/* EMERGENCY CRISIS WARNING BANNER */}
      {emergencyWarning && (
        <div className="bg-rose-500/15 border-2 border-rose-500/40 p-6 rounded-2xl space-y-4 shadow-xl shadow-rose-950/20">
          <div className="flex items-start gap-3">
            <span className="material-icons text-rose-500 text-3xl">emergency</span>
            <div>
              <h3 className="text-sm font-bold text-rose-300">CRITICAL SAFETY ALERT</h3>
              <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                If you are having suicidal thoughts, indicators of self-harm, or feeling severely depressed, please seek immediate help.
                We are an AI mental health platform, and we cannot replace professional psychiatric crisis care.
                Please reach out to the contacts below or a licensed mental health professional immediately.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {emergencyContacts.map((contact, idx) => (
              <div key={idx} className="p-3 bg-rose-950/10 border border-rose-500/20 rounded-xl">
                <h4 className="text-xs font-bold text-rose-200">{contact.name}</h4>
                <p className="text-sm font-extrabold text-white mt-1">{contact.number}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">{contact.description}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-4 items-center justify-between pt-2">
            <p className="text-[10px] text-gray-450 italic">Your security & life have immense value. Please reach out.</p>
            <button
              onClick={() => setEmergencyWarning(false)}
              className="py-1 px-4 border border-rose-500/30 text-rose-300 rounded-lg text-xs hover:bg-rose-500/10 transition-all"
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}

      {/* Chat Messages Log Area */}
      <div className="flex-1 bg-[#111928]/20 border border-gray-850 rounded-2xl p-6 overflow-y-auto space-y-4 max-h-[calc(100vh-380px)] pr-2">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 max-w-sm mx-auto">
            <span className="material-icons text-5xl text-gray-700 mb-3">spa</span>
            <h4 className="text-sm font-bold text-gray-400">Start a Safe Conversation</h4>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              How have you been feeling lately? You can talk about your day, stress, anxiety, or goals. I am here to listen.
            </p>
          </div>
        )}

        {messages.map((msg, index) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={index}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl p-4 text-xs leading-relaxed border ${
                  isUser
                    ? 'bg-gradient-to-r from-cyan-900/10 to-indigo-900/10 border-cyan-800/30 text-gray-100 rounded-tr-none'
                    : 'bg-[#111928]/60 border-gray-800 text-gray-200 rounded-tl-none'
                }`}
              >
                <div className="flex justify-between items-center mb-1 gap-4">
                  <span className="text-[10px] text-gray-400 font-bold capitalize">
                    {isUser ? 'You' : 'MindEase AI'}
                  </span>
                  {isUser && msg.emotion && (
                    <span className="text-[9px] text-cyan-400/80 bg-cyan-400/5 border border-cyan-400/10 px-2 py-0.5 rounded-full font-bold">
                      {msg.emotion}
                    </span>
                  )}
                </div>
                <p className="whitespace-pre-line">{msg.text}</p>
              </div>
            </div>
          );
        })}
        
        {loading && (
          <div className="flex justify-start">
            <div className="bg-[#111928]/60 border-gray-800 rounded-2xl rounded-tl-none p-4 text-xs text-cyan-400 flex items-center gap-2">
              <span className="material-icons animate-spin text-sm">sync</span>
              <span>Llama 3 is listening...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <form onSubmit={handleSendMessage} className="flex gap-3">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Share your thoughts..."
          disabled={loading}
          className="flex-1 px-4 py-3 rounded-xl glass-input text-xs"
        />
        <button
          type="submit"
          disabled={loading || !inputText.trim()}
          className="py-3 px-6 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-500/10 transition-all duration-250 disabled:opacity-50"
        >
          <span className="material-icons text-sm">send</span>
          Send
        </button>
      </form>
    </div>
  );
};

export default Chat;
