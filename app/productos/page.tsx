'use client';

import React, { useState, useMemo } from 'react';
import { MOCK_PRODUCTS } from '@/data/products';
import { ProductCard } from '@/components/store/ProductCard';
import { Filter, Flame, Sparkles } from 'lucide-react';

export default function CatalogPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [selectedSpice, setSelectedSpice] = useState<number | 'todos'>('todos');

  const categories = [
    { id: 'todos', name: 'Todos los Snacks' },
    { id: 'frutas', name: 'Frutas Enchiladas' },
    { id: 'variedad', name: 'Mix & Combos' },
  ];

  const spiceLevels: Array<{ id: number | 'todos'; name: string }> = [
    { id: 'todos', name: 'Todos los picantes' },
    { id: 1, name: 'Mild (Suave)' },
    { id: 2, name: 'Medium (Medio)' },
    { id: 3, name: 'Spicy (Picante)' },
    { id: 4, name: 'Xtra Spicy (Fuego)' },
  ];

  const filteredProducts = useMemo(() => {
    return MOCK_PRODUCTS.filter((product) => {
      const matchCategory =
        selectedCategory === 'todos' || product.category === selectedCategory;
      const matchSpice =
        selectedSpice === 'todos' || product.spiceLevel === selectedSpice;
      return matchCategory && matchSpice;
    });
  }, [selectedCategory, selectedSpice]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Header Banner */}
      <div className="bg-[#FCF2E3] p-8 md:p-12 rounded-xl border border-[#DEC0BC]/40 text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#87201D]/10 text-[#87201D] text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Catálogo Artesanal Zanita</span>
        </div>
        <h1 className="font-serif font-bold text-3xl sm:text-4xl md:text-5xl text-[#1F1B12]">
          Nuestras Creaciones Picantes
        </h1>
        <p className="text-sm md:text-base text-[#57413F] max-w-2xl mx-auto leading-relaxed">
          Explora nuestra variedad de frutas deshidratadas con la mejor selección de chiles secos, chamoy casero y condimentos de autor.
        </p>
      </div>

      {/* Filters Bar */}
      <div className="bg-[#FFF8F1] p-6 rounded-lg border border-[#DEC0BC]/40 shadow-xs space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-[#DEC0BC]/30 text-[#87201D] font-serif font-bold text-lg">
          <Filter className="w-5 h-5" />
          <h2>Filtrar Snacks</h2>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Category Pills */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8B716E] block">
              Categoría
            </span>
            <div className="flex flex-wrap gap-2">
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

          {/* Spice Level Pills */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8B716E] block">
              Nivel de Picante
            </span>
            <div className="flex flex-wrap gap-2">
              {spiceLevels.map((lvl) => (
                <button
                  key={String(lvl.id)}
                  onClick={() => setSelectedSpice(lvl.id)}
                  className={`px-3.5 py-2 text-xs font-bold rounded-full transition-all flex items-center gap-1.5 ${
                    selectedSpice === lvl.id
                      ? 'bg-[#832709] text-white shadow-xs'
                      : 'bg-[#F7EDDE] text-[#1F1B12] hover:bg-[#EBE1D2] border border-[#DEC0BC]/40'
                  }`}
                >
                  {lvl.id !== 'todos' && <Flame className="w-3.5 h-3.5 fill-current" />}
                  <span>{lvl.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Results Counter */}
      <div className="flex items-center justify-between text-xs text-[#8B716E] px-1">
        <span>Mostrando <strong>{filteredProducts.length}</strong> producto(s)</span>
        {(selectedCategory !== 'todos' || selectedSpice !== 'todos') && (
          <button
            onClick={() => {
              setSelectedCategory('todos');
              setSelectedSpice('todos');
            }}
            className="text-[#87201D] font-bold underline hover:text-[#A73832]"
          >
            Limpiar filtros
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
          <Flame className="w-12 h-12 text-[#8B716E] mx-auto opacity-50" />
          <h3 className="font-serif font-bold text-xl text-[#1F1B12]">
            No se encontraron productos con estos filtros
          </h3>
          <p className="text-xs text-[#57413F]">
            Intenta seleccionar otra categoría o reiniciar los filtros de picante.
          </p>
          <button
            onClick={() => {
              setSelectedCategory('todos');
              setSelectedSpice('todos');
            }}
            className="px-5 py-2.5 text-xs font-bold rounded-sm bg-[#87201D] text-white hover:bg-[#A73832]"
          >
            Ver todos los productos
          </button>
        </div>
      )}
    </div>
  );
}
