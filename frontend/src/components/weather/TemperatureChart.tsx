import { Line } from 'react-chartjs-2';
import { CategoryScale, Chart as ChartJS, Filler, Legend, LinearScale, LineElement, PointElement, Title, Tooltip } from 'chart.js';
import type { ChartData, ChartOptions } from 'chart.js';
import type { HourlyWeather } from '../../types';
import { useTheme } from '../../context/ThemeContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler, Legend);

export function TemperatureChart({ hourlyData }: { hourlyData: HourlyWeather[] }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const filteredData = hourlyData.filter((_, index) => index % 2 === 0);
  const highlightIndex = Math.min(6, Math.max(filteredData.length - 1, 0));
  const data: ChartData<'line'> = {
    labels: filteredData.map((item) => item.hora),
    datasets: [{
      label: 'Temperatura (°C)',
      data: filteredData.map((item) => item.temperatura),
      fill: true,
      borderColor: '#2f67f6',
      backgroundColor: 'rgba(47, 103, 246, 0.12)',
      pointRadius: filteredData.map((_, index) => (index === highlightIndex ? 5 : 3)),
      pointHoverRadius: filteredData.map((_, index) => (index === highlightIndex ? 6 : 4)),
      pointBorderWidth: 2,
      pointBackgroundColor: filteredData.map((_, index) => (index === highlightIndex ? '#2f67f6' : isDark ? '#121a29' : '#ffffff')),
      pointBorderColor: '#2f67f6',
      tension: 0.38,
    }],
  };
  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        align: 'start',
        labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, pointStyle: 'line', color: isDark ? '#aebbd0' : '#66738f' },
      },
      tooltip: {
        backgroundColor: isDark ? '#172132' : '#ffffff',
        titleColor: isDark ? '#f3f6fb' : '#1f2c46',
        bodyColor: '#2f67f6',
        borderColor: isDark ? '#30405a' : '#d7e3ff',
        borderWidth: 1,
        displayColors: false,
        titleAlign: 'center',
        bodyAlign: 'center',
        padding: 10,
        callbacks: {
          title: (items) => items[0]?.label ?? '',
          label: (item) => `${item.formattedValue}°C`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: isDark ? '#91a1ba' : '#7f8ba3' },
      },
      y: {
        border: { display: false },
        grid: { color: isDark ? 'rgba(66, 83, 110, 0.55)' : 'rgba(213, 223, 238, 0.9)' },
        ticks: { color: isDark ? '#91a1ba' : '#7f8ba3' },
      },
    },
  };

  return <div className="h-[270px] w-full"><Line data={data} options={options} /></div>;
}
