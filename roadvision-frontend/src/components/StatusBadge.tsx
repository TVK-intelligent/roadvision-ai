import React from 'react';
import { IncidentStatus } from '../types';

interface StatusBadgeProps {
  status: IncidentStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'SUBMITTED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-outline-variant"></span>
          ĐÃ TIẾP NHẬN
        </span>
      );
    case 'AI_ANALYZED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-fixed text-primary text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-primary"></span>
          AI ĐÃ PHÂN TÍCH
        </span>
      );
    case 'ASSIGNED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-fixed text-secondary text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-secondary"></span>
          ĐÃ ĐIỀU PHỐI
        </span>
      );
    case 'IN_PROGRESS':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-container text-on-primary text-xs font-semibold shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
          ĐANG THI CÔNG
        </span>
      );
    case 'RESOLVED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-container text-on-surface text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-secondary"></span>
          ĐÃ KHẮC PHỤC
        </span>
      );
    case 'CLOSED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-low text-on-surface-variant text-xs font-semibold border border-outline-variant/40">
          <span className="w-2 h-2 rounded-full bg-on-surface-variant"></span>
          ĐÃ ĐÓNG PHIẾU
        </span>
      );
    case 'REJECTED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-error-container text-error text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-error"></span>
          TỪ CHỐI
        </span>
      );
    default:
      return <span>{status}</span>;
  }
};
