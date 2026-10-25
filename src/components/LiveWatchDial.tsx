import React, { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

interface LiveWatchDialProps {
  size?: number;
  className?: string;
}

/**
 * A fully vector, real-time watch dial — sunburst face, applied gold indices,
 * dauphine hands and a sweeping seconds hand (8 beats/sec, like a 28,800 vph calibre).
 */
export const LiveWatchDial: React.FC<LiveWatchDialProps> = ({ size = 420, className = '' }) => {
  const prefersReducedMotion = useReducedMotion();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), prefersReducedMotion ? 1000 : 125);
    return () => clearInterval(id);
  }, [prefersReducedMotion]);

  const ms = prefersReducedMotion ? 0 : now.getMilliseconds();
  const s = now.getSeconds() + Math.floor(ms / 125) / 8;
  const m = now.getMinutes() + s / 60;
  const h = (now.getHours() % 12) + m / 60;
  const date = now.getDate();

  const indices = Array.from({ length: 12 }, (_, i) => i);
  const minuteTicks = Array.from({ length: 60 }, (_, i) => i).filter((i) => i % 5 !== 0);

  return (
    <svg
      viewBox="0 0 400 400"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={`Live watch showing ${now.toLocaleTimeString()}`}
    >
      <defs>
        <radialGradient id="lwd-face" cx="50%" cy="42%" r="62%">
          <stop offset="0%" stopColor="#1E2A33" />
          <stop offset="55%" stopColor="#0F171D" />
          <stop offset="100%" stopColor="#05080A" />
        </radialGradient>
        <linearGradient id="lwd-bezel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F4DFA8" />
          <stop offset="30%" stopColor="#C5A059" />
          <stop offset="55%" stopColor="#7A5A22" />
          <stop offset="80%" stopColor="#DFBD78" />
          <stop offset="100%" stopColor="#9E7B36" />
        </linearGradient>
        <linearGradient id="lwd-gold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#9E7B36" />
          <stop offset="50%" stopColor="#F4DFA8" />
          <stop offset="100%" stopColor="#9E7B36" />
        </linearGradient>
        <radialGradient id="lwd-glare" cx="30%" cy="20%" r="60%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <filter id="lwd-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000" floodOpacity="0.55" />
        </filter>
      </defs>

      {/* Case & bezel */}
      <circle cx="200" cy="200" r="196" fill="url(#lwd-bezel)" />
      <circle cx="200" cy="200" r="184" fill="#0A0A0B" />
      <circle cx="200" cy="200" r="178" fill="url(#lwd-face)" />

      {/* Sunburst brushing */}
      <g opacity="0.07">
        {Array.from({ length: 90 }, (_, i) => (
          <line
            key={i}
            x1="200"
            y1="200"
            x2={200 + 178 * Math.cos((i * 4 * Math.PI) / 180)}
            y2={200 + 178 * Math.sin((i * 4 * Math.PI) / 180)}
            stroke="#fff"
            strokeWidth="0.6"
          />
        ))}
      </g>

      {/* Minute track */}
      {minuteTicks.map((i) => (
        <line
          key={i}
          x1="200"
          y1="30"
          x2="200"
          y2="37"
          stroke="#FAF8F5"
          strokeOpacity="0.45"
          strokeWidth="1.2"
          transform={`rotate(${i * 6} 200 200)`}
        />
      ))}

      {/* Applied indices */}
      {indices.map((i) =>
        i === 3 ? null : (
          <rect
            key={i}
            x={i === 0 ? 191 : 195}
            y="34"
            width={i === 0 ? 18 : 10}
            height={i === 0 ? 40 : 32}
            rx="2"
            fill="url(#lwd-gold)"
            filter="url(#lwd-shadow)"
            transform={`rotate(${i * 30} 200 200)`}
          />
        ),
      )}

      {/* Date window at 3 o'clock */}
      <rect x="318" y="187" width="34" height="26" rx="3" fill="#FAF8F5" stroke="url(#lwd-gold)" strokeWidth="2.5" />
      <text x="335" y="206" textAnchor="middle" fontSize="16" fontWeight="600" fill="#0D0D0D" fontFamily="Plus Jakarta Sans, sans-serif">
        {date}
      </text>

      {/* Wordmark */}
      <text x="200" y="128" textAnchor="middle" fontSize="20" letterSpacing="5" fill="#DFBD78" fontFamily="Cormorant Garamond, serif" fontWeight="600">
        BIN FAREED
      </text>
      <text x="200" y="145" textAnchor="middle" fontSize="7.5" letterSpacing="3" fill="#FAF8F5" fillOpacity="0.6" fontFamily="Plus Jakarta Sans, sans-serif">
        CHRONOMÈTRE · AUTOMATIC
      </text>
      <text x="200" y="292" textAnchor="middle" fontSize="7" letterSpacing="3" fill="#FAF8F5" fillOpacity="0.45" fontFamily="Plus Jakarta Sans, sans-serif">
        SWISS MADE
      </text>

      {/* Hour hand */}
      <g transform={`rotate(${h * 30} 200 200)`} filter="url(#lwd-shadow)">
        <path d="M200 92 L208 200 L200 218 L192 200 Z" fill="url(#lwd-gold)" />
        <path d="M200 106 L203 190 L197 190 Z" fill="#E9F3EE" fillOpacity="0.85" />
      </g>

      {/* Minute hand */}
      <g transform={`rotate(${m * 6} 200 200)`} filter="url(#lwd-shadow)">
        <path d="M200 46 L206 200 L200 222 L194 200 Z" fill="url(#lwd-gold)" />
        <path d="M200 60 L202.5 186 L197.5 186 Z" fill="#E9F3EE" fillOpacity="0.85" />
      </g>

      {/* Seconds hand */}
      <g transform={`rotate(${s * 6} 200 200)`} filter="url(#lwd-shadow)">
        <line x1="200" y1="240" x2="200" y2="40" stroke="#C5A059" strokeWidth="1.8" />
        <circle cx="200" cy="232" r="6" fill="#C5A059" />
        <circle cx="200" cy="70" r="4" fill="none" stroke="#C5A059" strokeWidth="1.5" />
      </g>

      <circle cx="200" cy="200" r="7" fill="url(#lwd-bezel)" />
      <circle cx="200" cy="200" r="2.5" fill="#0A0A0B" />

      {/* Crystal glare */}
      <circle cx="200" cy="200" r="178" fill="url(#lwd-glare)" pointerEvents="none" />
    </svg>
  );
};
