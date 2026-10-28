/**
 * Tiện ích và dữ liệu tọa độ lộ trình GPS phục vụ mô phỏng tuần tra thực địa
 * Tuyến đường thực tế địa bàn tỉnh Hà Nam (ĐH.08, QL1A, ĐT.494)
 */

export interface PatrolPin {
  id: string;
  lat: number;
  lng: number;
  label: string;
  category: string;
  timestampSec: number;
  timeStr: string;
  snapshotUrl?: string;
  confidence?: number;
}

// 1. Tuyến Mẫu 1: Tuyến ĐH.08 (Xã Thanh Lâm - Phố Cà, Thanh Liêm, Hà Nam) ~ 650m
export const SAMPLE_ROUTE_1: [number, number][] = [
  [20.437520, 105.902800],
  [20.437269, 105.903159],
  [20.436950, 105.903600],
  [20.436680, 105.903950],
  [20.436410, 105.904280],
  [20.436150, 105.904550],
  [20.435880, 105.904810],
  [20.435600, 105.905100],
  [20.435320, 105.905420],
  [20.435010, 105.905800],
  [20.434720, 105.906150],
  [20.434400, 105.906510],
  [20.434050, 105.906920],
  [20.433720, 105.907300],
  [20.433350, 105.907720],
  [20.433010, 105.908100],
  [20.432650, 105.908550],
  [20.432300, 105.908980],
  [20.431950, 105.909400],
  [20.431600, 105.909850],
];

// 2. Tuyến Mẫu 2: Tuyến Quốc Lộ 1A (Đoạn qua Kiện Khê - Phố Cà) ~ 1.1km
export const SAMPLE_ROUTE_2: [number, number][] = [
  [20.448500, 105.912200],
  [20.447400, 105.912380],
  [20.446200, 105.912550],
  [20.445000, 105.912700],
  [20.443800, 105.912900],
  [20.442500, 105.913100],
  [20.441200, 105.913300],
  [20.439800, 105.913520],
  [20.438500, 105.913750],
  [20.437200, 105.913980],
  [20.435900, 105.914200],
  [20.434500, 105.914420],
  [20.433200, 105.914650],
  [20.431800, 105.914900],
  [20.430500, 105.915150],
  [20.429100, 105.915400],
  [20.427800, 105.915650],
  [20.426500, 105.915900],
];

// 3. Tuyến Mẫu 3: Tuyến Đường Tỉnh ĐT.494 (Thanh Liêm, Hà Nam) ~ 850m
export const SAMPLE_ROUTE_3: [number, number][] = [
  [20.441800, 105.898500],
  [20.441650, 105.899800],
  [20.441450, 105.901200],
  [20.441200, 105.902600],
  [20.440950, 105.904000],
  [20.440700, 105.905400],
  [20.440450, 105.906800],
  [20.440180, 105.908200],
  [20.439900, 105.909600],
  [20.439600, 105.911000],
  [20.439300, 105.912400],
  [20.439050, 105.913800],
  [20.438800, 105.915200],
];

/**
 * Nội suy vị trí xe tuần tra mượt mà theo tiến độ video (từ 0.0 đến 1.0)
 */
export function interpolatePosition(route: [number, number][], progress: number): [number, number] {
  if (!route || route.length === 0) return [20.437269, 105.903159];
  if (route.length === 1 || progress <= 0) return route[0];
  if (progress >= 1) return route[route.length - 1];

  const exactIndex = progress * (route.length - 1);
  const i0 = Math.floor(exactIndex);
  const i1 = Math.min(i0 + 1, route.length - 1);
  const t = exactIndex - i0;

  const lat = route[i0][0] + (route[i1][0] - route[i0][0]) * t;
  const lng = route[i0][1] + (route[i1][1] - route[i0][1]) * t;
  return [Number(lat.toFixed(6)), Number(lng.toFixed(6))];
}

/**
 * Lấy danh sách các điểm xe đã đi qua (đoạn đường traveled)
 */
export function getTraveledPath(route: [number, number][], currentPos: [number, number], progress: number): [number, number][] {
  if (!route || route.length === 0) return [];
  if (progress <= 0) return [route[0]];
  if (progress >= 1) return [...route];

  const exactIndex = progress * (route.length - 1);
  const i0 = Math.floor(exactIndex);
  const traveled = route.slice(0, i0 + 1);
  traveled.push(currentPos);
  return traveled;
}

/**
 * Tính tổng chiều dài lộ trình (Haversine, đơn vị km)
 */
export function calculateRouteDistanceKm(route: [number, number][]): number {
  if (!route || route.length < 2) return 0;
  let totalMeters = 0;
  for (let i = 0; i < route.length - 1; i++) {
    const [lat1, lon1] = route[i];
    const [lat2, lon2] = route[i + 1];
    const R = 6371e3; // meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    totalMeters += R * c;
  }
  return Number((totalMeters / 1000).toFixed(2));
}

/**
 * Phân tích tệp GPX hoặc GeoJSON được tải lên từ thiết bị/Google Maps
 */
export function parseGpxOrGeoJson(content: string): [number, number][] {
  const points: [number, number][] = [];
  try {
    const trimmed = content.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      // GeoJSON format
      const json = JSON.parse(trimmed);
      let coords: any[] = [];
      if (json.type === 'FeatureCollection' && json.features?.length > 0) {
        coords = json.features[0].geometry?.coordinates || [];
      } else if (json.type === 'Feature') {
        coords = json.geometry?.coordinates || [];
      } else if (json.type === 'LineString') {
        coords = json.coordinates || [];
      }

      for (const c of coords) {
        if (Array.isArray(c) && c.length >= 2) {
          // GeoJSON is [lon, lat] -> convert to [lat, lng]
          points.push([Number(c[1]), Number(c[0])]);
        }
      }
    } else {
      // GPX XML format
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(content, 'text/xml');
      const trkpts = xmlDoc.querySelectorAll('trkpt');
      trkpts.forEach((pt) => {
        const lat = parseFloat(pt.getAttribute('lat') || '');
        const lon = parseFloat(pt.getAttribute('lon') || '');
        if (!isNaN(lat) && !isNaN(lon)) {
          points.push([lat, lon]);
        }
      });

      if (points.length === 0) {
        // Fallback for wpt
        const wpts = xmlDoc.querySelectorAll('wpt');
        wpts.forEach((pt) => {
          const lat = parseFloat(pt.getAttribute('lat') || '');
          const lon = parseFloat(pt.getAttribute('lon') || '');
          if (!isNaN(lat) && !isNaN(lon)) {
            points.push([lat, lon]);
          }
        });
      }
    }
  } catch (err) {
    console.error('Lỗi khi phân tích tệp GPS:', err);
  }
  return points;
}
