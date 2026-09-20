import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LogIn, Home } from 'lucide-react';
import { Role } from '../types';
import { useAuth } from '../context/AuthContext';

interface AccessDeniedProps {
  requiredRoles?: Role[];
  userRole?: Role;
  onOpenLoginModal?: () => void;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({
  requiredRoles = [],
  userRole,
  onOpenLoginModal,
}) => {
  const { user } = useAuth();

  const getRoleDisplayName = (r?: string) => {
    switch (r) {
      case 'ROLE_ADMIN':
        return 'Quản Trị Viên (Admin)';
      case 'ROLE_STAFF':
        return 'Kỹ Thuật Viên (Staff)';
      case 'ROLE_CITIZEN':
        return 'Công Dân (Citizen)';
      default:
        return r || 'Khách vãng lai';
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-8 px-4">
      <div className="max-w-md w-full bg-surface-container-lowest border border-outline-variant/40 rounded-3xl p-8 shadow-xl text-center flex flex-col items-center gap-5">
        {/* Biểu tượng an ninh 403 */}
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center ring-8 ring-rose-500/5 animate-pulse">
          <ShieldAlert className="w-9 h-9" />
        </div>

        {/* Tiêu đề & Thông báo */}
        <div className="flex flex-col gap-2">
          <span className="font-mono text-xs font-bold text-rose-600 tracking-wider uppercase">
            MÃ LỖI 403 • TRUY CẬP BỊ GIỚI HẠN
          </span>
          <h2 className="font-display text-2xl font-black text-on-surface">
            Khu Vực Hạn Chế Phân Quyền
          </h2>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            {user ? (
              <>
                Tài khoản của bạn đang mang vai trò{' '}
                <strong className="text-on-surface">{getRoleDisplayName(userRole || user.role)}</strong>. 
                Trang này yêu cầu thẩm quyền của{' '}
                <strong className="text-primary font-semibold">
                  {requiredRoles.map(getRoleDisplayName).join(' hoặc ')}
                </strong>.
              </>
            ) : (
              'Bạn chưa đăng nhập vào hệ thống RoadVision. Vui lòng đăng nhập với tài khoản có thẩm quyền để tiếp tục.'
            )}
          </p>
        </div>

        {/* Hành động */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full mt-2">
          {!user && onOpenLoginModal ? (
            <button
              onClick={onOpenLoginModal}
              className="flex-1 w-full py-2.5 px-4 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-md hover:bg-primary-container flex items-center justify-center gap-2 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              <span>Đăng Nhập Ngay</span>
            </button>
          ) : (
            <Link
              to="/"
              className="flex-1 w-full py-2.5 px-4 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-md hover:bg-primary-container flex items-center justify-center gap-2 transition-colors"
            >
              <Home className="w-4 h-4" />
              <span>Về Trang Chủ</span>
            </Link>
          )}

          <Link
            to={user?.role === 'ROLE_STAFF' ? '/tasks' : user?.role === 'ROLE_CITIZEN' ? '/my-reports' : '/'}
            className="flex-1 w-full py-2.5 px-4 rounded-xl bg-surface-container border border-outline-variant/40 text-on-surface text-xs font-semibold hover:bg-surface-container-high flex items-center justify-center gap-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Khu Vực Của Tôi</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
