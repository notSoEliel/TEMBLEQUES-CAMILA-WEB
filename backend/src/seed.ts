import mongoose from "mongoose";
import { Product } from "./models/Product.js";
import { Rental, type RentalStatus } from "./models/Rental.js";
import { TermsAcceptance } from "./models/TermsAcceptance.js";
import { User } from "./models/User.js";
import { connectDB } from "./db.js";
import { AppError } from "./lib/errors.js";

export type SeedProfile = "ci" | "staging" | "demo";
export type SeedMode = "upsert" | "reset";

export interface SeedOptions {
  profile?: SeedProfile;
  mode?: SeedMode;
}

interface ProductFixture {
  seed_key: string;
  name: string;
  category: string[];
  description: string;
  rental_price: number;
  variants: Array<{
    size: string;
    stock: number;
    price_override?: number;
    in_maintenance: boolean;
  }>;
  images: string[];
  deposit_settings: {
    required: boolean;
    overrideAmount?: number;
  };
}

interface UserFixture {
  clerkId: string;
  name: string;
  email: string;
  role: "client" | "admin";
  phone: string;
  preferredAddress: string;
}

interface RentalFixture {
  fixture_key: string;
  user_clerk_id: string;
  product_seed_key: string;
  selected_size: string;
  start_offset_days: number;
  end_offset_days: number;
  status: RentalStatus;
  payment_status: "pending" | "completed" | "failed" | "refunded";
  payment_type: "reservation" | "full";
  terms_accepted: boolean;
  deposit_required: boolean;
  deposit_status: "not_required" | "pending_hold" | "held" | "released" | "captured" | "failed";
}

