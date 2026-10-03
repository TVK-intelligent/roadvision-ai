import React from 'react';
import { IncidentStatus } from '../types';

interface StatusBadgeProps {
  status: IncidentStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'SUBMITTED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
          Đã tiếp nhận
        </span>
      );
    case 'AI_ANALYZED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
          Đã phân tích AI
        </span>
      );
    case 'ASSIGNED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
          Đã phân công
        </span>
      );
    case 'IN_PROGRESS':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
          Đang thi công
        </span>
      );
    case 'RESOLVED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
          Đã khắc phục
        </span>
      );
    case 'CLOSED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
          Đã đóng phiếu
        </span>
      );
    case 'REJECTED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
          Từ chối
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 text-xs font-medium">
          {status}
        </span>
      );
  }
};
