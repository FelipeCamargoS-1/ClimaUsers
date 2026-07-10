import { Line } from 'react-chartjs-2';
import { CategoryScale, Chart as ChartJS, Filler, Legend, LinearScale, LineElement, PointElement, Title, Tooltip } from 'chart.js';
import type { ChartData, ChartOptions } from 'chart.js';
import type { HourlyWeather } from '../../types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler, Legend);

export function TemperatureChart({ hourlyData }: { hourlyData: HourlyWeather[] }) {
  const filteredData = hourlyData.filter((_, index) => index % 2 === 0);
  const data: ChartData<'line'> = { labels: filteredData.map((item) => item.hora), datasets: [{ label: 'Temperatura (°C)', data: filteredData.map((item) => item.temperatura), fill: true, borderColor: 'rgb(91, 92, 226)', backgroundColor: 'rgba(91, 92, 226, 0.12)', tension: 0.4 }] };
  const options: ChartOptions<'line'> = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
  return <div className="h-[260px] w-full"><Line data={data} options={options} /></div>;
}
