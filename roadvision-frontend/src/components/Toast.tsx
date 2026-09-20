import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string, title?: string, duration?: number) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string, title?: string, duration = 3500) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newToast: Toast = { id, type, title, message, duration };
      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback(
    (message: string, title?: string) => showToast('success', message, title),
    [showToast]
  );
  const error = useCallback(
    (message: string, title?: string) => showToast('error', message, title, 5000),
    [showToast]
  );
  const warning = useCallback(
    (message: string, title?: string) => showToast('warning', message, title),
    [showToast]
  );
  const info = useCallback(
    (message: string, title?: string) => showToast('info', message, title),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      {/* Toast Render Container Fixed at Bottom Right */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => {
          const getStyles = () => {
            switch (toast.type) {
              case 'success':
                return {
                  border: 'border-emerald-500/40 bg-white/95 dark:bg-slate-900/95 text-emerald-700 dark:text-emerald-300',
                  icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
                  glow: 'shadow-[0_8px_30px_rgb(16,185,129,0.15)]',
                };
              case 'error':
                return {
                  border: 'border-rose-500/40 bg-white/95 dark:bg-slate-900/95 text-rose-700 dark:text-rose-300',
                  icon: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />,
                  glow: 'shadow-[0_8px_30px_rgb(244,63,94,0.15)]',
                };
              case 'warning':
                return {
                  border: 'border-amber-500/40 bg-white/95 dark:bg-slate-900/95 text-amber-700 dark:text-amber-300',
                  icon: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
                  glow: 'shadow-[0_8px_30px_rgb(245,158,11,0.15)]',
                };
              default:
                return {
                  border: 'border-primary/40 bg-white/95 dark:bg-slate-900/95 text-primary dark:text-primary-fixed',
                  icon: <Info className="w-5 h-5 text-primary shrink-0" />,
                  glow: 'shadow-[0_8px_30px_rgb(37,99,235,0.15)]',
                };
            }
          };

          const style = getStyles();

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border backdrop-blur-md transition-all transform duration-300 ease-out animate-in fade-in slide-in-from-bottom-3 ${style.border} ${style.glow}`}
            >
              <div className="mt-0.5">{style.icon}</div>
              <div className="flex-1 min-w-0">
                {toast.title && (
                  <h4 className="font-bold text-xs leading-tight mb-0.5 text-on-surface">
                    {toast.title}
                  </h4>
                )}
                <p className="text-xs text-on-surface-variant leading-relaxed break-words">
                  {toast.message}
                </p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-on-surface-variant/60 hover:text-on-surface p-1 rounded-lg transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
