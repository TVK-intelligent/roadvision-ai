import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { incidentApi } from '../services/incidentApi';
import { Incident } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';
import { useAuth } from '../context/AuthContext';
import { PlusCircle, Clock, MapPin, ArrowRight, FileText, AlertCircle } from 'lucide-react';

export const MyReportsPage: React.FC = () => {
  const { user } = useAuth();
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
      <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/30 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-mono text-xs font-bold uppercase tracking-wider">
            <FileText className="w-4 h-4" />
            CIVIC TELEMETRY RECORD • HỒ SƠ PHẢN ÁNH CỦA BẠN
          </div>
          <h1 className="font-display text-2xl font-black text-on-surface mt-1">Lịch Sử Phản Ánh Hiện Trường</h1>
          <p className="text-xs text-on-surface-variant">
            Theo dõi thời gian thực tiến độ tiếp nhận, thẩm định AI và kết quả thi công sửa chữa của cơ quan chức năng.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/report"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-on-primary font-bold text-xs shadow-sm hover:bg-primary-container transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Gửi Phản Ánh Mới</span>
          </Link>
        </div>
      </div>

      {/* Danh sách Thẻ Sự Cố */}
      {loading ? (
        <div className="py-16 text-center text-on-surface-variant bg-surface-container-lowest rounded-3xl border border-outline-variant/30">
          <div className="inline-block animate-spin rounded-full h-7 w-7 border-2 border-primary border-t-transparent mb-2"></div>
          <div className="text-xs">Đang tải lịch sử phản ánh của bạn...</div>
        </div>
      ) : reports.length === 0 ? (
        <div className="py-16 px-4 text-center bg-surface-container-lowest rounded-3xl border border-outline-variant/30 flex flex-col items-center gap-3">
          <AlertCircle className="w-10 h-10 text-on-surface-variant/40" />
          <h3 className="font-bold text-base text-on-surface">Bạn chưa có phản ánh sự cố nào</h3>
          <p className="text-xs text-on-surface-variant max-w-sm">
            Khi bạn chụp ảnh và gửi phản ánh mặt đường, AI sẽ tự động phân tích và tiến độ xử lý sẽ xuất hiện tại đây.
          </p>
          <Link
            to="/report"
            className="mt-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-container transition-colors"
          >
            Báo cáo sự cố đầu tiên
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reports.map((item) => (
              <div
                key={item.id}
                className="bg-surface-container-lowest p-5 rounded-3xl border border-outline-variant/30 shadow-xs flex flex-col justify-between gap-4 hover:shadow-md transition-all hover:border-outline-variant/60"
              >
                <div className="flex gap-4">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-24 h-24 rounded-2xl object-cover shrink-0 border border-outline-variant/20 shadow-xs"
                  />
                  <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-primary">{item.ticketCode}</span>
                      <StatusBadge status={item.status} />
                    </div>
                    <h3 className="font-bold text-sm text-on-surface line-clamp-1">{item.title}</h3>
                    <div className="flex items-center gap-1 text-xs text-on-surface-variant line-clamp-1">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-primary" />
                      <span>{item.address || `${item.latitude?.toFixed(4)}, ${item.longitude?.toFixed(4)}`}</span>
                    </div>
                    {item.aiDetection?.confidence && (
                      <div className="text-[11px] text-on-surface-variant font-mono">
                        AI Tin Cậy: <strong className="text-primary font-bold">{(item.aiDetection.confidence * 100).toFixed(1)}%</strong>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-outline-variant/15 text-xs font-mono text-on-surface-variant">
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : 'Vừa xong'}
                    </span>
                  </div>
                  <Link
                    to={`/incidents/${item.id}`}
                    className="inline-flex items-center gap-1 font-bold text-primary hover:text-primary-container transition-colors"
                  >
                    <span>Xem tiến độ & nghiệm thu</span>
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
