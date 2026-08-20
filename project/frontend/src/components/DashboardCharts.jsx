import React from 'react';
import { Line, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  RadialLinearScale,
  Filler,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  RadialLinearScale,
  Filler,
  Tooltip,
  Legend
);

const DashboardCharts = ({ trends = [] }) => {
  const safeTrends = Array.isArray(trends) ? trends.filter(Boolean) : [];

  // 1. Prepare Line Chart Data for Stress vs Wellness
  const defaultLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const labels = safeTrends.length > 0 ? safeTrends.map(t => {
    try {
      const dateObj = new Date(t.date);
      return dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    } catch {
      return 'Day';
    }
  }) : defaultLabels;

  const wellnessData = safeTrends.length > 0 ? safeTrends.map(t => Number(t.wellness) || 0) : [65, 70, 58, 62, 75, 80, 85];
  const stressData = safeTrends.length > 0 ? safeTrends.map(t => Number(t.stress) || 0) : [35, 30, 42, 38, 25, 20, 15];

  const lineChartData = {
    labels,
    datasets: [
      {
        label: 'Wellness Score',
        data: wellnessData,
        borderColor: '#22d3ee', // Cyan
        backgroundColor: 'rgba(34, 211, 238, 0.1)',
        tension: 0.35,
        fill: true,
        pointBackgroundColor: '#22d3ee'
      },
      {
        label: 'Stress Level',
        data: stressData,
        borderColor: '#818cf8', // Indigo
        backgroundColor: 'rgba(129, 140, 248, 0.05)',
        tension: 0.35,
        fill: false,
        pointBackgroundColor: '#818cf8'
      }
    ]
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#e5e7eb',
          font: { family: 'Outfit', size: 12 }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 25, 40, 0.95)',
        titleColor: '#22d3ee',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 10
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.03)' },
        ticks: { color: '#9ca3af' }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.03)' },
        ticks: { color: '#9ca3af' },
        min: 0,
        max: 100
      }
    }
  };

  // 2. Prepare Radar Chart for Emotion Distribution
  // Count frequency of emotions
  const emotionCounts = { Happy: 4, Sad: 2, Anxiety: 3, Stress: 5, Fear: 1, Neutral: 8 };
  if (safeTrends.length > 0) {
    // Reset defaults and count actual
    for (let k in emotionCounts) emotionCounts[k] = 0;
    safeTrends.forEach(t => {
      const em = t?.emotion;
      if (em && em in emotionCounts) emotionCounts[em]++;
      else if (em) emotionCounts[em] = 1;
    });
  }

  const radarLabels = Object.keys(emotionCounts);
  const radarValues = Object.values(emotionCounts);

  const radarChartData = {
    labels: radarLabels,
    datasets: [
      {
        label: 'Emotion Distribution',
        data: radarValues,
        backgroundColor: 'rgba(34, 211, 238, 0.2)',
        borderColor: '#22d3ee',
        pointBackgroundColor: '#22d3ee',
        borderWidth: 2
      }
    ]
  };

  const radarChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      r: {
        angleLines: { color: 'rgba(255, 255, 255, 0.08)' },
        grid: { color: 'rgba(255, 255, 255, 0.08)' },
        pointLabels: {
          color: '#e5e7eb',
          font: { family: 'Outfit', size: 11 }
        },
        ticks: {
          backdropColor: 'transparent',
          color: '#9ca3af',
          showLabelBackdrop: false,
          stepSize: 2
        }
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 w-full">
      {/* Line Chart */}
      <div className="glass-card rounded-2xl p-6 lg:col-span-2 border border-gray-800 h-[360px] flex flex-col justify-between">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-bold text-gray-100">Mood & Stress Trends</h3>
          <span className="text-xs text-cyan-400 font-semibold px-2 py-0.5 rounded-full bg-cyan-400/10">7-Day Tracking</span>
        </div>
        <div className="flex-1 min-h-[260px] relative">
          <Line data={lineChartData} options={lineChartOptions} />
        </div>
      </div>

      {/* Radar Chart */}
      <div className="glass-card rounded-2xl p-6 border border-gray-800 h-[360px] flex flex-col justify-between">
        <h3 className="text-base font-bold text-gray-100 mb-4">Emotion Signature</h3>
        <div className="flex-1 min-h-[240px] relative">
          <Radar data={radarChartData} options={radarChartOptions} />
        </div>
      </div>
    </div>
  );
};

export default DashboardCharts;