const SEED_PRODUCTS: ProductFixture[] = [
  {
    seed_key: "pollera-santenena-clasica",
    name: "Pollera Santeñena Clásica",
    category: ["pollera"],
    description: "Pollera de gala santeñena con labores de punto de cruz y mundillo. Incluye enaguas completas.",
    rental_price: 250,
    variants: [
      { size: "S", stock: 1, in_maintenance: false },
      { size: "M", stock: 2, in_maintenance: false },
      { size: "L", stock: 1, in_maintenance: false },
    ],
    images: ["https://picsum.photos/seed/pollera1/600/800", "https://picsum.photos/seed/pollera1b/600/800"],
    deposit_settings: { required: true },
  },
  {
    seed_key: "pollera-montuna",
    name: "Pollera Montuna",
    category: ["pollera"],
    description: "Pollera montuna con estampados tradicionales y colores vibrantes. Ideal para desfiles.",
    rental_price: 150,
    variants: [
      { size: "S", stock: 2, in_maintenance: false },
      { size: "M", stock: 1, in_maintenance: false },
    ],
    images: ["https://picsum.photos/seed/pollera2/600/800"],
    deposit_settings: { required: true },
  },
  {
    seed_key: "pollera-gala-completa",
    name: "Pollera de Gala Completa",
    category: ["pollera"],
    description: "Set premium de pollera de gala con todos los accesorios incluidos. Tela de hilo fino.",
    rental_price: 400,
    variants: [
      { size: "M", stock: 1, in_maintenance: false },
      { size: "L", stock: 1, price_override: 450, in_maintenance: false },
    ],
    images: ["https://picsum.photos/seed/pollera3/600/800", "https://picsum.photos/seed/pollera3b/600/800"],
    deposit_settings: { required: true },
  },
  {
    seed_key: "cotona-pantalon-masculino",
    name: "Cotona y Pantalón Masculino",
    category: ["vestuario_masculino"],
    description: "Conjunto masculino típico: cotona blanca bordada con pantalón negro. Incluye sombrero pintao.",
    rental_price: 120,
    variants: [
      { size: "M", stock: 2, in_maintenance: false },
      { size: "L", stock: 2, in_maintenance: false },
      { size: "XL", stock: 1, in_maintenance: false },
    ],
    images: ["https://picsum.photos/seed/masc1/600/800"],
    deposit_settings: { required: true },
  },
  {
    seed_key: "camisilla-chacara",
    name: "Camisilla y Chácara",
    category: ["vestuario_masculino"],
    description: "Camisilla bordada con cutarra y chácara de cuero. Vestuario campesino auténtico.",
    rental_price: 100,
    variants: [
      { size: "S", stock: 1, in_maintenance: false },
      { size: "M", stock: 1, in_maintenance: false },
      { size: "L", stock: 1, in_maintenance: false },
    ],
    images: ["https://picsum.photos/seed/masc2/600/800"],
    deposit_settings: { required: true },
  },
  {
    seed_key: "pollera-infantil",
    name: "Pollera Infantil",
    category: ["infantil"],
    description: "Pollera montuna para niñas de 4 a 8 años. Colores alegres y tela resistente.",
    rental_price: 80,
    variants: [
      { size: "2-4", stock: 2, in_maintenance: false },
      { size: "4-6", stock: 2, in_maintenance: false },
      { size: "6-8", stock: 1, in_maintenance: false },
    ],
    images: ["https://picsum.photos/seed/infantil1/600/800"],
    deposit_settings: { required: true },
  },
  {
    seed_key: "conjunto-infantil-masculino",
    name: "Conjunto Típico Infantil Masculino",
    category: ["infantil"],
    description: "Conjunto típico para niños. Incluye cotona, pantalón y sombrero pintao miniatura.",
    rental_price: 70,
    variants: [
      { size: "4-6", stock: 2, in_maintenance: false },
      { size: "6-8", stock: 1, in_maintenance: false },
      { size: "8-10", stock: 1, in_maintenance: false },
    ],
    images: ["https://picsum.photos/seed/infantil2/600/800"],
    deposit_settings: { required: true },
  },
  {
    seed_key: "tembleques-blancos",
    name: "Juego de Tembleques Blancos",
    category: ["tembleques"],
    description: "Set completo de tembleques blancos hechos a mano con perlas y cristales. 12 pares.",
    rental_price: 180,
    variants: [{ size: "Único", stock: 3, in_maintenance: false }],
    images: ["https://picsum.photos/seed/tembleques1/600/800", "https://picsum.photos/seed/tembleques1b/600/800"],
    deposit_settings: { required: true },
  },
  {
    seed_key: "tembleques-colores",
    name: "Tembleques de Colores",
    category: ["tembleques"],
    description: "Set de tembleques multicolor para pollera montuna. Diseño artesanal único.",
    rental_price: 120,
    variants: [{ size: "Único", stock: 4, in_maintenance: false }],
    images: ["https://picsum.photos/seed/tembleques2/600/800"],
    deposit_settings: { required: true },
  },
  {
    seed_key: "peinetas-pajuela-oro",
    name: "Peinetas y Pajuela de Oro",
    category: ["accesorios"],
    description: "Par de peinetas doradas con pajuela tradicional. Réplicas de calidad museo.",
    rental_price: 90,
    variants: [{ size: "Único", stock: 6, in_maintenance: false }],
    images: ["https://picsum.photos/seed/acc1/600/800"],
    deposit_settings: { required: true },
  },
  {
    seed_key: "cadena-chata-mosqueta",
    name: "Cadena Chata y Mosqueta",
    category: ["accesorios"],
    description: "Cadena chata tradicional con mosqueta de oro. Joyería típica para pollera de gala.",
    rental_price: 110,
    variants: [{ size: "Único", stock: 3, in_maintenance: false }],
    images: ["https://picsum.photos/seed/acc2/600/800"],
    deposit_settings: { required: true },
  },
  {
    seed_key: "paquete-pollera-gala",
    name: "Paquete Completo Pollera de Gala",
    category: ["paquete_completo"],
    description: "Todo incluido: pollera de gala, tembleques, peinetas, cadena, mosqueta y zapatos. El set definitivo.",
    rental_price: 600,
    variants: [
      { size: "S", stock: 1, price_override: 550, in_maintenance: false },
      { size: "M", stock: 1, in_maintenance: false },
      { size: "L", stock: 1, price_override: 650, in_maintenance: false },
    ],
    images: ["https://picsum.photos/seed/paquete1/600/800", "https://picsum.photos/seed/paquete1b/600/800"],
    deposit_settings: { required: true },
  },
];

const SEED_USERS: UserFixture[] = [
  {
    clerkId: "seed_staging_client",
    name: "Cliente de demostración",
    email: "cliente.seed@example.invalid",
    role: "client",
    phone: "+507 6000-0001",
    preferredAddress: "Ciudad de Panamá",
  },
  {
    clerkId: "seed_staging_admin",
    name: "Administrador de demostración",
    email: "admin.seed@example.invalid",
    role: "admin",
    phone: "+507 6000-0002",
    preferredAddress: "Ciudad de Panamá",
  },
];

