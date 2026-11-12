import { Power } from '@phosphor-icons/react';
import DynamicPhosphorIcon from '../../../ui/DynamicPhosphorIcon';

// Top header (room, name, optional icon) and the tactile power switch pill.
interface LightHeaderProps {
  customIcon?: string | null;
  isOn: boolean;
  roomName: string;
  lightName: string;
  handleToggle: () => void;
  darkMode: boolean;
  lampIlluminationColor: string;
}

export default function LightHeader({
  customIcon,
  isOn,
  roomName,
  lightName,
  handleToggle,
  darkMode,
  lampIlluminationColor
}: LightHeaderProps) {
  return (
    <div className="flex items-center justify-between px-1">
      <div className="flex items-center gap-3">
        {customIcon && (
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center border shrink-0 transition-colors shadow-xs"
            style={{
              backgroundColor: isOn ? 'rgba(251, 191, 36, 0.15)' : 'rgba(100, 116, 139, 0.12)',
              borderColor: isOn ? 'rgba(251, 191, 36, 0.35)' : 'rgba(100, 116, 139, 0.25)',
              color: isOn ? '#fbbf24' : '#94a3b8'
            }}
          >
            <DynamicPhosphorIcon name={customIcon} size={22} weight="duotone" />
          </div>
        )}
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
            {roomName}
          </span>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight truncate max-w-[200px] sm:max-w-xs">
            {lightName}
          </h2>
        </div>
      </div>

      {/* Tactile Power Switch Pill */}
      <button
        type="button"
        onClick={handleToggle}
        aria-label={isOn ? 'Turn Light Off' : 'Turn Light On'}
        className={`h-11 px-3 rounded-full flex items-center gap-2 border transition-all duration-300 cursor-pointer active:scale-95 shadow-[4px_6px_12px_rgba(0,0,0,0.15)] ${
          isOn
            ? darkMode
              ? 'bg-black/40 border-amber-400/40 text-amber-300'
              : 'bg-white border-amber-400/60 text-amber-800 shadow-xs'
            : darkMode
            ? 'bg-black/20 border-white/10 text-slate-400'
            : 'bg-slate-100/90 border-slate-300/80 text-slate-700'
        }`}
      >
        <span className="text-xs font-black uppercase tracking-wider pl-1">
          {isOn ? 'On' : 'Off'}
        </span>
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 shadow-md ${
            isOn
              ? 'bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(251,191,36,0.6)] scale-105'
              : 'bg-slate-300 text-slate-700 dark:bg-slate-700 dark:text-slate-400'
          }`}
          style={{
            backgroundColor: isOn && lampIlluminationColor !== 'transparent' ? lampIlluminationColor : undefined
          }}
        >
          <Power size={15} weight="bold" />
        </div>
      </button>
    </div>
  );
}
