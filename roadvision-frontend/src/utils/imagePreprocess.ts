/**
 * Tiện ích tiền xử lý ảnh thông minh ở Client (Frontend):
 * 1. Tự động xoay chuẩn theo cờ EXIF Orientation (chống lật ngang 90 độ khi chụp từ iPhone/Samsung).
 * 2. Tối ưu kích thước cạnh dài về tối đa 1600px (Full HD+): Giữ nguyên từng đường nứt mảnh 2mm nhưng giảm dung lượng từ 15MB xuống ~600KB.
 * 3. Tăng cường tương phản nhẹ (Auto Contrast Enhancement): Giúp vết nứt đen và bóng ổ gà nổi bật rõ nét trên nền nhựa đường xám.
 */

export interface PreprocessOptions {
  maxDimension?: number;
  enhanceContrast?: boolean;
  quality?: number;
}

export async function preprocessImage(
  file: File,
  options: PreprocessOptions = {}
): Promise<{ file: File; previewUrl: string; originalSize: number; optimizedSize: number }> {
  const {
    maxDimension = 1600,
    enhanceContrast = true,
    quality = 0.90,
  } = options;

  const originalSize = file.size;

  // Sử dụng createImageBitmap với 'from-image' để tự động xử lý EXIF orientation chuẩn xác nhất
  let imageBitmap: ImageBitmap | null = null;
  let imgElement: HTMLImageElement | null = null;
  let origW = 0;
  let origH = 0;

  try {
    if (typeof createImageBitmap === 'function') {
      imageBitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      origW = imageBitmap.width;
      origH = imageBitmap.height;
    }
  } catch (err) {
    // Fallback sang HTMLImageElement nếu trình duyệt không hỗ trợ options trong createImageBitmap
    imageBitmap = null;
  }

  if (!imageBitmap) {
    imgElement = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Không thể tải ảnh để xử lý'));
      img.src = URL.createObjectURL(file);
    });
    origW = imgElement.naturalWidth || imgElement.width;
    origH = imgElement.naturalHeight || imgElement.height;
  }

  // Tính toán kích thước mới (giữ nguyên aspect ratio)
  let targetW = origW;
  let targetH = origH;

  if (origW > maxDimension || origH > maxDimension) {
    if (origW >= origH) {
      targetW = maxDimension;
      targetH = Math.round((origH * maxDimension) / origW);
    } else {
      targetH = maxDimension;
      targetW = Math.round((origW * maxDimension) / origH);
    }
  }

  // Vẽ lên Canvas off-screen
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Không thể khởi tạo Canvas 2D Context');
  }

  // Áp dụng bộ lọc tăng cường tương phản nhẹ (Hardware-Accelerated Canvas Filter)
  // Contrast 1.15x giúp vết nứt nhựa đường và lòng ổ gà nổi bật hơn 15% so với mặt đường xám
  if (enhanceContrast) {
    ctx.filter = 'contrast(1.15) brightness(1.02)';
  } else {
    ctx.filter = 'none';
  }

  if (imageBitmap) {
    ctx.drawImage(imageBitmap, 0, 0, targetW, targetH);
    imageBitmap.close();
  } else if (imgElement) {
    ctx.drawImage(imgElement, 0, 0, targetW, targetH);
    URL.revokeObjectURL(imgElement.src);
  }

  // Xuất ra Blob JPEG chất lượng cao 90%
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('Lỗi xuất tệp ảnh nén từ Canvas'));
      },
      'image/jpeg',
      quality
    );
  });

  // Đổi tên đuôi thành .jpg
  const cleanName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
  const optimizedFile = new File([blob], cleanName, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });

  const previewUrl = URL.createObjectURL(blob);

  return {
    file: optimizedFile,
    previewUrl,
    originalSize,
    optimizedSize: optimizedFile.size,
  };
}