const SEED_RENTALS: RentalFixture[] = [
  {
    fixture_key: "staging-pending-rental",
    user_clerk_id: "seed_staging_client",
    product_seed_key: "pollera-santenena-clasica",
    selected_size: "M",
    start_offset_days: 7,
    end_offset_days: 9,
    status: "pending",
    payment_status: "pending",
    payment_type: "reservation",
    terms_accepted: true,
    deposit_required: true,
    deposit_status: "pending_hold",
  },
  {
    fixture_key: "staging-reserved-rental",
    user_clerk_id: "seed_staging_client",
    product_seed_key: "pollera-montuna",
    selected_size: "M",
    start_offset_days: 14,
    end_offset_days: 16,
    status: "reserved",
    payment_status: "completed",
    payment_type: "reservation",
    terms_accepted: true,
    deposit_required: true,
    deposit_status: "held",
  },
  {
    fixture_key: "staging-returned-rental",
    user_clerk_id: "seed_staging_client",
    product_seed_key: "tembleques-blancos",
    selected_size: "Único",
    start_offset_days: -10,
    end_offset_days: -8,
    status: "returned",
    payment_status: "completed",
    payment_type: "full",
    terms_accepted: true,
    deposit_required: true,
    deposit_status: "released",
  },
];

function getProfile(value: string | undefined): SeedProfile {
  if (value === "ci" || value === "staging" || value === "demo") return value;
  return "ci";
}

function getMode(value: string | undefined): SeedMode {
  return value === "reset" ? "reset" : "upsert";
}

function getPrune(value: string | undefined): boolean {
  return value === "true";
}

function dateFromOffset(offsetDays: number): Date {
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date;
}

async function migrateLegacyProductKey(fixture: ProductFixture): Promise<void> {
  const legacy = await Product.findOne({
    name: fixture.name,
    seed_key: { $exists: false },
  }).select("_id");

  if (legacy) {
    await Product.updateOne({ _id: legacy._id }, { $set: { seed_key: fixture.seed_key } });
  }
}

async function seedProducts(): Promise<Map<string, string>> {
  const productIds = new Map<string, string>();

  for (const fixture of SEED_PRODUCTS) {
    await migrateLegacyProductKey(fixture);
    const product = await Product.findOneAndUpdate(
      { seed_key: fixture.seed_key },
      { $set: fixture },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).select("_id seed_key");

    if (!product) {
      throw new AppError(`No se pudo sembrar el producto ${fixture.seed_key}.`, 500, "SEED_PRODUCT_FAILED");
    }

    productIds.set(fixture.seed_key, product._id.toString());
  }

  return productIds;
}

async function seedUsers(): Promise<Map<string, string>> {
  const userIds = new Map<string, string>();

  for (const fixture of SEED_USERS) {
    const user = await User.findOneAndUpdate(
      { clerkId: fixture.clerkId },
      { $set: fixture },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).select("_id clerkId");

    if (!user) {
      throw new AppError(`No se pudo sembrar el usuario ${fixture.clerkId}.`, 500, "SEED_USER_FAILED");
    }

    userIds.set(fixture.clerkId, user._id.toString());
  }

  return userIds;
}

