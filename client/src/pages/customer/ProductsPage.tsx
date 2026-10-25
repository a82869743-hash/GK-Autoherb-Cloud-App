import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShoppingBag, CreditCard, CheckCircle, Clock, AlertTriangle, ArrowRight, Star, ThumbsUp, Check, Truck, ShieldCheck, ShoppingCart, RefreshCw, X, QrCode, Search } from 'lucide-react';
import api from '../../api/axiosInstance';
import { useUIStore } from '../../store/uiStore';
import { useCartStore } from '../../store/useCartStore';
import ProductsCartDrawer from '../../components/shared/ProductsCartDrawer';
import PaymentSandboxModal from '../../components/shared/PaymentSandboxModal';
import { AppPageHeader, SegmentedTabs } from '../../components/customer/ui';

function resolveImageUrl(url: string | undefined): string {
  if (!url) return '';
  if (url.includes('localhost:5000') || url.includes('127.0.0.1')) {
    const idx = url.indexOf('/uploads/');
    if (idx !== -1) return url.substring(idx);
  }
  return url;
}

// Static product configuration with details matching ChatGPT screenshots
const PRODUCT_TEMPLATES = [
  {
    dbName: 'MICROFIBER 40*60 800 GSM',
    category: 'Microfiber & Cleaning',
    whiteImage: '/products/white/microfiber_40x60_800gsm.jpg',
    displayName: 'Microfiber Towel 40x60 800 GSM',
    image: '/products/microfiber_40x60_800gsm.png',
    rating: 4.9,
    reviewsCount: 128,
    price: 399,
    mrp: 699,
    discount: '43% OFF',
    description: 'Premium 800 GSM microfiber towel for a swirl-free shine. Ultra absorbent, lint-free & safe on all surfaces.',
    features: ['Ultra Soft Touch', 'High Absorbency', 'Scratch Free', 'Durable & Long Lasting'],
    specs: {
      Size: '40 x 60 cm',
      GSM: '800 GSM',
      Material: 'Premium Microfiber',
      Color: 'Grey with Red Stitch'
    },
    whyBuy: 'Engineered for perfect care. Soft, absorbent & scratch-free for a flawless finish every time.'
  },
  {
    dbName: 'MICROFIBER 40*40 450 GSM 2PCS - SMOOTH FUR',
    category: 'Microfiber & Cleaning',
    whiteImage: '/products/white/microfiber_40x40_smooth_fur.jpg',
    displayName: 'Microfiber 40x40 450 GSM 2PCS - Smooth Fur',
    image: '/products/microfiber_40x40_smooth_fur.png',
    rating: 4.9,
    reviewsCount: 128,
    price: 299,
    mrp: 499,
    discount: '40% OFF',
    description: 'Premium 450 GSM microfiber towel with smooth fur texture. Ultra soft, lint-free & safe on all surfaces. Perfect for polishing, buffing & final finish.',
    features: ['Ultra Soft Touch', 'High Absorbency', 'Scratch Free', 'Durable & Long Lasting'],
    specs: {
      Size: '40 x 40 cm',
      GSM: '450 GSM',
      Quantity: '2 PCS',
      Color: 'Grey with Red Stitch'
    },
    whyBuy: 'Ideal for wax removal, detailing sprays, and interior dusting without leaving any swirl marks.'
  },
  {
    dbName: 'MICROFIBER 40*40 450 GSM 2PCS - HEAVY FUR',
    category: 'Microfiber & Cleaning',
    whiteImage: '/products/white/microfiber_40x40_heavy_fur.jpg',
    displayName: 'Microfiber Towel 40x40 450 GSM 2PCS - Heavy Fur',
    image: '/products/microfiber_40x40_heavy_fur.png',
    rating: 4.9,
    reviewsCount: 128,
    price: 299,
    mrp: 499,
    discount: '40% OFF',
    description: 'Premium 450 GSM microfiber towel with heavy fur texture. Ultra soft, lint-free & safe on all surfaces. Perfect for polishing, buffing & final finish.',
    features: ['Ultra Soft Touch', 'High Absorbency', 'Scratch Free', 'Durable & Long Lasting'],
    specs: {
      Size: '40 x 40 cm',
      GSM: '450 GSM',
      Quantity: '2 PCS',
      Color: 'Dark Grey with Red Stitch'
    },
    whyBuy: 'Long pile fibers safely trap dirt particles away from paint surfaces for a swirl-free finish.'
  },
  {
    dbName: 'ASTONISH PREMIUM DAMPING - 2.8 PLUS',
    category: 'Car Care Upgrades',
    whiteImage: '/products/white/astonish_damping_2.8_plus.jpg',
    displayName: 'Astonish Premium Damping-2.8 Plus',
    image: '/products/astonish_damping_2.8_plus.png',
    rating: 4.9,
    reviewsCount: 128,
    price: 1999,
    mrp: 3499,
    discount: '43% OFF',
    description: 'Premium damping sheet with 2.8mm thickness for superior noise reduction and vibration control. Enhances driving comfort with excellent heat resistance and durability.',
    features: ['Noise Reduction', 'Vibration Control', 'Heat Resistant', 'Long Lasting'],
    specs: {
      Thickness: '2.8 mm',
      PackSize: '5 Sheets (2.8mm Each)',
      Material: 'Premium Butyl Rubber',
      Adhesive: 'Industrial grade self-adhesive'
    },
    whyBuy: 'Damping sheets improve driving comfort by reducing noise, vibrations and heat for a quieter, smoother and more enjoyable ride.'
  },
  {
    dbName: 'SIDE CONSOL',
    category: 'Organisers',
    whiteImage: '/products/white/side_consol.jpg',
    displayName: 'Side Consol Storage Pocket',
    image: '/products/side_consol.png',
    rating: 4.9,
    reviewsCount: 128,
    price: 799,
    mrp: 1299,
    discount: '38% OFF',
    description: 'Smart side storage solution to keep your essentials within reach. Fills the gap between seat and console. Prevents items from falling into the gap.',
    features: ['Extra Storage', 'Premium Quality', 'Universal Fit', 'Easy Install'],
    specs: {
      Color: 'Black with Red Stitch',
      Material: 'Premium PU Leather',
      Fit: 'Universal',
      Installation: 'Insert directly into seat gap'
    },
    whyBuy: 'Maximize your car space and keep essentials within reach while driving. Smart, stylish & practical.'
  },
  {
    dbName: 'SIDE CONSOL FIX',
    category: 'Organisers',
    whiteImage: '/products/white/side_consol_fix.jpg',
    displayName: 'Side Consol Fix Pocket',
    image: '/products/side_consol_fix.png',
    rating: 4.9,
    reviewsCount: 128,
    price: 499,
    mrp: 799,
    discount: '38% OFF',
    description: 'Smart solution to fill the gap between seat and console. Prevents small items from falling into the gap. Keeps your car clean, organized and clutter-free.',
    features: ['Prevents Falls', 'Perfect Fit', 'Premium Quality', 'Easy Install'],
    specs: {
      Color: 'Black',
      Material: 'Flexible ABS & PU Leather',
      Fit: 'Universal Fit',
      Installation: 'Insert into seat gap'
    },
    whyBuy: 'Small items falling into the seat gap can be annoying and hard to retrieve. Side Consol Fix prevents drops, keeps your car clean and adds a premium look.'
  },
  {
    dbName: 'HOOK',
    category: 'Organisers',
    whiteImage: '/products/white/hook.jpg',
    displayName: 'Premium Car Headrest Hook',
    image: '/products/hook.png',
    rating: 4.9,
    reviewsCount: 128,
    price: 199,
    mrp: 299,
    discount: '33% OFF',
    description: 'Universal hook for your car to hang bags, accessories, and more. Strong grip that holds heavy items securely. Keeps your car organized and clutter-free.',
    features: ['Strong Hold', 'Premium Quality', 'Universal Fit', 'Easy Install'],
    specs: {
      Color: 'Black Carbon Fiber Texture',
      LoadCapacity: 'Up to 10 kg',
      Fit: 'Universal headrest shafts',
      Installation: 'Side-opening design, no removal needed'
    },
    whyBuy: 'From groceries to gadgets, keep everything securely hung and within reach. HOOK makes your car tidy, organized and stress-free.'
  },
  {
    dbName: 'TISSU COVER',
    category: 'Organisers',
    whiteImage: '/products/white/tissue_cover.jpg',
    displayName: 'Premium PU Leather Tissue Cover',
    image: '/products/tissue_cover.png',
    rating: 4.9,
    reviewsCount: 128,
    price: 249,
    mrp: 399,
    discount: '38% OFF',
    description: 'Stylish tissue cover for your car. Made with premium material for long-lasting use. Easy tissue access and keeps your car interior organized.',
    features: ['Premium Quality', 'Easy Access', 'Universal Fit', 'Stylish Design'],
    specs: {
      Color: 'Black',
      Material: 'Soft PU Leather',
      Fit: 'Fits most car dashboards/visors',
      Closure: 'Magnetic bottom flap'
    },
    whyBuy: 'Keep tissues within reach and your car interior organized. A perfect blend of style, convenience and premium quality.'
  },
  {
    dbName: 'TISSU COVER HEAVY',
    category: 'Organisers',
    whiteImage: '/products/white/tissue_cover_heavy.jpg',
    displayName: 'Heavy Build Tissue Cover',
    image: '/products/tissue_cover_heavy.png',
    rating: 4.9,
    reviewsCount: 128,
    price: 449,
    mrp: 699,
    discount: '36% OFF',
    description: 'Premium heavy build tissue cover for your car. Made with high-quality material for long-lasting use. Keeps tissues within reach and adds a premium look to your car.',
    features: ['Heavy Build', 'Premium Quality', 'Universal Fit', 'Easy To Use'],
    specs: {
      Color: 'Black with Red Stitch',
      Material: 'Textured PU Leather',
      Pattern: 'Diamond Quilted',
      Fit: 'Universal dash or armrest placement'
    },
    whyBuy: 'Keep tissues within easy reach and maintain the premium look of your car interior. Heavy build quality ensures long-lasting performance.'
  },
  {
    dbName: 'ST COVER',
    category: 'Interior Comfort',
    whiteImage: '/products/white/seat_cover.jpg',
    displayName: 'Premium PU Leather Seat Cover',
    image: '/products/seat_cover.png',
    rating: 4.8,
    reviewsCount: 128,
    price: 1499,
    mrp: 2499,
    discount: '40% OFF',
    description: 'Give your car interior a premium upgrade. Made with high-quality PU leather for durability and comfort. Universal fit for most cars.',
    features: ['Premium Quality', 'Comfortable Design', 'Universal Fit', 'Multi-Layer Protection'],
    specs: {
      ColorsAvailable: 'Black & Beige, Black & Red',
      Material: 'High-grade PU Leather',
      Quantity: 'Complete Set (Front & Rear)',
      Cleaning: 'Wipe clean surface'
    },
    whyBuy: 'Seat covers protect your original seats from dirt, spills, stains and wear & tear. Enhance comfort and give your car interior a premium look.'
  },
  {
    dbName: 'MEMORY NECK REST - ASTONISH',
    category: 'Interior Comfort',
    whiteImage: '/products/white/memory_neck_rest.jpg',
    displayName: 'Memory Neck Rest - ASTONISH',
    image: '/products/memory_neck_rest.png',
    rating: 4.8,
    reviewsCount: 128,
    price: 699,
    mrp: 1299,
    discount: '46% OFF',
    description: 'Experience superior comfort on every drive. Premium memory foam supports your neck and reduces fatigue. Ergonomic design for perfect neck & head support. Universal fit for most cars.',
    features: ['Memory Foam Comfort', 'Ergonomic Support', 'Universal Fit', 'Reduces Neck Fatigue'],
    specs: {
      Color: 'Black with Red Stitching',
      Material: 'High-Density Memory Foam',
      Cover: 'Breathable perforated leatherette',
      Strap: 'Adjustable elastic strap'
    },
    whyBuy: 'Long drives can cause neck pain and fatigue. ASTONISH Memory Neck Rest provides perfect support and comfort for a relaxed and enjoyable journey.'
  },
  {
    dbName: 'MEMORY CUSION PILLOW - ASTONISH',
    category: 'Interior Comfort',
    whiteImage: '/products/white/memory_cushion_pillow.jpg',
    displayName: 'Memory Cushion Pillow - ASTONISH',
    image: '/products/memory_cushion_pillow.png',
    rating: 4.8,
    reviewsCount: 128,
    price: 599,
    mrp: 1099,
    discount: '45% OFF',
    description: 'Experience superior comfort on every drive. Premium memory foam adapts to your back for perfect support. Reduces fatigue and enhances posture while driving. Universal fit for most car seats.',
    features: ['Memory Foam Comfort', 'Ergonomic Support', 'Universal Fit', 'Reduces Back Fatigue'],
    specs: {
      Color: 'Black with Red Stitching',
      Material: 'High-Density Memory Foam',
      Design: 'Ergonomic lumbar curvature',
      Washable: 'Removable zip cover'
    },
    whyBuy: 'Long drives can cause back pain and discomfort. ASTONISH Memory Cushion Pillow provides the perfect support to keep you relaxed and comfortable through every journey.'
  },
  {
    dbName: 'TYRE INFLATOR (14)',
    category: 'Tools & Gadgets',
    whiteImage: '/products/white/tyre_inflator.jpg',
    displayName: 'Digital Tyre Inflator',
    image: '/products/tyre_inflator.png',
    rating: 4.8,
    reviewsCount: 156,
    price: 1499,
    mrp: 2499,
    discount: '40% OFF',
    description: 'Portable tyre inflator with powerful motor for quick inflation. Digital display for accurate pressure reading. Auto shut-off, LED light & multiple nozzles for all uses. Perfect for cars, bikes, cycles & sports equipment.',
    features: ['Fast Inflation', 'Digital Display', 'Auto Shut-off', 'LED Light & Multi-use Nozzles'],
    specs: {
      PressureUnits: 'BAR, PSI',
      PowerSource: '12V Car Cigarette Lighter',
      MaxPressure: '150 PSI',
      Display: 'Backlit LCD Digital Display'
    },
    whyBuy: 'Proper tyre pressure ensures safety, better fuel efficiency & longer tyre life. Keep this compact inflator in your car and be always ready for emergencies.'
  },
  {
    dbName: 'PORTABLE CAR VACUUM CLEANER',
    category: 'Tools & Gadgets',
    whiteImage: '/products/white/car_vacuum.jpg',
    displayName: 'Portable Car Vacuum Cleaner',
    image: '/products/car_vacuum.png',
    rating: 4.8,
    reviewsCount: 156,
    price: 1499,
    mrp: 2499,
    discount: '40% OFF',
    description: 'High power portable vacuum cleaner for deep cleaning. Strong suction for dust, crumbs, pet hair & more. Compact, lightweight & easy to carry. Perfect for car, home & office use.',
    features: ['Strong Suction', 'HEPA Filter', 'Lightweight & Portable', 'Multi-use Attachments'],
    specs: {
      Power: '120W High Performance Motor',
      FilterType: 'Washable HEPA Filter',
      Weight: 'Lightweight ergonomic body',
      Accessories: 'Comes with multiple cleaning nozzles'
    },
    whyBuy: 'A clean car is a happy car! Remove dust, dirt, crumbs & pet hair easily with powerful suction. Compact & portable - clean anytime, anywhere.'
  },
  {
    dbName: 'CROSS BODY BAG',
    category: 'Bags & Travel',
    whiteImage: '/products/white/cross_body_bag.jpg',
    displayName: 'Premium Cross Body Bag',
    image: '/products/cross_body_bag.png',
    rating: 4.9,
    reviewsCount: 128,
    price: 799,
    mrp: 1299,
    discount: '38% OFF',
    description: 'Stylish and durable cross body bag for everyday use. Spacious compartments to keep your essentials organized. Adjustable strap for a comfortable fit. Perfect for travel, work, or casual outings.',
    features: ['Premium Quality', 'Lightweight Design', 'Spacious Storage', 'Water Resistant'],
    specs: {
      Color: 'Black with White Branding',
      Material: 'Water-resistant nylon/polyester',
      Strap: 'Adjustable shoulder strap',
      Zippers: 'Heavy-duty smooth zippers'
    },
    whyBuy: 'Keep your essentials organized and secure wherever you go. A perfect blend of style, functionality and durability for every journey.'
  }
];

