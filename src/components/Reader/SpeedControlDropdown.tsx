import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface SpeedControlDropdownProps {
  currentSpeed: number;
  onSpeedChange: (speed: number) => void;
  minSpeed?: number;
  maxSpeed?: number;
  speeds?: number[];
}

const SpeedControlDropdown: React.FC<SpeedControlDropdownProps> = ({
  currentSpeed,
  onSpeedChange,
  minSpeed = 0.8,
  maxSpeed = 1.5,
  speeds = [0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5]
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const badgeRef = useRef<HTMLButtonElement>(null);

  // Clamp current speed to valid range
  const clampedSpeed = Math.max(minSpeed, Math.min(maxSpeed, currentSpeed));
  const displaySpeed = speeds.reduce((prev, curr) =>
    Math.abs(curr - clampedSpeed) < Math.abs(prev - clampedSpeed) ? curr : prev
  );

  // Dynamic open direction
  useEffect(() => {
    if (!isOpen || !badgeRef.current) return;
    const rect = badgeRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    // Estimate dropdown height (5 * 40px per item + padding)
    const dropdownHeight = (speeds.length * 40) + 24;
    setOpenUpward(spaceBelow < dropdownHeight);
  }, [isOpen, speeds.length]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (badgeRef.current && !(badgeRef.current.parentNode as Element)?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) setIsOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleSpeedSelect = (speed: number) => {
    const clampedValue = Math.max(minSpeed, Math.min(maxSpeed, speed));
    onSpeedChange(clampedValue);
    setIsOpen(false);
  };

  const formatSpeed = (speed: number): string => {
    const formatted = speed.toFixed(1);
    return formatted.endsWith('.0') ? formatted.slice(0, -2) : formatted;
  };

  return (
    <div className="relative">
      <button
        ref={badgeRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 md:px-3.5 md:py-2 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-200 hover:border-amber-300 text-amber-700 transition-all duration-200 text-sm md:text-base font-medium min-w-[3.5rem] md:min-w-[4rem] justify-center"
        aria-label={`Playback speed: ${formatSpeed(displaySpeed)}x`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span>{formatSpeed(displaySpeed)}x</span>
        <ChevronDown
          className={`w-3 h-3 md:w-4 md:h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 z-50 min-w-[6rem] animate-in fade-in slide-in-from-top-2 duration-200
            bg-white rounded-lg shadow-lg border border-gray-200 py-1.5
            ${openUpward ? 'bottom-full mb-2' : 'top-full mt-1.5'}`}
          role="menu"
          aria-orientation="vertical"
        >
          {speeds.map((speed) => {
            const isActive = Math.abs(speed - displaySpeed) < 0.01;
            return (
              <button
                key={speed}
                onClick={() => handleSpeedSelect(speed)}
                className={`w-full px-4 py-2 text-left text-sm md:text-base transition-colors ${
                  isActive
                    ? 'bg-amber-50 text-amber-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                role="menuitem"
                aria-selected={isActive}
              >
                <div className="flex items-center justify-between">
                  <span>{formatSpeed(speed)}x</span>
                  {isActive && <span className="text-amber-600 ml-2">✓</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SpeedControlDropdown;
