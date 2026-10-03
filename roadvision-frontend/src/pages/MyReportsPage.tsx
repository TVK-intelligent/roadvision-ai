import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { incidentApi } from '../services/incidentApi';
import { Incident } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';
import { PlusCircle, Clock, MapPin, ArrowRight, FileText, AlertCircle } from 'lucide-react';

export const MyReportsPage: React.FC = () => {
  const [reports, setReports] = useState<Incident[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Phân trang
  const [page, setPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(6);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalElements, setTotalElements] = useState<number>(0);

  const fetchReports = (targetPage = page, targetSize = pageSize) => {
    setLoading(true);
    incidentApi
      .getMyReports(targetPage, targetSize)
      .then((res) => {
        setReports(res.data?.content || []);
        setTotalPages(res.data?.totalPages || 0);
        setTotalElements(res.data?.totalElements || 0);
      })
      .catch(() => {
        setReports([]);
        setTotalPages(0);
        setTotalElements(0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReports(page, pageSize);
  }, [page, pageSize]);

  return (
    <div className="flex flex-col gap-6 py-4">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wide">
            <FileText className="w-4 h-4 text-blue-600" />
            <span>Hồ sơ phản ánh công dân</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1">Lịch sử phản ánh sự cố</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi tiến độ tiếp nhận, phân công xử lý và hình ảnh nghiệm thu thực tế từ cơ quan quản lý.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/report"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-blue-600 text-white font-medium text-xs hover:bg-blue-700 transition-colors shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Gửi phản ánh mới</span>
          </Link>
        </div>
      </div>

      {/* Danh sách Thẻ Sự Cố */}
      {loading ? (
        <div className="py-16 text-center text-slate-500 bg-white rounded-lg border border-slate-200">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent mb-2"></div>
          <div className="text-xs">Đang tải lịch sử phản ánh của bạn...</div>
        </div>
      ) : reports.length === 0 ? (
        <div className="py-16 px-4 text-center bg-white rounded-lg border border-slate-200 flex flex-col items-center gap-3">
          <AlertCircle className="w-8 h-8 text-slate-400" />
          <h3 className="font-semibold text-sm text-slate-900">Bạn chưa có phản ánh sự cố nào</h3>
          <p className="text-xs text-slate-500 max-w-sm">
            Khi bạn gửi thông tin hiện trường mặt đường hư hỏng, tiến độ xử lý sẽ được cập nhật chi tiết tại đây.
          </p>
          <Link
            to="/report"
            className="mt-1 px-3.5 py-2 rounded-md bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors shadow-xs"
          >
            Gửi phản ánh đầu tiên
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reports.map((item) => (
              <div
                key={item.id}
                className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between gap-4 hover:border-slate-300 transition-colors"
              >
                <div className="flex gap-4">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-20 h-20 rounded-md object-cover shrink-0 border border-slate-200"
                  />
                  <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold text-blue-700">{item.ticketCode}</span>
                      <StatusBadge status={item.status} />
                    </div>
                    <h3 className="font-semibold text-sm text-slate-900 line-clamp-1">{item.title}</h3>
                    <div className="flex items-center gap-1 text-xs text-slate-500 line-clamp-1">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span>{item.address || `${item.latitude?.toFixed(4)}, ${item.longitude?.toFixed(4)}`}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5 text-xs">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : 'Vừa xong'}
                    </span>
                  </div>
                  <Link
                    to={`/incidents/${item.id}`}
                    className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <span>Chi tiết hồ sơ</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Phân trang */}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalElements={totalElements}
            pageSize={pageSize}
            onPageChange={(newPage) => setPage(newPage)}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(0);
            }}
          />
        </>
      )}
    </div>
  );
};
