'use client';
import { Check } from 'lucide-react';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export default function Checkbox({ checked, onChange, label, disabled }: CheckboxProps) {
  return (
    <label className={`flex items-center gap-3 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer group'}`}>
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={() => !disabled && onChange(!checked)}
        />
        <div className={`
          w-5 h-5 rounded-md border-2 transition-all duration-300 flex items-center justify-center
          ${checked 
            ? 'bg-accent border-accent' 
            : 'bg-surface/50 border-border group-hover:border-accent/50'}
        `}>
          <Check 
            className={`w-3.5 h-3.5 text-white transition-all duration-300 ${checked ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`} 
            strokeWidth={4}
          />
        </div>
      </div>
      {label && <span className="text-sm font-medium text-text-primary select-none">{label}</span>}
    </label>
  );
}
