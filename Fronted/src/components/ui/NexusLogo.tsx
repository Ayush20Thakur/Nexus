import { clsx } from 'clsx';

interface NexusLogoProps {
  size?: number | string;
  showText?: boolean;
  className?: string;
  glow?: boolean;
}

export function NexusLogo({
  size = 32,
  showText = false,
  className,
  glow = true,
}: NexusLogoProps) {
  const numericSize = typeof size === 'number' ? size : parseInt(size, 10) || 32;

  return (
    <div className={clsx('inline-flex items-center gap-3', className)}>
      <svg
        width={numericSize}
        height={numericSize}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={clsx(glow && 'drop-shadow-[0_0_12px_rgba(0,180,255,0.6)]')}
      >
        <defs>
          <linearGradient id="nexusGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>

          <linearGradient id="nexusNodeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7dd3fc" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>

          <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Frame Lines / Circuit Tracks */}
        {/* Left vertical rail */}
        <line x1="20" y1="20" x2="20" y2="80" stroke="url(#nexusGradient)" strokeWidth="3" strokeLinecap="round" />
        <line x1="20" y1="80" x2="38" y2="80" stroke="url(#nexusGradient)" strokeWidth="3" strokeLinecap="round" />
        <line x1="38" y1="80" x2="38" y2="60" stroke="url(#nexusGradient)" strokeWidth="3" strokeLinecap="round" />

        {/* Top-left diagonal circuit to center */}
        <line x1="20" y1="20" x2="50" y2="50" stroke="url(#nexusGradient)" strokeWidth="3" strokeLinecap="round" />

        {/* Inner diagonal cross trace */}
        <line x1="20" y1="80" x2="80" y2="20" stroke="url(#nexusGradient)" strokeWidth="3" strokeLinecap="round" />

        {/* Diagonal N main stroke */}
        <line x1="32" y1="26" x2="32" y2="60" stroke="url(#nexusGradient)" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="32" y1="60" x2="68" y2="40" stroke="url(#nexusGradient)" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="68" y1="40" x2="68" y2="74" stroke="url(#nexusGradient)" strokeWidth="2.5" strokeLinecap="round" />

        {/* Right vertical rail & circuit box */}
        <line x1="80" y1="80" x2="80" y2="20" stroke="url(#nexusGradient)" strokeWidth="3" strokeLinecap="round" />
        <line x1="80" y1="20" x2="62" y2="20" stroke="url(#nexusGradient)" strokeWidth="3" strokeLinecap="round" />
        <line x1="62" y1="20" x2="62" y2="40" stroke="url(#nexusGradient)" strokeWidth="3" strokeLinecap="round" />
        <line x1="80" y1="80" x2="62" y2="80" stroke="url(#nexusGradient)" strokeWidth="3" strokeLinecap="round" />

        {/* Additional circuit line from right to center */}
        <line x1="80" y1="80" x2="50" y2="50" stroke="url(#nexusGradient)" strokeWidth="3" strokeLinecap="round" />

        {/* Glowing Circuit Nodes */}
        {/* Top Left Corner */}
        <circle cx="20" cy="20" r="3.5" fill="#38bdf8" stroke="#0369a1" strokeWidth="1.5" filter="url(#glowFilter)" />
        {/* Bottom Left Corner */}
        <circle cx="20" cy="80" r="3.5" fill="#38bdf8" stroke="#0369a1" strokeWidth="1.5" filter="url(#glowFilter)" />
        {/* Top Right Corner */}
        <circle cx="80" cy="20" r="3.5" fill="#38bdf8" stroke="#0369a1" strokeWidth="1.5" filter="url(#glowFilter)" />
        {/* Bottom Right Corner */}
        <circle cx="80" cy="80" r="3.5" fill="#38bdf8" stroke="#0369a1" strokeWidth="1.5" filter="url(#glowFilter)" />

        {/* Inner Nodes */}
        <circle cx="32" cy="26" r="2.8" fill="#7dd3fc" stroke="#0284c7" strokeWidth="1" />
        <circle cx="32" cy="60" r="2.8" fill="#7dd3fc" stroke="#0284c7" strokeWidth="1" />
        <circle cx="38" cy="45" r="3" fill="#38bdf8" stroke="#0284c7" strokeWidth="1.2" />
        <circle cx="50" cy="50" r="3.5" fill="#e0f2fe" stroke="#0284c7" strokeWidth="1.5" filter="url(#glowFilter)" />
        <circle cx="62" cy="40" r="3" fill="#38bdf8" stroke="#0284c7" strokeWidth="1.2" />
        <circle cx="68" cy="74" r="2.8" fill="#7dd3fc" stroke="#0284c7" strokeWidth="1" />
      </svg>

      {showText && (
        <span className="font-extrabold tracking-tight text-on-surface text-xl font-heading">
          NEXUS
        </span>
      )}
    </div>
  );
}
