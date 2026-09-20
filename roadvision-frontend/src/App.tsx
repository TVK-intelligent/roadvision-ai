import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
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
const StaffTasksPage = lazy(() =>
  import('./pages/StaffTasksPage').then((m) => ({ default: m.StaffTasksPage }))
);
const PatrolModePage = lazy(() =>
  import('./pages/PatrolModePage').then((m) => ({ default: m.PatrolModePage }))
);

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-surface flex flex-col font-sans text-on-surface">
            {/* Header Kính Mờ Định Vị Cố Định */}
            <Navbar />

            {/* Vùng Nội Dung Chính */}
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-12">
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Tuyến công khai (Public Routes) */}
                  <Route path="/" element={<HomePage />} />
                  <Route path="/map" element={<SpatialMapPage />} />
                  <Route path="/report" element={<ReportIncidentPage />} />
                  <Route path="/patrol" element={<PatrolModePage />} />
                  <Route path="/incidents/:id" element={<IncidentDossierPage />} />

                  {/* Tuyến Công Dân (Citizen & Admin): Lịch sử phản ánh */}
                  <Route
                    path="/my-reports"
                    element={
                      <ProtectedRoute allowedRoles={['ROLE_CITIZEN', 'ROLE_ADMIN']}>
                        <MyReportsPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Tuyến Kỹ Thuật Viên (Staff & Admin): Nhiệm vụ bảo trì hiện trường */}
                  <Route
                    path="/tasks"
                    element={
                      <ProtectedRoute allowedRoles={['ROLE_STAFF', 'ROLE_ADMIN']}>
                        <StaffTasksPage />
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

                  {/* Tuyến mặc định quay về trang chủ */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </main>

            {/* Chân trang hiện đại */}
            <Footer />
          </div>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
