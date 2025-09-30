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
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
    },
  };
  return (
    <div className="h-full w-full rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
      {title && <p className="text-sm font-semibold text-slate-900">{title}</p>}
      <div className={`${title ? 'mt-3' : ''} h-full w-full`}>
        <Pie data={chartData} options={options} />
      </div>
    </div>
  );
}

export function BarCard({ title, labels, seriesLabel, data, color }) {
  const chartData = {
    labels,
    datasets: [{ 
      label: seriesLabel, 
      data, 
      backgroundColor: color || '#22c55e',
      borderRadius: 4,
      borderSkipped: false,
    }],
  };
  const options = { 
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: color || '#22c55e',
        borderWidth: 1,
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxTicksLimit: 8,
          font: {
            size: 12,
          },
        },
      },
      y: { 
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: {
            size: 12,
          },
        },
      },
    },
  };
  return (
    <div className="h-full w-full rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
      {title && <p className="text-sm font-semibold text-slate-900">{title}</p>}
      <div className={`${title ? 'mt-3' : ''} h-full w-full`}>
        <Bar data={chartData} options={options} />
      </div>
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
        pointHoverRadius: 6,
        pointHoverBackgroundColor: color || '#0ea5e9',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2,
      },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: color || '#0ea5e9',
        borderWidth: 1,
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxTicksLimit: 8,
          font: {
            size: 12,
          },
        },
      },
      y: { 
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: {
            size: 12,
          },
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
  };
  return (
    <div className="h-full w-full rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
      {title && <p className="text-sm font-semibold text-slate-900">{title}</p>}
      <div className={`${title ? 'mt-3' : ''} h-full w-full`}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}


