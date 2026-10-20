import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Footer } from './Footer';
import { AiChatWidget } from './AiChatWidget';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('roadvision_sidebar_collapsed') === 'true';
  });
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem('roadvision_sidebar_collapsed', String(isCollapsed));
  }, [isCollapsed]);

  return (
    <div className="min-h-screen bg-[#f4f5f8] flex font-sans text-slate-800">
      {/* 1. Dark Sidebar Bên Trái (Cố Định / Thu Gọn) */}
      <Sidebar
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* 2. Vùng Nội Dung Chính Bên Phải */}
      <div
        className={`
          flex-1 flex flex-col min-w-0 transition-all duration-200 ease-in-out
          ${isCollapsed ? 'md:ml-20' : 'md:ml-64'}
        `}
      >
        {/* Topbar Hiện Đại */}
        <Topbar
          isSidebarCollapsed={isCollapsed}
          onToggleSidebar={() => setIsCollapsed(!isCollapsed)}
          onOpenMobileSidebar={() => setIsMobileOpen(true)}
        />

        {/* Nội dung trang theo từng Route */}
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>

        {/* Footer */}
        <Footer />
      </div>

      {/* Trợ lý AI Chatbot */}
      <AiChatWidget />
    </div>
  );
};