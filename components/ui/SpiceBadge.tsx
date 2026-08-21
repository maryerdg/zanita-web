import React from 'react';
import { Flame } from 'lucide-react';

interface SpiceBadgeProps {
  level: 1 | 2 | 3 | 4;
  name: 'Mild' | 'Medium' | 'Spicy' | 'Xtra Spicy';
  showFlames?: boolean;
  className?: string;
}

export const SpiceBadge: React.FC<SpiceBadgeProps> = ({
  level,
  name,
  showFlames = true,
  className = '',
}) => {
  const badgeStyles = {
    1: { bg: 'bg-[#FFA9B6]/20', text: 'text-[#8E4A56]', border: 'border-[#FFA9B6]' },
    2: { bg: 'bg-[#D46240]/20', text: 'text-[#D46240]', border: 'border-[#D46240]' },
    3: { bg: 'bg-[#A73832]/20', text: 'text-[#A73832]', border: 'border-[#A73832]' },
    4: { bg: 'bg-[#87201D]/20', text: 'text-[#87201D]', border: 'border-[#87201D]' },
  };

  const style = badgeStyles[level];

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full border ${style.bg} ${style.text} ${style.border} ${className}`}
    >
      {showFlames && (
        <span className="inline-flex">
          {Array.from({ length: level }).map((_, i) => (
            <Flame key={i} className="w-3 h-3 fill-current" />
          ))}
        </span>
      )}
      <span>{name}</span>
    </span>
  );
};
