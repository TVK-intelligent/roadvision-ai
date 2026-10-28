import React, { useEffect, useRef, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PatrolPin } from '../utils/patrolRoutes';
import { Eye, Navigation, AlertTriangle, Layers, Maximize2 } from 'lucide-react';

// Sửa lỗi hiển thị icon marker mặc định của Leaflet trong React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface PatrolRouteMapProps {
  routePoints: [number, number][];
  currentPosition: [number, number];
  traveledPoints: [number, number][];
  incidentPins: PatrolPin[];
  className?: string;
  routeName?: string;
}

// Custom DivIcon cho xe tuần tra hành trình
const createVehicleIcon = () => {
  return L.divIcon({
    className: 'patrol-vehicle-marker',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;">
        <div style="position: absolute; width: 36px; height: 36px; border-radius: 9999px; background: rgba(37, 99, 235, 0.25); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: relative; width: 28px; height: 28px; border-radius: 9999px; background: #2563eb; color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); border: 2.5px solid #ffffff; font-size: 14px;">
          🚗
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

// Custom DivIcon cho điểm sự cố AI phát hiện (Ổ gà, Vết nứt)
const createIncidentIcon = (category: string) => {
  const isPothole = category === 'POTHOLE';
  const bg = isPothole ? '#ef4444' : '#f59e0b';
  return L.divIcon({
    className: 'patrol-incident-marker',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; cursor: pointer;">
        <div style="width: 22px; height: 22px; border-radius: 9999px; background: ${bg}; color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.35); border: 2px solid #ffffff; font-weight: 800; font-size: 11px;">
          !
        </div>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
};

// Custom DivIcon cho điểm Xuất phát và Đích
const createEndpointIcon = (type: 'START' | 'END') => {
  const isStart = type === 'START';
  const color = isStart ? '#10b981' : '#64748b';
  const text = isStart ? 'A' : 'B';
  return L.divIcon({
    className: `patrol-endpoint-${type.toLowerCase()}`,
    html: `
      <div style="width: 22px; height: 22px; border-radius: 9999px; background: ${color}; color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 11px; border: 2px solid #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.25);">
        ${text}
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
};

// Bộ điều khiển camera bản đồ (Follow vehicle hoặc Fit Bounds)
const MapController: React.FC<{
  currentPos: [number, number];
  routePoints: [number, number][];
  autoFollow: boolean;
}> = ({ currentPos, routePoints, autoFollow }) => {
  const map = useMap();
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    map.invalidateSize();
    const timer = setTimeout(() => map.invalidateSize(), 300);
    return () => clearTimeout(timer);
  }, [map]);

  // Lần đầu tải: Tự động fit toàn bộ bounds của lộ trình
  useEffect(() => {
    if (!hasInitializedRef.current && routePoints.length > 1) {
      try {
        const bounds = L.latLngBounds(routePoints.map((p) => [p[0], p[1]]));
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 17 });
        hasInitializedRef.current = true;
      } catch (e) {
        // Fallback
        map.setView(currentPos, 16);
      }
    }
  }, [routePoints, map, currentPos]);

  // Khi xe chạy: Nếu bật autoFollow, camera trượt theo xe
  useEffect(() => {
    if (autoFollow && currentPos) {
      map.panTo(currentPos, { animate: true, duration: 0.3 });
    }
  }, [currentPos, autoFollow, map]);

  return null;
};

export const PatrolRouteMap: React.FC<PatrolRouteMapProps> = ({
  routePoints,
  currentPosition,
  traveledPoints,
  incidentPins,
  className = 'h-64 w-full',
  routeName = 'Tuyến đường tuần tra',
}) => {
  const [autoFollow, setAutoFollow] = useState<boolean>(true);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

  const vehicleIcon = useMemo(() => createVehicleIcon(), []);
  const startIcon = useMemo(() => createEndpointIcon('START'), []);
  const endIcon = useMemo(() => createEndpointIcon('END'), []);

  const handleFitBounds = () => {
    if (mapInstance && routePoints.length > 1) {
      try {
        const bounds = L.latLngBounds(routePoints.map((p) => [p[0], p[1]]));
        mapInstance.fitBounds(bounds, { padding: [30, 30], maxZoom: 17 });
        setAutoFollow(false);
      } catch (e) {
        mapInstance.setView(currentPosition, 16);
      }
    }
  };

  const startPoint = routePoints.length > 0 ? routePoints[0] : currentPosition;
  const endPoint = routePoints.length > 1 ? routePoints[routePoints.length - 1] : null;

  return (
    <div className={`overflow-hidden rounded-2xl border border-outline-variant/30 shadow-xs relative z-0 isolate ${className}`}>
      {/* Thanh công cụ điều khiển trên bản đồ */}
      <div className="absolute top-2.5 right-2.5 z-[1000] flex items-center gap-1.5 bg-surface-container-lowest/90 backdrop-blur-md px-2 py-1 rounded-xl border border-outline-variant/30 shadow-sm text-[11px]">
        <button
          type="button"
          onClick={() => setAutoFollow(!autoFollow)}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
            autoFollow
              ? 'bg-primary text-on-primary'
              : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
          }`}
          title={autoFollow ? 'Đang bám sát vị trí xe (Nhấn để tắt)' : 'Bấm để tự động bám theo xe'}
        >
          <Navigation className={`w-3 h-3 ${autoFollow ? 'animate-pulse' : ''}`} />
          <span>Bám xe</span>
        </button>

        <button
          type="button"
          onClick={handleFitBounds}
          className="p-1 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container transition-all cursor-pointer"
          title="Xem toàn cảnh tuyến đường"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Thông tin số km và sự cố ghim trên bản đồ */}
      <div className="absolute bottom-2 left-2 z-[1000] flex items-center gap-2 bg-surface-container-lowest/90 backdrop-blur-md px-2.5 py-1 rounded-xl border border-outline-variant/30 shadow-sm text-[11px] font-mono">
        <span className="flex items-center gap-1 text-on-surface-variant">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
          <span>Đã đi: {traveledPoints.length} mốc</span>
        </span>
        {incidentPins.length > 0 && (
          <span className="flex items-center gap-1 text-error font-bold border-l border-outline-variant/30 pl-2">
            <span>🔴 {incidentPins.length} sự cố ghim</span>
          </span>
        )}
      </div>

      <MapContainer
        center={currentPosition}
        zoom={16}
        scrollWheelZoom={false}
        ref={setMapInstance}
        style={{ height: '100%', width: '100%', minHeight: '100%' }}
      >
        <MapController
          currentPos={currentPosition}
          routePoints={routePoints}
          autoFollow={autoFollow}
        />
        <TileLayer
          attribution='&copy; Google Maps'
          url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
          maxZoom={20}
        />

        {/* 1. Tuyến đường quy hoạch/dự kiến tuần tra (Đường nét đứt màu xanh dương) */}
        {routePoints.length > 1 && (
          <Polyline
            positions={routePoints}
            pathOptions={{
              color: '#3b82f6',
              weight: 4,
              dashArray: '6, 8',
              opacity: 0.6,
            }}
          />
        )}

        {/* 2. Tuyến đường xe tuần tra thực tế đã đi qua (Đường nét liền màu xanh lá đậm) */}
        {traveledPoints.length > 1 && (
          <Polyline
            positions={traveledPoints}
            pathOptions={{
              color: '#059669',
              weight: 5,
              opacity: 0.9,
              lineCap: 'round',
            }}
          />
        )}

        {/* Điểm xuất phát (Start) */}
        {startPoint && (
          <Marker position={startPoint} icon={startIcon}>
            <Popup>
              <div className="text-xs font-bold text-emerald-600">🏁 Điểm bắt đầu tuần tra (Km 0+000)</div>
              <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                {startPoint[0].toFixed(6)}, {startPoint[1].toFixed(6)}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Điểm kết thúc (End) */}
        {endPoint && (
          <Marker position={endPoint} icon={endIcon}>
            <Popup>
              <div className="text-xs font-bold text-slate-700">🏁 Điểm đích lộ trình tuần tra</div>
              <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                {endPoint[0].toFixed(6)}, {endPoint[1].toFixed(6)}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Vị trí Xe Tuần Tra thời gian thực */}
        {currentPosition && (
          <Marker position={currentPosition} icon={vehicleIcon} zIndexOffset={1000}>
            <Popup>
              <div className="text-xs font-bold text-primary flex items-center gap-1">
                <span>🚗 Xe Tuần Tra RoadVision AI</span>
              </div>
              <div className="text-[11px] text-gray-600 mt-1 font-mono">
                Tọa độ: {currentPosition[0].toFixed(6)}, {currentPosition[1].toFixed(6)}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">{routeName}</div>
            </Popup>
          </Marker>
        )}

        {/* Các Marker Sự Cố AI Phát Hiện Dọc Tuyến */}
        {incidentPins.map((pin) => (
          <Marker
            key={pin.id}
            position={[pin.lat, pin.lng]}
            icon={createIncidentIcon(pin.category)}
            zIndexOffset={500}
          >
            <Popup>
              <div className="p-1 min-w-[160px]">
                <div className="flex items-center gap-1 font-bold text-xs text-error">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{pin.label}</span>
                </div>
                <div className="text-[11px] text-gray-600 mt-1">
                  Thời gian: <span className="font-mono font-semibold">{pin.timeStr}</span>
                </div>
                <div className="text-[10px] text-gray-500 font-mono">
                  {pin.lat.toFixed(6)}, {pin.lng.toFixed(6)}
                </div>
                {pin.snapshotUrl && (
                  <div className="mt-1.5 rounded-lg overflow-hidden border border-gray-200">
                    <img src={pin.snapshotUrl} alt="Thumbnail sự cố" className="w-full h-16 object-cover" />
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
