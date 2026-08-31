import React from 'react';
import { Card } from '../components/ui/Card';
import {
  ShieldCheck,
  CreditCard,
  Smartphone,
  Radio,
  AlertTriangle,
  Layers,
  ArrowRight,
  BookOpen,
  Info,
  CheckCircle2,
  Lock
} from 'lucide-react';

interface MethodologyViewProps {
  onRouteChange: (route: string) => void;
}

export const MethodologyView: React.FC<MethodologyViewProps> = ({ onRouteChange }) => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-[#E5E5E0] shadow-sm space-y-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#008080]/10 text-[#008080] border border-[#008080]/30 text-xs font-bold uppercase tracking-wider">
          <BookOpen className="w-3.5 h-3.5 text-[#008080]" />
          <span>System Architecture &amp; Data Pipeline</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-[#1A1A1A] tracking-tight">
          RailFlow AI Multi-Signal Methodology
        </h1>
        <p className="text-sm text-[#6B7280] leading-relaxed max-w-3xl">
          Understanding how RailFlow AI fuses CCTV vision estimation, ticketing volumes, and an experimental anonymous device-density signal to forecast crowd surges across Mumbai Suburban Railway.
        </p>
      </div>

      {/* Mandatory Technical Disclaimer Highlight Banner */}
      <div className="bg-[#D97706]/10 border border-[#D97706]/30 rounded-2xl p-5 shadow-xs space-y-2">
        <div className="flex items-center gap-2 text-[#D97706] font-bold text-sm">
          <AlertTriangle className="w-5 h-5 text-[#D97706] shrink-0" />
          <span>Important Technical Disclaimer</span>
        </div>
        <p className="text-xs sm:text-sm text-[#1A1A1A] leading-relaxed">
          RailFlow AI <strong>does NOT</strong> claim that mobile phone radiation or ambient RF directly counts exact individual people. 
          The RF metric is strictly designated as an <strong>&ldquo;Experimental anonymous device-density signal&rdquo;</strong>—a supporting indicator of relative ambient density used in ensemble with primary ground-truth inputs (CCTV optical flow and ETVM/UTS ticketing transaction velocity).
        </p>
      </div>

      {/* The 4 Core Signal Pillars */}
      <div className="space-y-3">
        <h2 className="text-base sm:text-lg font-bold text-[#1A1A1A]">
          The 4 Core Multi-Modal Telemetry Signals
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Signal 1: CCTV */}
          <Card className="space-y-3 border-[#E5E5E0] bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#008080]/10 text-[#008080] flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-[#1A1A1A] text-sm">
                  1. CCTV Optical Flow &amp; Head Detection
                </h3>
                <span className="text-[11px] text-[#008080] font-bold">Primary Signal</span>
              </div>
            </div>
            <p className="text-xs text-[#6B7280] leading-relaxed">
              Edge vision algorithms evaluate footfall velocity, concourse dwell times, and bottleneck pinch-points on Foot Overbridges (FOBs) without recording facial biometric data.
            </p>
          </Card>

          {/* Signal 2: ETVM */}
          <Card className="space-y-3 border-[#E5E5E0] bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center font-bold">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-[#1A1A1A] text-sm">
                  2. ETVM &amp; ATVM Counter Ingress Velocity
                </h3>
                <span className="text-[11px] text-[#2563EB] font-bold">Transactional Ground Truth</span>
              </div>
            </div>
            <p className="text-xs text-[#6B7280] leading-relaxed">
              Physical automated ticketing vending machines report real-time transaction velocities, providing instantaneous indicators of sudden passenger surges at booking halls.
            </p>
          </Card>

          {/* Signal 3: UTS */}
          <Card className="space-y-3 border-[#E5E5E0] bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#4F46E5]/10 text-[#4F46E5] flex items-center justify-center font-bold">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-[#1A1A1A] text-sm">
                  3. UTS Mobile App Activity
                </h3>
                <span className="text-[11px] text-[#4F46E5] font-bold">Digital Geo-Ticketing</span>
              </div>
            </div>
            <p className="text-xs text-[#6B7280] leading-relaxed">
              Unreserved Ticketing System (UTS) geofenced purchases indicate incoming commuter traffic 10 to 20 minutes before passengers arrive on the platform.
            </p>
          </Card>

          {/* Signal 4: Device Density */}
          <Card className="space-y-3 border-[#E5E5E0] bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#D97706]/10 text-[#D97706] flex items-center justify-center font-bold">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-[#1A1A1A] text-sm">
                  4. Experimental Anonymous Device-Density Signal
                </h3>
                <span className="text-[11px] text-[#D97706] font-bold">Supporting Indicator</span>
              </div>
            </div>
            <p className="text-xs text-[#6B7280] leading-relaxed">
              Measures aggregated, anonymous ambient RF density indices across platform sectors to detect sudden cluster accumulations in low-visibility zones.
            </p>
          </Card>
        </div>
      </div>

      {/* Privacy & Ethical AI Standards */}
      <Card className="space-y-3 border-[#E5E5E0] bg-white">
        <div className="flex items-center gap-2 text-[#1A1A1A] font-bold text-sm">
          <Lock className="w-4 h-4 text-[#008080]" />
          <span>Privacy-by-Design &amp; Commuter Safety</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-[#6B7280]">
          <div className="bg-[#F9F9F7] p-3.5 rounded-xl border border-[#E5E5E0] space-y-1">
            <strong className="text-[#1A1A1A] block font-bold">No Facial Recognition</strong>
            <span>Images are processed on edge sensors and discarded immediately.</span>
          </div>
          <div className="bg-[#F9F9F7] p-3.5 rounded-xl border border-[#E5E5E0] space-y-1">
            <strong className="text-[#1A1A1A] block font-bold">Non-Individualized</strong>
            <span>All RF density telemetry is aggregated into sector indices without identifying devices.</span>
          </div>
          <div className="bg-[#F9F9F7] p-3.5 rounded-xl border border-[#E5E5E0] space-y-1">
            <strong className="text-[#1A1A1A] block font-bold">Open Hackathon Scope</strong>
            <span>Engineered for Smart India Hackathon (SIH 2026) Mumbai Suburban optimization.</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

