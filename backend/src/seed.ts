import bcrypt from "bcryptjs";
import { User } from "./models/User.js";
import { Product } from "./models/Product.js";

const SEED_PRODUCTS = [
  {
    name: "Pollera Santenena Clasica",
    category: "pollera" as const,
    description: "Pollera de gala santenena con labores de punto de cruz y mundillo. Incluye enaguas completas.",
    rental_price: 250,
    stock: 2,
    size: "M",
    images: ["https://picsum.photos/seed/pollera1/600/800", "https://picsum.photos/seed/pollera1b/600/800"],
  },
  {
    name: "Pollera Montuna",
    category: "pollera" as const,
    description: "Pollera montuna con estampados tradicionales y colores vibrantes. Ideal para desfiles.",
    rental_price: 150,
    stock: 3,
    size: "S",
    images: ["https://picsum.photos/seed/pollera2/600/800"],
  },
  {
    name: "Pollera de Gala Completa",
    category: "pollera" as const,
    description: "Set premium de pollera de gala con todos los accesorios incluidos. Tela de hilo fino.",
    rental_price: 400,
    stock: 1,
    size: "L",
    images: ["https://picsum.photos/seed/pollera3/600/800", "https://picsum.photos/seed/pollera3b/600/800"],
  },
  {
    name: "Cotona y Pantalon Masculino",
    category: "vestuario_masculino" as const,
    description: "Conjunto masculino tipico: cotona blanca bordada con pantalon negro. Incluye sombrero pintao.",
    rental_price: 120,
    stock: 4,
    size: "L",
    images: ["https://picsum.photos/seed/masc1/600/800"],
  },
  {
    name: "Camisilla y Chacara",
    category: "vestuario_masculino" as const,
    description: "Camisilla bordada con cutarra y chacara de cuero. Vestuario campesino autentico.",
    rental_price: 100,
    stock: 3,
    size: "M",
    images: ["https://picsum.photos/seed/masc2/600/800"],
  },
  {
    name: "Pollera Infantil",
    category: "infantil" as const,
    description: "Pollera montuna para ninas de 4 a 8 anos. Colores alegres y tela resistente.",
    rental_price: 80,
    stock: 5,
    size: "Infantil 4-8",
    images: ["https://picsum.photos/seed/infantil1/600/800"],
  },
  {
    name: "Conjunto Tipico Infantil Masculino",
    category: "infantil" as const,
    description: "Conjunto tipico para ninos. Incluye cotona, pantalon y sombrero pintao miniatura.",
    rental_price: 70,
    stock: 4,
    size: "Infantil 4-8",
    images: ["https://picsum.photos/seed/infantil2/600/800"],
  },
  {
    name: "Juego de Tembleques Blancos",
    category: "tembleques" as const,
    description: "Set completo de tembleques blancos hechos a mano con perlas y cristales. 12 pares.",
    rental_price: 180,
    stock: 3,
    images: ["https://picsum.photos/seed/tembleques1/600/800", "https://picsum.photos/seed/tembleques1b/600/800"],
  },
  {
    name: "Tembleques de Colores",
    category: "tembleques" as const,
    description: "Set de tembleques multicolor para pollera montuna. Diseno artesanal unico.",
    rental_price: 120,
    stock: 4,
    images: ["https://picsum.photos/seed/tembleques2/600/800"],
  },
  {
    name: "Peinetas y Pajuela de Oro",
    category: "accesorios" as const,
    description: "Par de peinetas doradas con pajuela tradicional. Replicas de calidad museo.",
    rental_price: 90,
    stock: 6,
    images: ["https://picsum.photos/seed/acc1/600/800"],
  },
  {
    name: "Cadena Chata y Mosqueta",
    category: "accesorios" as const,
    description: "Cadena chata tradicional con mosqueta de oro. Joyeria tipica para pollera de gala.",
    rental_price: 110,
    stock: 3,
    images: ["https://picsum.photos/seed/acc2/600/800"],
  },
  {
    name: "Paquete Completo Pollera de Gala",
    category: "paquete_completo" as const,
    description: "Todo incluido: pollera de gala, tembleques, peinetas, cadena, mosqueta y zapatos. El set definitivo.",
    rental_price: 600,
    stock: 1,
    size: "M",
    images: ["https://picsum.photos/seed/paquete1/600/800", "https://picsum.photos/seed/paquete1b/600/800"],
  },
];

export async function seedDatabase() {
  try {
    // Seed admin user
    const adminExists = await User.findOne({ email: "admin@tembleques.com" });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash("admin123", 12);
      await User.create({
        name: "Camila Admin",
        email: "admin@tembleques.com",
        password: hashedPassword,
        role: "admin",
        phone: "+507-6000-0000",
      });
      console.log("[Seed] Admin user created: admin@tembleques.com / admin123");
    }

    // Seed demo client
    const clientExists = await User.findOne({ email: "cliente@demo.com" });
    if (!clientExists) {
      const hashedPassword = await bcrypt.hash("demo123", 12);
      await User.create({
        name: "Maria Demo",
        email: "cliente@demo.com",
        password: hashedPassword,
        role: "client",
        phone: "+507-6111-1111",
      });
      console.log("[Seed] Demo client created: cliente@demo.com / demo123");
    }

    // Seed products
    const productCount = await Product.countDocuments();
    if (productCount === 0) {
      await Product.insertMany(
        SEED_PRODUCTS.map((p) => ({
          ...p,
          condition_status: "disponible",
        }))
      );
      console.log(`[Seed] ${SEED_PRODUCTS.length} products created`);
    }

    console.log("[Seed] Database seeding complete");
  } catch (error) {
    console.error("[Seed] Error seeding database:", error);
  }
}
