import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number; // 0-based
  totalPages: number;
  totalElements: number;
  pageSize: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange?: (newSize: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalElements,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) => {
  if (totalElements === 0 || totalPages <= 1) {
    if (totalElements === 0) return null;
    return (
      <div className="flex items-center justify-between py-3 px-4 bg-surface-container-lowest rounded-xl border border-outline-variant/30 text-xs text-on-surface-variant mt-3">
        <span>Tổng số <strong className="text-on-surface">{totalElements}</strong> bản ghi (1 trang duy nhất)</span>
      </div>
    );
  }

  const startItem = currentPage * pageSize + 1;
  const endItem = Math.min((currentPage + 1) * pageSize, totalElements);

  // Sinh danh sách các nút trang hiển thị thông minh (1 ... 4 5 6 ... 10)
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 0; i < totalPages; i++) pages.push(i);
    } else {
      pages.push(0);
      let start = Math.max(1, currentPage - 1);
      let end = Math.min(totalPages - 2, currentPage + 1);

      if (currentPage <= 2) {
        start = 1;
        end = 3;
      } else if (currentPage >= totalPages - 3) {
        start = totalPages - 4;
        end = totalPages - 2;
      }

      if (start > 1) pages.push('...');
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 2) pages.push('...');
      pages.push(totalPages - 1);
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-3.5 px-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xs mt-4">
      {/* Thông tin số lượng bản ghi & Kích thước trang */}
      <div className="flex items-center gap-3 text-xs text-on-surface-variant">
        <span>
          Hiển thị <strong className="text-on-surface font-semibold">{startItem}</strong> -{' '}
          <strong className="text-on-surface font-semibold">{endItem}</strong> trên{' '}
          <strong className="text-primary font-bold">{totalElements}</strong> kết quả
        </span>

        {onPageSizeChange && (
          <div className="hidden md:flex items-center gap-1.5 ml-2 pl-3 border-l border-outline-variant/40">
            <span>Mỗi trang:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="bg-surface-container-low border border-outline-variant/40 rounded-lg px-2 py-1 text-xs font-semibold text-on-surface outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        )}
      </div>

      {/* Điều khiển chuyển trang */}
      <div className="flex items-center gap-1">
        {/* Về trang đầu */}
        <button
          onClick={() => onPageChange(0)}
          disabled={currentPage === 0}
          title="Trang đầu"
          className="p-1.5 rounded-lg border border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:bg-surface-container disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Trang trước */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 0}
          title="Trang trước"
          className="p-1.5 rounded-lg border border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:bg-surface-container disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Các nút số trang */}
        <div className="flex items-center gap-1 mx-1">
          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`dots-${idx}`} className="px-2 text-xs text-on-surface-variant select-none">
                  ...
                </span>
              );
            }
            const pageIndex = p as number;
            const isCurrent = pageIndex === currentPage;

            return (
              <button
                key={`page-${pageIndex}`}
                onClick={() => onPageChange(pageIndex)}
                className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold transition-all ${
                  isCurrent
                    ? 'bg-primary text-on-primary shadow-sm ring-1 ring-primary'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container border border-outline-variant/20'
                }`}
              >
                {pageIndex + 1}
              </button>
            );
          })}
        </div>

        {/* Trang sau */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages - 1}
          title="Trang sau"
          className="p-1.5 rounded-lg border border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:bg-surface-container disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Về trang cuối */}
        <button
          onClick={() => onPageChange(totalPages - 1)}
          disabled={currentPage >= totalPages - 1}
          title="Trang cuối"
          className="p-1.5 rounded-lg border border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:bg-surface-container disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
