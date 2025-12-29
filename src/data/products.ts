export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: "Audio" | "Wearables" | "Smart Home" | "Accessories";
  badge?: "New" | "Bestseller" | "Limited";
  rating: number;
  reviews: number;
  colors: string[];
  inventory: number;
  accent: string;
};

export const categories: Array<Product["category"]> = [
  "Audio",
  "Wearables",
  "Smart Home",
  "Accessories",
];

export const products: Product[] = [
  {
    id: "aurora-headphones",
    name: "Aurora NC Headphones",
    description:
      "Wireless noise-cancelling over-ears with adaptive transparency and 36-hour battery life.",
    price: 349,
    category: "Audio",
    badge: "Bestseller",
    rating: 4.8,
    reviews: 2145,
    colors: ["slate", "ivory", "copper"],
    inventory: 42,
    accent: "linear-gradient(135deg, #1f2937, #0ea5e9)",
  },
  {
    id: "pulse-buds",
    name: "Pulse Mini Buds",
    description:
      "Pocket-size earbuds with spatial audio, sweat resistance, and wireless charging.",
    price: 179,
    category: "Audio",
    badge: "New",
    rating: 4.6,
    reviews: 987,
    colors: ["graphite", "frost"],
    inventory: 64,
    accent: "linear-gradient(135deg, #111827, #6366f1)",
  },
  {
    id: "halo-watch",
    name: "Halo Smartwatch",
    description:
      "AMOLED display, week-long battery, and advanced health tracking with guided workouts.",
    price: 299,
    category: "Wearables",
    badge: "Limited",
    rating: 4.7,
    reviews: 1634,
    colors: ["midnight", "sand", "sage"],
    inventory: 28,
    accent: "linear-gradient(145deg, #0f172a, #22d3ee)",
  },
  {
    id: "stride-tracker",
    name: "Stride Fitness Band",
    description:
      "Lightweight tracker with GPS, sleep insights, and on-wrist coaching.",
    price: 149,
    category: "Wearables",
    rating: 4.5,
    reviews: 842,
    colors: ["charcoal", "ocean"],
    inventory: 51,
    accent: "linear-gradient(145deg, #0b132b, #3a86ff)",
  },
  {
    id: "lumen-lamp",
    name: "Lumen Smart Lamp",
    description:
      "Tunable LED lamp with motion automation, sunrise alarm, and Matter support.",
    price: 129,
    category: "Smart Home",
    badge: "Bestseller",
    rating: 4.9,
    reviews: 2195,
    colors: ["alpine", "amber"],
    inventory: 73,
    accent: "linear-gradient(130deg, #111827, #fbbf24)",
  },
  {
    id: "haven-camera",
    name: "Haven 4K Camera",
    description:
      "Secure indoor camera with HDR, two-way audio, and private local storage.",
    price: 199,
    category: "Smart Home",
    rating: 4.4,
    reviews: 678,
    colors: ["white", "stone"],
    inventory: 35,
    accent: "linear-gradient(135deg, #0f172a, #7dd3fc)",
  },
  {
    id: "flux-charger",
    name: "Flux 3-in-1 Charger",
    description:
      "Magnetic stand that powers phone, earbuds, and watch simultaneously.",
    price: 119,
    category: "Accessories",
    badge: "New",
    rating: 4.3,
    reviews: 512,
    colors: ["matte black", "silver"],
    inventory: 88,
    accent: "linear-gradient(150deg, #1f2937, #a855f7)",
  },
  {
    id: "arc-case",
    name: "Arc Impact Case",
    description:
      "Slim shock-absorbing phone case with microfiber lining and lanyard loop.",
    price: 49,
    category: "Accessories",
    rating: 4.2,
    reviews: 431,
    colors: ["mist", "ink", "citrus"],
    inventory: 120,
    accent: "linear-gradient(150deg, #0f172a, #34d399)",
  },
];

export const featured = products.slice(0, 3);
