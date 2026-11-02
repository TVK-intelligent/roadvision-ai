import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Sửa lỗi hiển thị icon marker mặc định của Leaflet trong React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Icon màu xanh lá dành riêng cho Trụ sở Tổ đội
const depotIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface LeafletMapProps {
  latitude: number;
  longitude: number;
  popupTitle?: string;
  className?: string;
  routePolyline?: [number, number][];
  routeOrigin?: { lat: number; lon: number; title: string };
}

// Bộ điều khiển kích thước khung bản đồ và tự động bám góc nhìn theo toàn bộ lộ trình OSRM
const MapController: React.FC<{ center: [number, number]; routePolyline?: [number, number][] }> = ({
  center,
  routePolyline,
}) => {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();
    const timer1 = setTimeout(() => map.invalidateSize(), 150);
    const timer2 = setTimeout(() => map.invalidateSize(), 500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [map]);

  useEffect(() => {
    if (routePolyline && routePolyline.length > 1) {
      const bounds = L.latLngBounds(routePolyline);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    } else {
      map.setView(center, 15);
    }
  }, [center, routePolyline, map]);

  return null;
};

export const LeafletMap: React.FC<LeafletMapProps> = ({
  latitude,
  longitude,
  popupTitle = 'Vị trí sự cố',
  className = 'h-64 w-full rounded-xl',
  routePolyline,
  routeOrigin,
}) => {
  const position: [number, number] = [
    latitude && !isNaN(Number(latitude)) ? Number(latitude) : 21.0285,
    longitude && !isNaN(Number(longitude)) ? Number(longitude) : 105.8048,
  ];

  return (
    <div className={`overflow-hidden rounded-xl border border-outline-variant/50 shadow-sm relative z-0 isolate ${className}`}>
      <MapContainer
        center={position}
        zoom={15}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%', minHeight: '100%' }}
      >
        <MapController center={position} routePolyline={routePolyline} />
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        {/* Lộ trình đường bộ OSRM */}
        {routePolyline && routePolyline.length > 0 && (
          <Polyline
            positions={routePolyline}
            color="#2563eb"
            weight={5}
            opacity={0.85}
          />
        )}
        {/* Marker trụ sở xuất phát */}
        {routeOrigin && (
          <Marker position={[routeOrigin.lat, routeOrigin.lon]} icon={depotIcon}>
            <Popup>
              <div className="text-xs font-semibold text-emerald-800">🏢 {routeOrigin.title}</div>
              <div className="text-[11px] text-slate-500">Trụ sở xuất phát điều phối</div>
            </Popup>
          </Marker>
        )}
        {/* Marker điểm sự cố */}
        <Marker position={position}>
          <Popup>
            <div className="text-sm font-semibold">{popupTitle}</div>
            <div className="text-xs text-gray-500 font-mono">
              {position[0].toFixed(6)}, {position[1].toFixed(6)}
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};
