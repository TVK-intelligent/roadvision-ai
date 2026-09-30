import React from 'react';
import { IncidentStatus } from '../types';
import { Check, Sparkles, UserCheck, Hammer, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

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
    label: 'Tiếp nhận phản ánh',
    subLabel: () => 'Đã tiếp nhận',
    icon: <Check className="w-3.5 h-3.5" />,
  },
  {
    key: 'AI_ANALYZED',
    stepNum: 2,
    label: 'AI quét & phân loại',
    subLabel: () => 'YOLOv8 hoàn tất',
    icon: <Sparkles className="w-3.5 h-3.5" />,
  },
  {
    key: 'ASSIGNED',
    stepNum: 3,
    label: 'Thẩm định & điều phối',
    subLabel: () => 'Đã phân công',
    icon: <UserCheck className="w-3.5 h-3.5" />,
  },
  {
    key: 'IN_PROGRESS',
    stepNum: 4,
    label: 'Thi công hiện trường',
    subLabel: (_, isRework, reworkCount) => {
      if (isRework) {
        return reworkCount ? `Tái thi công (#${reworkCount})` : 'Tái thi công';
      }
      return 'Đang thi công';
    },
    icon: <Hammer className="w-3.5 h-3.5" />,
  },
  {
    key: 'RESOLVED_OR_CLOSED',
    stepNum: 5,
    label: 'Nghiệm thu & đóng phiếu',
    subLabel: (status) => {
      if (status === 'CLOSED') return 'Đã đóng hồ sơ';
      if (status === 'RESOLVED') return 'Đã nghiệm thu (Chờ đóng)';
      return 'Chờ nghiệm thu';
    },
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
];

export const Timeline: React.FC<TimelineProps> = ({ status, isRework, reworkCount, isDisputed }) => {
  // Ánh xạ chính xác trạng thái Database vào 5 Pha nghiệp vụ chuẩn
  const getStageIndex = (s: IncidentStatus): number => {
    switch (s) {
      case 'SUBMITTED':
        return 0;
      case 'AI_ANALYZED':
        return 1;
      case 'ASSIGNED':
        return 2;
      case 'IN_PROGRESS':
        return 3;
      case 'RESOLVED':
      case 'CLOSED':
        return 4;
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
      <div className="w-full bg-rose-50 border border-rose-200/80 rounded-2xl p-4 flex items-center justify-between text-xs text-rose-900 shadow-xs">
        <div className="flex items-center gap-2.5">
          <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <div>
            <span className="font-bold uppercase tracking-wider text-rose-700">Hồ sơ đã bị từ chối tiếp nhận</span>
            <p className="text-rose-600/80 text-[11px] mt-0.5">Sự cố không nằm trong thẩm quyền bảo trì hoặc ảnh chụp không hợp lệ.</p>
          </div>
        </div>
        <span className="font-mono font-bold px-2.5 py-1 bg-rose-100 rounded-lg text-rose-700 text-[11px]">
          REJECTED
        </span>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 font-display">
            Tiến độ xử lý 5 pha
          </span>
          {isDisputed && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold border border-rose-200 animate-pulse">
              <AlertTriangle className="w-3 h-3" /> Đang khiếu nại
            </span>
          )}
          {isRework && status === 'IN_PROGRESS' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200">
              Tái thi công {reworkCount ? `lần #${reworkCount}` : ''}
            </span>
          )}
        </div>
        <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
          Pha {currentIndex + 1} / 5
        </span>
      </div>

      {/* Dải Stepper 5 bước hiện đại với đường nối */}
      <div className="relative">
        <div className="grid grid-cols-5 gap-1 sm:gap-2">
          {STEPS.map((step, idx) => {
            const isCompleted = idx < currentIndex || (idx === 4 && status === 'CLOSED');
            const isCurrent = idx === currentIndex && !(idx === 4 && status === 'CLOSED');
            const isPending = idx > currentIndex;

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
                  className={`relative z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all ${
                    isCompleted
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isCurrent
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-sm animate-pulse'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4 text-white" /> : step.icon}
                </div>

                {/* Tên bước */}
                <span
                  className={`text-[11px] sm:text-xs mt-2 font-semibold line-clamp-1 transition-colors ${
                    isCurrent
                      ? 'text-blue-700 font-bold'
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

