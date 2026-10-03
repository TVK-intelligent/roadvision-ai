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
      <div className="flex items-center justify-between py-2.5 px-4 bg-white rounded-lg border border-slate-200 text-xs text-slate-600 mt-3">
        <span>Tổng số <strong className="text-slate-900 font-semibold">{totalElements}</strong> bản ghi (1 trang duy nhất)</span>
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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-2.5 px-4 bg-white rounded-lg border border-slate-200 text-xs text-slate-600 mt-4">
      {/* Thông tin số lượng bản ghi & Kích thước trang */}
      <div className="flex items-center gap-3">
        <span>
          Hiển thị <strong className="text-slate-900 font-semibold">{startItem}</strong> -{' '}
          <strong className="text-slate-900 font-semibold">{endItem}</strong> trên{' '}
          <strong className="text-slate-900 font-semibold">{totalElements}</strong> kết quả
        </span>

        {onPageSizeChange && (
          <div className="hidden md:flex items-center gap-1.5 ml-2 pl-3 border-l border-slate-200">
            <span>Mỗi trang:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Số bản ghi mỗi trang"
              className="bg-white border border-slate-300 rounded-md px-2 py-1 text-xs font-medium text-slate-700 outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
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
          aria-label="Về trang đầu"
          className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Trang trước */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 0}
          title="Trang trước"
          aria-label="Trang trước"
          className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Các nút số trang */}
        <div className="flex items-center gap-1 mx-1">
          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`dots-${idx}`} className="px-2 text-xs text-slate-400 select-none">
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
                className={`min-w-[28px] h-7 px-2 rounded-md text-xs font-medium transition-all ${
                  isCurrent
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-700 hover:bg-slate-100 border border-slate-200'
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
          aria-label="Trang sau"
          className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Về trang cuối */}
        <button
          onClick={() => onPageChange(totalPages - 1)}
          disabled={currentPage >= totalPages - 1}
          title="Trang cuối"
          aria-label="Về trang cuối"
          className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
