import React from 'react';
import { IncidentStatus } from '../types';
import { Check, Layers, UserCheck, Hammer, CheckCircle2, AlertTriangle, XCircle, ShieldCheck, FileCheck, Archive, Compass, RefreshCw } from 'lucide-react';

interface TimelineProps {
  status: IncidentStatus;
  isRework?: boolean;
  reworkCount?: number;
  isDisputed?: boolean;
}

interface StepDef {
  key: string;
  stepNum: number;
  label: string;
  subLabel: (status: IncidentStatus, isRework?: boolean, reworkCount?: number) => string;
  icon: React.ReactNode;
}

const STEPS: StepDef[] = [
  {
    key: 'SUBMITTED',
    stepNum: 1,
    label: '1. Gửi phản ánh',
    subLabel: () => 'Đã tiếp nhận',
    icon: <Check className="w-3.5 h-3.5" />,
  },
  {
    key: 'AI_ANALYZED',
    stepNum: 2,
    label: '2. AI phân tích',
    subLabel: () => 'RoadVision AI',
    icon: <Layers className="w-3.5 h-3.5" />,
  },
  {
    key: 'VERIFIED',
    stepNum: 3,
    label: '3. Phân loại',
    subLabel: () => 'Duyệt đầu vào',
    icon: <FileCheck className="w-3.5 h-3.5" />,
  },
  {
    key: 'INSPECTION',
    stepNum: 4,
    label: '4. Khảo sát',
    subLabel: (status) => {
      if (status === 'INSPECTION_ASSIGNED') return 'Đã giao khảo sát';
      if (status === 'INSPECTING') return 'Đang đo đạc';
      if (status === 'INSPECTED') return 'Đã có báo cáo';
      return 'Khảo sát thực địa';
    },
    icon: <Compass className="w-3.5 h-3.5" />,
  },
  {
    key: 'ASSIGNED',
    stepNum: 5,
    label: '5. Giao tổ đội',
    subLabel: () => 'Tổ thi công',
    icon: <UserCheck className="w-3.5 h-3.5" />,
  },
  {
    key: 'IN_PROGRESS',
    stepNum: 6,
    label: '6. Thi công',
    subLabel: (status, isRework, reworkCount) => {
      if (status === 'REWORK_REQUIRED') return 'Yêu cầu làm lại';
      if (status === 'PENDING_ACCEPTANCE' || status === 'PENDING_INSPECTION') return 'Chờ nghiệm thu';
      if (isRework) return reworkCount ? `Thi công lại (#${reworkCount})` : 'Thi công lại';
      return 'Đang thi công';
    },
    icon: <Hammer className="w-3.5 h-3.5" />,
  },
  {
    key: 'CLOSED',
    stepNum: 7,
    label: '7. Nghiệm thu',
    subLabel: (status) => {
      if (status === 'CLOSED') return 'Nghiệm thu đạt';
      if (status === 'REWORK_REQUIRED') return 'Chưa đạt yêu cầu';
      return 'Đối chiếu bằng chứng';
    },
    icon: <ShieldCheck className="w-3.5 h-3.5" />,
  },
];

export const Timeline: React.FC<TimelineProps> = ({ status, isRework, reworkCount, isDisputed }) => {
  const getStageIndex = (s: IncidentStatus): number => {
    switch (s) {
      case 'SUBMITTED':
        return 0;
      case 'AI_ANALYZED':
        return 1;
      case 'VERIFIED':
        return 2;
      case 'INSPECTION_ASSIGNED':
      case 'INSPECTING':
      case 'INSPECTED':
        return 3;
      case 'ASSIGNED':
        return 4;
      case 'IN_PROGRESS':
      case 'PENDING_INSPECTION':
      case 'PENDING_ACCEPTANCE':
        return 5;
      case 'REWORK_REQUIRED':
        return 5;
      case 'RESOLVED':
      case 'CLOSED':
        return 6;
      case 'REJECTED':
        return 0;
      default:
        return 0;
    }
  };

  const currentIndex = getStageIndex(status);

  // Nếu bị từ chối tiếp nhận
  if (status === 'REJECTED') {
    return (
      <div className="w-full bg-rose-50 border border-rose-200 rounded-lg p-4 flex items-center justify-between text-xs text-rose-900 shadow-xs">
        <div className="flex items-center gap-2.5">
          <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <div>
            <span className="font-semibold uppercase tracking-wide text-rose-800">Hồ sơ đã bị từ chối tiếp nhận (REJECTED)</span>
            <p className="text-slate-600 text-xs mt-0.5">Sự cố không thuộc phạm vi xử lý, ảnh không liên quan hoặc báo cáo không hợp lệ.</p>
          </div>
        </div>
        <span className="font-mono font-medium px-2 py-0.5 bg-rose-100 rounded text-rose-700 text-xs">
          Từ chối
        </span>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-lg p-4 sm:p-5 border border-slate-200 shadow-xs">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">
            Quy trình Quản lý Bảo trì 7 Giai đoạn Chuẩn
          </span>
          {isDisputed && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[11px] font-medium border border-rose-200">
              <AlertTriangle className="w-3 h-3" /> Đang khiếu nại
            </span>
          )}
          {status === 'REWORK_REQUIRED' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 text-[11px] font-medium border border-rose-300">
              <RefreshCw className="w-3 h-3 animate-spin" /> Yêu cầu thi công lại {reworkCount ? `(Lần #${reworkCount})` : ''}
            </span>
          )}
          {isRework && status === 'IN_PROGRESS' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[11px] font-medium border border-amber-200">
              Tái thi công {reworkCount ? `lần #${reworkCount}` : ''}
            </span>
          )}
        </div>
        <span className="font-mono text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
          Giai đoạn {currentIndex + 1} / 7
        </span>
      </div>

      {/* Dải Stepper 7 bước với đường nối */}
      <div className="relative">
        <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
          {STEPS.map((step, idx) => {
            const isCompleted = idx < currentIndex || (idx === 6 && status === 'CLOSED');
            const isCurrent = idx === currentIndex;

            return (
              <div key={step.key} className="flex flex-col items-center text-center relative group">
                {/* Đường nối giữa các bước */}
                {idx > 0 && (
                  <div
                    className={`absolute top-4 -left-1/2 w-full h-[2px] -z-0 transition-colors ${
                      idx <= currentIndex ? 'bg-blue-600' : 'bg-slate-200'
                    }`}
                  />
                )}

                {/* Node biểu tượng */}
                <div
                  className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    isCompleted
                      ? 'bg-blue-600 text-white'
                      : isCurrent
                      ? 'bg-blue-600 text-white ring-2 ring-blue-100'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4 text-white" /> : step.icon}
                </div>

                {/* Tên bước */}
                <span
                  className={`text-[11px] sm:text-xs mt-2 font-medium line-clamp-1 transition-colors ${
                    isCurrent
                      ? 'text-blue-700 font-semibold'
                      : isCompleted
                      ? 'text-slate-800'
                      : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </span>

                {/* Trạng thái phụ */}
                <span
                  className={`text-[10px] mt-0.5 line-clamp-1 ${
                    isCurrent
                      ? 'text-blue-600 font-medium'
                      : isCompleted
                      ? 'text-emerald-600 font-medium'
                      : 'text-slate-400'
                  }`}
                >
                  {isCurrent
                    ? step.subLabel(status, isRework, reworkCount)
                    : isCompleted
                    ? 'Hoàn tất'
                    : 'Chờ xử lý'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
