import React, { useState, useRef, useCallback } from 'react';
import { ChevronsLeftRight, Sparkles, CheckCircle2, Columns, SplitSquareVertical, Maximize2, Minimize2, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';

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
  className = 'min-h-[420px] w-full',
}) => {
  const [sliderPosition, setSliderPosition] = useState<number>(50); // % từ 0 đến 100
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'slider' | 'side-by-side'>('side-by-side'); // Mặc định hiển thị song song góc rộng để thấy trọn cả 2 ảnh
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain'); // Mặc định 'contain' để giữ nguyên 100% góc rộng không bị cắt xén mép ảnh
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
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

  const renderContent = (isModal = false) => {
    const objectFitClass = fitMode === 'contain' ? 'object-contain' : 'object-cover';

    return (
      <div className="flex flex-col gap-2 w-full h-full">
        {/* Thanh công cụ điều khiển góc nhìn & chế độ hiển thị */}
        <div className="flex items-center justify-between flex-wrap gap-2 px-1 text-xs">
          <div className="flex items-center gap-1.5 bg-surface-container-high p-1 rounded-xl border border-outline-variant/30">
            <button
              type="button"
              onClick={() => setViewMode('side-by-side')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'side-by-side'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Góc Rộng Song Song</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('slider')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'slider'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <SplitSquareVertical className="w-3.5 h-3.5" />
              <span>Kéo Thanh Trượt</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFitMode(fitMode === 'contain' ? 'cover' : 'contain')}
              className="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-semibold text-xs border border-outline-variant/30 flex items-center gap-1.5 transition-colors"
              title={fitMode === 'contain' ? 'Chuyển sang chế độ lấp đầy khung' : 'Chuyển sang chế độ xem trọn góc rộng'}
            >
              <RefreshCw className="w-3.5 h-3.5 text-secondary" />
              <span>{fitMode === 'contain' ? 'Đang hiện Trọn 100% Ảnh' : 'Đang hiện Lấp Đầy Khung'}</span>
            </button>

            {!isModal && (
              <button
                type="button"
                onClick={() => setIsFullscreen(true)}
                className="px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs border border-primary/20 flex items-center gap-1.5 transition-colors"
                title="Phóng to toàn màn hình"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Phóng To Toàn Cảnh</span>
              </button>
            )}
          </div>
        </div>

        {/* Khung Hiển Thị Chính */}
        {viewMode === 'side-by-side' ? (
          /* CHẾ ĐỘ 1: XEM SONG SONG 2 ẢNH GÓC RỘNG NGUYÊN VẸN KHÔNG BỊ XÉN */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 min-h-[380px]">
            {/* Ảnh Trước */}
            <div className="relative rounded-2xl overflow-hidden border border-outline-variant/40 bg-slate-950 flex items-center justify-center p-2 min-h-[300px]">
              <img
                src={beforeImageUrl}
                alt="Trước xử lý"
                className={`w-full h-full max-h-[550px] ${objectFitClass} rounded-xl`}
              />
              <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-full bg-rose-600/90 backdrop-blur-sm px-3 py-1 text-[11px] font-mono font-bold text-white shadow-md">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{beforeLabel}</span>
              </div>
            </div>

            {/* Ảnh Sau */}
            <div className="relative rounded-2xl overflow-hidden border border-outline-variant/40 bg-slate-950 flex items-center justify-center p-2 min-h-[300px]">
              <img
                src={afterImageUrl}
                alt="Sau xử lý"
                className={`w-full h-full max-h-[550px] ${objectFitClass} rounded-xl`}
              />
              <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-full bg-emerald-600/90 backdrop-blur-sm px-3 py-1 text-[11px] font-mono font-bold text-white shadow-md">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{afterLabel}</span>
              </div>
            </div>
          </div>
        ) : (
          /* CHẾ ĐỘ 2: THANH TRƯỢT TƯƠNG TÁC (SLIDER VIEW) */
          <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchMove={handleTouchMove}
            className={`relative select-none overflow-hidden rounded-2xl border border-outline-variant/40 bg-slate-950 shadow-sm min-h-[380px] flex-1`}
          >
            {/* Lớp ảnh SAU (After) */}
            <img
              src={afterImageUrl}
              alt="Sau xử lý"
              className={`absolute inset-0 h-full w-full ${objectFitClass}`}
            />
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-full bg-emerald-600/90 backdrop-blur-sm px-3 py-1 text-[11px] font-mono font-bold text-white shadow-md">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{afterLabel}</span>
            </div>

            {/* Lớp ảnh TRƯỚC (Before) */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${sliderPosition}%` }}
            >
              <img
                src={beforeImageUrl}
                alt="Trước xử lý"
                className={`absolute inset-0 h-full max-w-none ${objectFitClass}`}
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

            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full bg-black/70 backdrop-blur-sm text-[11px] font-mono text-white/90 pointer-events-none">
              Kéo thanh trượt qua trái/phải để đối chiếu Trước vs Sau
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className={`relative flex flex-col gap-2 ${className}`}>
        {renderContent(false)}
      </div>

      {/* MODAL PHÓNG TO TOÀN MÀN HÌNH (FULLSCREEN LIGHTBOX) */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-md flex flex-col p-4 md:p-6 animate-in fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 text-white">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base">So Sánh Góc Rộng Toàn Cảnh Trước & Sau Khi Thi Công</span>
            </div>
            <button
              onClick={() => setIsFullscreen(false)}
              className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <Minimize2 className="w-4 h-4" />
              <span>Thu Nhỏ / Đóng</span>
            </button>
          </div>

          <div className="flex-1 mt-4 overflow-hidden">
            {renderContent(true)}
          </div>
        </div>
      )}
    </>
  );
};
