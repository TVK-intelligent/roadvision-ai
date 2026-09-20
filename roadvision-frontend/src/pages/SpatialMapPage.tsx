import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { incidentApi } from '../services/incidentApi';
import { Incident, IncidentStatus, Category } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  MapPin,
  Layers,
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowUpRight,
  Filter,
  Navigation,
} from 'lucide-react';

// Sửa cấu hình default icon cho Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Hàm tạo custom divIcon sinh động theo loại hư hỏng và trạng thái
const createCustomIcon = (category: string, status: string, severity?: string) => {
  let bgColor = 'bg-rose-500';
  let iconEmoji = '🕳️';
  let pulse = status !== 'CLOSED' && status !== 'RESOLVED' && severity === 'HIGH';

  if (status === 'RESOLVED' || status === 'CLOSED') {
    bgColor = 'bg-emerald-500';
    iconEmoji = '✓';
  } else if (category === 'ROAD_CRACK') {
    bgColor = 'bg-amber-500';
    iconEmoji = '⚡';
  } else if (category === 'ROAD_FLOODING') {
    bgColor = 'bg-blue-600';
    iconEmoji = '🌊';
  } else if (category === 'ROAD_OBSTACLE') {
    bgColor = 'bg-emerald-600';
    iconEmoji = '🚧';
  } else if (category === 'COMPLEX_DAMAGE') {
    bgColor = 'bg-purple-600';
    iconEmoji = '⚠️';
  } else {
    bgColor = 'bg-rose-600';
    iconEmoji = '🕳️';
  }

  const html = `
    <div class="relative flex items-center justify-center">
      ${pulse ? `<div class="absolute w-8 h-8 rounded-full ${bgColor} opacity-40 animate-ping"></div>` : ''}
      <div class="w-7 h-7 rounded-full ${bgColor} border-2 border-white shadow-lg flex items-center justify-center text-white text-[11px] font-bold">
        ${iconEmoji}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-map-marker',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

// Component con hỗ trợ di chuyển tâm bản đồ mượt mà khi chọn từ danh sách
const MapFlyTo: React.FC<{ center: [number, number] | null }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 16, { duration: 1.2 });
    }
  }, [center, map]);
  return null;
};

export const SpatialMapPage: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeCenter, setActiveCenter] = useState<[number, number] | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  useEffect(() => {
    incidentApi
      .getPublicMapIncidents()
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setIncidents(res.data);
        }
      })
      .catch((err) => {
        console.warn('Lấy dữ liệu bản đồ công khai lỗi:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  // Bộ lọc dữ liệu
  const filteredIncidents = incidents.filter((inc) => {
    const matchSearch =
      search.trim() === '' ||
      inc.ticketCode?.toLowerCase().includes(search.toLowerCase()) ||
      inc.title?.toLowerCase().includes(search.toLowerCase()) ||
      inc.address?.toLowerCase().includes(search.toLowerCase());

    const matchStatus =
      selectedStatus === 'ALL' ||
      (selectedStatus === 'PENDING' && (inc.status === 'SUBMITTED' || inc.status === 'AI_ANALYZED')) ||
      (selectedStatus === 'WORKING' && (inc.status === 'ASSIGNED' || inc.status === 'IN_PROGRESS')) ||
      (selectedStatus === 'DONE' && (inc.status === 'RESOLVED' || inc.status === 'CLOSED'));

    const matchCategory = selectedCategory === 'ALL' || inc.category === selectedCategory;

    return matchSearch && matchStatus && matchCategory;
  });

  // Số liệu tổng hợp nhanh
  const stats = {
    total: incidents.length,
    potholes: incidents.filter((i) => i.category === 'POTHOLE').length,
    cracks: incidents.filter((i) => i.category === 'ROAD_CRACK').length,
    resolved: incidents.filter((i) => i.status === 'RESOLVED' || i.status === 'CLOSED').length,
  };

  const defaultPosition: [number, number] = [10.776889, 106.700806];

  return (
    <div className="flex flex-col gap-5 py-4">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-primary font-mono text-xs font-semibold uppercase">
            <Layers className="w-4 h-4" />
            GIS SPATIAL INTELLIGENCE • HỆ THỐNG BẢN ĐỒ SỐ ĐÔ THỊ
          </div>
          <h1 className="font-display text-2xl font-extrabold text-on-surface mt-1">
            Bản Đồ Không Gian Giám Sát Mặt Đường
          </h1>
          <p className="text-xs text-on-surface-variant">
            Trực quan hóa vị trí các điểm hư hại mặt đường theo thời gian thực được phát hiện qua mô hình AI thị giác máy tính.
          </p>
        </div>

        {/* Thẻ đếm KPI nhanh */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-surface-container-low px-3 py-2 rounded-xl border border-outline-variant/30 text-center">
            <div className="font-mono text-lg font-bold text-primary">{stats.total}</div>
            <div className="text-[10px] text-on-surface-variant font-medium">Tổng Sự Cố</div>
          </div>
          <div className="bg-rose-500/10 px-3 py-2 rounded-xl border border-rose-500/20 text-center">
            <div className="font-mono text-lg font-bold text-rose-600">{stats.potholes}</div>
            <div className="text-[10px] text-rose-700 font-medium">Ổ Gà Nguy Hiểm</div>
          </div>
          <div className="bg-amber-500/10 px-3 py-2 rounded-xl border border-amber-500/20 text-center">
            <div className="font-mono text-lg font-bold text-amber-600">{stats.cracks}</div>
            <div className="text-[10px] text-amber-700 font-medium">Vết Nứt Kết Cấu</div>
          </div>
          <div className="bg-emerald-500/10 px-3 py-2 rounded-xl border border-emerald-500/20 text-center">
            <div className="font-mono text-lg font-bold text-emerald-600">{stats.resolved}</div>
            <div className="text-[10px] text-emerald-700 font-medium">Đã Nghiệm Thu</div>
          </div>
        </div>
      </div>

      {/* Bố cục chính: Cột Danh sách bên trái & Bản đồ GIS bên phải */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[700px]">
        {/* Danh mục bên trái (4 cột) */}
        <div className="lg:col-span-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm flex flex-col overflow-hidden">
          {/* Hộp tìm kiếm và lọc */}
          <div className="p-4 border-b border-outline-variant/30 flex flex-col gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-on-surface-variant absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Tìm mã ticket, tên đường..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-container-low text-xs border border-outline-variant/30 focus:outline-none focus:border-primary"
              />
            </div>

            {/* Bộ lọc trạng thái */}
            <div className="flex items-center gap-1 overflow-x-auto text-xs pb-1">
              <button
                onClick={() => setSelectedStatus('ALL')}
                className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
                  selectedStatus === 'ALL'
                    ? 'bg-primary text-on-primary font-bold shadow-sm'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                Tất cả ({incidents.length})
              </button>
              <button
                onClick={() => setSelectedStatus('PENDING')}
                className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
                  selectedStatus === 'PENDING'
                    ? 'bg-primary text-on-primary font-bold shadow-sm'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                Chờ duyệt
              </button>
              <button
                onClick={() => setSelectedStatus('WORKING')}
                className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
                  selectedStatus === 'WORKING'
                    ? 'bg-primary text-on-primary font-bold shadow-sm'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                Đang sửa
              </button>
              <button
                onClick={() => setSelectedStatus('DONE')}
                className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
                  selectedStatus === 'DONE'
                    ? 'bg-primary text-on-primary font-bold shadow-sm'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                Đã xử lý
              </button>
            </div>

            {/* Bộ lọc 4 phân loại sự cố AI */}
            <div className="flex items-center gap-1 overflow-x-auto text-[11px] pt-1 border-t border-outline-variant/20">
              {[
                { key: 'ALL', label: 'Tất cả loại' },
                { key: 'POTHOLE', label: '🕳️ Ổ gà' },
                { key: 'ROAD_CRACK', label: '⚡ Vết nứt' },
                { key: 'ROAD_FLOODING', label: '🌊 Ngập úng' },
                { key: 'ROAD_OBSTACLE', label: '🚧 Vật cản' },
                { key: 'COMPLEX_DAMAGE', label: '⚠️ Đa sự cố' },
              ].map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`px-2 py-0.5 rounded-md whitespace-nowrap transition-all ${
                    selectedCategory === cat.key
                      ? 'bg-secondary-container text-on-secondary-container font-bold border border-secondary/30'
                      : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Danh sách cuộn các điểm */}
          <div className="flex-1 overflow-y-auto divide-y divide-outline-variant/20 p-2">
            {filteredIncidents.length === 0 ? (
              <div className="p-8 text-center text-xs text-on-surface-variant">
                Không tìm thấy sự cố phù hợp với bộ lọc
              </div>
            ) : (
              filteredIncidents.map((inc) => (
                <div
                  key={inc.id}
                  onClick={() => {
                    setSelectedIncident(inc);
                    setActiveCenter([Number(inc.latitude), Number(inc.longitude)]);
                  }}
                  className={`p-3 rounded-xl cursor-pointer transition-all flex gap-3 hover:bg-surface-container-low ${
                    selectedIncident?.id === inc.id
                      ? 'bg-primary-fixed/30 border border-primary/30'
                      : ''
                  }`}
                >
                  <img
                    src={inc.imageUrl}
                    alt={inc.ticketCode}
                    className="w-16 h-16 rounded-lg object-cover shrink-0 border border-outline-variant/30"
                  />
                  <div className="flex-1 flex flex-col justify-between overflow-hidden">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-[11px] font-bold text-primary">
                        {inc.ticketCode}
                      </span>
                      <StatusBadge status={inc.status} />
                    </div>
                    <div className="text-xs font-semibold text-on-surface truncate">
                      {inc.title}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-on-surface-variant">
                      <span className="truncate max-w-[140px]">{inc.address}</span>
                      {inc.aiDetection && (
                        <span className="font-mono font-bold text-secondary">
                          {(inc.aiDetection.confidence * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Bản đồ GIS bên phải (8 cột) */}
        <div className="lg:col-span-8 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden relative">
          <MapContainer
            center={defaultPosition}
            zoom={14}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; Google Maps'
              url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
              maxZoom={20}
            />

            <MapFlyTo center={activeCenter} />

            {filteredIncidents.map((inc) => {
              const lat = Number(inc.latitude);
              const lng = Number(inc.longitude);
              if (isNaN(lat) || isNaN(lng)) return null;

              return (
                <Marker
                  key={inc.id}
                  position={[lat, lng]}
                  icon={createCustomIcon(inc.category, inc.status, inc.severity)}
                  eventHandlers={{
                    click: () => {
                      setSelectedIncident(inc);
                    },
                  }}
                >
                  <Popup>
                    <div className="flex flex-col gap-2 max-w-[240px] p-1">
                      <img
                        src={inc.imageUrl}
                        alt={inc.ticketCode}
                        className="w-full h-28 object-cover rounded-lg"
                      />
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-xs font-bold text-primary">
                          {inc.ticketCode}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface-container-high">
                          {inc.category}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-gray-800 line-clamp-2">
                        {inc.title}
                      </div>
                      <div className="text-[10px] text-gray-500">{inc.address}</div>
                      {inc.aiDetection && (
                        <div className="text-[10px] font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                          AI Phân Loại: {inc.aiDetection.className} (
                          {(inc.aiDetection.confidence * 100).toFixed(1)}%)
                        </div>
                      )}
                      <Link
                        to={`/incidents/${inc.id}`}
                        className="mt-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors shadow-sm"
                      >
                        <span>Mở Hồ Sơ Chi Tiết</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* Chú giải bản đồ góc dưới phải */}
          <div className="absolute bottom-4 right-4 z-[400] bg-white/95 backdrop-blur-md p-3 rounded-xl shadow-lg border border-outline-variant/40 text-xs flex flex-col gap-1.5">
            <span className="font-bold text-[11px] text-gray-800 uppercase tracking-wider">
              Chú Giải Bản Đồ
            </span>
            <div className="flex items-center gap-2 text-gray-700">
              <span className="w-3 h-3 rounded-full bg-rose-600 border border-white shadow-sm"></span>
              <span>Ổ gà (Pothole)</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <span className="w-3 h-3 rounded-full bg-amber-500 border border-white shadow-sm"></span>
              <span>Nứt mặt đường (Crack)</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <span className="w-3 h-3 rounded-full bg-emerald-500 border border-white shadow-sm"></span>
              <span>Đã vá xong (Resolved)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
