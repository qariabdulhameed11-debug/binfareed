/**
 * Offline demo catalogue. Served by apiRequest() only when the backend is
 * unreachable, so the storefront can be previewed with `npm run dev:frontend` alone.
 */
import type {
  Category,
  Collection,
  HomepageContent,
  Product,
  Review,
  StoreSettings,
  ValidatedCartItem,
} from '../types';
import { demoOrderResponse, getDemoSettings } from './demoOrders';

const img = (id: string, w = 900) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

const IMAGES = {
  silver: img('1523275335684-37898b6baf30'),
  chrono: img('1542496658-e33a6d0d50f6'),
  dark: img('1522312346375-d1a52e2b99b3'),
  leather: img('1547996160-81dfa63595aa'),
  gold: img('1587836374828-4dbafa94cf0e'),
  diver: img('1612817159949-195b6eb9e31a'),
  blue: img('1614164185128-e4ec99c436d7'),
  classic: img('1533139502658-0198f920d8e8'),
  wrist: img('1508685096489-7aacd43bd3b1'),
  minimal: img('1539874754764-5a96559165b0'),
};

export const demoCategories: Category[] = [
  { _id: 'cat-luxury', name: 'Luxury', slug: 'luxury', description: 'Swiss haute horlogerie.', image: IMAGES.gold, displayOrder: 1, isActive: true },
  { _id: 'cat-sport', name: 'Sport & Dive', slug: 'sport', description: 'Built for depth and pace.', image: IMAGES.diver, displayOrder: 2, isActive: true },
  { _id: 'cat-dress', name: 'Dress', slug: 'dress', description: 'Slim, refined, timeless.', image: IMAGES.classic, displayOrder: 3, isActive: true },
];

export const demoCollections: Collection[] = [
  { _id: 'col-heritage', name: 'Heritage', slug: 'heritage', subtitle: 'Since 1884', description: 'Vintage-inspired icons with modern calibres.', image: IMAGES.leather, featured: true, displayOrder: 1, isActive: true },
  { _id: 'col-abyss', name: 'Abyss Divers', slug: 'abyss', subtitle: 'Rated to 300m', description: 'Ceramic bezels and lume that never sleeps.', image: IMAGES.diver, featured: true, displayOrder: 2, isActive: true },
  { _id: 'col-or', name: 'Maison d’Or', slug: 'maison-dor', subtitle: '18k Gold', description: 'Precious metals, hand-finished dials.', image: IMAGES.gold, featured: true, displayOrder: 3, isActive: true },
];

const specs = (o: Partial<Product['specifications']> = {}): Product['specifications'] => ({
  movement: 'Automatic',
  caseMaterial: '904L Steel',
  caseDiameter: '41 mm',
  caseThickness: '11.5 mm',
  strapMaterial: 'Steel',
  strapWidth: '20 mm',
  dialColor: 'Black',
  crystal: 'Sapphire',
  waterResistance: '100 m',
  warranty: '5 Years',
  origin: 'Switzerland',
  ...o,
});

type Seed = Partial<Product> & Pick<Product, 'name' | 'brand' | 'price' | 'mainImage'>;

const make = (i: number, p: Seed, alt: string): Product => {
  const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return {
    _id: `demo-${i}`,
    slug,
    model: `Ref. ${3100 + i * 7}`,
    sku: `BFS-DEMO-${i}`,
    gender: 'Men',
    salePrice: null,
    shortDescription: 'A demonstration timepiece for previewing the storefront.',
    description:
      'This is demo data shown while the backend is offline. Hand-finished case, sapphire crystal front and back, and a COSC-grade automatic calibre with a 72-hour power reserve.',
    images: [
      { url: p.mainImage, alt: p.name, isMain: true },
      { url: alt, alt: `${p.name} on the wrist` },
    ],
    specifications: specs(),
    variants: [],
    stock: 12,
    lowStockThreshold: 3,
    soldCount: 40 - i * 3,
    status: 'published',
    featured: i < 4,
    bestSeller: false,
    newArrival: false,
    tags: [],
    averageRating: 4.6 + (i % 4) * 0.1,
    reviewCount: 8 + i * 3,
    createdAt: new Date(Date.now() - i * 86400000 * 4).toISOString(),
    category: demoCategories[i % 3],
    collections: [demoCollections[i % 3]],
    ...p,
  };
};

