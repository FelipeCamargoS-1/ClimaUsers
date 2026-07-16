import { useEffect } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const markerIcon = new L.Icon({ iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png', shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41] });

function Recenter({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo([latitude, longitude], 10, {
      animate: true,
      duration: 1.8,
      easeLinearity: 0.25,
    });
  }, [latitude, longitude, map]);

  return null;
}

export function Map({ latitude, longitude, city, state }: { latitude: number; longitude: number; city: string; state: string }) {
  return (
    <div className="h-full overflow-hidden rounded-[24px]">
      <MapContainer center={[latitude, longitude]} zoom={10} className="h-full w-full">
        <Recenter latitude={latitude} longitude={longitude} />
        <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[latitude, longitude]} icon={markerIcon}><Popup>{city} - {state}</Popup></Marker>
      </MapContainer>
    </div>
  );
}
