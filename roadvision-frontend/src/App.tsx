import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import { NotificationProvider } from './context/NotificationContext';
import { MainLayout } from './components/MainLayout';
import { PageLoader } from './components/PageLoader';
import { ProtectedRoute } from './components/ProtectedRoute';

// Tách nhỏ Bundle và nạp trang theo nhu cầu (Code-Splitting / Lazy Loading)
const HomePage = lazy(() =>
  import('./pages/HomePage').then((m) => ({ default: m.HomePage }))
);
const ReportIncidentPage = lazy(() =>
  import('./pages/ReportIncidentPage').then((m) => ({ default: m.ReportIncidentPage }))
);
const DispatchQueuePage = lazy(() =>
  import('./pages/DispatchQueuePage').then((m) => ({ default: m.DispatchQueuePage }))
);
const IncidentDossierPage = lazy(() =>
  import('./pages/IncidentDossierPage').then((m) => ({ default: m.IncidentDossierPage }))
);
const MyReportsPage = lazy(() =>
  import('./pages/MyReportsPage').then((m) => ({ default: m.MyReportsPage }))
);
const SpatialMapPage = lazy(() =>
  import('./pages/SpatialMapPage').then((m) => ({ default: m.SpatialMapPage }))
);
const InspectionTasksPage = lazy(() =>
  import('./pages/InspectionTasksPage').then((m) => ({ default: m.InspectionTasksPage }))
);
const ConstructionTasksPage = lazy(() =>
  import('./pages/ConstructionTasksPage').then((m) => ({ default: m.ConstructionTasksPage }))
);
const PatrolModePage = lazy(() =>
  import('./pages/PatrolModePage').then((m) => ({ default: m.PatrolModePage }))
);
const AdminAnalyticsPage = lazy(() =>
  import('./pages/AdminAnalyticsPage').then((m) => ({ default: m.AdminAnalyticsPage }))
);
const AdminTeamsPage = lazy(() =>
  import('./pages/AdminTeamsPage').then((m) => ({ default: m.AdminTeamsPage }))
);
const AdminUsersPage = lazy(() =>
  import('./pages/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage }))
);
const LeaderboardPage = lazy(() =>
  import('./pages/LeaderboardPage').then((m) => ({ default: m.LeaderboardPage }))
);
const PhotoGuidePage = lazy(() =>
  import('./pages/PhotoGuidePage').then((m) => ({ default: m.PhotoGuidePage }))
);
const IncidentReportsPage = lazy(() =>
  import('./pages/IncidentReportsPage').then((m) => ({ default: m.IncidentReportsPage }))
);
const AdminSettingsPage = lazy(() =>
  import('./pages/AdminSettingsPage').then((m) => ({ default: m.AdminSettingsPage }))
);


export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <NotificationProvider>
          <BrowserRouter>
            <MainLayout>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Tuyến công khai (Public Routes) */}
                  <Route path="/" element={<HomePage />} />
                  <Route path="/map" element={<SpatialMapPage />} />
                  <Route path="/report" element={<ReportIncidentPage />} />
                  <Route path="/leaderboard" element={<LeaderboardPage />} />
                  <Route path="/photo-guide" element={<PhotoGuidePage />} />
                  <Route path="/incidents/:id" element={<IncidentDossierPage />} />

                  {/* Tuyến Tuần Tra AI Chuyên Nghiệp: Dành riêng cho Kỹ thuật viên / Tuần tra viên & Admin */}
                  <Route
                    path="/patrol"
                    element={
                      <ProtectedRoute allowedRoles={['ROLE_STAFF', 'ROLE_ADMIN']}>
                        <PatrolModePage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Tuyến Công Dân (Citizen & Admin): Lịch sử phản ánh */}
                  <Route
                    path="/my-reports"
                    element={
                      <ProtectedRoute allowedRoles={['ROLE_CITIZEN', 'ROLE_ADMIN']}>
                        <MyReportsPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Tuyến Kỹ Thuật Viên: Khảo sát thực địa (Giai đoạn 4) */}
                  <Route
                    path="/inspection-tasks"
                    element={
                      <ProtectedRoute allowedRoles={['ROLE_STAFF', 'ROLE_ADMIN']}>
                        <InspectionTasksPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Tuyến Kỹ Thuật Viên: Thi công sửa chữa (Giai đoạn 6) */}
                  <Route
                    path="/construction-tasks"
                    element={
                      <ProtectedRoute allowedRoles={['ROLE_STAFF', 'ROLE_ADMIN']}>
                        <ConstructionTasksPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Tuyến Kỹ Thuật Viên: Nhiệm vụ bảo trì hiện trường (Tương thích cũ) */}
                  <Route
                    path="/tasks"
                    element={
                      <ProtectedRoute allowedRoles={['ROLE_STAFF', 'ROLE_ADMIN']}>
                        <InspectionTasksPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Tuyến Nghiệp Vụ: Báo cáo sự cố toàn diện (Dành cho Admin & Cán bộ) */}
                  <Route
                    path="/reports"
                    element={
                      <ProtectedRoute allowedRoles={['ROLE_ADMIN', 'ROLE_STAFF']}>
                        <IncidentReportsPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Tuyến Quản Trị Viên (Admin duy nhất): Hàng đợi điều phối trung tâm */}
                  <Route
                    path="/dispatch"
                    element={
                      <ProtectedRoute allowedRoles={['ROLE_ADMIN']}>
                        <DispatchQueuePage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Tuyến Quản Trị Viên (Admin duy nhất): Trung tâm phân tích & Điều hành KPI */}
                  <Route
                    path="/analytics"
                    element={
                      <ProtectedRoute allowedRoles={['ROLE_ADMIN']}>
                        <AdminAnalyticsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/analytics"
                    element={
                      <ProtectedRoute allowedRoles={['ROLE_ADMIN']}>
                        <AdminAnalyticsPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Tuyến Quản Trị Viên: Quản lý Tổ Đội & Nhân Viên Chuyên Trách */}
                  <Route
                    path="/admin/teams"
                    element={
                      <ProtectedRoute allowedRoles={['ROLE_ADMIN']}>
                        <AdminTeamsPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Tuyến Quản Trị Viên: Quản lý Toàn Bộ Người Dùng & Phân Quyền (RBAC) */}
                  <Route
                    path="/admin/users"
                    element={
                      <ProtectedRoute allowedRoles={['ROLE_ADMIN']}>
                        <AdminUsersPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Tuyến Quản Trị Viên: Cài Đặt & Cấu Hình Tham Số Hệ Thống */}
                  <Route
                    path="/admin/settings"
                    element={
                      <ProtectedRoute allowedRoles={['ROLE_ADMIN']}>
                        <AdminSettingsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute allowedRoles={['ROLE_ADMIN']}>
                        <AdminSettingsPage />
                      </ProtectedRoute>
                    }
                  />


                  {/* Tuyến mặc định quay về trang chủ */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
          </MainLayout>
        </BrowserRouter>
        </NotificationProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
