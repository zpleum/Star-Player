import { usePlayer } from '@/contexts/PlayerContext';
import { SlidersHorizontal, RotateCcw, X, ChevronDown } from 'lucide-react';
import { useState } from 'react';

const BANDS = [32, 64, 125, 250, 500, '1k', '2k', '4k', '8k', '16k'];

export const EQ_PRESETS = [
  { name: 'Flat', gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { name: 'Rock', gains: [4, 3, 2, 0, -1, -2, -1, 2, 4, 5] },
  { name: 'Pop', gains: [-2, -1, 0, 2, 4, 4, 2, 0, -1, -2] },
  { name: 'Jazz', gains: [3, 2, 1, 2, -1, -2, 0, 1, 2, 3] },
  { name: 'Classical', gains: [0, 0, 0, 0, 0, 0, -1, -2, -3, -4] },
  { name: 'Bass Boost', gains: [6, 5, 4, 2, 1, 0, 0, 0, 0, 0] },
  { name: 'Electronic', gains: [4, 3, 1, -1, -2, 0, 2, 3, 4, 5] },
];

interface EqualizerProps {
  onClose?: () => void;
  variant?: 'popover' | 'sidebar';
}

export default function Equalizer({ onClose, variant = 'popover' }: EqualizerProps) {
  const { state, setEqBand, setEqPreset } = usePlayer();
  const { eqGains, eqPreset } = state;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleReset = () => {
    setEqPreset('Flat', EQ_PRESETS[0].gains);
  };

  return (
    <div className={`flex flex-col gap-6 ${
      variant === 'popover' 
        ? 'bg-surface/90 backdrop-blur-3xl rounded-3xl border border-border p-6 w-full max-w-lg mx-auto'
        : 'w-full h-full flex-1 p-2'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
            <SlidersHorizontal className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary leading-tight">Equalizer</h2>
            <p className="text-xs text-text-muted">10-band audio tuning</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-primary rounded-full hover:bg-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full flex items-center justify-between bg-background border border-border text-text-primary text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-accent transition-colors"
          >
            <span className={eqPreset === 'Custom' ? 'text-text-muted' : ''}>{eqPreset}</span>
            <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
              <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                {EQ_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => {
                      setEqPreset(p.name, p.gains);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-surface ${
                      eqPreset === p.name ? 'text-accent bg-accent/10 font-medium' : 'text-text-primary'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <button
          onClick={handleReset}
          title="Reset to Flat"
          className="p-2.5 bg-background border border-border text-text-muted hover:text-text-primary rounded-xl transition-colors hover:bg-surface"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-end justify-between h-56 pt-8 pb-2 px-2 bg-background/50 rounded-2xl border border-border relative">
        {/* Background grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between py-6 px-4 pointer-events-none opacity-10">
          <div className="w-full border-t border-text-primary"></div>
          <div className="w-full border-t border-text-primary"></div>
          <div className="w-full border-t border-text-primary"></div>
          <div className="w-full border-t border-text-primary"></div>
          <div className="w-full border-t border-text-primary"></div>
        </div>
        <div className="absolute left-1 top-2 text-[10px] text-text-muted opacity-50">+12dB</div>
        <div className="absolute left-1 bottom-8 text-[10px] text-text-muted opacity-50">-12dB</div>
        <div className="absolute left-1 top-1/2 -translate-y-1/2 text-[10px] text-text-muted opacity-50">0dB</div>

        {BANDS.map((band, idx) => (
          <div key={idx} className="flex flex-col items-center gap-4 z-10 w-8">
            <div className="relative h-40 w-full flex justify-center">
              <input
                type="range"
                min="-12"
                max="12"
                step="0.1"
                value={eqGains[idx] || 0}
                onChange={(e) => setEqBand(idx, parseFloat(e.target.value))}
                className="absolute w-40 h-1.5 -rotate-90 origin-center top-20 bg-surface rounded-full appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/50 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent"
                style={{
                  background: `linear-gradient(to right, rgba(var(--accent-rgb),0.1) 0%, var(--accent) ${(Number(eqGains[idx] || 0) + 12) / 24 * 100}%, #1f2937 ${(Number(eqGains[idx] || 0) + 12) / 24 * 100}%, #1f2937 100%)`
                }}
              />
            </div>
            <span className="text-[10px] font-medium text-text-muted">{band}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
