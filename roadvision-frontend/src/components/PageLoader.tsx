import React from 'react';
import { Shield, Sparkles } from 'lucide-react';

export const PageLoader: React.FC = () => {
  return (
    <div className="w-full min-h-[60vh] flex flex-col items-center justify-center gap-4 py-16 animate-in fade-in duration-300">
      <div className="relative">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 border-2 border-primary/30 flex items-center justify-center text-primary animate-pulse">
          <Shield className="w-7 h-7" />
        </div>
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center text-on-primary">
          <Sparkles className="w-2.5 h-2.5 animate-spin" />
        </div>
      </div>
      <div className="flex flex-col items-center gap-1">
        <div className="font-display font-bold text-sm text-on-surface tracking-wide">
          Đang nạp dữ liệu RoadVision...
        </div>
        <div className="font-mono text-[11px] text-on-surface-variant">
          TELEMETRY SYNC • V2.4
        </div>
      </div>
    </div>
  );
};