export default function ProductsPage() {
  const toast = useUIStore((s) => s.toast);
  const { productsCart, productsDrawerOpen, setProductsDrawerOpen } = useCartStore();
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [paymentMode, setPaymentMode] = useState<'razorpay' | 'qr'>('razorpay');
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrTransactionId, setQrTransactionId] = useState('');
  const [submittingQr, setSubmittingQr] = useState(false);

  // Tab state synced with URL search params
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'orders' ? 'orders' : 'shop';
  const handleTabChange = (tab: 'shop' | 'orders') => {
    setSearchParams({ tab });
  };

  // Sandbox payment modal state
  const [sandboxModal, setSandboxModal] = useState<{
    isOpen: boolean;
    orderId: string;
    amount: number;
    itemName: string;
    loading?: boolean;
  } | null>(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [dbCategories, setDbCategories] = useState<string[]>([]);

  // Normalize product name for fuzzy matching
  const normalizeProductName = (name: string) => {
    return (name || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '') // Remove all non-alphanumeric
      .trim();
  };

  // Load products and match with DB stock
  const loadData = async () => {
    try {
      setLoading(true);
      // Fetch master categories list
      try {
        const catRes = await api.get('/inventory/categories');
        if (catRes.data?.data) {
          setDbCategories(catRes.data.data.map((c: any) => c.category).filter(Boolean));
        }
      } catch { /* ignore if categories endpoint fails */ }

      // 1. Fetch DB Products (secure customer endpoint) to match live price/stock
      const invRes = await api.get('/products');
      const dbItems = invRes.data?.data || [];

      const matchedDbIds = new Set<number>();

      // Map template products to DB items using fuzzy matching
      const mapped = PRODUCT_TEMPLATES.map((tmpl) => {
        // Try exact match first
        let match = dbItems.find(
          (db: any) => db.product_name.toUpperCase() === tmpl.dbName.toUpperCase()
        );

        // If no exact match, try normalized fuzzy match
        if (!match) {
          const normalizedTmpl = normalizeProductName(tmpl.dbName);
          match = dbItems.find((db: any) => {
            const normalizedDb = normalizeProductName(db.product_name);
            return normalizedDb === normalizedTmpl || 
                   normalizedDb.includes(normalizedTmpl) || 
                   normalizedTmpl.includes(normalizedDb);
          });
        }

        // If still no match, try partial word matching
        if (!match) {
          const tmplWords = tmpl.dbName.toUpperCase().split(/[\s*\-_]+/).filter(Boolean);
          match = dbItems.find((db: any) => {
            const dbUpper = (db.product_name || '').toUpperCase();
            // At least 2 key words must match
            const matchCount = tmplWords.filter(w => dbUpper.includes(w)).length;
            return matchCount >= Math.min(2, tmplWords.length);
          });
        }

        if (match) matchedDbIds.add(match.id);

        const dbQty = match ? parseFloat(match.quantity) : 0;
        const dbSellingPrice = match ? parseFloat(match.selling_price) : 0;
        const dbCostPrice = match ? parseFloat(match.cost_price) : 0;

        // Extract image(s) from DB images_json if available
        let dbImages: string[] = [];
        if (match?.images_json) {
          try {
            const imgArr = typeof match.images_json === 'string' ? JSON.parse(match.images_json) : match.images_json;
            if (Array.isArray(imgArr)) dbImages = imgArr.map(resolveImageUrl).filter(Boolean);
            else if (typeof imgArr === 'string' && imgArr) dbImages = [resolveImageUrl(imgArr)];
          } catch { /* ignore parse errors */ }
        }

        const effectiveImages = dbImages.length > 0 ? dbImages : [tmpl.whiteImage, tmpl.image];

        // Calculate MRP and discount from DB data
        const effectivePrice = dbSellingPrice > 0 ? dbSellingPrice : tmpl.price;
        const effectiveMrp = dbSellingPrice > 0
          ? Math.ceil(dbSellingPrice * 1.6 / 10) * 10
          : tmpl.mrp;
        const effectiveDiscount = effectiveMrp > effectivePrice
          ? Math.round(((effectiveMrp - effectivePrice) / effectiveMrp) * 100) + '% OFF'
          : tmpl.discount;

        return {
          ...tmpl,
          // DB data overrides template when available
          displayName: match?.product_name || tmpl.displayName,
          description: match?.description || tmpl.description,
          image: effectiveImages[0],
          images: effectiveImages,
          price: effectivePrice,
          mrp: effectiveMrp,
          discount: effectiveDiscount,
          category: match?.category || tmpl.category,
          specs: {
            ...tmpl.specs,
            Category: match?.category || tmpl.category,
            ...(match?.brand ? { Brand: match.brand } : {}),
            ...(match?.sku ? { SKU: match.sku } : {}),
          },
          dbId: match?.id || null,
          dbQty: dbQty,
          dbPrice: effectivePrice,
          inStock: match ? (isNaN(dbQty) ? true : dbQty > 0) : false
        };
      });

      // 2. Add any DB products that didn't match a template (so nothing is hidden)
      // De-duplicate by product name (keep the one with highest selling_price)
      const unmatchedDbProducts = dbItems.filter((db: any) => !matchedDbIds.has(db.id));
      const seenNames = new Map<string, any>();
      for (const db of unmatchedDbProducts) {
        const nameKey = (db.product_name || '').toUpperCase().trim();
        const existing = seenNames.get(nameKey);
        if (!existing || (parseFloat(db.selling_price) || 0) > (parseFloat(existing.selling_price) || 0)) {
          seenNames.set(nameKey, db);
        }
      }

      for (const db of seenNames.values()) {
        const dbQty = parseFloat(db.quantity);
        const sellingPrice = parseFloat(db.selling_price) || 0;
        // Skip products with no price set
        if (sellingPrice <= 0) continue;

        const estimatedMrp = Math.ceil(sellingPrice * 1.6 / 10) * 10; // Round up to nearest 10
        const discountPct = Math.round(((estimatedMrp - sellingPrice) / estimatedMrp) * 100);

        // Extract image(s) from DB images_json
        let dbImages: string[] = [];
        if (db.images_json) {
          try {
            const imgArr = typeof db.images_json === 'string' ? JSON.parse(db.images_json) : db.images_json;
            if (Array.isArray(imgArr)) dbImages = imgArr.map(resolveImageUrl).filter(Boolean);
            else if (typeof imgArr === 'string' && imgArr) dbImages = [resolveImageUrl(imgArr)];
          } catch { /* ignore parse errors */ }
        }

        const effectiveImages = dbImages.length > 0 ? dbImages : [];

        mapped.push({
          dbName: db.product_name,
          displayName: db.product_name,
          image: effectiveImages[0],
          images: effectiveImages,
          rating: 4.5,
          reviewsCount: 0,
          price: sellingPrice,
          mrp: estimatedMrp,
          discount: discountPct > 0 ? discountPct + '% OFF' : '',
          description: db.description || db.product_name,
          features: [],
          category: db.category || 'More Accessories',
          specs: { Category: db.category || 'More Accessories', Brand: db.brand || 'GK AutoHerb', SKU: db.sku || '-' },
          whyBuy: '',
          dbId: db.id,
          dbQty: dbQty,
          dbPrice: sellingPrice,
          inStock: isNaN(dbQty) ? true : dbQty > 0,
        } as any);
      }

      setProducts(mapped);

      // 3. Fetch Customer Orders
      const orderRes = await api.get('/products/my-orders');
      setOrders(orderRes.data?.data || []);
    } catch (err) {
      console.error('Error loading products/orders:', err);
      toast('error', 'Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Derive all categories from master dbCategories and loaded products
  // Chips only for categories that actually have products (empty chips made the filter look broken)
  const availableCategories = Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort((a: string, b: string) => a.localeCompare(b)) as string[];
  const [sortBy, setSortBy] = useState<'relevance' | 'price_asc' | 'price_desc' | 'discount'>('relevance');
  const [inStockOnly, setInStockOnly] = useState(false);

  // Filter products by search term and selected category
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !searchTerm ||
      p.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = !selectedCategory || p.category === selectedCategory;
    const matchesStock = !inStockOnly || p.inStock;

    return matchesSearch && matchesCategory && matchesStock;
  }).sort((a, b) => {
    if (sortBy === 'price_asc') return a.price - b.price;
    if (sortBy === 'price_desc') return b.price - a.price;
    if (sortBy === 'discount') return (b.mrp - b.price) / (b.mrp || 1) - (a.mrp - a.price) / (a.mrp || 1);
    return Number(b.inStock) - Number(a.inStock);
  });

  const qtyInCart = (dbId: number | null) => (dbId ? productsCart.find((i: any) => i.id === dbId)?.quantity || 0 : 0);
  const cartCount = productsCart.reduce((n: number, i: any) => n + (i.quantity || 1), 0);
  const cartTotal = productsCart.reduce((n: number, i: any) => n + (Number(i.selling_price) || 0) * (i.quantity || 1), 0);
  const addToCart = (product: any) => {
    if (!product.dbId) {
      toast('error', 'This product is unavailable right now');
      return;
    }
    useCartStore.getState().addProductToCart({
      id: product.dbId,
      product_name: product.displayName,
      selling_price: product.price,
      image_url: product.image,
      stock: product.dbQty || 99,
    });
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePurchase = async () => {
    if (!selectedProduct) return;
    if (!selectedProduct.dbId) {
      toast('error', 'This product is temporarily unavailable (not linked to inventory).');
      return;
    }

    if (selectedProduct.dbQty < quantity) {
      toast('error', `Only ${selectedProduct.dbQty} units left in stock.`);
      return;
    }

    try {
      if (paymentMode === 'razorpay') {
        const sdkLoaded = await loadRazorpayScript();
        if (!sdkLoaded) {
          toast('error', 'Razorpay SDK failed to load. Are you online?');
          return;
        }

        // 1. Create Order
        const orderRes = await api.post('/products/order', {
          product_id: selectedProduct.dbId,
          quantity,
          payment_method: 'razorpay'
        });

        const orderData = orderRes.data?.razorpay_order;
        const productOrderId = orderRes.data?.order_id;

        if (!orderData) {
          toast('error', 'Failed to initialize payment.');
          return;
        }

        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_123',
          amount: orderData.amount,
          currency: orderData.currency,
          name: 'GK AutoHerb',
          description: `Purchase: ${selectedProduct.displayName}`,
          image: '/assets/logo.png',
          order_id: orderData.id,
          handler: async (response: any) => {
            try {
              toast('info', 'Verifying payment...');
              await api.post('/products/order/verify', {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              });
              toast('success', 'Order placed successfully! Stock updated.');
              setSelectedProduct(null);
              loadData();
            } catch (err: any) {
              toast('error', err.response?.data?.error || 'Verification failed.');
            }
          },
          prefill: {
            name: '',
            email: '',
            contact: ''
          },
          theme: {
            color: '#D32F2F'
          },
          modal: {
            ondismiss: () => {
              toast('warning', 'Payment cancelled.');
            }
          }
        };

        // If mock order (Sandbox mode)
        if (orderData.id.startsWith('order_mock_')) {
          setSandboxModal({
            isOpen: true,
            orderId: orderData.id,
            amount: selectedProduct.dbPrice * quantity,
            itemName: selectedProduct.displayName,
          });
          return;
        }

        const rzp = new (window as any).Razorpay(options);
        rzp.open();

      } else {
        // QR Code Modal Open
        setQrModalOpen(true);
      }
    } catch (err: any) {
      console.error('Purchase error:', err);
      toast('error', err.response?.data?.error || 'Failed to place order.');
    }
  };

  const handleConfirmSandboxPayment = async () => {
    if (!sandboxModal) return;
    try {
      setSandboxModal(prev => prev ? { ...prev, loading: true } : null);
      await api.post('/products/order/verify', {
        razorpay_order_id: sandboxModal.orderId,
        razorpay_payment_id: 'pay_mock_' + Date.now(),
        razorpay_signature: 'sig_mock_' + Date.now()
      });
      toast('success', 'Order placed successfully! (Simulated)');
      setSelectedProduct(null);
      setSandboxModal(null);
      loadData();
    } catch (err: any) {
      toast('error', err.response?.data?.error || 'Verification failed.');
      setSandboxModal(prev => prev ? { ...prev, loading: false } : null);
    }
  };

  const handleQrSubmit = async () => {
    if (!qrTransactionId.trim()) {
      toast('error', 'Please enter a valid Transaction ID / UTR number.');
      return;
    }

    try {
      setSubmittingQr(true);
      await api.post('/products/order', {
        product_id: selectedProduct.dbId,
        quantity,
        payment_method: 'qr',
        qr_transaction_id: qrTransactionId.trim()
      });

      toast('success', 'QR Payment submitted. Awaiting Admin verification!');
      setQrModalOpen(false);
      setSelectedProduct(null);
      setQrTransactionId('');
      handleTabChange('orders');
      loadData();
    } catch (err: any) {
      toast('error', err.response?.data?.error || 'Failed to submit QR payment.');
    } finally {
      setSubmittingQr(false);
    }
  };

  return (
    <div className="pb-6">
      <AppPageHeader
        title="Car Accessories"
        right={
          <button onClick={() => setProductsDrawerOpen(true)} className="relative h-10 w-10 rounded-full bg-white shadow-app flex items-center justify-center" aria-label="Open cart">
            <ShoppingCart size={19} />
            {cartCount > 0 && <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-[#D32F2F] text-white text-[10px] font-bold flex items-center justify-center">{cartCount}</span>}
          </button>
        }
      />

      <div className="mt-1 mb-3">
        <SegmentedTabs<'shop' | 'orders'>
          value={activeTab as 'shop' | 'orders'}
          onChange={(v) => handleTabChange(v)}
          options={[
            { value: 'shop', label: 'Shop' },
            { value: 'orders', label: 'My orders', badge: orders.length ? <span className="text-[11px] opacity-70">{orders.length}</span> : undefined },
          ]}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-60 rounded-2xl bg-slate-200/70 animate-pulse" />)}
        </div>
      ) : activeTab === 'shop' ? (
        <div>
          {/* Search + sort (sticky like Blinkit) */}
          <div className="sticky top-14 z-20 -mx-4 px-4 pt-1 pb-3 bg-[#f3f4f6]/95 backdrop-blur-md space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder='Search "microfiber", "vacuum"…'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="app-input pl-11 pr-10"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-label="Clear search"><X size={16} /></button>
                )}
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="h-12 w-[118px] rounded-xl border border-slate-200 bg-white pl-3 pr-7 text-[13px] font-semibold text-slate-700"
                aria-label="Sort products"
              >
                <option value="relevance">Relevance</option>
                <option value="price_asc">Price ↑</option>
                <option value="price_desc">Price ↓</option>
                <option value="discount">Discount</option>
              </select>
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
              <button onClick={() => setSelectedCategory('')} className={`app-chip ${!selectedCategory ? 'app-chip-on' : 'app-chip-off'}`}>All <span className="opacity-60 text-[11px]">{products.length}</span></button>
              {availableCategories.map((cat) => (
                <button key={cat} onClick={() => setSelectedCategory(cat)} className={`app-chip ${selectedCategory === cat ? 'app-chip-on' : 'app-chip-off'}`}>
                  {cat} <span className="opacity-60 text-[11px]">{products.filter((p) => p.category === cat).length}</span>
                </button>
              ))}
              <button onClick={() => setInStockOnly((v) => !v)} className={`app-chip ${inStockOnly ? 'app-chip-on' : 'app-chip-off'}`}>In stock</button>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="app-card px-6 py-10 text-center">
              <ShoppingBag size={36} className="mx-auto text-slate-300" />
              <p className="font-display font-bold mt-3">No accessories match</p>
              <p className="text-sm text-slate-500 mt-1">Try another category or search word.</p>
              <button onClick={() => { setSearchTerm(''); setSelectedCategory(''); setInStockOnly(false); }} className="app-btn-outline mt-4 px-5">Clear filters</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredProducts.map((product, idx) => {
                const qty = qtyInCart(product.dbId);
                const offPct = product.mrp > product.price ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : 0;
                return (
                  <div key={product.dbId || idx} className="app-card p-2.5 flex flex-col">
                    <button onClick={() => setSelectedProduct(product)} className="relative aspect-square rounded-xl bg-white border border-slate-100 overflow-hidden">
                      {product.image ? (
                        <img src={product.image} alt={product.displayName} loading="lazy" className="h-full w-full object-contain p-1.5" />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-slate-300"><ShoppingBag size={32} /></span>
                      )}
                      {!product.inStock && (
                        <span className="absolute inset-x-2 bottom-2 rounded-lg bg-white/95 text-[11px] font-bold text-slate-500 py-1">Out of stock</span>
                      )}
                    </button>
                    <div className="relative -mt-5 flex justify-end pr-1">
                      {qty > 0 ? (
                        <div className="h-9 flex items-center rounded-xl bg-[#D32F2F] text-white shadow-app">
                          <button onClick={() => useCartStore.getState().updateProductQty(product.dbId, qty - 1)} className="w-8 h-9 font-bold text-lg" aria-label="Decrease">−</button>
                          <span className="w-5 text-center text-sm font-bold">{qty}</span>
                          <button onClick={() => addToCart(product)} className="w-8 h-9 font-bold text-lg" aria-label="Increase">+</button>
                        </div>
                      ) : (
                        <button
                          disabled={!product.inStock}
                          onClick={() => addToCart(product)}
                          className="h-9 px-5 rounded-xl border-2 border-[#D32F2F] bg-white text-[#D32F2F] text-sm font-extrabold shadow-app disabled:border-slate-200 disabled:text-slate-300"
                        >
                          ADD
                        </button>
                      )}
                    </div>
                    <button onClick={() => setSelectedProduct(product)} className="text-left mt-1.5 flex-1 flex flex-col">
                      {offPct > 0 && <span className="text-[11px] font-extrabold text-emerald-600">{offPct}% OFF</span>}
                      <span className="text-[13px] font-semibold text-slate-900 leading-snug line-clamp-2 min-h-[34px]">{product.displayName}</span>
                      <span className="mt-auto pt-1 flex items-baseline gap-1.5">
                        <span className="font-display font-extrabold text-slate-900">₹{Number(product.price).toLocaleString('en-IN')}</span>
                        {product.mrp > product.price && <span className="text-xs text-slate-400 line-through">₹{Number(product.mrp).toLocaleString('en-IN')}</span>}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Orders Tab */
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center space-y-3">
              <ShoppingBag size={48} className="mx-auto text-gray-300" />
              <h3 className="font-bold text-gray-800 text-base">No orders placed yet</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Explore our premium accessories store tab to upgrade your car with original detailing cloths, seat covers, and damping sheets.
              </p>
              <button
                onClick={() => handleTabChange('shop')}
                className="px-5 py-2.5 bg-[#111111] hover:bg-[#D32F2F] text-white text-xs font-bold rounded-xl transition-colors"
              >
                Go to Shop
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {orders.map((order) => {
                let cartItems: any[] = [];
                if (order.items_json) {
                  try {
                    cartItems = typeof order.items_json === 'string' ? JSON.parse(order.items_json) : order.items_json;
                  } catch {
                    cartItems = [];
                  }
                }

                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:border-gray-200 transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center border border-red-100 shrink-0 shadow-sm">
                        <ShoppingBag size={22} />
                      </div>
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-extrabold text-gray-900 text-sm">
                            {cartItems.length > 1
                              ? `Cart Order (${cartItems.length} items)`
                              : cartItems.length === 1
                              ? cartItems[0].product_name
                              : order.product_name}
                          </h4>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              order.payment_status === 'completed'
                                ? 'bg-green-50 text-green-700 border border-green-200'
                                : order.payment_status === 'pending'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                          >
                            {order.payment_status === 'completed'
                              ? 'Paid & Approved'
                              : order.payment_status === 'pending'
                              ? 'Pending Verification / Awaiting Approval'
                              : 'Failed'}
                          </span>
                        </div>

                        {/* Cart Items List */}
                        {cartItems.length > 0 ? (
                          <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100 space-y-1.5 text-xs text-gray-700">
                            {cartItems.map((item: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-gray-800">• {item.product_name}</span>
                                <div className="flex items-center gap-2 text-[11px]">
                                  <span className="bg-gray-200/80 text-gray-700 font-bold px-1.5 py-0.5 rounded">x{item.quantity}</span>
                                  <span className="font-bold text-gray-900">₹{item.total_price || (item.unit_price * item.quantity)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500">
                            Qty: <strong>{parseInt(order.quantity)}</strong> &bull; Total: <strong>₹{order.total_amount}</strong>
                          </p>
                        )}

                        {order.shipping_address && (
                          <p className="text-[11px] text-blue-600 font-semibold flex items-center gap-1 pt-0.5">
                            <span>📍</span> {order.shipping_address}
                          </p>
                        )}

                        <p className="text-[10px] text-gray-400">
                          Ordered: {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
                        </p>
                      </div>
                    </div>

                    <div className="text-left md:text-right space-y-1 md:self-center shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-gray-100">
                      <div className="text-lg font-black text-gray-900">₹{order.total_amount}</div>
                      <p className="text-[11px] text-gray-500 font-medium">
                        Payment: <span className="uppercase font-bold text-gray-700">{order.payment_method}</span>
                      </p>
                      {order.payment_method === 'razorpay' && order.razorpay_payment_id && (
                        <p className="text-[10px] text-gray-400 font-mono">
                          Ref: {order.razorpay_payment_id}
                        </p>
                      )}
                      {order.payment_method === 'qr' && order.qr_transaction_id && (
                        <p className="text-[10px] text-gray-400 font-mono">
                          Ref: {order.qr_transaction_id}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Product Detail & Checkout Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl overflow-hidden w-full max-w-4xl shadow-2xl flex flex-col md:flex-row max-h-[90vh]">
            {/* Product Picture Section */}
            <div className="relative md:w-1/2 bg-white border-b border-gray-100 flex flex-col justify-between min-h-[300px]">
              <div className="flex-1 flex items-center justify-center p-2">
                <img
                  src={selectedProduct.image || 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?w=500&q=80'}
                  alt={selectedProduct.displayName}
                  className="w-full h-[280px] object-contain rounded-xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?w=500&q=80';
                  }}
                />
              </div>
              {selectedProduct.images && selectedProduct.images.length > 1 && (
                <div className="p-3 bg-gray-50 flex items-center gap-2 overflow-x-auto justify-center">
                  {selectedProduct.images.map((img: string, idx: number) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedProduct((prev: any) => ({ ...prev, image: img }))}
                      className={`w-12 h-12 rounded-lg border-2 overflow-hidden shrink-0 transition-all ${
                        selectedProduct.image === img ? 'border-red-500 scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-4 left-4 p-2 rounded-full bg-black/50 hover:bg-black text-white transition-colors md:hidden"
              >
                <X size={18} />
              </button>
            </div>

            {/* Product Details Section */}
            <div className="md:w-1/2 p-6 overflow-y-auto flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-black text-gray-900 leading-tight">
                      {selectedProduct.displayName}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center text-amber-500 gap-0.5">
                        <Star size={14} fill="currentColor" />
                        <span className="text-xs font-bold text-gray-700">{selectedProduct.rating}</span>
                      </div>
                      <span className="text-xs text-gray-400">({selectedProduct.reviewsCount} Reviews)</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors hidden md:block"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="flex items-baseline gap-2.5">
                  <span className="text-2xl font-black text-gray-900">₹{selectedProduct.dbPrice}</span>
                  <span className="text-sm text-gray-400 line-through">₹{selectedProduct.mrp}</span>
                  <span className="bg-red-50 text-red-600 text-xs font-extrabold px-2 py-0.5 rounded-md">
                    {selectedProduct.discount}
                  </span>
                </div>

                <p className="text-xs text-gray-600 leading-relaxed">
                  {selectedProduct.description}
                </p>

                {/* Specs / Details */}
                <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                  <h4 className="text-[10px] uppercase font-black text-gray-400 tracking-wider">Product Specs</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(selectedProduct.specs).map(([key, val]: any) => (
                      <div key={key}>
                        <span className="text-gray-400">{key}:</span>{' '}
                        <strong className="text-gray-800">{val}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Features list */}
                <div className="space-y-1.5">
                  {selectedProduct.features.map((feat: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-gray-700">
                      <CheckCircle size={14} className="text-red-600 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                {/* Qty and Payment Mode selectors */}
                <div className="pt-2 grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-black text-gray-400 tracking-wider">Quantity</label>
                    <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden h-10 w-28">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-8 h-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center font-bold text-gray-600 transition-colors"
                      >
                        -
                      </button>
                      <span className="flex-1 text-center font-bold text-sm text-gray-800">{quantity}</span>
                      <button
                        onClick={() => setQuantity(Math.min(selectedProduct.dbQty, quantity + 1))}
                        className="w-8 h-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center font-bold text-gray-600 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-black text-gray-400 tracking-wider">Payment Method</label>
                    <div className="flex rounded-xl overflow-hidden border border-gray-200 h-10">
                      <button
                        onClick={() => setPaymentMode('razorpay')}
                        className={`flex-1 flex items-center justify-center gap-1 text-xs font-bold transition-all ${
                          paymentMode === 'razorpay' ? 'bg-[#111] text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <CreditCard size={14} />
                        Online
                      </button>
                      <button
                        onClick={() => setPaymentMode('qr')}
                        className={`flex-1 flex items-center justify-center gap-1 text-xs font-bold transition-all ${
                          paymentMode === 'qr' ? 'bg-[#111] text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <QrCode size={14} />
                        Scan QR
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block leading-tight">Total Amount</span>
                  <span className="text-xl font-black text-gray-900">₹{selectedProduct.dbPrice * quantity}</span>
                </div>
                <button
                  onClick={handlePurchase}
                  className="px-6 py-3 bg-[#D32F2F] hover:bg-[#af101a] text-white text-sm font-bold rounded-xl transition-all shadow-md flex items-center gap-2"
                >
                  Confirm Purchase
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Payment Upload Modal */}
      {qrModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl overflow-hidden w-full max-w-md shadow-2xl p-6 space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-extrabold text-[#1c1b1b] text-lg">Scan & Pay</h3>
                <p className="text-xs text-gray-500">Pay using any UPI app</p>
              </div>
              <button
                onClick={() => setQrModalOpen(false)}
                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* QR Code Image Display */}
            <div className="bg-gray-50 rounded-2xl p-4 flex flex-col items-center justify-center border border-gray-100 space-y-3">
              <img
                src="/qr.jpg"
                alt="UPI QR Code"
                className="w-48 h-48 rounded-xl object-cover shadow-md"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=gkautoherb@okaxis%26pn=GK%20AutoHerb%26am=' + (selectedProduct.dbPrice * quantity);
                }}
              />
              <div className="text-center">
                <span className="text-xs font-bold text-gray-700">Amount to Pay:</span>{' '}
                <span className="text-sm font-black text-[#D32F2F]">₹{selectedProduct.dbPrice * quantity}</span>
              </div>
            </div>

            {/* Transaction ID input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 block">
                Transaction ID / UTR Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter 12-digit UPI Transaction Ref ID"
                value={qrTransactionId}
                onChange={(e) => setQrTransactionId(e.target.value)}
                className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D32F2F] focus:border-transparent font-medium"
              />
              <p className="text-[10px] text-gray-400">
                Submit the Transaction ID from GPay, PhonePe, Paytm or any other UPI App for confirmation.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setQrModalOpen(false)}
                className="flex-1 h-11 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleQrSubmit}
                disabled={submittingQr}
                className="flex-1 h-11 bg-[#D32F2F] hover:bg-[#af101a] text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                {submittingQr ? (
                  <RefreshCw className="animate-spin" size={14} />
                ) : (
                  <>
                    <Check size={14} />
                    Confirm Payment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky cart bar (Blinkit style) */}
      {productsCart.length > 0 && activeTab === 'shop' && (
        <div className="fixed inset-x-0 bottom-[76px] z-40 px-4">
          <button
            onClick={() => setProductsDrawerOpen(true)}
            className="mx-auto max-w-md w-full flex items-center gap-3 rounded-2xl bg-[#1a7f37] px-4 py-3 text-white shadow-app-lg"
          >
            <span className="h-9 w-9 rounded-xl bg-white/15 flex items-center justify-center"><ShoppingBag size={18} /></span>
            <span className="flex-1 text-left">
              <span className="block text-sm font-bold">{cartCount} item{cartCount > 1 ? 's' : ''}</span>
              <span className="block text-xs text-white/80">₹{cartTotal.toLocaleString('en-IN')}</span>
            </span>
            <span className="font-display font-extrabold flex items-center gap-1">View cart <ArrowRight size={16} /></span>
          </button>
        </div>
      )}

      {/* Products Cart Drawer */}
      <ProductsCartDrawer
        isOpen={productsDrawerOpen}
        onClose={() => setProductsDrawerOpen(false)}
        onOrderSuccess={() => loadData()}
      />

      {/* Payment Sandbox Simulation Modal */}
      {sandboxModal && (
        <PaymentSandboxModal
          isOpen={sandboxModal.isOpen}
          onClose={() => setSandboxModal(null)}
          onConfirm={handleConfirmSandboxPayment}
          itemName={sandboxModal.itemName}
          amount={sandboxModal.amount}
          loading={sandboxModal.loading}
        />
      )}
    </div>
  );
}
