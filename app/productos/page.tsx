import React from 'react';
import CatalogClient from './CatalogClient';
import { getProducts } from '@/lib/catalog';

export const revalidate = 0; // Para dev. Luego se puede pasar a revalidate tags

export default async function CatalogPage() {
  const products = await getProducts();

  return <CatalogClient initialProducts={products} />;
}
