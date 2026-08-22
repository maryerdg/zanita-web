import React from 'react';
import Link from 'next/link';
import { Product } from '@/data/products';
import { PlaceholderImage } from '@/components/ui/PlaceholderImage';
import { ShoppingBag } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  return (
    <div className="group relative flex flex-col bg-[#FCF2E3] rounded-lg border border-[#DEC0BC]/40 overflow-hidden transition-all duration-300 hover:shadow-md hover:border-[#A73832]/30">
      <Link href={`/productos/${product.slug}`} className="block relative overflow-hidden">
        <PlaceholderImage
          title={product.name}
          category={product.categoryLabel.toUpperCase()}
          colorAccent={product.colorAccent}
          aspectRatio="square"
        />
        <div className="absolute top-3 right-3 z-10">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#87201D] text-white shadow-xs">
            {product.categoryLabel}
          </span>
        </div>
      </Link>

      <div className="flex flex-col flex-1 p-5">
        <div className="flex items-start justify-between gap-2 mb-1">
          <Link href={`/productos/${product.slug}`}>
            <h3 className="font-serif font-bold text-lg text-[#1F1B12] group-hover:text-[#87201D] transition-colors">
              {product.name}
            </h3>
          </Link>
        </div>

        <p className="text-xs text-[#57413F] line-clamp-2 mb-4 flex-1">
          {product.tagline}
        </p>

        <div className="flex items-center justify-between pt-3 border-t border-[#DEC0BC]/30">
          <div>
            <span className="text-xs text-[#8B716E] block">Precio</span>
            <span className="font-serif font-bold text-lg text-[#87201D]">
              ${product.price} MXN
            </span>
          </div>

          <Link
            href={`/productos/${product.slug}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-sm bg-[#87201D] text-white hover:bg-[#A73832] transition-colors shadow-xs"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Ver Detalle</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
