"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Bar, Pie } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function DashboardCharts({ summary }) {
  const byDistrict = summary?.buckets?.byDistrict || [];

  if (byDistrict.length === 0) {
    return (
      <div className="dashboard-chart-grid">
        <section className="dashboard-chart dashboard-chart--empty-full" aria-label="Biểu đồ">
          <p style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>Chưa có dữ liệu biểu đồ.</p>
        </section>
      </div>
    );
  }

  const labels = byDistrict.map(item => item.label);
  const data = byDistrict.map(item => item.count);

  const colors = [
    "#4f46e5", "#ec4899", "#8b5cf6", "#14b8a6", "#f59e0b",
    "#ef4444", "#84cc16", "#06b6d4", "#f97316", "#64748b"
  ];

  const barData = {
    labels,
    datasets: [
      {
        label: "Số lượng Building",
        data,
        backgroundColor: "#4f46e5",
        borderRadius: 4,
      },
    ],
  };

  const pieData = {
    labels,
    datasets: [
      {
        label: "Phân bổ theo quận",
        data,
        backgroundColor: colors,
        borderWidth: 1,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: "Số lượng building theo từng quận/huyện", font: { size: 16 }, align: 'start' },
    },
    scales: {
      y: { beginAtZero: true, grid: { borderDash: [4, 4] } },
      x: { grid: { display: false } }
    }
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "right" },
      title: { display: true, text: "Phân bổ building theo quận/huyện", font: { size: 16 }, align: 'start' },
    },
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginTop: '1.5rem' }}>
      <div style={{ flex: '1 1 60%', minWidth: '400px', height: '400px', padding: '1.5rem', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
        <Bar options={barOptions} data={barData} />
      </div>
      <div style={{ flex: '1 1 30%', minWidth: '300px', height: '400px', padding: '1.5rem', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
        <Pie options={pieOptions} data={pieData} />
      </div>
    </div>
  );
}
