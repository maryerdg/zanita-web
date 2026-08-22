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
      <div className="bg-[#FCF2E3] p-8 md:p-12 rounded-xl border border-[#DEC0BC]/40 text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#87201D]/10 text-[#87201D] text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Catálogo Zanita • Tijuana</span>
        </div>
        <h1 className="font-serif font-bold text-3xl sm:text-4xl md:text-5xl text-[#1F1B12]">
          Nuestros Productos & Snacks
        </h1>
        <p className="text-sm md:text-base text-[#57413F] max-w-2xl mx-auto leading-relaxed">
          Manzanas, uvas, charolas de toppings y paquetes preparados al momento con chamoy artesanal de la casa. Pedidos con 3 días de anticipación.
        </p>
      </div>

      {/* Category Filter Bar */}
      <div className="bg-[#FFF8F1] p-6 rounded-lg border border-[#DEC0BC]/40 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#DEC0BC]/30 text-[#87201D] font-serif font-bold text-lg">
          <Filter className="w-5 h-5" />
          <h2>Categorías de Productos</h2>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 text-xs font-bold rounded-full transition-all ${
                selectedCategory === cat.id
                  ? 'bg-[#87201D] text-white shadow-xs'
                  : 'bg-[#F7EDDE] text-[#1F1B12] hover:bg-[#EBE1D2] border border-[#DEC0BC]/40'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Results Counter */}
      <div className="flex items-center justify-between text-xs text-[#8B716E] px-1">
        <span>Mostrando <strong>{filteredProducts.length}</strong> producto(s)</span>
        {selectedCategory !== 'todos' && (
          <button
            onClick={() => setSelectedCategory('todos')}
            className="text-[#87201D] font-bold underline hover:text-[#A73832]"
          >
            Ver todas las categorías
          </button>
        )}
      </div>

      {/* Products Grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-[#F7EDDE] rounded-xl border border-[#DEC0BC]/40 p-8 space-y-4">
          <h3 className="font-serif font-bold text-xl text-[#1F1B12]">
            No hay productos en esta categoría
          </h3>
          <button
            onClick={() => setSelectedCategory('todos')}
            className="px-5 py-2.5 text-xs font-bold rounded-sm bg-[#87201D] text-white hover:bg-[#A73832]"
          >
            Ver catálogo completo
          </button>
        </div>
      )}
    </div>
  );
}
