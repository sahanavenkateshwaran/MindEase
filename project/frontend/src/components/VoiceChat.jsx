import React, { useState, useRef, useEffect } from 'react';
import api from '../api';

const VoiceChat = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [reply, setReply] = useState('');
  const [metrics, setMetrics] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Initialize Canvas Visualizer
  const drawWave = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);
      
      ctx.fillStyle = 'rgba(11, 15, 25, 0.4)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#22d3ee'; // Cyan
      ctx.beginPath();
      
      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };
    draw();
  };

  const startRecording = async () => {
    setTranscription('');
    setReply('');
    setMetrics(null);
    setAudioUrl(null);
    audioChunksRef.current = [];

    if (!navigator.mediaDevices?.getUserMedia) {
      alert('This browser does not support microphone access.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/wav';
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;

      // Audio visualizer hookup
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      setIsRecording(true);
      
      // Delay visualizer draw slightly
      setTimeout(drawWave, 100);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        cancelAnimationFrame(animationFrameRef.current);
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
        
        stream.getTracks().forEach(track => track.stop());

        if (audioChunksRef.current.length === 0) {
          setTranscription('No audio was captured.');
          setLoading(false);
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/wav' });
        await uploadAudio(audioBlob);
      };

      mediaRecorder.start(250);
    } catch (err) {
      console.error('Microphone access failed:', err);
      alert('Unable to access microphone. Please check system permissions and try again.');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const uploadAudio = async (blob) => {
    setLoading(true);
    const formData = new FormData();
    formData.append('file', blob, 'voice.wav');

    try {
      const token = localStorage.getItem('token');
      const response = await api.post('/api/voice/process', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      const data = response.data;
      setTranscription(data.transcription || 'I heard your voice input and I am ready to help.');
      setReply(data.reply || 'I am here with you. Please take one slow breath and tell me how you are feeling.');
      setMetrics({
        emotion: data.emotion || 'Neutral',
        pitch: data.pitch || 0,
        energy: data.energy || 0,
        speaking_speed: data.speaking_speed || 0,
        volume: data.volume || 0
      });

      if (data.audio) {
        const audioStr = `data:audio/mp3;base64,${data.audio}`;
        setAudioUrl(audioStr);
        const playAudio = new Audio(audioStr);
        playAudio.play().catch(e => console.error("Auto play error:", e));
      }
    } catch (err) {
      console.error("Acoustic voice processing error:", err);
      setTranscription('I could not process the audio on the first try, but I am still here with you.');
      setReply('Take a slow breath. You do not need to force a perfect answer. I am listening and I can support you right now.');
      setMetrics({ emotion: 'Neutral', pitch: 0, energy: 0, speaking_speed: 0, volume: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  return (
    <div className="glass-card rounded-2xl p-6 border border-gray-800 flex flex-col justify-between h-full min-h-[420px]">
      <div className="text-center mb-4">
        <h3 className="text-base font-bold text-gray-100">Empathetic Voice Chat</h3>
        <p className="text-xs text-gray-400">Speak your mind, listen to suggestions</p>
      </div>

      {/* Waveform / Visualizer panel */}
      <div className="relative w-full h-36 bg-[#0b0f19]/80 rounded-xl overflow-hidden border border-gray-850 flex items-center justify-center mb-6">
        <canvas ref={canvasRef} width="360" height="144" className="w-full h-full" />
        
        {!isRecording && !loading && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-xs">
            Press the mic button and start speaking
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/70 text-cyan-400 text-xs gap-3">
            <span className="material-icons animate-spin text-3xl">sync</span>
            <span>Analyzing voice features & speaking rate...</span>
          </div>
        )}
      </div>

      {/* Record button */}
      <div className="flex justify-center mb-6">
        {!isRecording ? (
          <button
            onClick={startRecording}
            disabled={loading}
            className="w-16 h-16 rounded-full bg-cyan-500 hover:bg-cyan-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 active:scale-95 transition-all duration-200 disabled:opacity-50"
          >
            <span className="material-icons text-3xl">mic</span>
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="w-16 h-16 rounded-full bg-rose-500 hover:bg-rose-600 flex items-center justify-center text-white shadow-lg shadow-rose-500/20 active:scale-95 animate-pulse transition-all duration-200"
          >
            <span className="material-icons text-3xl">stop</span>
          </button>
        )}
      </div>

      {/* Transcription and Reply Display */}
      <div className="flex-1 space-y-4 max-h-[160px] overflow-y-auto pr-1">
        {transcription && (
          <div className="bg-gray-800/30 border border-gray-800 p-3 rounded-xl">
            <p className="text-[10px] text-cyan-400 uppercase font-bold tracking-wider mb-1">Your Voice</p>
            <p className="text-xs text-gray-300 italic">"{transcription}"</p>
          </div>
        )}
        {reply && (
          <div className="bg-gradient-to-r from-cyan-950/20 to-indigo-950/20 border border-cyan-950/45 p-3 rounded-xl">
            <p className="text-[10px] text-indigo-400 uppercase font-bold tracking-wider mb-1">MindEase Assistant</p>
            <p className="text-xs text-gray-200">{reply}</p>
          </div>
        )}
      </div>

      {/* Voice Metrics Footer */}
      {metrics && (
        <div className="mt-4 pt-4 border-t border-gray-850 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center bg-gray-900/10 p-3 rounded-xl border border-gray-850">
          <div>
            <p className="text-[9px] text-gray-400 font-semibold uppercase">Voice Emotion</p>
            <p className="text-xs text-cyan-400 font-bold mt-0.5">{metrics.emotion}</p>
          </div>
          <div>
            <p className="text-[9px] text-gray-400 font-semibold uppercase">Pitch (Hz)</p>
            <p className="text-xs text-indigo-400 font-bold mt-0.5">{metrics.pitch}</p>
          </div>
          <div>
            <p className="text-[9px] text-gray-400 font-semibold uppercase">Speed (on/s)</p>
            <p className="text-xs text-indigo-450 font-bold mt-0.5">{metrics.speaking_speed}</p>
          </div>
          <div>
            <p className="text-[9px] text-gray-400 font-semibold uppercase">Volume (dB)</p>
            <p className="text-xs text-rose-450 font-bold mt-0.5">{metrics.volume}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceChat;
