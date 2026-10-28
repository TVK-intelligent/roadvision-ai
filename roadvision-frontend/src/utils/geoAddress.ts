/**
 * Utility hỗ trợ Định vị Ngược (Reverse Geocoding) & Định vị Thuận (Forward Geocoding)
 * với cơ chế nhận diện TUYẾN ĐƯỜNG CHÍNH XÁC (Street/Route Level):
 * 1. Vite Proxy OSM Nominatim (/api/osm/reverse) - Dùng DNS Google 8.8.8.8, trích xuất chính xác tên đường (Quốc lộ, Tỉnh lộ, Số nhà/Tên phố)
 * 2. Photon Komoot Reverse (Dự phòng tên phố)
 * 3. BigDataCloud Client Geocode (Dự phòng đơn vị hành chính)
 * 4. Fallback Tọa độ địa phương
 */

export interface ReverseGeocodeDetail {
  fullAddress: string;
  roadName?: string;
  routeCode?: string;
  suburb?: string;
  cityOrProvince?: string;
}

export async function reverseGeocodeAddress(lat: number, lng: number): Promise<string> {
  // Tầng 1: Sử dụng cổng chuyển tiếp nội bộ /api/osm/reverse (OpenStreetMap Nominatim với DNS Google 8.8.8.8)
  // Xác định chính xác: Tên tuyến đường, mã đường (QL1A, ĐH.08, ĐT494...), số nhà và tên phố
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`/api/osm/reverse?lat=${lat}&lon=${lng}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        const road = data.address.road || data.address.highway || data.address.pedestrian || data.name;
        const suburb = data.address.suburb || data.address.village || data.address.town || data.address.quarter;
        const cityOrState = data.address.city || data.address.state || data.address.province;

        // Nếu có tên đường cụ thể (Ví dụ: "ĐH.08", "Quốc lộ 1A", "Phố Trần Quốc Toản", "ĐT494")
        if (road) {
          const roadLower = road.toLowerCase();
          const roadLabel =
            roadLower.startsWith('đường') ||
            roadLower.startsWith('phố') ||
            roadLower.startsWith('quốc lộ') ||
            roadLower.startsWith('ql') ||
            roadLower.startsWith('đt') ||
            roadLower.startsWith('đh')
              ? (road.startsWith('ĐH') || road.startsWith('ĐT') || road.startsWith('QL') ? `Tuyến ${road}` : road)
              : `Đường ${road}`;

          const parts = [
            roadLabel,
            data.address.house_number ? `Số ${data.address.house_number}` : null,
            suburb,
            data.address.town || data.address.city_district || data.address.county,
            cityOrState,
          ].filter(Boolean);
          return parts.join(', ');
        }

        if (data.display_name) {
          return data.display_name;
        }
      }
    }
  } catch {
    // Tiếp tục chuyển sang Tầng 2 nếu cổng nội bộ gặp sự cố
  }

  // Tầng 2: Thử Photon Komoot (Máy chủ châu Âu mở, nhận diện tên đường phố rất tốt)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        const props = data.features[0].properties;
        const street = props.street || props.name;
        const district = props.district || props.locality;
        const city = props.city || props.state;

        if (street) {
          const parts = [props.housenumber ? `Số ${props.housenumber} ${street}` : street, district, city].filter(
            Boolean
          );
          return parts.join(', ');
        }
      }
    }
  } catch {
    // Tiếp tục chuyển sang Tầng 3
  }

  // Tầng 3: Thử BigDataCloud Client Geocode (CDN toàn cầu)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=vi`,
      { signal: controller.signal }
    );
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      const parts: string[] = [];

      if (data.localityInfo?.administrative && Array.isArray(data.localityInfo.administrative)) {
        const sorted = [...data.localityInfo.administrative]
          .filter(
            (a: any) =>
              a.order >= 6 &&
              a.name &&
              !a.name.toLowerCase().includes('sông hồng') &&
              !a.name.toLowerCase().includes('châu á')
          )
          .sort((a: any, b: any) => (b.adminLevel || 0) - (a.adminLevel || 0));

        for (const item of sorted) {
          if (!parts.includes(item.name)) {
            parts.push(item.name);
          }
        }
      }

      if (parts.length === 0) {
        if (data.locality) parts.push(data.locality);
        if (data.city && data.city !== data.locality) parts.push(data.city);
        if (data.principalSubdivision) parts.push(data.principalSubdivision);
      }

      if (parts.length > 0) {
        return parts.join(', ');
      }
    }
  } catch {
    // Bỏ qua lỗi
  }

  // Tầng 4: Fallback tọa độ không gian chính xác
  return `Vị trí tọa độ [${lat.toFixed(5)}, ${lng.toFixed(5)}]`;
}

/**
 * Tra cứu tọa độ theo tên địa chỉ hoặc chuỗi tọa độ
 */
export async function forwardGeocodeAddress(
  query: string
): Promise<{ lat: number; lng: number; displayName: string } | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  // Kiểm tra nếu người dùng nhập hoặc dán trực tiếp tọa độ: "20.4372, 105.9031"
  const coordMatch = trimmed.match(/^(-?\d+(\.\d+)?)[,\s]+(-?\d+(\.\d+)?)$/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lng = parseFloat(coordMatch[3]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return {
        lat,
        lng,
        displayName: `Tọa độ [${lat.toFixed(5)}, ${lng.toFixed(5)}]`,
      };
    }
  }

  // Thử tra cứu qua cổng proxy nội bộ /api/osm/search
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`/api/osm/search?q=${encodeURIComponent(trimmed)}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          displayName: data[0].display_name || trimmed,
        };
      }
    }
  } catch {
    // Thử photon search
  }

  // Fallback sang Photon Search
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(trimmed)}&limit=1`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        const coords = data.features[0].geometry.coordinates;
        const props = data.features[0].properties;
        return {
          lat: coords[1],
          lng: coords[0],
          displayName: [props.name, props.district, props.city].filter(Boolean).join(', ') || trimmed,
        };
      }
    }
  } catch {
    // Bỏ qua lỗi
  }

  return null;
}

/**
 * Lấy tọa độ dự phòng qua IP mạng khi thiết bị/máy tính bàn không có phần cứng GPS
 */
export async function getIpLocationFallback(): Promise<{ lat: number; lng: number; city?: string } | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch('https://ipwho.is/', { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.latitude && data.longitude) {
        return {
          lat: data.latitude,
          lng: data.longitude,
          city: data.city || data.region,
        };
      }
    }
  } catch {
    // Bỏ qua lỗi IP
  }
  return null;
}
