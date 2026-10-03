import React, { useState, useRef, useCallback } from 'react';
import { ChevronsLeftRight, CheckCircle2, Columns, SplitSquareVertical, Maximize2, Minimize2, RefreshCw } from 'lucide-react';

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
  beforeLabel = 'Trước xử lý',
  afterLabel = 'Sau nghiệm thu',
  className = 'min-h-[420px] w-full',
}) => {
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'slider' | 'side-by-side'>('side-by-side');
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain');
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
        {/* Thanh công cụ điều khiển */}
        <div className="flex items-center justify-between flex-wrap gap-2 px-1 text-xs">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('side-by-side')}
              className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === 'side-by-side'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Xem song song</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('slider')}
              className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === 'slider'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <SplitSquareVertical className="w-3.5 h-3.5" />
              <span>Thanh trượt</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFitMode(fitMode === 'contain' ? 'cover' : 'contain')}
              className="px-3 py-1.5 rounded-md bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs border border-slate-200 flex items-center gap-1.5 transition-colors"
              title={fitMode === 'contain' ? 'Chuyển sang chế độ lấp đầy khung' : 'Chuyển sang chế độ xem trọn ảnh'}
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>{fitMode === 'contain' ? 'Xem trọn ảnh' : 'Lấp đầy khung'}</span>
            </button>

            {!isModal && (
              <button
                type="button"
                onClick={() => setIsFullscreen(true)}
                className="px-3 py-1.5 rounded-md bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs border border-slate-200 flex items-center gap-1.5 transition-colors"
                title="Phóng to toàn màn hình"
              >
                <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Toàn màn hình</span>
              </button>
            )}
          </div>
        </div>

        {/* Khung Hiển Thị Chính */}
        {viewMode === 'side-by-side' ? (
          /* CHẾ ĐỘ 1: XEM SONG SONG */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 min-h-[380px]">
            {/* Ảnh Trước */}
            <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-950 flex items-center justify-center p-2 min-h-[300px]">
              <img
                src={beforeImageUrl}
                alt="Trước xử lý"
                className={`w-full h-full max-h-[550px] ${objectFitClass} rounded-md`}
              />
              <div className="absolute top-3 left-3 z-10 rounded-md bg-slate-900/80 backdrop-blur-xs px-2.5 py-1 text-xs font-medium text-white border border-white/20">
                <span>{beforeLabel}</span>
              </div>
            </div>

            {/* Ảnh Sau */}
            <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-950 flex items-center justify-center p-2 min-h-[300px]">
              <img
                src={afterImageUrl}
                alt="Sau xử lý"
                className={`w-full h-full max-h-[550px] ${objectFitClass} rounded-md`}
              />
              <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-md bg-emerald-600/90 backdrop-blur-xs px-2.5 py-1 text-xs font-medium text-white border border-emerald-400/30">
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
            className="relative select-none overflow-hidden rounded-lg border border-slate-200 bg-slate-950 shadow-xs min-h-[380px] flex-1"
          >
            {/* Lớp ảnh SAU (After) */}
            <img
              src={afterImageUrl}
              alt="Sau xử lý"
              className={`absolute inset-0 h-full w-full ${objectFitClass}`}
            />
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-md bg-emerald-600/90 backdrop-blur-xs px-2.5 py-1 text-xs font-medium text-white border border-emerald-400/30">
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
              <div className="absolute top-3 left-3 z-10 rounded-md bg-slate-900/80 backdrop-blur-xs px-2.5 py-1 text-xs font-medium text-white border border-white/20">
                <span>{beforeLabel}</span>
              </div>
            </div>

            {/* Đường vạch ngăn cách & Tay cầm kéo slider */}
            <div
              className="absolute top-0 bottom-0 z-20 w-0.5 bg-white shadow-md cursor-ew-resize flex items-center justify-center -translate-x-1/2"
              style={{ left: `${sliderPosition}%` }}
              onMouseDown={handleMouseDown}
              onTouchStart={() => setIsDragging(true)}
              onTouchEnd={() => setIsDragging(false)}
            >
              <div className="w-7 h-7 rounded-full bg-white text-slate-700 shadow-md border border-slate-300 flex items-center justify-center transition-transform hover:scale-105 active:scale-95">
                <ChevronsLeftRight className="w-3.5 h-3.5 text-slate-700" />
              </div>
            </div>

            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 px-2.5 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[11px] text-white/90 pointer-events-none">
              Kéo thanh trượt để so sánh trước và sau thi công
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

      {/* MODAL PHÓNG TO TOÀN MÀN HÌNH */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[10000] bg-slate-900/90 flex flex-col p-4 md:p-6 animate-in fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 text-white">
            <span className="font-semibold text-sm">So sánh trước và sau thi công hoàn thiện</span>
            <button
              onClick={() => setIsFullscreen(false)}
              className="px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Minimize2 className="w-4 h-4" />
              <span>Đóng</span>
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
