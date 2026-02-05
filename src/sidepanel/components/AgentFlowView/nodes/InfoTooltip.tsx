/**
 * InfoTooltip - Small info icon that shows a tooltip on hover
 */

import { memo, useState } from 'react';

interface InfoTooltipProps {
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const InfoTooltip = memo(({ text, position = 'top', className = '' }: InfoTooltipProps) => {
  const [show, setShow] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <div className="w-4 h-4 rounded-full bg-white/30 hover:bg-white/50 flex items-center justify-center cursor-help transition-colors">
        <svg
          className="w-3 h-3 text-white/80"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      {show && (
        <div
          className={`absolute ${positionClasses[position]} w-48 bg-gray-900 text-white text-xs rounded-lg shadow-lg p-2 z-50 pointer-events-none`}
        >
          <div className="relative">
            {text}
          </div>
        </div>
      )}
    </div>
  );
});

InfoTooltip.displayName = 'InfoTooltip';
