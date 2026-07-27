import React from 'react';
import { NOTE_COLORS } from '../lib/noteColors';
import { Check } from 'lucide-react';

interface ColorPickerProps {
  value: string | null | undefined;
  onChange: (color: string | null) => void;
  size?: 'sm' | 'md';
}

export default function ColorPicker({ value, onChange, size = 'md' }: ColorPickerProps) {
  const dotSize = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6';
  const iconSize = size === 'sm' ? 10 : 12;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {NOTE_COLORS.map((c) => {
        const isSelected = value === c.value || (value === undefined && c.value === null);
        return (
          <button
            key={c.value ?? 'none'}
            title={c.label}
            onClick={() => onChange(c.value)}
            className={`${dotSize} rounded-full border-2 transition-all hover:scale-110 flex items-center justify-center ${
              isSelected ? 'border-foreground/60 scale-110' : 'border-transparent'
            }`}
            style={{ backgroundColor: c.dot }}
          >
            {isSelected && <Check size={iconSize} className="text-white drop-shadow" strokeWidth={3} />}
          </button>
        );
      })}
    </div>
  );
}
