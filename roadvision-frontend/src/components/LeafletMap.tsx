import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Sửa lỗi hiển thị icon marker mặc định của Leaflet trong React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface LeafletMapProps {
  latitude: number;
  longitude: number;
  popupTitle?: string;
  className?: string;
}

// Bộ điều khiển kích thước khung bản đồ, khắc phục hiện tượng vỡ/xám ô gạch OSM khi hiển thị trong flex/grid
const MapController: React.FC<{ center: [number, number] }> = ({ center }) => {
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
    map.setView(center, 15);
  }, [center, map]);

  return null;
};

export const LeafletMap: React.FC<LeafletMapProps> = ({
  latitude,
  longitude,
  popupTitle = 'Vị trí sự cố',
  className = 'h-64 w-full rounded-xl',
}) => {
  const position: [number, number] = [
    latitude && !isNaN(Number(latitude)) ? Number(latitude) : 10.776889,
    longitude && !isNaN(Number(longitude)) ? Number(longitude) : 106.700806,
  ];

  return (
    <div className={`overflow-hidden rounded-xl border border-outline-variant/50 shadow-sm relative ${className}`}>
      <MapContainer
        center={position}
        zoom={15}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%', minHeight: '100%' }}
      >
        <MapController center={position} />
        <TileLayer
          attribution='&copy; Google Maps'
          url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
          maxZoom={20}
        />
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
