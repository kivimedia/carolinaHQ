export interface ProductSize {
  name: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  image: string;
  sizes: ProductSize[];
  basePrice: number;
  frequency: number;
  conversionRate: number;
  colorPresets: string[];
}

export interface LineItem {
  id: string;
  product: Product;
  selectedSize: string;
  selectedColor: string;
  quantity: number;
  unitPrice: number;
  notes: string;
}

export interface ProposalData {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  eventType: string;
  eventDate: string;
  venue: string;
  guests: string;
  colorTheme: string;
  notes: string;
  lineItems: LineItem[];
  personalNote: string;
}

export const EVENT_TYPES = [
  "Birthday",
  "Corporate Event",
  "Wedding",
  "Baby Shower",
  "Graduation",
  "Sweet 16",
  "Grand Opening",
  "Gender Reveal",
  "Photo Shoot",
  "Fundraiser",
  "Anniversary",
  "Prom",
  "Holiday Party",
  "Other",
];

export const PRODUCTS: Product[] = [
  {
    id: "arch-standard",
    name: "Balloon Arch",
    category: "Arches",
    description: "A stunning organic-style arch that frames your event space beautifully. Perfect as a photo backdrop or entrance feature.",
    image: "/images/products/balloon-arch.jpg",
    sizes: [
      { name: "Small (4-5ft)", price: 250 },
      { name: "Standard (8ft)", price: 450 },
      { name: "Large (10ft)", price: 600 },
      { name: "Half Arch", price: 300 },
    ],
    basePrice: 450,
    frequency: 47,
    conversionRate: 18,
    colorPresets: ["Pastel Pink", "Navy & Gold", "Classic White", "Rainbow", "Custom"],
  },
  {
    id: "marquee-letters",
    name: "Marquee Letters",
    category: "Marquee",
    description: "Light-up marquee letters and numbers that make a bold statement. Perfect for milestone birthdays and photo ops.",
    image: "/images/products/marquee-letters.jpg",
    sizes: [
      { name: "3ft Letters", price: 150 },
      { name: "4ft Letters", price: 200 },
      { name: "4ft Numbers", price: 200 },
    ],
    basePrice: 200,
    frequency: 48,
    conversionRate: 22,
    colorPresets: ["Warm White", "Cool White"],
  },
  {
    id: "balloon-garland",
    name: "Balloon Garland",
    category: "Garlands",
    description: "A flowing garland arrangement that adds organic beauty to any space. Drapes beautifully along walls, tables, or railings.",
    image: "/images/products/balloon-garland.jpg",
    sizes: [
      { name: "6ft Garland", price: 200 },
      { name: "10ft Garland", price: 350 },
      { name: "15ft Garland", price: 500 },
    ],
    basePrice: 350,
    frequency: 7,
    conversionRate: 15,
    colorPresets: ["Sage & Blush", "Dusty Rose", "Tropical", "Elegant Neutrals", "Custom"],
  },
  {
    id: "balloon-wall",
    name: "Balloon Wall",
    category: "Walls & Backdrops",
    description: "A full balloon wall backdrop that creates the ultimate photo opportunity. Makes every guest feel like a VIP.",
    image: "/images/products/balloon-wall.jpg",
    sizes: [
      { name: "5x3ft Wall", price: 350 },
      { name: "7x4ft Wall", price: 500 },
      { name: "8x6ft Wall", price: 700 },
    ],
    basePrice: 500,
    frequency: 8,
    conversionRate: 12,
    colorPresets: ["Hot Pink & Gold", "Pastel Rainbow", "Monochrome", "Custom"],
  },
  {
    id: "centerpiece",
    name: "Centerpieces",
    category: "Centerpieces",
    description: "Table-level balloon arrangements that elevate your event decor. Available in various styles from classic to modern.",
    image: "/images/products/centerpiece.jpg",
    sizes: [
      { name: "Small (per table)", price: 25 },
      { name: "Standard (per table)", price: 45 },
      { name: "Premium (per table)", price: 65 },
    ],
    basePrice: 45,
    frequency: 8,
    conversionRate: 10,
    colorPresets: ["Match Event Theme", "Classic Elegant", "Fun & Bright", "Custom"],
  },
  {
    id: "columns",
    name: "Balloon Columns",
    category: "Columns",
    description: "Tall, eye-catching balloon columns that create grand entrance ways and define event spaces with architectural elegance.",
    image: "/images/products/columns.jpg",
    sizes: [
      { name: "5ft Column (each)", price: 75 },
      { name: "6ft Column (each)", price: 100 },
      { name: "8ft Column (each)", price: 150 },
    ],
    basePrice: 100,
    frequency: 11,
    conversionRate: 14,
    colorPresets: ["White & Gold", "Event Colors", "Spiral Design", "Custom"],
  },
  {
    id: "bouquets",
    name: "Balloon Bouquets",
    category: "Bouquets",
    description: "Classic helium balloon bouquets tied with ribbon. Perfect for table accents, entrances, or gift-giving.",
    image: "/images/products/bouquet.jpg",
    sizes: [
      { name: "3 Balloon Bouquet", price: 20 },
      { name: "5 Balloon Bouquet", price: 30 },
      { name: "7 Balloon Bouquet", price: 45 },
    ],
    basePrice: 30,
    frequency: 9,
    conversionRate: 8,
    colorPresets: ["Birthday Fun", "Elegant Mix", "Custom Colors"],
  },
];

export const CATEGORIES = Array.from(new Set(PRODUCTS.map((p) => p.category)));

export const SAMPLE_PROPOSALS = [
  {
    id: "1",
    clientName: "Sarah Johnson",
    eventType: "Birthday",
    eventDate: "Mar 15, 2026",
    total: 725,
    status: "draft" as const,
    confidence: "no_brainer" as const,
    products: ["10ft Balloon Arch", "Marquee Letters \"16\""],
    createdAt: "2 min ago",
  },
  {
    id: "2",
    clientName: "TechCorp Inc.",
    eventType: "Corporate Event",
    eventDate: "Mar 22, 2026",
    total: 1450,
    status: "sent" as const,
    confidence: "suggested" as const,
    products: ["8ft Arch", "Columns (x4)", "Backdrop"],
    createdAt: "1 hour ago",
  },
  {
    id: "3",
    clientName: "Emily & Marcus",
    eventType: "Wedding",
    eventDate: "Apr 5, 2026",
    total: 2100,
    status: "needs_review" as const,
    confidence: "needs_human" as const,
    products: ["10ft Arch", "Garland (15ft)", "Centerpieces (x10)"],
    createdAt: "3 hours ago",
  },
  {
    id: "4",
    clientName: "Raleigh Dance Academy",
    eventType: "Grand Opening",
    eventDate: "Mar 28, 2026",
    total: 850,
    status: "accepted" as const,
    confidence: "suggested" as const,
    products: ["Large Arch", "Columns (x2)"],
    createdAt: "Yesterday",
  },
  {
    id: "5",
    clientName: "Maria Santos",
    eventType: "Baby Shower",
    eventDate: "Mar 20, 2026",
    total: 525,
    status: "draft" as const,
    confidence: "needs_human" as const,
    products: ["Balloon Wall", "Bouquets (x5)"],
    createdAt: "5 min ago",
  },
];
