import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import { useAuth } from './AuthContext';
import { useToast } from '../components/Toast';
import { incidentApi } from '../services/incidentApi';
import { NotificationItem } from '../types';

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  isConnected: boolean;
  isLoading: boolean;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Âm thanh báo hiệu Ding nhẹ nhàng bằng Web Audio API (chuẩn không cần tải thêm file mp3)
const playNotificationChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    // Trình duyệt có thể chặn autoplay âm thanh nếu người dùng chưa tương tác
  }
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const stompClientRef = useRef<Client | null>(null);

  // 1. Tải danh sách thông báo và số lượng chưa đọc ban đầu
  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    try {
      setIsLoading(true);
      const [listRes, countRes] = await Promise.all([
        incidentApi.getNotifications(0, 20),
        incidentApi.getUnreadNotificationCount(),
      ]);
      setNotifications(listRes.data?.content || []);
      setUnreadCount(countRes.data?.unreadCount || 0);
    } catch {
      // Bỏ qua lỗi ngầm
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (isAuthenticated && user) {
      refreshNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setIsConnected(false);
    }
  }, [isAuthenticated, user, refreshNotifications]);

  // 2. Khởi tạo kết nối STOMP WebSocket Real-time
  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
        stompClientRef.current = null;
      }
      return;
    }

    // Địa chỉ WebSocket backend (hỗ trợ localhost hoặc tên miền máy chủ)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname || 'localhost';
    const wsUrl = `${protocol}//${host}:8080/ws`;

    const client = new Client({
      brokerURL: wsUrl,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        setIsConnected(true);

        const handleNewNotification = (body: string) => {
          try {
            const noti: NotificationItem = JSON.parse(body);
            setNotifications((prev) => [noti, ...prev]);
            setUnreadCount((prev) => prev + 1);

            // Bật âm thanh chuông báo
            playNotificationChime();

            // Hiện popup Toast thông báo tức thời
            if (noti.type === 'URGENT') {
              toast.error(noti.message, noti.title);
            } else if (noti.type === 'SUCCESS') {
              toast.success(noti.message, noti.title);
            } else if (noti.type === 'WARNING') {
              toast.warning(noti.message, noti.title);
            } else {
              toast.info(noti.message, noti.title);
            }
          } catch {
            // parse error
          }
        };

        // Kênh thông báo theo vai trò
        if (user.role === 'ROLE_ADMIN') {
          client.subscribe('/topic/notifications/admin', (msg) => {
            handleNewNotification(msg.body);
          });
        }

        if (user.role === 'ROLE_STAFF') {
          client.subscribe('/topic/notifications/staff', (msg) => {
            handleNewNotification(msg.body);
          });
        }

        // Kênh thông báo cá nhân người dùng
        if (user.id) {
          client.subscribe(`/topic/notifications/user/${user.id}`, (msg) => {
            handleNewNotification(msg.body);
          });
        }

        // Kênh thông báo chung toàn hệ thống
        client.subscribe('/topic/notifications/all', (msg) => {
          handleNewNotification(msg.body);
        });
      },
      onDisconnect: () => {
        setIsConnected(false);
      },
      onStompError: () => {
        setIsConnected(false);
      },
    });

    client.activate();
    stompClientRef.current = client;

    return () => {
      if (client) {
        client.deactivate();
      }
    };
  }, [isAuthenticated, user]);

  // 3. Đánh dấu 1 thông báo là đã đọc
  const markAsRead = async (id: number) => {
    try {
      await incidentApi.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  };

  // 4. Đánh dấu tất cả là đã đọc
  const markAllAsRead = async () => {
    try {
      await incidentApi.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success('Đã đánh dấu tất cả thông báo là đã đọc', 'Thông báo');
    } catch {
      // ignore
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isConnected,
        isLoading,
        markAsRead,
        markAllAsRead,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
