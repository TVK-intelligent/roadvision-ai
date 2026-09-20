import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';
import { AccessDenied } from './AccessDenied';
import { AuthModal } from './AuthModal';

interface ProtectedRouteProps {
  allowedRoles?: Role[];
  children: React.ReactElement;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  children,
}) => {
  const { user, isAuthenticated } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // 1. Chưa đăng nhập
  if (!isAuthenticated || !user) {
    return (
      <>
        <AccessDenied
          requiredRoles={allowedRoles}
          onOpenLoginModal={() => setIsAuthModalOpen(true)}
        />
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />
      </>
    );
  }

  // 2. Đã đăng nhập nhưng không có vai trò phù hợp
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <>
        <AccessDenied
          requiredRoles={allowedRoles}
          userRole={user.role}
          onOpenLoginModal={() => setIsAuthModalOpen(true)}
        />
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />
      </>
    );
  }

  // 3. Đầy đủ quyền hạn
  return children;
};
