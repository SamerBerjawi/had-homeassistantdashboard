import React, { useState } from 'react';
import { 
  Door, 
  DoorOpen, 
  ShieldCheck, 
  ShieldWarning, 
  BatteryCharging, 
  BatteryHigh, 
  BatteryLow, 
  BatteryWarning, 
  Clock, 
  FrameCorners, 
  SquaresFour, 
  Lock, 
  LockOpen, 
  Archive, 
  Stack 
} from '@phosphor-icons/react';
import { ResolvedEntity } from '../../../types';
import DetailsRightDrawer from '../DetailsRightDrawer';

interface OpeningsOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  doorSensors: ResolvedEntity[];
  windowSensors: ResolvedEntity[];
  otherContactSensors?: ResolvedEntity[];
  initialTab?: 'all' | 'doors' | 'windows' | 'other';
}

export default function OpeningsOverviewModal({
  isOpen,
  onClose,
  doorSensors,
  windowSensors,
  otherContactSensors = [],
  initialTab = 'all'
}: OpeningsOverviewModalProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'doors' | 'windows' | 'other'>(initialTab);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const openDoors = doorSensors.filter(d => d.state === 'on');
  const openWindows = windowSensors.filter(w => w.state === 'on');
  const openOthers = otherContactSensors.filter(o => o.state === 'on');
  const totalOpen = openDoors.length + openWindows.length + openOthers.length;
  const totalSensors = doorSensors.length + windowSensors.length + otherContactSensors.length;

  const displayedSensors = [
    ...(activeTab === 'all' || activeTab === 'doors' ? doorSensors : []),
    ...(activeTab === 'all' || activeTab === 'windows' ? windowSensors : []),
    ...(activeTab === 'all' || activeTab === 'other' ? otherContactSensors : [])
  ];

  const getSensorIcon = (sensor: ResolvedEntity, isOpen: boolean) => {
    const devClass = sensor.attributes?.device_class;
    const eid = sensor.entity_id.toLowerCase();

    if (devClass === 'door' || devClass === 'garage_door' || eid.includes('door') || eid.includes('garage') || eid.includes('gate')) {
      return isOpen 
        ? <DoorOpen size={22} weight="duotone" className="text-amber-400" /> 
        : <Door size={22} weight="duotone" className="text-emerald-400" />;
    }
    if (devClass === 'window' || eid.includes('window')) {
      return <FrameCorners size={22} weight="duotone" className={isOpen ? 'text-amber-400' : 'text-emerald-400'} />;
    }
    if (devClass === 'lock' || eid.includes('lock')) {
      return isOpen
        ? <LockOpen size={22} weight="duotone" className="text-amber-400" />
        : <Lock size={22} weight="duotone" className="text-emerald-400" />;
    }
    if (eid.includes('safe') || eid.includes('cabinet') || eid.includes('mailbox')) {
      return <Archive size={22} weight="duotone" className={isOpen ? 'text-amber-400' : 'text-emerald-400'} />;
    }
    return <Stack size={22} weight="duotone" className={isOpen ? 'text-amber-400' : 'text-emerald-400'} />;
  };

  return (
    <DetailsRightDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Contact Sensors & Perimeter Openings"
      subtitle={`${totalOpen} opening${totalOpen === 1 ? '' : 's'} unsealed • ${totalSensors} total monitored sensors`}
      icon={totalOpen > 0 
        ? <ShieldWarning size={22} weight="duotone" className="text-amber-400" /> 
        : <ShieldCheck size={22} weight="duotone" className="text-emerald-400" />
      }
    >
      <div className="space-y-6">
        {/* Status Summary Banner */}
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
            totalOpen > 0
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-3">
            {totalOpen > 0 ? (
              <ShieldWarning size={28} weight="duotone" className="text-amber-400 shrink-0 animate-pulse" />
            ) : (
              <ShieldCheck size={28} weight="duotone" className="text-emerald-400 shrink-0" />
            )}
            <div>
              <div className="text-sm font-bold text-white">
                {totalOpen > 0 ? `${totalOpen} Monitored Opening${totalOpen === 1 ? '' : 's'} Open` : 'All Contact Sensors Sealed & Closed'}
              </div>
              <div className="text-xs text-slate-300">
                {totalOpen > 0
                  ? `${openDoors.length} Door(s) • ${openWindows.length} Window(s)${openOthers.length > 0 ? ` • ${openOthers.length} Other(s)` : ''}`
                  : 'Perimeter envelope is fully secure'}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-white/5 border border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer truncate ${
              activeTab === 'all'
                ? 'bg-white/15 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({totalSensors})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('doors')}
            className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer truncate flex items-center justify-center gap-1 ${
              activeTab === 'doors'
                ? 'bg-white/15 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Door size={14} weight="duotone" />
            <span>Doors ({doorSensors.length}) {openDoors.length > 0 && `• ${openDoors.length}`}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('windows')}
            className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer truncate flex items-center justify-center gap-1 ${
              activeTab === 'windows'
                ? 'bg-white/15 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FrameCorners size={14} weight="duotone" />
            <span>Windows ({windowSensors.length}) {openWindows.length > 0 && `• ${openWindows.length}`}</span>
          </button>
          {otherContactSensors.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('other')}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer truncate flex items-center justify-center gap-1 ${
                activeTab === 'other'
                  ? 'bg-white/15 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Archive size={14} weight="duotone" />
              <span>Other ({otherContactSensors.length}) {openOthers.length > 0 && `• ${openOthers.length}`}</span>
            </button>
          )}
        </div>

        {/* Sensor List (Read-Only Accurate Status) */}
        <div className="space-y-3">
          {displayedSensors.map((sensor) => {
            const isOpen = sensor.state === 'on';
            const battery = sensor.batteryPct ?? (
              typeof sensor.attributes?.battery === 'number' 
                ? sensor.attributes.battery 
                : typeof sensor.attributes?.battery_level === 'number' 
                  ? sensor.attributes.battery_level 
                  : undefined
            );
            const roomName = sensor.area?.name || 'Perimeter';
            const devClass = sensor.attributes?.device_class || 'contact';

            return (
              <div
                key={sensor.entity_id}
                className={`p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-4 ${
                  isOpen
                    ? 'bg-amber-500/10 border-amber-500/30 shadow-md'
                    : 'bg-white/5 border-white/10 opacity-80'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                      isOpen
                        ? 'bg-amber-500/20 border border-amber-500/40 animate-pulse'
                        : 'bg-emerald-500/15 border border-emerald-500/30'
                    }`}
                  >
                    {getSensorIcon(sensor, isOpen)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white truncate">{sensor.name}</h4>
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                          isOpen
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        {isOpen ? 'Open' : 'Closed'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-400">
                      <span>{roomName}</span>
                      <span>•</span>
                      <span className="capitalize">{devClass}</span>
                      {battery !== undefined && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-medium">
                            {battery <= 20 ? (
                              <BatteryWarning size={16} weight="duotone" className="text-rose-400" />
                            ) : battery >= 80 ? (
                              <BatteryCharging size={16} weight="duotone" className="text-emerald-400" />
                            ) : (
                              <BatteryHigh size={16} weight="duotone" className="text-slate-300" />
                            )}
                            {Math.round(battery)}%
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Read-only HA Status */}
                <div className="text-right shrink-0">
                  <span className={`text-xs font-bold ${isOpen ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {isOpen ? 'Open' : 'Closed'}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 block truncate max-w-28 sm:max-w-xs">
                    {sensor.entity_id}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DetailsRightDrawer>
  );
}
