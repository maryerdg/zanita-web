'use client';

import React, { useState, useMemo } from 'react';
import { MOCK_PRODUCTS } from '@/data/products';
import { ProductCard } from '@/components/store/ProductCard';
import { Filter, Sparkles } from 'lucide-react';

export default function CatalogPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');

  const categories = [
    { id: 'todos', name: 'Todos los Productos' },
    { id: 'manzanas', name: 'Manzanas Preparadas' },
    { id: 'combos', name: 'Combos & Paquetes' },
    { id: 'charolas', name: 'Charolas Preparadas' },
    { id: 'snacks', name: 'Snacks & Mixes' },
    { id: 'uvas', name: 'Uvas Preparadas' },
  ];

  const filteredProducts = useMemo(() => {
    return MOCK_PRODUCTS.filter((product) => {
      return selectedCategory === 'todos' || product.category === selectedCategory;
    });
  }, [selectedCategory]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Header Banner */}
      <div className="bg-[#FFF9F2] p-8 md:p-12 rounded-2xl border border-[#E4D5C1] text-center space-y-4 shadow-2xs">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F09CA9]/25 text-[#A73832] text-xs font-bold uppercase tracking-wider border border-[#F09CA9]/40">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Catálogo Zanita • Tijuana</span>
        </div>
        <h1 className="font-serif font-bold text-3xl sm:text-4xl md:text-5xl text-[#261C19]">
          Nuestros Productos & Snacks
        </h1>
        <p className="text-sm md:text-base text-[#6E564F] max-w-2xl mx-auto leading-relaxed">
          Manzanas, uvas, charolas de toppings y paquetes preparados con chamoy. Pedidos con 3 días de anticipación.
        </p>
      </div>

      {/* Category Filter Bar */}
      <div className="bg-white p-6 rounded-2xl border border-[#E4D5C1] shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#E4D5C1]/60 text-[#A73832] font-serif font-bold text-lg">
          <Filter className="w-5 h-5" />
          <h2>Categorías de Productos</h2>
        </div>

        <div className="flex flex-wrap gap-2.5 pt-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-full transition-all ${
                selectedCategory === cat.id
                  ? 'bg-[#A73832] text-white shadow-xs'
                  : 'bg-[#F5EBDC] text-[#261C19] hover:bg-[#E4D5C1] border border-[#E4D5C1]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Results Counter */}
      <div className="flex items-center justify-between text-xs text-[#6E564F] px-1">
        <span>Mostrando <strong>{filteredProducts.length}</strong> producto(s)</span>
        {selectedCategory !== 'todos' && (
          <button
            onClick={() => setSelectedCategory('todos')}
            className="text-[#A73832] font-bold underline hover:text-[#8e2e28]"
          >
            Ver todas las categorías
          </button>
        )}
      </div>

      {/* Products Grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-[#FFF9F2] rounded-2xl border border-[#E4D5C1] p-8 space-y-4">
          <h3 className="font-serif font-bold text-xl text-[#261C19]">
            No hay productos en esta categoría
          </h3>
          <button
            onClick={() => setSelectedCategory('todos')}
            className="px-6 py-3 text-xs font-bold uppercase tracking-wider rounded-md bg-[#A73832] text-white hover:bg-[#8e2e28]"
          >
            Ver catálogo completo
          </button>
        </div>
      )}
    </div>
  );
}
