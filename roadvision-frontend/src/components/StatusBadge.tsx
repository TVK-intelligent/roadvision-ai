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
    case 'VERIFIED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-600"></span>
          Đã xác nhận
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
    case 'PENDING_INSPECTION':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse"></span>
          Chờ nghiệm thu
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

export const ModerationFlagBadge: React.FC<{ flag?: string; score?: number }> = ({ flag, score }) => {
  if (!flag && (score === undefined || score === null)) return null;

  return (
    <div className="inline-flex items-center gap-1.5 flex-wrap">
      {score !== undefined && score !== null && (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${
          score >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
          score <= 30 ? 'bg-rose-50 text-rose-700 border-rose-300' :
          'bg-slate-50 text-slate-700 border-slate-300'
        }`}>
          Uy tín: {score}/100
        </span>
      )}
      {flag === 'TRUSTED_REPORT' && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          ⭐ Ưu tiên xử lý
        </span>
      )}
      {flag === 'SUSPECTED_DUPLICATE_IMAGE' && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
          ⚠️ Nghi vấn ảnh trùng
        </span>
      )}
      {flag === 'LOW_PRIORITY_REVIEW' && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          🔍 Kiểm duyệt tăng cường
        </span>
      )}
      {flag === 'POTENTIAL_DUPLICATE' && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
          📍 Trùng vị trí lân cận
        </span>
      )}
    </div>
  );
};
