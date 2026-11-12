import { LightCapabilities } from '../../../../services/lightClassification';
import { SCENE_PRESETS } from './lightPresets';

// Scenes tab: native HA effect chips and atmosphere presets.
interface ScenesPanelProps {
  activeEffect: string;
  caps: LightCapabilities;
  handleSelectEffect: (effect: string) => void;
  darkMode: boolean;
  supportsColor: boolean;
  supportsWarmth: boolean;
  handleApplyScene: (scene: (typeof SCENE_PRESETS)[0]) => void;
}

export default function ScenesPanel({
  activeEffect,
  caps,
  handleSelectEffect,
  darkMode,
  supportsColor,
  supportsWarmth,
  handleApplyScene
}: ScenesPanelProps) {
  return (
    <div className="space-y-3 pt-1 animate-fadeIn">
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
          Lighting Scenes & Effects
        </span>
        {activeEffect && (
          <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
            {activeEffect}
          </span>
        )}
      </div>

      {/* Native Home Assistant Light Effects Chips */}
      {caps.effectList && caps.effectList.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {caps.effectList.map((eff) => {
            const isSelected = activeEffect.toLowerCase() === eff.toLowerCase();
            return (
              <button
                key={eff}
                type="button"
                onClick={() => handleSelectEffect(eff)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 border ${
                  isSelected
                    ? 'bg-purple-500 text-white border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                    : darkMode
                    ? 'bg-black/20 hover:bg-black/40 border-white/5 text-slate-300'
                    : 'bg-white/70 hover:bg-white border-slate-200/80 text-slate-800 font-bold shadow-xs'
                }`}
              >
                {eff}
              </button>
            );
          })}
        </div>
      )}

      {/* Atmosphere Presets (if entity also supports color/temp) */}
      {(supportsColor || supportsWarmth) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {SCENE_PRESETS.map((scene) => {
            const Icon = scene.icon;
            return (
              <button
                key={scene.id}
                type="button"
                onClick={() => handleApplyScene(scene)}
                className={`p-3 rounded-2xl border text-left flex flex-col gap-2 transition-all cursor-pointer active:scale-95 shadow-[4px_6px_12px_rgba(0,0,0,0.10)] ${
                  darkMode
                    ? 'bg-black/20 hover:bg-black/40 border-white/5 text-white'
                    : 'bg-white/70 hover:bg-white border-slate-200/80 text-slate-900 shadow-xs'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center">
                  <Icon size={18} weight="duotone" />
                </div>
                <div>
                  <span className="text-xs font-black block">{scene.name}</span>
                  <span className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold block">
                    {scene.desc}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
