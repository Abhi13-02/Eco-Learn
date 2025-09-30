"use client";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
} from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement
);

export function PieCard({ title, data, labels, colors }) {
  const chartData = {
    labels,
    datasets: [{ data, backgroundColor: colors || ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6'] }],
  };
  return (
    <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <div className="mt-3"><Pie data={chartData} /></div>
    </div>
  );
}

export function BarCard({ title, labels, seriesLabel, data, color }) {
  const chartData = {
    labels,
    datasets: [{ label: seriesLabel, data, backgroundColor: color || '#22c55e' }],
  };
  const options = { responsive: true, plugins: { legend: { display: false } } };
  return (
    <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <div className="mt-3"><Bar data={chartData} options={options} /></div>
    </div>
  );
}

export function LineCard({ title, labels, seriesLabel, data, color }) {
  const chartData = {
    labels,
    datasets: [
      {
        label: seriesLabel,
        data,
        fill: false,
        borderColor: color || '#0ea5e9',
        backgroundColor: color || '#0ea5e962',
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: color || '#0ea5e9',
      },
    ],
  };
  const options = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true },
    },
  };
  return (
    <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <div className="mt-3"><Line data={chartData} options={options} /></div>
    </div>
  );
}