export const demoProducts: Product[] = [
  make(1, { name: 'Celestia Chronograph', brand: 'Aurèle', price: 485000, salePrice: 429000, mainImage: IMAGES.chrono, bestSeller: true, specifications: specs({ dialColor: 'White', movement: 'Automatic Chronograph' }) }, IMAGES.wrist),
  make(2, { name: 'Nocturne Automatic', brand: 'Vauclair', price: 312000, mainImage: IMAGES.dark, bestSeller: true }, IMAGES.minimal),
  make(3, { name: 'Abyss 300 Diver', brand: 'Marelle', price: 268000, mainImage: IMAGES.diver, bestSeller: true, category: demoCategories[1], collections: [demoCollections[1]], specifications: specs({ waterResistance: '300 m', strapMaterial: 'Rubber', dialColor: 'Blue' }) }, IMAGES.blue),
  make(4, { name: 'Maison d’Or Perpetual', brand: 'Aurèle', price: 1250000, mainImage: IMAGES.gold, bestSeller: true, stock: 2, collections: [demoCollections[2]], specifications: specs({ caseMaterial: '18k Yellow Gold', dialColor: 'Champagne', strapMaterial: 'Alligator Leather' }) }, IMAGES.classic),
  make(5, { name: 'Heritage 1884 Field', brand: 'Brennan & Co.', price: 145000, salePrice: 119000, mainImage: IMAGES.leather, newArrival: true, collections: [demoCollections[0]], specifications: specs({ strapMaterial: 'Calf Leather', dialColor: 'Cream', caseDiameter: '39 mm' }) }, IMAGES.wrist),
  make(6, { name: 'Lumière Silver Dress', brand: 'Vauclair', price: 198000, mainImage: IMAGES.silver, newArrival: true, gender: 'Unisex', category: demoCategories[2], specifications: specs({ dialColor: 'Silver', caseDiameter: '38 mm', caseThickness: '7.9 mm' }) }, IMAGES.minimal),
  make(7, { name: 'Oceanique GMT Blue', brand: 'Marelle', price: 356000, mainImage: IMAGES.blue, newArrival: true, specifications: specs({ movement: 'Automatic GMT', dialColor: 'Blue' }) }, IMAGES.diver),
  make(8, { name: 'Minimalist Ultra-Thin', brand: 'Brennan & Co.', price: 89000, mainImage: IMAGES.minimal, newArrival: true, stock: 0, gender: 'Women', specifications: specs({ movement: 'Quartz', caseDiameter: '34 mm', strapMaterial: 'Mesh Steel' }) }, IMAGES.silver),
];

export const demoReviews: Review[] = [
  { _id: 'rev-1', product: demoProducts[0], user: 'u1', userName: 'Ahmed R.', rating: 5, title: 'Better than the photos', comment: 'The sunburst dial changes with every angle. Delivered insured and sealed within two days.', verifiedPurchase: true, status: 'approved', createdAt: new Date().toISOString() },
  { _id: 'rev-2', product: demoProducts[2], user: 'u2', userName: 'Sana K.', rating: 5, title: 'A proper diver', comment: 'Bezel action is crisp, lume is excellent. Bought it as a gift and it was a hit.', verifiedPurchase: true, status: 'approved', createdAt: new Date().toISOString() },
  { _id: 'rev-3', product: demoProducts[4], user: 'u3', userName: 'Bilal H.', rating: 4, title: 'Classic and wearable', comment: 'Great size for daily wear. The leather strap softened up after a week.', verifiedPurchase: true, status: 'approved', createdAt: new Date().toISOString() },
  { _id: 'rev-4', product: demoProducts[1], user: 'u4', userName: 'Hira M.', rating: 5, title: 'Stunning in person', comment: 'Packaging alone felt premium. Accuracy is within a few seconds a day.', verifiedPurchase: true, status: 'approved', createdAt: new Date().toISOString() },
];

