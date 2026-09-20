import React, { useState, useRef, useCallback } from 'react';
import { ChevronsLeftRight, Sparkles, CheckCircle2 } from 'lucide-react';

interface BeforeAfterSliderProps {
  beforeImageUrl: string;
  afterImageUrl: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  beforeImageUrl,
  afterImageUrl,
  beforeLabel = 'TRƯỚC XỬ LÝ (BEFORE)',
  afterLabel = 'SAU NGHIỆM THU (AFTER)',
  className = 'h-80',
}) => {
  const [sliderPosition, setSliderPosition] = useState<number>(50); // % từ 0 đến 100
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPosition(percentage);
    },
    []
  );

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchMove={handleTouchMove}
      className={`relative select-none overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface-container-low shadow-sm ${className}`}
    >
      {/* Lớp ảnh SAU (After) - Nằm dưới cùng */}
      <img
        src={afterImageUrl}
        alt="Sau xử lý"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-full bg-emerald-600/90 backdrop-blur-sm px-3 py-1 text-[11px] font-mono font-bold text-white shadow-md">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>{afterLabel}</span>
      </div>

      {/* Lớp ảnh TRƯỚC (Before) - Cắt theo vị trí slider */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${sliderPosition}%` }}
      >
        <img
          src={beforeImageUrl}
          alt="Trước xử lý"
          className="absolute inset-0 h-full max-w-none object-cover"
          style={{ width: containerRef.current ? `${containerRef.current.offsetWidth}px` : '100%' }}
        />
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-full bg-rose-600/90 backdrop-blur-sm px-3 py-1 text-[11px] font-mono font-bold text-white shadow-md">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{beforeLabel}</span>
        </div>
      </div>

      {/* Đường vạch ngăn cách & Tay cầm kéo slider */}
      <div
        className="absolute top-0 bottom-0 z-20 w-1 bg-white shadow-[0_0_12px_rgba(0,0,0,0.5)] cursor-ew-resize flex items-center justify-center -translate-x-1/2"
        style={{ left: `${sliderPosition}%` }}
        onMouseDown={handleMouseDown}
        onTouchStart={() => setIsDragging(true)}
        onTouchEnd={() => setIsDragging(false)}
      >
        <div className="w-9 h-9 rounded-full bg-white text-slate-800 shadow-xl border-2 border-primary flex items-center justify-center transition-transform hover:scale-110 active:scale-95">
          <ChevronsLeftRight className="w-4 h-4 text-primary font-bold" />
        </div>
      </div>

      {/* Hướng dẫn tương tác bên dưới */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 px-3 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-[10px] font-mono text-white/90 pointer-events-none">
        Kéo thanh trượt để so sánh vết hư hại và mặt đường nghiệm thu
      </div>
    </div>
  );
};
