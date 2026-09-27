/**
 * Trích xuất tọa độ GPS (Latitude, Longitude) từ thẻ EXIF của tệp ảnh JPEG/HEIC
 * Thuần TypeScript, không phụ thuộc thư viện ngoài.
 */

export interface ExifGpsCoordinate {
  latitude: number;
  longitude: number;
}

export async function extractGpsFromExif(file: File): Promise<ExifGpsCoordinate | null> {
  try {
    const buffer = await file.slice(0, 128 * 1024).arrayBuffer(); // Đọc 128KB đầu là đủ cho EXIF
    const view = new DataView(buffer);

    // Kiểm tra định dạng JPEG (0xFFD8)
    if (view.getUint16(0, false) !== 0xffd8) {
      return null;
    }

    let offset = 2;
    const length = view.byteLength;

    while (offset < length - 4) {
      const marker = view.getUint16(offset, false);
      offset += 2;

      // APP1 marker chứa EXIF (0xFFE1)
      if (marker === 0xffe1) {
        const app1Length = view.getUint16(offset, false);
        offset += 2;

        // Kiểm tra header 'Exif\0\0' (0x457869660000)
        const exifHeader = view.getUint32(offset, false);
        if (exifHeader !== 0x45786966) {
          return null;
        }
        offset += 6; // Bỏ qua 'Exif\0\0'

        // TIFF Header
        const tiffOffset = offset;
        const byteOrder = view.getUint16(tiffOffset, false);
        const littleEndian = byteOrder === 0x4949; // 'II'

        if (view.getUint16(tiffOffset + 2, littleEndian) !== 0x002a) {
          return null;
        }

        const ifd0Offset = view.getUint32(tiffOffset + 4, littleEndian);
        let curOffset = tiffOffset + ifd0Offset;

        if (curOffset >= length) return null;

        const entriesCount = view.getUint16(curOffset, littleEndian);
        curOffset += 2;

        let gpsIfdOffset = 0;
        for (let i = 0; i < entriesCount; i++) {
          if (curOffset + 12 > length) break;
          const tag = view.getUint16(curOffset, littleEndian);
          if (tag === 0x8825) {
            // GPS Info IFD Pointer
            gpsIfdOffset = view.getUint32(curOffset + 8, littleEndian);
            break;
          }
          curOffset += 12;
        }

        if (!gpsIfdOffset) return null;

        let curGpsOffset = tiffOffset + gpsIfdOffset;
        if (curGpsOffset >= length) return null;

        const gpsEntriesCount = view.getUint16(curGpsOffset, littleEndian);
        curGpsOffset += 2;

        let latRef = 'N';
        let lonRef = 'E';
        let rawLat: number[] | null = null;
        let rawLon: number[] | null = null;

        for (let i = 0; i < gpsEntriesCount; i++) {
          if (curGpsOffset + 12 > length) break;
          const tag = view.getUint16(curGpsOffset, littleEndian);
          const valOffset = view.getUint32(curGpsOffset + 8, littleEndian);

          if (tag === 0x0001) {
            // GPSLatitudeRef
            latRef = String.fromCharCode(view.getUint8(curGpsOffset + 8));
          } else if (tag === 0x0002) {
            // GPSLatitude (3 rationals)
            rawLat = readRationals(view, tiffOffset + valOffset, 3, littleEndian);
          } else if (tag === 0x0003) {
            // GPSLongitudeRef
            lonRef = String.fromCharCode(view.getUint8(curGpsOffset + 8));
          } else if (tag === 0x0004) {
            // GPSLongitude (3 rationals)
            rawLon = readRationals(view, tiffOffset + valOffset, 3, littleEndian);
          }
          curGpsOffset += 12;
        }

        if (rawLat && rawLon && rawLat.length === 3 && rawLon.length === 3) {
          let lat = rawLat[0] + rawLat[1] / 60 + rawLat[2] / 3600;
          let lon = rawLon[0] + rawLon[1] / 60 + rawLon[2] / 3600;

          if (latRef === 'S') lat = -lat;
          if (lonRef === 'W') lon = -lon;

          if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
            return { latitude: lat, longitude: lon };
          }
        }
        return null;
      } else {
        // Nhảy qua marker khác
        const markerLength = view.getUint16(offset, false);
        offset += markerLength;
      }
    }
  } catch (err) {
    console.debug('Không thể trích xuất EXIF GPS:', err);
  }
  return null;
}

function readRationals(
  view: DataView,
  offset: number,
  count: number,
  littleEndian: boolean
): number[] | null {
  if (offset + count * 8 > view.byteLength) return null;
  const res: number[] = [];
  for (let i = 0; i < count; i++) {
    const num = view.getUint32(offset + i * 8, littleEndian);
    const den = view.getUint32(offset + i * 8 + 4, littleEndian);
    if (den === 0) return null;
    res.push(num / den);
  }
  return res;
}
