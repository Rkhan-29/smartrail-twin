import React from 'react';
import { UserRole } from '../types';
import { Card } from '../components/ui/Card';
import { Train, User, Activity, CheckCircle2, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface LoginViewProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onRouteChange: (route: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  currentRole,
  onRoleChange,
  onRouteChange
}) => {
  return (
    <div className="max-w-md mx-auto py-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-teal-800 text-white flex items-center justify-center mx-auto shadow-sm">
          <Train className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          RailFlow AI Demo Portal
        </h1>
        <p className="text-xs text-slate-500">
          Switch user profile mode to experience passenger features vs control room console.
        </p>
      </div>

      <div className="space-y-3">
        {/* Passenger Mode Option */}
        <Card
          variant="default"
          hoverEffect
          onClick={() => {
            onRoleChange('passenger');
            onRouteChange('/home');
          }}
          className={cn(
            'cursor-pointer space-y-2 border-2 transition-all',
            currentRole === 'passenger'
              ? 'border-teal-600 bg-teal-50/20'
              : 'border-slate-200'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Passenger / Commuter Mode</h3>
                <span className="text-[11px] text-slate-500">Public Live View</span>
              </div>
            </div>
            {currentRole === 'passenger' && (
              <CheckCircle2 className="w-5 h-5 text-teal-600" />
            )}
          </div>
          <p className="text-xs text-slate-600">
            Check station crowding, coach load, next trains, and 15-minute predictive surge advisories before boarding.
          </p>
        </Card>

        {/* Control Room Mode Option */}
        <Card
          variant="default"
          hoverEffect
          onClick={() => {
            onRoleChange('control_room');
            onRouteChange('/control-room');
          }}
          className={cn(
            'cursor-pointer space-y-2 border-2 transition-all',
            currentRole === 'control_room'
              ? 'border-slate-900 bg-slate-50'
              : 'border-slate-200'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Operations Control Room (OCC)</h3>
                <span className="text-[11px] text-slate-500">Station Master &amp; Police Command</span>
              </div>
            </div>
            {currentRole === 'control_room' && (
              <CheckCircle2 className="w-5 h-5 text-slate-900" />
            )}
          </div>
          <p className="text-xs text-slate-600">
            Full network telemetry, real-time surge alerts, station triage list, and marshalling dispatch advisories.
          </p>
        </Card>
      </div>

      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
        Demo environment configured for SIH 2026 Mumbai Suburban Railway prototype.
      </div>
    </div>
  );
};