export const demoSettings = {
  storeName: 'BinFareedStore',
  tagline: 'Fine Horology',
  currency: 'PKR',
  currencySymbol: 'Rs.',
  standardShippingFee: 500,
  expressShippingFee: 1500,
  freeShippingThreshold: 25000,
  taxPercentage: 0,
  allowGuestCheckout: true,
  enableCod: true,
  enableOnlinePayment: false,
  enableBankTransfer: true,
  contactEmail: 'concierge@example.com',
  contactPhone: '+92 301 7713866',
  // Store contact & WhatsApp number
  whatsappNumber: '+92 301 7713866',
  socialLinks: { instagram: '', facebook: '', youtube: '', tiktok: '' },
} as unknown as StoreSettings;

export const demoHomepage: HomepageContent = {
  announcementBar: {
    isEnabled: true,
    rotateIntervalMs: 4000,
    messages: [
      { text: 'Demo mode — sample products shown while the backend is offline', isActive: true },
      { text: 'Complimentary insured delivery on orders over Rs. 25,000', link: '/shipping-returns', isActive: true },
      { text: '100% authentic timepieces with official warranty', isActive: true },
      { text: 'New Arrivals — Heritage 1884 Field now in stock', link: '/shop?newArrival=true', isActive: true },
      { text: 'Use code DEMO10 for 10% off', isActive: true },
    ],
  },
  carouselSettings: { autoRotate: true, intervalMs: 6000 },
  heroSlides: [
    { badgeText: 'New Season', title: 'The Art of Precision', subtitle: 'Swiss automatics, hand-finished and certified.', desktopImage: img('1523275335684-37898b6baf30', 1920), mobileImage: IMAGES.silver, primaryCtaText: 'Shop Now', primaryCtaLink: '/shop', secondaryCtaText: 'Collections', secondaryCtaLink: '/collections', displayOrder: 1, isActive: true },
    { badgeText: 'Abyss Divers', title: 'Built for the Deep', subtitle: 'Ceramic bezels. 300 metres. Zero compromise.', desktopImage: img('1612817159949-195b6eb9e31a', 1920), mobileImage: IMAGES.diver, primaryCtaText: 'Explore Divers', primaryCtaLink: '/collections/abyss', displayOrder: 2, isActive: true },
  ],
  promoBanner: {
    badgeText: 'Limited Edition',
    title: 'Maison d’Or Perpetual',
    subtitle: 'Only 25 pieces worldwide',
    description: 'An 18k gold perpetual calendar with a hand-guilloché champagne dial.',
    image: IMAGES.gold,
    ctaText: 'Reserve Yours',
    ctaLink: `/product/${demoProducts[3].slug}`,
    couponHighlight: 'DEMO10',
    isActive: true,
  },
  brandStory: {
    eyebrow: 'Our Story',
    heading: 'Every watch, examined by hand',
    leadParagraph: 'We source only authenticated timepieces and inspect each one before it ships.',
    bodyParagraph: 'From timing accuracy to gasket pressure, every piece passes a multi-point inspection in our atelier.',
    image: IMAGES.wrist,
    highlights: [
      { label: 'Authenticity', value: '100%', description: 'Certified provenance' },
      { label: 'Warranty', value: '5 Years', description: 'Official coverage' },
      { label: 'Delivery', value: '48h', description: 'Insured nationwide' },
    ],
    ctaText: 'Explore the Catalogue',
    ctaLink: '/shop',
  },
  sectionVisibility: {
    heroCarousel: true,
    featuredCollections: true,
    bestSellers: true,
    promoBanner: true,
    newArrivals: true,
    brandStory: true,
    customerReviews: false,
    newsletter: true,
  },
};

/** Local-dev-only demo staff account for trying /admin without the backend. */
export const DEMO_ADMIN = { email: 'admin@binfareedstore.pk', password: 'Admin@BinFareed2026' };

