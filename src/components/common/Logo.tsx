import React from 'react';
import { useSettings } from '../../context/SettingsContext';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 'md', showSubtitle = true }) => {
  const { settings } = useSettings();

  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  // If a custom hospital logo is uploaded, render it
  if (settings.hospital_logo_url) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <img
          src={settings.hospital_logo_url}
          alt={settings.hospital_name}
          className={`${iconSizes[size]} object-contain rounded`}
        />
        <div>
          <div className={`font-bold tracking-tight text-slate-900 ${textSizes[size]}`}>
            {settings.hospital_name}
          </div>
          {showSubtitle && (
            <div className="text-xs font-medium text-teal-700 uppercase tracking-wider">
              Sri Lanka Healthcare
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default MediPlus Healthcare Logo
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`${iconSizes[size]} rounded-xl bg-gradient-to-br from-teal-500 to-sky-600 flex items-center justify-center text-white shadow-md shadow-teal-500/20 shrink-0`}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5"
        >
          <path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h5v5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z" />
          <path d="M8 12h8" stroke="#ffffff" strokeWidth="3" />
        </svg>
      </div>
      <div>
        <div className={`font-bold tracking-tight text-slate-900 flex items-center gap-1 ${textSizes[size]}`}>
          <span>Medi</span>
          <span className="text-teal-600">Plus</span>
        </div>
        {showSubtitle && (
          <div className="text-[10px] font-semibold text-slate-500 tracking-wider uppercase">
            Hospital System • LK
          </div>
        )}
      </div>
    </div>
  );
};
