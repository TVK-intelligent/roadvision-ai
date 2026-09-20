import React from 'react';
import { IncidentStatus } from '../types';
import { Check, Cpu, ShieldCheck, Wrench, Hammer, CheckCircle2, Archive } from 'lucide-react';

interface TimelineProps {
  status: IncidentStatus;
}

const STAGES: { key: IncidentStatus | 'VERIFIED'; label: string; icon: React.ReactNode }[] = [
  { key: 'SUBMITTED', label: '1. Tiếp nhận', icon: <Check className="w-4 h-4" /> },
  { key: 'AI_ANALYZED', label: '2. Phân tích AI', icon: <Cpu className="w-4 h-4" /> },
  { key: 'VERIFIED', label: '3. Thẩm định', icon: <ShieldCheck className="w-4 h-4" /> },
  { key: 'ASSIGNED', label: '4. Phân công', icon: <Wrench className="w-4 h-4" /> },
  { key: 'IN_PROGRESS', label: '5. Đang thi công', icon: <Hammer className="w-4 h-4" /> },
  { key: 'RESOLVED', label: '6. Nghiệm thu', icon: <CheckCircle2 className="w-4 h-4" /> },
  { key: 'CLOSED', label: '7. Đóng phiếu', icon: <Archive className="w-4 h-4" /> },
];

export const Timeline: React.FC<TimelineProps> = ({ status }) => {
  const getStageIndex = (s: IncidentStatus): number => {
    switch (s) {
      case 'SUBMITTED': return 0;
      case 'AI_ANALYZED': return 1;
      case 'ASSIGNED': return 3;
      case 'IN_PROGRESS': return 4;
      case 'RESOLVED': return 5;
      case 'CLOSED': return 6;
      case 'REJECTED': return 0;
      default: return 0;
    }
  };

  const currentIndex = getStageIndex(status);

  return (
    <div className="w-full bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/30 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-bold text-on-surface">Tiến độ vòng đời xử lý sự cố</span>
        <span className="font-mono text-xs font-semibold text-primary bg-primary-fixed/40 px-2.5 py-0.5 rounded-full">
          Giai đoạn {currentIndex + 1} / 7
        </span>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="min-w-[650px] grid grid-cols-7 gap-2 relative">
          {STAGES.map((stage, idx) => {
            const isCompleted = idx < currentIndex;
            const isCurrent = idx === currentIndex;

            return (
              <div key={stage.key} className="flex flex-col items-center text-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    isCurrent
                      ? 'bg-primary text-on-primary ring-4 ring-primary-fixed shadow-md animate-pulse'
                      : isCompleted
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-high text-on-surface-variant/60'
                  }`}
                >
                  {stage.icon}
                </div>
                <span className={`text-xs mt-2 font-medium truncate ${isCurrent ? 'text-primary font-bold' : 'text-on-surface-variant'}`}>
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
