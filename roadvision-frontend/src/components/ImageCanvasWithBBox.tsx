import React, { useState } from 'react';
import { AiDetection } from '../types';
import { AlertCircle } from 'lucide-react';

interface ImageCanvasProps {
  imageUrl: string;
  aiDetection?: AiDetection;
  className?: string;
}

export const ImageCanvasWithBBox: React.FC<ImageCanvasProps> = ({
  imageUrl,
  aiDetection,
  className = '',
}) => {
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    }
  };

  const hasValidBox =
    Boolean(aiDetection) &&
    ((aiDetection?.boxes && aiDetection.boxes.length > 0) ||
     (Boolean(aiDetection?.className) && aiDetection?.className !== 'NONE' && (aiDetection?.bboxWidth || 0) > 0));

  const topPct = naturalSize && aiDetection?.bboxY != null && naturalSize.height > 0
    ? (aiDetection.bboxY / naturalSize.height) * 100
    : 0;

  const leftPct = naturalSize && aiDetection?.bboxX != null && naturalSize.width > 0
    ? (aiDetection.bboxX / naturalSize.width) * 100
    : 0;

  const widthPct = naturalSize && aiDetection?.bboxWidth != null && naturalSize.width > 0
    ? (aiDetection.bboxWidth / naturalSize.width) * 100
    : 0;

  const heightPct = naturalSize && aiDetection?.bboxHeight != null && naturalSize.height > 0
    ? (aiDetection.bboxHeight / naturalSize.height) * 100
    : 0;

  return (
    <div className={`relative overflow-hidden rounded-xl bg-surface-container-high flex items-center justify-center p-2 ${className}`}>
      {/* Wrapper bọc khít ảnh để tỷ lệ Bounding Box chính xác */}
      <div className="relative inline-block max-w-full max-h-full">
        <img
          src={imageUrl}
          alt="Hiện trường sự cố"
          className="max-w-full max-h-64 object-contain rounded-lg block"
          crossOrigin="anonymous"
          onLoad={handleImageLoad}
        />

        {/* Render danh sách TẤT CẢ các Hộp bao Bounding Box của AI */}
        {naturalSize && naturalSize.width > 0 && naturalSize.height > 0 && (
          <>
            {aiDetection?.boxes && aiDetection.boxes.length > 0 ? (
              aiDetection.boxes.map((box, idx) => {
                const bTop = (box.y / naturalSize.height) * 100;
                const bLeft = (box.x / naturalSize.width) * 100;
                const bW = (box.width / naturalSize.width) * 100;
                const bH = (box.height / naturalSize.height) * 100;

                // Phân màu hộp bao theo loại hư hỏng để trực quan chuyên nghiệp
                const isCrack = box.className?.includes('CRACK');
                const isFlood = box.className?.includes('FLOOD');
                const isObstacle = box.className?.includes('OBSTACLE');

                const borderColor = isCrack
                  ? 'border-amber-500 bg-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                  : isFlood
                  ? 'border-cyan-500 bg-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                  : isObstacle
                  ? 'border-rose-500 bg-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                  : 'border-primary bg-primary/20 shadow-[0_0_15px_rgba(37,99,235,0.4)]';

                const badgeColor = isCrack
                  ? 'bg-amber-500 text-slate-950'
                  : isFlood
                  ? 'bg-cyan-500 text-slate-950'
                  : isObstacle
                  ? 'bg-rose-500 text-white'
                  : 'bg-primary text-on-primary';

                return (
                  <div
                    key={idx}
                    className={`absolute border-2 backdrop-blur-[1px] rounded transition-all duration-300 pointer-events-none ${borderColor}`}
                    style={{
                      top: `${Math.max(0, bTop)}%`,
                      left: `${Math.max(0, bLeft)}%`,
                      width: `${Math.min(100 - bLeft, bW)}%`,
                      height: `${Math.min(100 - bTop, bH)}%`,
                    }}
                  >
                    {/* Nhãn loại hư hại và độ tin cậy */}
                    <div className={`absolute -top-6 left-0 font-mono text-xs font-bold px-2 py-0.5 rounded shadow flex items-center gap-1 whitespace-nowrap ${badgeColor}`}>
                      <span>⚠️ #{idx + 1}</span>
                      <span>{box.className}</span>
                      <span className="opacity-90">
                        ({(box.confidence * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                );
              })
            ) : hasValidBox ? (
              <div
                className="absolute border-2 border-primary bg-primary/20 backdrop-blur-[1px] rounded transition-all duration-300 shadow-[0_0_15px_rgba(37,99,235,0.4)] pointer-events-none"
                style={{
                  top: `${Math.max(0, topPct)}%`,
                  left: `${Math.max(0, leftPct)}%`,
                  width: `${Math.min(100 - leftPct, widthPct)}%`,
                  height: `${Math.min(100 - topPct, heightPct)}%`,
                }}
              >
                <div className="absolute -top-6 left-0 bg-primary text-on-primary font-mono text-xs font-bold px-2 py-0.5 rounded shadow flex items-center gap-1 whitespace-nowrap">
                  <span>⚠️</span>
                  <span>{aiDetection?.className}</span>
                  <span className="opacity-90">
                    ({((aiDetection?.confidence || 0) * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="absolute -bottom-5 right-0 bg-surface-container-lowest/90 text-primary font-mono text-[10px] px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
                  TENSOR: {naturalSize.width}x{naturalSize.height}
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* Thông báo trạng thái khi không có hộp bao */}
      {!hasValidBox && (
        <div className="absolute bottom-3 left-3 right-3 bg-surface-container-lowest/90 backdrop-blur-sm border border-outline-variant/40 rounded-lg px-3 py-2 flex items-center gap-2 text-xs text-on-surface shadow-sm">
          <AlertCircle className="w-4 h-4 text-secondary shrink-0" />
          <span>
            {aiDetection
              ? `AI quét ảnh (${aiDetection.inferenceMs || 0}ms): Chưa phát hiện hư hỏng có độ tin cậy ≥ ${Math.round((aiDetection.activeThreshold ?? 0.20) * 100)}%. Bạn có thể kéo thanh trượt xuống để phát hiện nhạy hơn hoặc gửi báo cáo để chuyên viên thẩm định.`
              : 'Đang chuẩn bị quét thị giác AI...'}
          </span>
        </div>
      )}
    </div>
  );
};
