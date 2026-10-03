import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { incidentApi } from '../services/incidentApi';
import { Incident } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  MapPin,
  Search,
  ArrowUpRight,
} from 'lucide-react';

// Sửa cấu hình default icon cho Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Marker GIS chuyên nghiệp, chuẩn màu, không dùng emoji, không nhấp nháy liên tục
const createCustomIcon = (category: string, status: string) => {
  let bgColor = '#dc2626'; // Đỏ: Ổ gà

  if (status === 'RESOLVED' || status === 'CLOSED') {
    bgColor = '#16a34a'; // Xanh lá: Đã khắc phục / Đóng
  } else if (category === 'ROAD_CRACK') {
    bgColor = '#d97706'; // Vàng cam: Nứt mặt đường
  } else if (category === 'ROAD_FLOODING') {
    bgColor = '#2563eb'; // Xanh dương: Ngập úng
  } else if (category === 'ROAD_OBSTACLE' || category === 'COMPLEX_DAMAGE' || category === 'OTHER') {
    bgColor = '#475569'; // Slate: Vật cản / Khác
  }

  const html = `
    <div style="display: flex; align-items: center; justify-content: center;">
      <div style="width: 20px; height: 20px; border-radius: 50%; background-color: ${bgColor}; border: 2.5px solid #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.35);"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-map-marker',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
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
          const first = res.data[0];
          if (first && !isNaN(Number(first.latitude)) && !isNaN(Number(first.longitude))) {
            setActiveCenter([Number(first.latitude), Number(first.longitude)]);
          }
        }
      })
      .catch(() => {
        setIncidents([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredIncidents = incidents.filter((item) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchText =
        item.title?.toLowerCase().includes(q) ||
        item.ticketCode?.toLowerCase().includes(q) ||
        item.address?.toLowerCase().includes(q);
      if (!matchText) return false;
    }

    if (selectedStatus === 'PENDING') {
      if (item.status !== 'SUBMITTED' && item.status !== 'AI_ANALYZED') return false;
    } else if (selectedStatus === 'WORKING') {
      if (item.status !== 'ASSIGNED' && item.status !== 'IN_PROGRESS') return false;
    } else if (selectedStatus === 'DONE') {
      if (item.status !== 'RESOLVED' && item.status !== 'CLOSED') return false;
    }

    if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
      return false;
    }

    return true;
  });

  const stats = {
    total: incidents.length,
    potholes: incidents.filter((i) => i.category === 'POTHOLE').length,
    cracks: incidents.filter((i) => i.category === 'ROAD_CRACK').length,
    resolved: incidents.filter((i) => i.status === 'RESOLVED' || i.status === 'CLOSED').length,
  };

  const defaultPosition: [number, number] =
    incidents.length > 0 && !isNaN(Number(incidents[0].latitude)) && !isNaN(Number(incidents[0].longitude))
      ? [Number(incidents[0].latitude), Number(incidents[0].longitude)]
      : [20.436036, 105.904596];

  return (
    <div className="flex flex-col gap-6 py-4">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wide">
            <MapPin className="w-4 h-4 text-blue-600" />
            <span>Bản đồ số không gian GIS</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1">
            Bản đồ giám sát sự cố hạ tầng
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Trực quan hóa phân bố các điểm hư hại mặt đường theo vị trí địa lý, trạng thái tiếp nhận và tiến độ xử lý.
          </p>
        </div>

        {/* Thẻ đếm KPI */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-slate-50 px-3 py-2 rounded-md border border-slate-200 text-center">
            <div className="text-base font-bold text-slate-900">{stats.total}</div>
            <div className="text-[11px] text-slate-500 font-medium">Tổng sự cố</div>
          </div>
          <div className="bg-slate-50 px-3 py-2 rounded-md border border-slate-200 text-center">
            <div className="text-base font-bold text-rose-600">{stats.potholes}</div>
            <div className="text-[11px] text-slate-500 font-medium">Ổ gà</div>
          </div>
          <div className="bg-slate-50 px-3 py-2 rounded-md border border-slate-200 text-center">
            <div className="text-base font-bold text-amber-600">{stats.cracks}</div>
            <div className="text-[11px] text-slate-500 font-medium">Nứt mặt đường</div>
          </div>
          <div className="bg-slate-50 px-3 py-2 rounded-md border border-slate-200 text-center">
            <div className="text-base font-bold text-emerald-600">{stats.resolved}</div>
            <div className="text-[11px] text-slate-500 font-medium">Đã khắc phục</div>
          </div>
        </div>
      </div>

      {/* Bố cục chính: Cột Danh sách bên trái & Bản đồ GIS bên phải */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[650px]">
        {/* Danh mục bên trái (4 cột) */}
        <div className="lg:col-span-4 bg-white rounded-lg border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          {/* Hộp tìm kiếm và lọc */}
          <div className="p-3.5 border-b border-slate-200 flex flex-col gap-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Tìm theo mã vé, tên đường..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-md bg-white text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-900"
              />
            </div>

            {/* Bộ lọc trạng thái */}
            <div className="flex items-center gap-1 overflow-x-auto text-xs pb-0.5">
              <button
                onClick={() => setSelectedStatus('ALL')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedStatus === 'ALL'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                Tất cả ({incidents.length})
              </button>
              <button
                onClick={() => setSelectedStatus('PENDING')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedStatus === 'PENDING'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                Chờ duyệt
              </button>
              <button
                onClick={() => setSelectedStatus('WORKING')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedStatus === 'WORKING'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                Đang sửa
              </button>
              <button
                onClick={() => setSelectedStatus('DONE')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedStatus === 'DONE'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                Đã xử lý
              </button>
            </div>

            {/* Bộ lọc phân loại sự cố */}
            <div className="flex items-center gap-1 overflow-x-auto text-xs pt-1 border-t border-slate-100">
              {[
                { key: 'ALL', label: 'Tất cả loại' },
                { key: 'POTHOLE', label: 'Ổ gà' },
                { key: 'ROAD_CRACK', label: 'Vết nứt' },
                { key: 'ROAD_FLOODING', label: 'Ngập úng' },
                { key: 'ROAD_OBSTACLE', label: 'Vật cản' },
                { key: 'COMPLEX_DAMAGE', label: 'Đa sự cố' },
              ].map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`px-2 py-0.5 rounded-md whitespace-nowrap text-[11px] transition-colors ${
                    selectedCategory === cat.key
                      ? 'bg-slate-900 text-white font-medium'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Danh sách cuộn các điểm */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500">Đang tải dữ liệu không gian...</div>
            ) : filteredIncidents.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
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
                  className={`p-2.5 rounded-md cursor-pointer transition-colors flex gap-2.5 hover:bg-slate-50 ${
                    selectedIncident?.id === inc.id
                      ? 'bg-blue-50/70 border border-blue-200'
                      : ''
                  }`}
                >
                  <img
                    src={inc.imageUrl}
                    alt={inc.ticketCode}
                    className="w-14 h-14 rounded-md object-cover shrink-0 border border-slate-200"
                  />
                  <div className="flex-1 flex flex-col justify-between overflow-hidden">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-xs font-semibold text-blue-700">
                        {inc.ticketCode}
                      </span>
                      <StatusBadge status={inc.status} />
                    </div>
                    <div className="text-xs font-medium text-slate-900 truncate">
                      {inc.title}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="truncate max-w-[140px]">{inc.address}</span>
                      {inc.aiDetection && (
                        <span className="font-mono font-medium text-slate-700">
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
        <div className="lg:col-span-8 bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden relative">
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
                  icon={createCustomIcon(inc.category, inc.status)}
                  eventHandlers={{
                    click: () => {
                      setSelectedIncident(inc);
                    },
                  }}
                >
                  <Popup>
                    <div className="flex flex-col gap-2 max-w-[240px] p-0.5">
                      <img
                        src={inc.imageUrl}
                        alt={inc.ticketCode}
                        className="w-full h-28 object-cover rounded-md border border-slate-200"
                      />
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-xs font-semibold text-blue-700">
                          {inc.ticketCode}
                        </span>
                        <StatusBadge status={inc.status} />
                      </div>
                      <div className="text-xs font-semibold text-slate-900 line-clamp-2">
                        {inc.title}
                      </div>
                      <div className="text-[11px] text-slate-500">{inc.address}</div>
                      <Link
                        to={`/incidents/${inc.id}`}
                        className="mt-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 !text-white font-semibold text-xs hover:bg-blue-700 transition-colors shadow-xs"
                      >
                        <span className="!text-white">Xem chi tiết hồ sơ</span>
                        <ArrowUpRight className="w-3.5 h-3.5 !text-white" />
                      </Link>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* Chú giải bản đồ */}
          <div className="absolute bottom-3 right-3 z-[400] bg-white p-3 rounded-md shadow-md border border-slate-200 text-xs flex flex-col gap-1.5">
            <span className="font-semibold text-slate-900 text-xs uppercase tracking-wide">
              Chú giải bản đồ
            </span>
            <div className="flex items-center gap-2 text-slate-700">
              <span className="w-3 h-3 rounded-full bg-rose-600 border border-white shadow-xs"></span>
              <span>Ổ gà (Pothole)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <span className="w-3 h-3 rounded-full bg-amber-600 border border-white shadow-xs"></span>
              <span>Nứt mặt đường (Crack)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <span className="w-3 h-3 rounded-full bg-blue-600 border border-white shadow-xs"></span>
              <span>Điểm ngập úng (Flooding)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <span className="w-3 h-3 rounded-full bg-slate-600 border border-white shadow-xs"></span>
              <span>Vật cản / Khác</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <span className="w-3 h-3 rounded-full bg-emerald-600 border border-white shadow-xs"></span>
              <span>Đã khắc phục (Resolved)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
