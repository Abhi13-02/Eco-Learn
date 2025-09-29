"use client";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

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


