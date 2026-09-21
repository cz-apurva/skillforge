import React from 'react';

/**
 * Editorial Academic Illustration for Login Hero
 */
export function AcademicHeroIllustration({ className = '', width = '100%', height = 'auto' }) {
  return (
    <svg
      viewBox="0 0 520 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ width, height, maxWidth: '100%' }}
    >
      <defs>
        <linearGradient id="academicGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#0284c7" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id="academicGrad2" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
        <linearGradient id="academicGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* Subtle Background Geometry */}
      <circle cx="260" cy="200" r="170" fill="url(#academicGlow)" />
      <circle cx="260" cy="200" r="140" stroke="#334155" strokeWidth="1" strokeDasharray="6 6" />
      <circle cx="260" cy="200" r="100" stroke="#4f46e5" strokeWidth="1" strokeOpacity="0.4" />

      {/* Floating Algorithmic & Assessment Nodes */}
      <g opacity="0.9">
        <line x1="140" y1="110" x2="210" y2="150" stroke="#4f46e5" strokeWidth="1.5" strokeDasharray="3 3" />
        <line x1="380" y1="120" x2="310" y2="160" stroke="#0284c7" strokeWidth="1.5" strokeDasharray="3 3" />
        <line x1="260" y1="90" x2="260" y2="150" stroke="#6366f1" strokeWidth="1.5" />
        
        {/* Node Chips */}
        <rect x="100" y="90" width="80" height="36" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />
        <text x="140" y="112" fill="#94a3b8" fontSize="11" fontFamily="sans-serif" textAnchor="middle" fontWeight="600">
          FairGrade
        </text>

        <rect x="340" y="100" width="85" height="36" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />
        <text x="382" y="122" fill="#38bdf8" fontSize="11" fontFamily="sans-serif" textAnchor="middle" fontWeight="600">
          AI Copilot
        </text>
      </g>

      {/* Central Desk & Workspace */}
      <ellipse cx="260" cy="330" rx="200" ry="24" fill="#0f172a" />
      <path d="M120 320 L400 320 L370 332 L150 332 Z" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />

      {/* Laptop & Workspace Elements */}
      <rect x="205" y="240" width="110" height="70" rx="6" fill="#1e293b" stroke="#4f46e5" strokeWidth="2" />
      <rect x="215" y="248" width="90" height="52" rx="3" fill="#0f172a" />
      {/* Code / Evaluation Lines on Screen */}
      <rect x="222" y="256" width="45" height="4" rx="2" fill="#6366f1" />
      <rect x="222" y="264" width="70" height="3" rx="1.5" fill="#38bdf8" />
      <rect x="222" y="271" width="55" height="3" rx="1.5" fill="#94a3b8" />
      <rect x="222" y="278" width="62" height="3" rx="1.5" fill="#10b981" />
      <rect x="222" y="285" width="40" height="3" rx="1.5" fill="#6366f1" />
      {/* Laptop Base */}
      <path d="M190 310 L330 310 L320 316 L200 316 Z" fill="#334155" />

      {/* Open Academic Book / Notebook on Left */}
      <g transform="translate(130, 260)">
        <path d="M10 35 Q 35 25 60 35 L 60 55 Q 35 45 10 55 Z" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
        <path d="M60 35 Q 85 25 110 35 L 110 55 Q 85 45 60 55 Z" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
        <line x1="60" y1="35" x2="60" y2="55" stroke="#6366f1" strokeWidth="2" />
        {/* Book pages lines */}
        <line x1="22" y1="40" x2="48" y2="36" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="22" y1="46" x2="45" y2="42" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="72" y1="36" x2="98" y2="40" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="72" y1="42" x2="95" y2="46" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
      </g>

      {/* Graduation Cap / Academic Badge on Top Center */}
      <g transform="translate(225, 45)">
        <polygon points="35,10 70,25 35,40 0,25" fill="url(#academicGrad1)" />
        <polygon points="35,32 58,42 58,54 35,62 12,54 12,42" fill="#3730a3" />
        <path d="M58 25 L64 36 L64 54" stroke="#fbbf24" strokeWidth="2" fill="none" />
        <circle cx="64" cy="56" r="3" fill="#fbbf24" />
      </g>

      {/* Pen and Bookmark on Right */}
      <g transform="translate(345, 275)">
        <rect x="10" y="20" width="35" height="22" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="1" />
        <circle cx="20" cy="31" r="5" fill="#10b981" fillOpacity="0.2" stroke="#10b981" strokeWidth="1.5" />
        <line x1="30" y1="28" x2="40" y2="28" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
        <line x1="30" y1="34" x2="38" y2="34" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/**
 * Empty State Illustration
 */
export function EmptyDataIllustration({ className = '', size = 160 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="100" cy="100" r="70" fill="rgba(79, 70, 229, 0.08)" />
      <circle cx="100" cy="100" r="55" stroke="#334155" strokeWidth="1.5" strokeDasharray="4 4" />
      
      {/* Clipboard */}
      <rect x="75" y="55" width="50" height="70" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
      <rect x="87" y="48" width="26" height="12" rx="3" fill="#334155" stroke="#64748b" strokeWidth="1" />
      <circle cx="100" cy="54" r="2" fill="#94a3b8" />
      
      {/* Content lines */}
      <line x1="85" y1="72" x2="115" y2="72" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
      <line x1="85" y1="82" x2="110" y2="82" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
      <line x1="85" y1="92" x2="105" y2="92" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
      
      {/* Sparkle / subtle dot */}
      <circle cx="138" cy="70" r="3" fill="#6366f1" />
      <circle cx="62" cy="120" r="2" fill="#38bdf8" />
    </svg>
  );
}

/**
 * Learning Journey & Continue Learning Hero Illustration
 */
export function LearningJourneyIllustration({ className = '', width = '100%', height = 'auto' }) {
  return (
    <svg
      viewBox="0 0 440 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ width, height, maxWidth: '100%' }}
    >
      <defs>
        <linearGradient id="ljGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="ljPath" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4f46e5" />
          <stop offset="50%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>

      {/* Subtle Background Glow Rings */}
      <circle cx="220" cy="120" r="100" fill="url(#ljGrad)" />
      <circle cx="340" cy="80" r="45" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />

      {/* Curving Milestone Journey Path */}
      <path
        d="M 50 170 Q 140 185 190 125 T 320 90 T 390 60"
        stroke="url(#ljPath)"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Milestone 1 - Start / Completed */}
      <g transform="translate(50, 170)">
        <circle cx="0" cy="0" r="14" fill="#1e293b" stroke="#4f46e5" strokeWidth="2" />
        <circle cx="0" cy="0" r="6" fill="#6366f1" />
        <rect x="-35" y="20" width="70" height="20" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1" />
        <text x="0" y="34" fill="#94a3b8" fontSize="9" fontWeight="600" textAnchor="middle" fontFamily="sans-serif">Foundations</text>
      </g>

      {/* Milestone 2 - Active / In-Progress Step */}
      <g transform="translate(190, 125)">
        <circle cx="0" cy="0" r="20" fill="rgba(56, 189, 248, 0.15)" stroke="#38bdf8" strokeWidth="1.5" />
        <circle cx="0" cy="0" r="13" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
        <polygon points="-3,-5 6,0 -3,5" fill="#38bdf8" />
        <rect x="-42" y="-34" width="84" height="20" rx="4" fill="#1e293b" stroke="#38bdf8" strokeWidth="1" />
        <text x="0" y="-20" fill="#38bdf8" fontSize="9" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">Active Focus</text>
      </g>

      {/* Milestone 3 - Next / Target Mastery */}
      <g transform="translate(320, 90)">
        <circle cx="0" cy="0" r="14" fill="#1e293b" stroke="#10b981" strokeWidth="2" />
        <circle cx="0" cy="0" r="6" fill="#10b981" />
        <rect x="-35" y="20" width="70" height="20" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1" />
        <text x="0" y="34" fill="#10b981" fontSize="9" fontWeight="600" textAnchor="middle" fontFamily="sans-serif">Reassessment</text>
      </g>

      {/* Flag / Goal at finish */}
      <g transform="translate(390, 60)">
        <line x1="0" y1="0" x2="0" y2="24" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />
        <polygon points="0,0 20,6 0,12" fill="#10b981" />
      </g>

      {/* Floating Insight Sparkles */}
      <g opacity="0.8">
        <circle cx="120" cy="65" r="3" fill="#6366f1" />
        <circle cx="280" cy="180" r="2.5" fill="#38bdf8" />
        <circle cx="360" cy="140" r="3" fill="#10b981" />
      </g>
    </svg>
  );
}

