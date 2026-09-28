'use client';

import React from 'react';
import Image from 'next/image';
import { COMBO_METADATA } from '@/lib/catalog/presentation';

interface ComboSplitImageProps {
  priority?: boolean;
  className?: string;
  sizes?: string;
}

/**
 * ComboSplitImage
 *
 * Displays a 50/50 split/collage combining Manzanita Verde and Manzanita Roja Gala,
 * visually communicating that combos can be customized with green, red, or mixed apples.
 * Works seamlessly in both ProductCard (4:5) and ProductDetailPage (1:1).
 */
export const ComboSplitImage: React.FC<ComboSplitImageProps> = ({
  priority = false,
  className = '',
  sizes = '(max-width: 519px) 50vw, (max-width: 639px) 33vw, (max-width: 1279px) 25vw, 320px',
}) => {
  const { leftSrc, leftAlt, rightSrc, rightAlt, alt } = COMBO_METADATA.splitImages;

  return (
    <div
      className={`absolute inset-0 w-full h-full grid grid-cols-2 overflow-hidden ${className}`}
      role="img"
      aria-label={alt}
    >
      {/* Left Half: Manzanita Verde */}
      <div className="relative h-full w-full overflow-hidden border-r border-[#FFF9F2]/70">
        <Image
          src={leftSrc}
          alt={leftAlt}
          fill
          priority={priority}
          className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
          sizes={sizes}
        />
      </div>

      {/* Right Half: Manzanita Roja Gala */}
      <div className="relative h-full w-full overflow-hidden">
        <Image
          src={rightSrc}
          alt={rightAlt}
          fill
          priority={priority}
          className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
          sizes={sizes}
        />
      </div>
    </div>
  );
};
