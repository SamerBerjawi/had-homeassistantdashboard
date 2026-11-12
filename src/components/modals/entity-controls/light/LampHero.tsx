import { LightCapabilities } from '../../../../services/lightClassification';

// Pendant lamp hero with ambient bloom and conical light beam; click toggles power.
interface LampHeroProps {
  glassCardStyle: string;
  handleToggle: () => void;
  isOn: boolean;
  lampIlluminationColor: string;
  brightness: number;
  beamOpacity: number;
  darkMode: boolean;
  caps: LightCapabilities;
}

export default function LampHero({
  glassCardStyle,
  handleToggle,
  isOn,
  lampIlluminationColor,
  brightness,
  beamOpacity,
  darkMode,
  caps
}: LampHeroProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl p-4 flex flex-col items-center justify-center min-h-[210px] transition-all duration-500 cursor-pointer ${glassCardStyle}`}
      onClick={handleToggle}
      title={isOn ? 'Click lamp to turn off' : 'Click lamp to turn on'}
     role="button" tabIndex={0} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.currentTarget.click(); } }}>
      {/* Ambient background bloom */}
      <div
        className="absolute -top-10 inset-x-0 h-48 rounded-full blur-3xl transition-opacity duration-700 pointer-events-none"
        style={{
          backgroundColor: lampIlluminationColor,
          opacity: isOn ? (brightness / 100) * 0.35 : 0
        }}
      />

      {/* SVG Pendant Lamp & Conical Light Beam */}
      <svg
        viewBox="0 0 240 210"
        className="w-56 sm:w-64 h-auto overflow-visible select-none drop-shadow-md"
      >
        <defs>
          <linearGradient id="shadeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="35%" stopColor="#334155" />
            <stop offset="70%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          <linearGradient id="brassTrim" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#b45309" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>

          <linearGradient id="lightBeam" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={lampIlluminationColor} stopOpacity="0.85" />
            <stop offset="40%" stopColor={lampIlluminationColor} stopOpacity="0.45" />
            <stop offset="100%" stopColor={lampIlluminationColor} stopOpacity="0.0" />
          </linearGradient>

          <radialGradient id="bulbGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="45%" stopColor={lampIlluminationColor} stopOpacity="0.85" />
            <stop offset="100%" stopColor={lampIlluminationColor} stopOpacity="0.3" />
          </radialGradient>
        </defs>

        {/* Conical Light Beam */}
        <polygon
          points="65,95 175,95 230,205 10,205"
          fill="url(#lightBeam)"
          className="transition-opacity duration-500 ease-out pointer-events-none"
          style={{ opacity: beamOpacity }}
        />

        {/* Hanging Cord */}
        <line
          x1="120"
          y1="0"
          x2="120"
          y2="38"
          stroke={darkMode ? '#94a3b8' : '#64748b'}
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Brass Socket Fixture */}
        <rect
          x="113"
          y="36"
          width="14"
          height="12"
          rx="2"
          fill="url(#brassTrim)"
        />

        {/* Pendant Lamp Bell / Flared Shade */}
        <path
          d="M 112 48 C 112 66, 68 82, 54 94 C 50 97, 51 98, 62 98 L 178 98 C 189 98, 190 97, 186 94 C 172 82, 128 66, 128 48 Z"
          fill="url(#shadeGrad)"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="1"
        />

        {/* Brass Metallic Accent Rim at Shade Base */}
        <ellipse
          cx="120"
          cy="98"
          rx="60"
          ry="7"
          fill="url(#brassTrim)"
        />

        {/* Diffuser Lens */}
        <ellipse
          cx="120"
          cy="98"
          rx="54"
          ry="5"
          fill={isOn ? 'url(#bulbGlow)' : '#1e293b'}
          className="transition-all duration-300"
        />

        {/* Core Hotspot Glow */}
        {isOn && (
          <ellipse
            cx="120"
            cy="98"
            rx="30"
            ry="3"
            fill="#ffffff"
            opacity={Math.min(1, (brightness / 100) * 0.9 + 0.1)}
            className="transition-opacity duration-300 pointer-events-none"
          />
        )}
      </svg>

      {/* State Subtitle */}
      <div className="mt-2 text-center">
        <span
          className={`text-xs font-bold tracking-wide transition-colors ${
            isOn
              ? 'text-amber-500 dark:text-amber-400'
              : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          {isOn
            ? caps.supportsBrightness
              ? `Illuminated • ${brightness}% Brightness`
              : 'Illuminated • Active'
            : 'Standby • Tap to Turn On'}
        </span>
      </div>
    </div>
  );
}
