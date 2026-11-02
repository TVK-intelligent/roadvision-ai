import React from 'react';
import { IncidentStatus } from '../types';
import { CheckCircle2, AlertCircle, RefreshCw, Clock, Wrench, ShieldCheck, HardHat, Compass, FileCheck } from 'lucide-react';

interface StatusBadgeProps {
  status: IncidentStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'SUBMITTED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium whitespace-nowrap shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
          <span>Đã tiếp nhận</span>
        </span>
      );
    case 'AI_ANALYZED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-50 text-sky-700 border border-sky-200 text-xs font-medium whitespace-nowrap shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-600 shrink-0" />
          <span>Đã phân tích AI</span>
        </span>
      );
    case 'VERIFIED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-teal-50 text-teal-700 border border-teal-200 text-xs font-medium whitespace-nowrap shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0" />
          <span>Đã xác nhận</span>
        </span>
      );
    case 'INSPECTION_ASSIGNED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-50 text-cyan-700 border border-cyan-200 text-xs font-medium whitespace-nowrap shadow-2xs">
          <Compass className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
          <span>Giao khảo sát</span>
        </span>
      );
    case 'INSPECTING':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-50 text-cyan-700 border border-cyan-200 text-xs font-medium whitespace-nowrap shadow-2xs">
          <Compass className="w-3.5 h-3.5 text-cyan-600 animate-spin shrink-0" />
          <span>Đang khảo sát</span>
        </span>
      );
    case 'INSPECTED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-teal-50 text-teal-700 border border-teal-200 text-xs font-medium whitespace-nowrap shadow-2xs">
          <FileCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
          <span>Đã khảo sát</span>
        </span>
      );
    case 'ASSIGNED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-medium whitespace-nowrap shadow-2xs">
          <HardHat className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span>Giao thi công</span>
        </span>
      );
    case 'IN_PROGRESS':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-xs font-medium whitespace-nowrap shadow-2xs">
          <Wrench className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>Đang thi công</span>
        </span>
      );
    case 'PENDING_INSPECTION':
    case 'PENDING_ACCEPTANCE':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-xs font-medium whitespace-nowrap shadow-2xs">
          <Clock className="w-3.5 h-3.5 text-purple-600 shrink-0" />
          <span>Chờ nghiệm thu</span>
        </span>
      );
    case 'REWORK_REQUIRED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-xs font-medium whitespace-nowrap shadow-2xs">
          <RefreshCw className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span>Yêu cầu làm lại</span>
        </span>
      );
    case 'RESOLVED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium whitespace-nowrap shadow-2xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Đã khắc phục</span>
        </span>
      );
    case 'CLOSED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-medium whitespace-nowrap shadow-2xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
          <span>Đã hoàn thành</span>
        </span>
      );
    case 'REJECTED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-xs font-medium whitespace-nowrap shadow-2xs">
          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span>Từ chối</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200 text-xs font-medium whitespace-nowrap shadow-2xs">
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
          Ưu tiên xử lý
        </span>
      )}
      {flag === 'SUSPECTED_DUPLICATE_IMAGE' && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
          Nghi vấn ảnh trùng
        </span>
      )}
      {flag === 'LOW_PRIORITY_REVIEW' && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          Kiểm duyệt tăng cường
        </span>
      )}
      {flag === 'POTENTIAL_DUPLICATE' && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
          Trùng vị trí lân cận
        </span>
      )}
    </div>
  );
};