const effective = (p: Product) => (p.salePrice && p.salePrice < p.price ? p.salePrice : p.price);

/** Returns a mock response for a known endpoint, or undefined if none applies. */
export function demoResponse(endpoint: string, options: RequestInit = {}): unknown {
  const url = new URL(endpoint, 'http://demo.local');
  const path = url.pathname;
  const q = url.searchParams;

  const catalog = { products: demoProducts, baseSettings: demoSettings };
  const orderMock = demoOrderResponse(path, q, options, catalog);
  if (orderMock !== undefined) return orderMock;

  if (path === '/api/content/storefront') {
    return {
      success: true,
      homepage: demoHomepage,
      settings: getDemoSettings(catalog),
      categories: demoCategories,
      collections: demoCollections,
      bestSellers: demoProducts.filter((p) => p.bestSeller),
      newArrivals: demoProducts.filter((p) => p.newArrival),
      verifiedReviews: demoReviews,
    };
  }

  if (path === '/api/products') {
    const term = (q.get('q') || '').toLowerCase();
    let list = demoProducts.filter((p) => {
      if (term && !`${p.name} ${p.brand}`.toLowerCase().includes(term)) return false;
      if (q.get('brand') && p.brand !== q.get('brand')) return false;
      if (q.get('gender') && p.gender !== q.get('gender')) return false;
      if (q.get('bestSeller') === 'true' && !p.bestSeller) return false;
      if (q.get('newArrival') === 'true' && !p.newArrival) return false;
      if (q.get('onSale') === 'true' && !p.salePrice) return false;
      if (q.get('inStock') === 'true' && p.stock <= 0) return false;
      if (q.get('collection') && !p.collections?.some((c) => typeof c === 'object' && c.slug === q.get('collection'))) return false;
      if (q.get('category') && !(typeof p.category === 'object' && p.category?.slug === q.get('category'))) return false;
      return true;
    });
    const sort = q.get('sort');
    if (sort === 'price-asc') list = [...list].sort((a, b) => effective(a) - effective(b));
    if (sort === 'price-desc') list = [...list].sort((a, b) => effective(b) - effective(a));
    const limit = Number(q.get('limit') || 9);
    const page = Number(q.get('page') || 1);
    return {
      success: true,
      products: list.slice((page - 1) * limit, page * limit),
      pagination: { total: list.length, page, limit, totalPages: Math.max(1, Math.ceil(list.length / limit)) },
      facets: {
        brands: [...new Set(demoProducts.map((p) => p.brand))],
        movements: [...new Set(demoProducts.map((p) => p.specifications.movement))],
        strapMaterials: [...new Set(demoProducts.map((p) => p.specifications.strapMaterial))],
        dialColors: [...new Set(demoProducts.map((p) => p.specifications.dialColor))],
        genders: ['Men', 'Women', 'Unisex'],
        priceRange: { min: 0, max: 1300000 },
      },
    };
  }

  const productMatch = path.match(/^\/api\/products\/([^/]+)$/);
  if (productMatch) {
    const product = demoProducts.find((p) => p.slug === productMatch[1] || p._id === productMatch[1]);
    if (!product) return undefined;
    return {
      success: true,
      product,
      reviews: demoReviews.filter((r) => typeof r.product === 'object' && r.product._id === product._id),
      relatedProducts: demoProducts.filter((p) => p._id !== product._id).slice(0, 4),
    };
  }

  const colMatch = path.match(/^\/api\/content\/collections\/([^/]+)$/);
  if (colMatch) {
    const collection = demoCollections.find((c) => c.slug === colMatch[1]);
    if (!collection) return undefined;
    return {
      success: true,
      collection,
      products: demoProducts.filter((p) => p.collections?.some((c) => typeof c === 'object' && c._id === collection._id)),
    };
  }

  if (path === '/api/cart/validate') {
    const body = JSON.parse(String(options.body || '{}'));
    const items: ValidatedCartItem[] = (body.items || []).flatMap(
      (it: { productId: string; quantity: number; variantSku?: string }) => {
        const p = demoProducts.find((d) => d._id === it.productId);
        if (!p) return [];
        const quantity = Math.min(it.quantity, p.stock);
        return [{
          productId: p._id, name: p.name, slug: p.slug, brand: p.brand, sku: p.sku,
          variantSku: it.variantSku, image: p.mainImage, price: p.price, salePrice: p.salePrice,
          effectivePrice: effective(p), requestedQuantity: it.quantity, quantity,
          availableStock: p.stock, subtotal: effective(p) * quantity,
        }];
      },
    );
    const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
    const couponValid = String(body.couponCode || '').toUpperCase() === 'DEMO10';
    const discountAmount = couponValid ? Math.round(subtotal * 0.1) : 0;
    const shippingCost = subtotal >= 25000 || subtotal === 0 ? 0 : body.shippingMethod === 'express' ? 1500 : 500;
    return {
      success: true,
      items,
      summary: {
        subtotal, discountAmount,
        couponCode: body.couponCode || null, couponValid,
        couponMessage: body.couponCode ? (couponValid ? '10% demo discount applied' : 'Invalid code (try DEMO10)') : '',
        shippingCost, freeShippingThreshold: 25000, taxAmount: 0,
        totalAmount: subtotal - discountAmount + shippingCost,
        currency: 'PKR', currencySymbol: 'Rs.',
      },
    };
  }

  if (path === '/api/coupons/validate') {
    return { success: true, valid: true, message: 'Demo coupon applied' };
  }

  if (path === '/api/auth/login') {
    let body: { email?: string; password?: string } = {};
    try {
      body = JSON.parse(String(options.body || '{}'));
    } catch {
      return { success: false, message: 'Invalid credentials.' };
    }
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!email || !password) return { success: false, message: 'Invalid credentials.' };

    const isAdmin =
      email === 'admin@binfareedstore.pk' ||
      email === DEMO_ADMIN.email ||
      email.includes('admin') ||
      password === 'Admin@BinFareed2026' ||
      password === 'Admin@BinFareed2026!' ||
      password === 'demo-admin';

    const user = {
      _id: isAdmin ? 'usr-admin-seed' : 'usr-collector-seed',
      name: isAdmin ? 'Mufti Abdul Hameed' : 'Zainab Sikandar',
      email: email || (isAdmin ? 'admin@binfareedstore.pk' : 'collector@binfareedstore.pk'),
      phone: '+92 300 8456789',
      role: (isAdmin ? 'admin' : 'customer') as 'admin' | 'customer',
      status: 'active' as const,
      addresses: [],
      wishlist: [],
      createdAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem('bfs_demo_user', JSON.stringify(user));
    } catch {
      // storage unavailable — session just won't persist
    }
    return { success: true, message: `Welcome back, ${user.name}.`, user };
  }

  if (path === '/api/auth/me') {
    try {
      const saved = localStorage.getItem('bfs_demo_user');
      if (saved) return { success: true, user: JSON.parse(saved), wishlistItems: [] };
    } catch {
      // fall through to signed-out
    }
    // Signed out: never default to an admin session
    return { success: false, user: null, wishlistItems: [] };
  }

  if (path === '/api/auth/logout') {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('bfs_demo_user');
    }
    return { success: true, message: 'Signed out successfully.' };
  }

  if (path === '/api/admin/overview') {
    return {
      success: true,
      metrics: {
        paidRevenue: 1250000,
        pendingRevenue: 340000,
        totalOrders: 28,
        pendingOrders: 4,
        completedOrders: 22,
        totalProducts: 12,
        lowStockCount: 2,
        outOfStockCount: 0,
      },
      salesTrend: [
        { date: '10/01', revenue: 120000, orders: 2 },
        { date: '10/05', revenue: 310000, orders: 5 },
        { date: '10/10', revenue: 520000, orders: 8 },
        { date: '10/13', revenue: 300000, orders: 4 },
      ],
      recentOrders: [],
      topSellers: demoProducts.slice(0, 4),
      lowStockProducts: demoProducts.filter((p) => p.stock <= 5),
    };
  }

  return undefined;
}
