import { CloudSun, Compass, Droplets, Gauge, MapPin, Sunrise, Sunset, Wind } from 'lucide-react';
import type { WeatherData } from '../../types';

export function WeatherCard({ data }: { data: WeatherData }) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-600 via-blue-600 to-indigo-700 p-5 text-white shadow-lg sm:p-7">
      <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-cyan-300/10 blur-3xl" />
      <div className="relative">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-2 text-sm text-white/75"><MapPin className="h-4 w-4" />{data.cidade}, {data.estado}</div>
            <div className="mt-1 text-xs text-white/60">Condições meteorológicas atuais</div>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/80">
            <Metric icon={Droplets} label="Umidade" value={`${data.umidade}%`} />
            <Metric icon={Wind} label="Vento" value={`${data.vento} km/h`} />
            <Metric icon={Gauge} label="Pressão" value={`${data.pressao} hPa`} />
          </div>
        </div>
        <div className="mt-8 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div className="flex items-center gap-4">
            {data.icone ? <img src={data.icone} alt={data.condicao} className="h-20 w-20 drop-shadow-lg sm:h-24 sm:w-24" /> : <CloudSun className="h-20 w-20" />}
            <div><div className="text-5xl font-light tracking-tight sm:text-6xl">{data.temperatura}°</div><div className="mt-1 text-sm font-medium capitalize text-white/90">{data.condicao}</div><div className="text-xs text-white/65">Sensação de {data.sensacaoTermica}°C</div></div>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs sm:text-right">
            <Metric icon={Sunrise} label="Nascer do sol" value={data.nascerDoSol} />
            <Metric icon={Sunset} label="Pôr do sol" value={data.porDoSol} />
            <Metric icon={Compass} label="Coordenadas" value={`${data.latitude.toFixed(2)}, ${data.longitude.toFixed(2)}`} />
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Droplets; label: string; value: string }) {
  return <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-white/75" /><span><span className="block text-[10px] text-white/55">{label}</span><strong className="font-semibold text-white">{value}</strong></span></div>;
}
