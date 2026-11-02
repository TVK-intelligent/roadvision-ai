export interface RouteResult {
  distanceKm: number;
  durationMinutes: number;
  isDrivingRoute: boolean; // true: đường bộ OSRM thực tế, false: đường chim bay dự phòng
  polylineCoordinates: [number, number][]; // Tọa độ Leaflet [lat, lon] để vẽ lộ trình
}

const routeCache = new Map<string, RouteResult>();

// Helper tính cự ly Haversine (đường chim bay) làm phương án dự phòng khi mất mạng
export const calculateHaversineKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

export const routingService = {
  /**
   * Tính lộ trình đường bộ thực tế giữa 2 điểm GPS thông qua OSRM (Open Source Routing Machine)
   */
  async getRoute(
    startLat: number,
    startLon: number,
    endLat: number,
    endLon: number
  ): Promise<RouteResult> {
    const cacheKey = `${startLat.toFixed(4)},${startLon.toFixed(4)}->${endLat.toFixed(4)},${endLon.toFixed(4)}`;
    if (routeCache.has(cacheKey)) {
      return routeCache.get(cacheKey)!;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s timeout

      // OSRM chuẩn quốc tế nhận format: {longitude},{latitude}
      const url = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson`;

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`OSRM error: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const primaryRoute = data.routes[0];
        const distanceKm = Math.round((primaryRoute.distance / 1000) * 10) / 10;
        // Thêm 2-3 phút chuẩn bị xuất phát và đèn đỏ nội đô
        const durationMinutes = Math.max(15, Math.round(primaryRoute.duration / 60) + 5);

        // Chuyển đổi [lon, lat] của GeoJSON sang [lat, lon] của Leaflet
        const polylineCoordinates: [number, number][] = (
          primaryRoute.geometry?.coordinates || []
        ).map((coord: [number, number]) => [coord[1], coord[0]]);

        const result: RouteResult = {
          distanceKm,
          durationMinutes,
          isDrivingRoute: true,
          polylineCoordinates,
        };

        routeCache.set(cacheKey, result);
        return result;
      }
    } catch (err) {
      // Khi mất mạng hoặc OSRM bận, tự động fallback sang ước tính thực tế
      // (Hệ số uốn khúc đường đô thị Hà Nội ~1.35x cự ly chim bay)
    }

    const crowFlyKm = calculateHaversineKm(startLat, startLon, endLat, endLon);
    const estRoadKm = Math.round(crowFlyKm * 1.35 * 10) / 10;
    const estMinutes = Math.max(25, Math.round((estRoadKm / 22) * 60) + 3);

    const fallbackResult: RouteResult = {
      distanceKm: estRoadKm,
      durationMinutes: estMinutes,
      isDrivingRoute: false,
      polylineCoordinates: [
        [startLat, startLon],
        [endLat, endLon],
      ],
    };

    routeCache.set(cacheKey, fallbackResult);
    return fallbackResult;
  },
};
