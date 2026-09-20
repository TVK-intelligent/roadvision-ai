import React, { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, MapPin } from 'lucide-react';

// Sửa lỗi icon marker Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapPickerProps {
  latitude: number;
  longitude: number;
  onLocationChange: (lat: number, lng: number) => void;
  className?: string;
}

// Bắt sự kiện click trên bản đồ để di chuyển Marker
const MapClickHandler: React.FC<{ onLocationChange: (lat: number, lng: number) => void }> = ({ onLocationChange }) => {
  useMapEvents({
    click(e) {
      onLocationChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

// Đồng bộ vị trí trung tâm và sửa kích thước container
const MapSyncer: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();
    const t = setTimeout(() => map.invalidateSize(), 300);
    return () => clearTimeout(t);
  }, [map]);

  useEffect(() => {
    map.setView(center, map.getZoom() < 14 ? 15 : map.getZoom());
  }, [center, map]);

  return null;
};

export const MapPicker: React.FC<MapPickerProps> = ({
  latitude,
  longitude,
  onLocationChange,
  className = 'h-64 w-full',
}) => {
  const markerRef = useRef<L.Marker>(null);

  const position: [number, number] = [
    latitude && !isNaN(latitude) ? latitude : 20.436036,
    longitude && !isNaN(longitude) ? longitude : 105.904596,
  ];

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const latLng = marker.getLatLng();
          onLocationChange(latLng.lat, latLng.lng);
        }
      },
    }),
    [onLocationChange]
  );

  return (
    <div className={`relative overflow-hidden rounded-xl border border-outline-variant/50 shadow-sm ${className}`}>
      <MapContainer
        center={position}
        zoom={15}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', minHeight: '100%' }}
      >
        <MapSyncer center={position} />
        <MapClickHandler onLocationChange={onLocationChange} />
        <TileLayer
          attribution='&copy; Google Maps'
          url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
          maxZoom={20}
        />
        <Marker
          draggable={true}
          eventHandlers={eventHandlers}
          position={position}
          ref={markerRef}
        >
          <Popup minWidth={90}>
            <div className="text-xs font-sans">
              <span className="font-bold text-primary block">Tọa độ sự cố:</span>
              <span className="font-mono text-gray-600">{position[0].toFixed(6)}, {position[1].toFixed(6)}</span>
              <p className="text-[10px] text-gray-500 mt-1 italic">Kéo thả ghim hoặc click trên bản đồ để đổi vị trí</p>
            </div>
          </Popup>
        </Marker>
      </MapContainer>

      {/* Chú thích nhanh trên góc bản đồ */}
      <div className="absolute bottom-2 left-2 z-[400] bg-surface-container-lowest/90 backdrop-blur-sm px-2.5 py-1 rounded-md text-[11px] font-medium text-on-surface shadow flex items-center gap-1.5 border border-outline-variant/30 pointer-events-none">
        <MapPin className="w-3.5 h-3.5 text-primary" />
        <span>Click hoặc kéo ghim để chọn vị trí chính xác</span>
      </div>
    </div>
  );
};
