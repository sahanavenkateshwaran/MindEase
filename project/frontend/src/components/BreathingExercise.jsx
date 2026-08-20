import React, { useState, useEffect } from 'react';

const BreathingExercise = () => {
  const [isActive, setIsActive] = useState(false);
  const [cycleSeconds, setCycleSeconds] = useState(0); // 0 to 13
  const [phase, setPhase] = useState('Idle'); // Breathe In, Hold, Exhale, Idle

  useEffect(() => {
    let interval = null;
    if (isActive) {
      interval = setInterval(() => {
        setCycleSeconds((prev) => {
          const next = (prev + 1) % 14;
          // Determine phase based on next second
          if (next < 4) {
            setPhase('Breathe In');
          } else if (next < 8) {
            setPhase('Hold');
          } else {
            setPhase('Exhale');
          }
          return next;
        });
      }, 1000);
    } else {
      clearInterval(interval);
      setPhase('Idle');
      setCycleSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const startExercise = () => {
    setPhase('Breathe In');
    setCycleSeconds(0);
    setIsActive(true);
  };

  const stopExercise = () => {
    setIsActive(false);
  };

  // Get current step counter for display
  const getDisplayCounter = () => {
    if (phase === 'Breathe In') return 4 - cycleSeconds; // 4 to 1
    if (phase === 'Hold') return 8 - cycleSeconds; // 4 to 1
    if (phase === 'Exhale') return 14 - cycleSeconds; // 6 to 1
    return 0;
  };

  // Inline styling for the bubble based on phase
  const getBubbleScale = () => {
    if (phase === 'Breathe In') {
      // Scale from 1.0 to 1.5
      return 1.0 + (cycleSeconds * 0.125);
    }
    if (phase === 'Hold') {
      return 1.5;
    }
    if (phase === 'Exhale') {
      // Scale from 1.5 down to 1.0 (lasts 6 seconds)
      const secondsInPhase = cycleSeconds - 8;
      return 1.5 - (secondsInPhase * 0.083);
    }
    return 1.0;
  };

  const getBubbleColor = () => {
    if (phase === 'Breathe In') return 'border-cyan-400 bg-cyan-400/20 shadow-[0_0_30px_rgba(34,211,238,0.5)]';
    if (phase === 'Hold') return 'border-indigo-400 bg-indigo-400/20 shadow-[0_0_40px_rgba(99,102,241,0.6)]';
    if (phase === 'Exhale') return 'border-emerald-400 bg-emerald-400/20 shadow-[0_0_30px_rgba(52,211,153,0.5)]';
    return 'border-gray-600 bg-gray-800/40 shadow-none';
  };

  return (
    <div className="glass-card rounded-2xl p-6 flex flex-col items-center justify-center text-center h-[340px] relative overflow-hidden border border-gray-800">
      <h3 className="text-lg font-bold text-gray-100 mb-2">Pranayama Breathing Bubble</h3>
      <p className="text-xs text-gray-400 mb-6">4s Breathe In • 4s Hold • 6s Exhale</p>

      {/* Bubble Container */}
      <div className="h-44 flex items-center justify-center mb-6">
        <div
          style={{
            transform: `scale(${getBubbleScale()})`,
            transition: phase === 'Hold' ? 'none' : 'transform 1s linear, background-color 0.8s ease'
          }}
          className={`w-24 h-24 rounded-full border-2 flex flex-col items-center justify-center ${getBubbleColor()}`}
        >
          {isActive ? (
            <>
              <span className="text-xl font-extrabold text-white leading-none">
                {getDisplayCounter()}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-white/80 mt-1">
                {phase}
              </span>
            </>
          ) : (
            <span className="material-icons text-3xl text-gray-400">play_arrow</span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-4 z-10">
        {!isActive ? (
          <button
            onClick={startExercise}
            className="flex items-center gap-2 py-1.5 px-6 rounded-full text-sm font-semibold bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg shadow-cyan-500/20 transition-all duration-200"
          >
            <span className="material-icons text-sm">play_arrow</span>
            Start
          </button>
        ) : (
          <button
            onClick={stopExercise}
            className="flex items-center gap-2 py-1.5 px-6 rounded-full text-sm font-semibold bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20 transition-all duration-200"
          >
            <span className="material-icons text-sm">stop</span>
            Stop
          </button>
        )}
      </div>
    </div>
  );
};

export default BreathingExercise;
