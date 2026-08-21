export interface Product {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: 'frutas' | 'gomitas' | 'variedad' | 'edicion-especial';
  spiceLevel: 1 | 2 | 3 | 4;
  spiceName: 'Mild' | 'Medium' | 'Spicy' | 'Xtra Spicy';
  weightOptions: string[];
  ingredients: string[];
  featured: boolean;
  flavorNotes: string[];
  colorAccent: string;
}

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    slug: 'manzanita-verde-enchilada',
    name: 'Manzanita Verde Enchilada',
    tagline: 'Manzanas deshidratadas crujientes cubiertas de chile artesanal',
    description: 'Manzanas verdes deshidratadas en su punto perfecto de acidez, cubiertas con nuestra mezcla secreta de chiles secos, limón deshidratado y sal de mar. Un equilibrio entre acidez, dulzura y picante.',
    price: 85,
    originalPrice: 95,
    category: 'frutas',
    spiceLevel: 2,
    spiceName: 'Medium',
    weightOptions: ['100g', '250g', '500g'],
    ingredients: ['Manzana Verde Deshidratada', 'Mezcla Artesanal de Chiles Secos', 'Limón Real Deshidratado', 'Sal de Mar'],
    featured: true,
    flavorNotes: ['Cítrico', 'Crujiente', 'Picante Balanceado'],
    colorAccent: '#4F7942',
  },
  {
    id: 'prod-2',
    slug: 'mango-enchilado-artesanal',
    name: 'Mango Enchilado Artesanal',
    tagline: 'Lajas gruesas de mango Kent con chamoy de la casa',
    description: 'Nuestras lajas premium de mango deshidratado sin azúcar añadida, marinadas en chamoy artesanal elaborado con flor de Jamaica y chiltepín entero molido a piedra.',
    price: 95,
    category: 'frutas',
    spiceLevel: 3,
    spiceName: 'Spicy',
    weightOptions: ['120g', '250g', '500g'],
    ingredients: ['Mango Kent', 'Chamoy Artesanal de Jamaica', 'Chile Chiltepín', 'Flor de Sal'],
    featured: true,
    flavorNotes: ['Dulce Natural', 'Fruity', 'Intensidad Alta'],
    colorAccent: '#D46240',
  },
  {
    id: 'prod-3',
    slug: 'pina-deshidratada-con-habanero',
    name: 'Piña Deshidratada con Habanero Dulce',
    tagline: 'Rodajas de piña miel con toque de habanero ahumado',
    description: 'Piña miel deshidratada lentamente a baja temperatura para preservar sus azúcares naturales, combinada con habanero naranja ahumado a la leña.',
    price: 90,
    category: 'frutas',
    spiceLevel: 4,
    spiceName: 'Xtra Spicy',
    weightOptions: ['100g', '250g'],
    ingredients: ['Piña Miel', 'Habanero Naranja Ahumado', 'Limón Colima', 'Sal Artesanal'],
    featured: true,
    flavorNotes: ['Tropical', 'Ahumado', 'Xtra Fuego'],
    colorAccent: '#A73832',
  },
  {
    id: 'prod-4',
    slug: 'fresita-enchilada-gourmet',
    name: 'Fresita Enchilada Gourmet',
    tagline: 'Fresas integrales deshidratadas con cubierta picante suave',
    description: 'Fresas enteras deshidratadas con un toque delicado de tajín casero y chamoy de durazno. Una explosión frutal para los amantes del picante sutil.',
    price: 110,
    originalPrice: 125,
    category: 'frutas',
    spiceLevel: 1,
    spiceName: 'Mild',
    weightOptions: ['100g', '200g'],
    ingredients: ['Fresa Entéra Deshidratada', 'Chamoy de Durazno', 'Chile Dulce', 'Azúcar de Coco'],
    featured: false,
    flavorNotes: ['Suave', 'Afrutado', 'Acidulce'],
    colorAccent: '#8E4A56',
  },
  {
    id: 'prod-5',
    slug: 'mix-zanita-especial',
    name: 'Mix Zanita Artesanal',
    tagline: 'La combinación perfecta de todas nuestras frutas picantes',
    description: 'Una selección curada con lo mejor de nuestra cocina artesanal: mango, manzana verde, piña y tamarindo enchilado en una sola presentación.',
    price: 150,
    category: 'variedad',
    spiceLevel: 3,
    spiceName: 'Spicy',
    weightOptions: ['300g', '600g'],
    ingredients: ['Mango', 'Manzana Verde', 'Piña Miel', 'Tamarindo', 'Mezcla de 4 Chiles'],
    featured: true,
    flavorNotes: ['Variedad', 'Compartir', 'Best Seller'],
    colorAccent: '#87201D',
  },
  {
    id: 'prod-6',
    slug: 'tamarindo-artesanal-con-chile',
    name: 'Bocado de Tamarindo Silvestre',
    tagline: 'Tamarindo natural despulpado a mano con chile ancho y árbol',
    description: 'Pulpa de tamarindo 100% natural moldeada artesanalmente sin conservadores sintéticos, sazonada con chile de árbol dorado en aceite de aguacate.',
    price: 75,
    category: 'frutas',
    spiceLevel: 3,
    spiceName: 'Spicy',
    weightOptions: ['150g', '300g'],
    ingredients: ['Tamarindo Natural', 'Chile de Árbol', 'Chile Ancho', 'Piloncillo Rallado'],
    featured: false,
    flavorNotes: ['Tradicional', 'Ácido', 'Especioso'],
    colorAccent: '#832709',
  },
];
