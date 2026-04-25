import { Product } from "./models/Product.js";

const SEED_PRODUCTS = [
  {
    name: "Pollera Santeñena Clásica",
    category: "pollera" as const,
    description: "Pollera de gala santeñena con labores de punto de cruz y mundillo. Incluye enaguas completas.",
    rental_price: 250,
    variants: [
      { size: "S", stock: 1, in_maintenance: false },
      { size: "M", stock: 2, in_maintenance: false },
      { size: "L", stock: 1, in_maintenance: false },
    ],
    images: ["https://picsum.photos/seed/pollera1/600/800", "https://picsum.photos/seed/pollera1b/600/800"],
  },
  {
    name: "Pollera Montuna",
    category: "pollera" as const,
    description: "Pollera montuna con estampados tradicionales y colores vibrantes. Ideal para desfiles.",
    rental_price: 150,
    variants: [
      { size: "S", stock: 2, in_maintenance: false },
      { size: "M", stock: 1, in_maintenance: false },
    ],
    images: ["https://picsum.photos/seed/pollera2/600/800"],
  },
  {
    name: "Pollera de Gala Completa",
    category: "pollera" as const,
    description: "Set premium de pollera de gala con todos los accesorios incluidos. Tela de hilo fino.",
    rental_price: 400,
    variants: [
      { size: "M", stock: 1, in_maintenance: false },
      { size: "L", stock: 1, price_override: 450, in_maintenance: false },
    ],
    images: ["https://picsum.photos/seed/pollera3/600/800", "https://picsum.photos/seed/pollera3b/600/800"],
  },
  {
    name: "Cotona y Pantalón Masculino",
    category: "vestuario_masculino" as const,
    description: "Conjunto masculino típico: cotona blanca bordada con pantalón negro. Incluye sombrero pintao.",
    rental_price: 120,
    variants: [
      { size: "M", stock: 2, in_maintenance: false },
      { size: "L", stock: 2, in_maintenance: false },
      { size: "XL", stock: 1, in_maintenance: false },
    ],
    images: ["https://picsum.photos/seed/masc1/600/800"],
  },
  {
    name: "Camisilla y Chácara",
    category: "vestuario_masculino" as const,
    description: "Camisilla bordada con cutarra y chácara de cuero. Vestuario campesino auténtico.",
    rental_price: 100,
    variants: [
      { size: "S", stock: 1, in_maintenance: false },
      { size: "M", stock: 1, in_maintenance: false },
      { size: "L", stock: 1, in_maintenance: false },
    ],
    images: ["https://picsum.photos/seed/masc2/600/800"],
  },
  {
    name: "Pollera Infantil",
    category: "infantil" as const,
    description: "Pollera montuna para niñas de 4 a 8 años. Colores alegres y tela resistente.",
    rental_price: 80,
    variants: [
      { size: "2-4", stock: 2, in_maintenance: false },
      { size: "4-6", stock: 2, in_maintenance: false },
      { size: "6-8", stock: 1, in_maintenance: false },
    ],
    images: ["https://picsum.photos/seed/infantil1/600/800"],
  },
  {
    name: "Conjunto Típico Infantil Masculino",
    category: "infantil" as const,
    description: "Conjunto típico para niños. Incluye cotona, pantalón y sombrero pintao miniatura.",
    rental_price: 70,
    variants: [
      { size: "4-6", stock: 2, in_maintenance: false },
      { size: "6-8", stock: 1, in_maintenance: false },
      { size: "8-10", stock: 1, in_maintenance: false },
    ],
    images: ["https://picsum.photos/seed/infantil2/600/800"],
  },
  {
    name: "Juego de Tembleques Blancos",
    category: "tembleques" as const,
    description: "Set completo de tembleques blancos hechos a mano con perlas y cristales. 12 pares.",
    rental_price: 180,
    variants: [
      { size: "Único", stock: 3, in_maintenance: false },
    ],
    images: ["https://picsum.photos/seed/tembleques1/600/800", "https://picsum.photos/seed/tembleques1b/600/800"],
  },
  {
    name: "Tembleques de Colores",
    category: "tembleques" as const,
    description: "Set de tembleques multicolor para pollera montuna. Diseño artesanal único.",
    rental_price: 120,
    variants: [
      { size: "Único", stock: 4, in_maintenance: false },
    ],
    images: ["https://picsum.photos/seed/tembleques2/600/800"],
  },
  {
    name: "Peinetas y Pajuela de Oro",
    category: "accesorios" as const,
    description: "Par de peinetas doradas con pajuela tradicional. Réplicas de calidad museo.",
    rental_price: 90,
    variants: [
      { size: "Único", stock: 6, in_maintenance: false },
    ],
    images: ["https://picsum.photos/seed/acc1/600/800"],
  },
  {
    name: "Cadena Chata y Mosqueta",
    category: "accesorios" as const,
    description: "Cadena chata tradicional con mosqueta de oro. Joyería típica para pollera de gala.",
    rental_price: 110,
    variants: [
      { size: "Único", stock: 3, in_maintenance: false },
    ],
    images: ["https://picsum.photos/seed/acc2/600/800"],
  },
  {
    name: "Paquete Completo Pollera de Gala",
    category: "paquete_completo" as const,
    description: "Todo incluido: pollera de gala, tembleques, peinetas, cadena, mosqueta y zapatos. El set definitivo.",
    rental_price: 600,
    variants: [
      { size: "S", stock: 1, price_override: 550, in_maintenance: false },
      { size: "M", stock: 1, in_maintenance: false },
      { size: "L", stock: 1, price_override: 650, in_maintenance: false },
    ],
    images: ["https://picsum.photos/seed/paquete1/600/800", "https://picsum.photos/seed/paquete1b/600/800"],
  },
];

export async function seedDatabase() {
  try {
    // Users are managed by Clerk — no user seeding needed.
    // To assign admin role: Clerk Dashboard → Users → select user
    //   → Public Metadata → set { "role": "admin" }
    const productCount = await Product.countDocuments();
    if (productCount === 0) {
      await Product.insertMany(SEED_PRODUCTS);
      console.log(`[Seed] ${SEED_PRODUCTS.length} products created`);
    }

    console.log("[Seed] Database seeding complete");
  } catch (error) {
    console.error("[Seed] Error seeding database:", error);
  }
}
