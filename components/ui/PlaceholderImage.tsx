import React from 'react';
import { Flame, Sparkles } from 'lucide-react';

interface PlaceholderImageProps {
  title: string;
  category?: string;
  colorAccent?: string;
  aspectRatio?: 'square' | 'video' | 'portrait';
  className?: string;
}

export const PlaceholderImage: React.FC<PlaceholderImageProps> = ({
  title,
  category = 'Zanita',
  colorAccent = '#87201D',
  aspectRatio = 'square',
  className = '',
}) => {
  const aspectClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    portrait: 'aspect-[4/5]',
  };

  return (
    <div
      className={`relative w-full overflow-hidden rounded-md flex flex-col items-center justify-center p-6 text-center transition-transform duration-300 hover:scale-[1.02] ${aspectClasses[aspectRatio]} ${className}`}
      style={{
        background: `radial-gradient(circle at 30% 30%, ${colorAccent}22 0%, #FAF1E4 80%)`,
        border: `1px solid ${colorAccent}33`,
      }}
    >
      {/* Visual watermark pattern */}
      <div className="absolute inset-0 opacity-10 flex items-center justify-center pointer-events-none">
        <Sparkles className="w-32 h-32" style={{ color: colorAccent }} />
      </div>

      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mb-3 shadow-sm"
        style={{ backgroundColor: colorAccent, color: '#FFFFFF' }}
      >
        <Flame className="w-7 h-7" />
      </div>

      <span
        className="text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full mb-1"
        style={{ backgroundColor: `${colorAccent}15`, color: colorAccent }}
      >
        {category}
      </span>

      <p className="font-serif font-bold text-base md:text-lg text-surface-on-surface line-clamp-2 px-2" style={{ color: '#1F1B12' }}>
        {title}
      </p>

      <span className="mt-3 text-[11px] font-mono opacity-60 text-outline">
        [ Recurso Visual Zanita ]
      </span>
    </div>
  );
};