async function seedRentals(productIds: Map<string, string>, userIds: Map<string, string>): Promise<void> {
  for (const fixture of SEED_RENTALS) {
    const productId = productIds.get(fixture.product_seed_key);
    const userId = userIds.get(fixture.user_clerk_id);

    if (!productId || !userId) {
      throw new AppError(`La reserva semilla ${fixture.fixture_key} referencia datos inexistentes.`, 500, "SEED_REFERENCE_NOT_FOUND");
    }

    const startDate = dateFromOffset(fixture.start_offset_days);
    const endDate = dateFromOffset(fixture.end_offset_days);
    const orderGroupId = `seed-order-${fixture.fixture_key}`;
    const product = await Product.findById(productId).select("rental_price variants deposit_settings");
    const selectedVariant = product?.variants.find((variant) => variant.size === fixture.selected_size);
    const dailyPrice = selectedVariant?.price_override ?? product?.rental_price ?? 0;
    const rentalDays = Math.max(fixture.end_offset_days - fixture.start_offset_days, 1);
    const total = dailyPrice * rentalDays * 1.07;

    const rental = await Rental.findOneAndUpdate(
      { fixture_key: fixture.fixture_key },
      {
        $set: {
          fixture_key: fixture.fixture_key,
          user_id: userId,
          product_id: productId,
          order_group_id: orderGroupId,
          selected_size: fixture.selected_size,
          start_date: startDate,
          end_date: endDate,
          total,
          balance_due: fixture.payment_type === "full" ? 0 : total * 0.75,
          payment_type: fixture.payment_type,
          status: fixture.status,
          payment_status: fixture.payment_status,
          terms_accepted: fixture.terms_accepted,
          deposit_required: fixture.deposit_required,
          deposit_amount: fixture.deposit_required ? total * 0.25 : 0,
          deposit_status: fixture.deposit_status,
          late_days: 0,
          late_fee_amount: 0,
          late_fee_status: "not_applicable",
          status_history: [{ status: fixture.status, timestamp: new Date(), notes: "Estado semilla de demostración." }],
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    if (!rental) {
      throw new AppError(`No se pudo sembrar la reserva ${fixture.fixture_key}.`, 500, "SEED_RENTAL_FAILED");
    }

    if (fixture.terms_accepted) {
      await TermsAcceptance.findOneAndUpdate(
        { rental_id: rental._id },
        {
          $set: {
            user_id: userId,
            accepted_at: new Date(),
            ip_address: "127.0.0.1",
            user_agent: "tembleques-seed/1.0",
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    }
  }
}

async function resetSeedNamespace(): Promise<void> {
  const seedRentals = await Rental.find({ fixture_key: { $exists: true } }).select("_id");
  const rentalIds = seedRentals.map((rental) => rental._id);

  await Promise.all([
    Product.deleteMany({ seed_key: { $exists: true } }),
    Rental.deleteMany({ fixture_key: { $exists: true } }),
    User.deleteMany({ clerkId: { $regex: /^seed_/ } }),
    TermsAcceptance.deleteMany({ rental_id: { $in: rentalIds } }),
  ]);
}

async function pruneSeedNamespace(profile: SeedProfile): Promise<void> {
  const productKeys = SEED_PRODUCTS.map((fixture) => fixture.seed_key);
  const rentalKeys = SEED_RENTALS.map((fixture) => fixture.fixture_key);
  const userKeys = profile === "staging" || profile === "demo"
    ? SEED_USERS.map((fixture) => fixture.clerkId)
    : [];

  const staleRentals = await Rental.find({
    fixture_key: { $exists: true, $nin: rentalKeys },
  }).select("_id");
  const staleRentalIds = staleRentals.map((rental) => rental._id);

  await Promise.all([
    Product.deleteMany({ seed_key: { $exists: true, $nin: productKeys } }),
    Rental.deleteMany({ fixture_key: { $exists: true, $nin: rentalKeys } }),
    User.deleteMany({ clerkId: { $regex: /^seed_/, $nin: userKeys } }),
    TermsAcceptance.deleteMany({ rental_id: { $in: staleRentalIds } }),
  ]);
}

export async function seedDatabase(options: SeedOptions = {}): Promise<void> {
  const profile = options.profile ?? getProfile(process.env.SEED_PROFILE);
  const mode = options.mode ?? getMode(process.env.SEED_MODE);
  const prune = getPrune(process.env.SEED_PRUNE);

  if (process.env.APP_ENV === "production") {
    throw new AppError("El seed está deshabilitado en producción.", 500, "SEED_PRODUCTION_DISABLED");
  }

  if (mode === "reset") {
    await resetSeedNamespace();
  }

  if (prune) {
    await pruneSeedNamespace(profile);
  }

  const productIds = await seedProducts();

  if (profile === "staging" || profile === "demo") {
    const userIds = await seedUsers();
    await seedRentals(productIds, userIds);
  }

  console.log(`[Seed] Perfil ${profile} aplicado en modo ${mode}. Productos gestionados: ${productIds.size}.`);
}

if (import.meta.main) {
  const profileArgument = process.argv.find((argument) => argument.startsWith("--profile="))?.split("=")[1];
  const modeArgument = process.argv.find((argument) => argument.startsWith("--mode="))?.split("=")[1];

  connectDB()
    .then(() => seedDatabase({
      profile: getProfile(profileArgument ?? process.env.SEED_PROFILE),
      mode: getMode(modeArgument ?? process.env.SEED_MODE),
    }))
    .then(() => mongoose.disconnect())
    .catch(async (error: unknown) => {
      console.error("[Seed] Error aplicando datos semilla:", error);
      await mongoose.disconnect();
      process.exitCode = 1;
    });
}
