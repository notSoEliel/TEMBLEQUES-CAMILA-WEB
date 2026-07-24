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
  name_en: string;
  category: string[];
  description: string;
  description_en: string;
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
  role: "client" | "owner";
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
    name: "Juego de Cadena Chata y Aretes Folclóricos",
    name_en: "Chata Chain Necklace and Earrings Set",
    category: ["accesorios"],
    description: "Elegante conjunto de joyería tradicional en tono dorado. Incluye la clásica Cadena Chata con pendiente de filigrana y cruz, acompañada de un par de aretes colgantes estilo mosqueta. Accesorio imprescindible para lucir con la Pollera.",
    description_en: "Elegant traditional gold-tone jewelry set for Panamanian folklore attire. Features the iconic Chata chain necklace with filigree pendant and cross, paired with matching dangle earrings. An essential accessory for Pollera costumes.",
    rental_price: 10,
    variants: [{ size: "Único", stock: 1, in_maintenance: false }],
    images: ["https://res.cloudinary.com/voeuxvfj/image/upload/f_auto,q_auto/v1784860315/teah3ftdchszcgqtvitn.png"],
    deposit_settings: { required: true },
  },
  {
    seed_key: "pollera-montuna",
    name: "Set Completo de Pollera Montuna de Gala",
    name_en: "Women's Red Montuna Pollera Set",
    category: ["pollera", "paquete_completo", "tembleques"],
    description: "Indumentaria tradicional completa de Pollera Montuna de gala para dama. Incluye faldón de zaraza floreado en tono rojo, camisa de dos arandelas con encajes, juego de cadenas tradicionales (prendas) y tembleques de colores.",
    description_en: "Complete traditional women's Montuna Pollera set. Includes full red floral skirt, double-ruffle white blouse, full set of traditional gold jewelry, and vibrant colored tembleques (headpiece).",
    rental_price: 100,
    variants: [
      { size: "S", stock: 2, in_maintenance: false },
      { size: "M", stock: 1, in_maintenance: false },
    ],
    images: [
      "https://res.cloudinary.com/voeuxvfj/image/upload/f_auto,q_auto/v1784854219/r60yyktrm4zwhqdwvccz.jpg",
      "https://res.cloudinary.com/voeuxvfj/image/upload/f_auto,q_auto/v1784854226/vmarxxmmlvz1dbyayxgz.jpg",
      "https://res.cloudinary.com/voeuxvfj/image/upload/f_auto,q_auto/v1784854232/lia4qigwyeluetriswie.jpg",
    ],
    deposit_settings: { required: true },
  },
  {
    seed_key: "pollera-gala-completa",
    name: "Set de Pollera Montuna",
    name_en: "Montuna Pollera Set",
    category: ["pollera", "paquete_completo", "tembleques", "accesorios"],
    description: "Atuendo folclórico completo. Incluye faldón floreado en tonos cálidos con encaje blanco, camisa con labor azul, rosario/cadena tradicional y sombrero pintado/de junco. Ideal para desfiles y actos escolares.",
    description_en: "Complete traditional Montuna outfit for girls. Includes a floral tier skirt with lace trim, printed blouse, rosary necklace, and a traditional straw hat. Ready to wear for cultural events.",
    rental_price: 60,
    variants: [
      { size: "M", stock: 1, in_maintenance: false },
      { size: "L", stock: 1, price_override: 450, in_maintenance: false },
      { size: "S", stock: 1, in_maintenance: false },
      { size: "10-12", stock: 1, in_maintenance: false },
    ],
    images: ["https://res.cloudinary.com/voeuxvfj/image/upload/f_auto,q_auto/v1784853531/svvt1husf2gqxzewzyyg.jpg"],
    deposit_settings: { required: true },
  },
  {
    seed_key: "cotona-pantalon-masculino",
    name: "Conjunto Infantil de Camisilla y Pantalón",
    name_en: "Boys' Traditional Camisilla Set",
    category: ["vestuario_masculino", "infantil"],
    description: "Atuendo típico masculino para niños. Incluye camisilla blanca de manga larga con finas alforzas, bolsillos y botones decorativos, acompañada de pantalón de vestir negro. Tela liviana y elegante.",
    description_en: "Atuendo típico masculino para niños. Incluye camisilla blanca de manga larga con finas alforzas, bolsillos y botones decorativos, acompañada de pantalón de vestir negro. Tela liviana y elegante.",
    rental_price: 50,
    variants: [
      { size: "6-8", stock: 1, in_maintenance: false },
      { size: "8-10", stock: 1, in_maintenance: false },
      { size: "10-12", stock: 1, in_maintenance: false },
    ],
    images: ["https://res.cloudinary.com/voeuxvfj/image/upload/f_auto,q_auto/v1784853484/rndiivepzqxn3xw1wuqc.jpg"],
    deposit_settings: { required: true },
  },
  {
    seed_key: "camisilla-chacara",
    name: "Camisilla Panameña Tradicional con Bordado a Mano",
    name_en: "Traditional Panamanian Camisilla:",
    category: ["vestuario_masculino"],
    description: "Camisilla tradicional panameña de manga larga, confeccionada con finas alforzas y una delicada pechera bordada a mano en punto de cruz con motivos geométricos.",
    description_en: "Authentic Panamanian \"Camisilla\" shirt featuring intricate hand-embroidered cross-stitch detail on the chest and fine vertical pleats. Handcrafted traditional attire.",
    rental_price: 50,
    variants: [
      { size: "S", stock: 1, in_maintenance: false },
      { size: "M", stock: 1, in_maintenance: false },
      { size: "L", stock: 1, in_maintenance: false },
    ],
    images: ["https://res.cloudinary.com/voeuxvfj/image/upload/f_auto,q_auto/v1784853379/gi5iqdh3lgzgjgu6cxbe.jpg"],
    deposit_settings: { required: true },
  },
  {
    seed_key: "pollera-infantil",
    name: "Conjunto Completo de Pollera Montuna Infantil",
    name_en: "Complete Girls' Montuna Pollera Set",
    category: ["infantil", "pollera"],
    description: "Traje tradicional de Pollera Montuna para niñas. Incluye faldón de zaraza floreado, camisa blanca con lazo y encajes, y rosario de cuentas. Tela fresca, cómoda y con gran vuelo para bailar.",
    description_en: "Traditional Montuna Pollera outfit for girls. Includes full floral skirt, white lace-trimmed blouse with bow, and beaded necklace. Lightweight and comfortable for folklore dancing.",
    rental_price: 80,
    variants: [
      { size: "2-4", stock: 2, in_maintenance: false },
      { size: "4-6", stock: 2, in_maintenance: false },
      { size: "6-8", stock: 1, in_maintenance: false },
    ],
    images: ["https://res.cloudinary.com/voeuxvfj/image/upload/f_auto,q_auto/v1784853452/rwt2gyts5xchgbmiuryr.jpg"],
    deposit_settings: { required: true },
  },
  {
    seed_key: "conjunto-infantil-masculino",
    name: "Camisa Tonosieña Tradicional",
    name_en: "Men's Traditional Tonosieña Shirt",
    category: ["infantil", "vestuario_masculino"],
    description: "Auténtica Camisa Tonosieña para caballero. Elaborada en tela a rayas finas con pechera detallada en alforzas y una vistosa hilera de botones de colores vibrantes. Fresca, elegante y perfecta para eventos folclóricos.",
    description_en: "Authentic Panamanian \"Tonosieña\" shirt featuring fine vertical stripes, intricate front pleating, and signature multi-colored buttons. Lightweight and iconic for traditional celebrations.",
    rental_price: 50,
    variants: [
      { size: "4-6", stock: 2, in_maintenance: false },
      { size: "6-8", stock: 1, in_maintenance: false },
      { size: "8-10", stock: 1, in_maintenance: false },
      { size: "10-12", stock: 1, in_maintenance: false },
      { size: "S", stock: 1, in_maintenance: false },
      { size: "M", stock: 1, in_maintenance: false },
      { size: "L", stock: 1, in_maintenance: false },
    ],
    images: [
      "https://res.cloudinary.com/voeuxvfj/image/upload/f_auto,q_auto/v1784853553/pctvljsgkklruqpr0dhx.jpg",
      "https://res.cloudinary.com/voeuxvfj/image/upload/f_auto,q_auto/v1784853565/xm6se10ef1g6kvoefatd.jpg",
    ],
    deposit_settings: { required: true },
  },
  {
    seed_key: "tembleques-blancos",
    name: "Juego de Flores para Pollera Congo",
    name_en: "Congo Pollera Flower Headpiece Set",
    category: ["tembleques"],
    description: "Vistoso juego de flores de colores para Pollera Congo. Incluye 6 arreglos agrupados y 2 botones individuales con horquilla. Liviano, duradero y fácil de ajustar al peinado tradicional.",
    description_en: "Vibrant flower headpiece set for Panamanian Pollera Congo. Includes 6 floral clusters and 2 hairpin accents. Lightweight, durable, and easy to secure for dancing.",
    rental_price: 20,
    variants: [{ size: "Único", stock: 3, in_maintenance: false }],
    images: ["https://res.cloudinary.com/voeuxvfj/image/upload/f_auto,q_auto/v1784853429/tbfqctwzrtvm9yl8omyd.jpg"],
    deposit_settings: { required: true },
  },
  {
    seed_key: "tembleques-colores",
    name: "Tembleques de Colores",
    name_en: "Multi-color tembleques set",
    category: ["tembleques"],
    description: "Set de tembleques multicolor para pollera montuna. Diseño artesanal único.",
    description_en: "nique handcrafted design o one-of-a-kind handcrafted design.",
    rental_price: 60,
    variants: [{ size: "Único", stock: 4, in_maintenance: false }],
    images: ["https://res.cloudinary.com/voeuxvfj/image/upload/f_auto,q_auto/v1784853268/uofgb38tiqls78erxxgn.jpg"],
    deposit_settings: { required: true },
  },
  {
    seed_key: "peinetas-pajuela-oro",
    name: "Conjunto de la Etnia Negra",
    name_en: "Afro-Panamanian Traditional Set",
    category: ["vestuario_masculino", "paquete_completo"],
    description: "Diseño artesanal confeccionado en vibrantes estampados afro. Incluye camisa estilo túnica y gorro a juego.",
    description_en: "Handcrafted traditional Afro-Panamanian attire featuring vibrant African print fabric. Includes a tunic-style shirt and matching hat.",
    rental_price: 30,
    variants: [
      { size: "8-10", stock: 1, in_maintenance: false },
      { size: "10-12", stock: 1, in_maintenance: false },
      { size: "S", stock: 1, in_maintenance: false },
      { size: "M", stock: 1, in_maintenance: false },
      { size: "L", stock: 1, in_maintenance: false },
    ],
    images: ["https://res.cloudinary.com/voeuxvfj/image/upload/f_auto,q_auto/v1784853286/qhawus5ss9wcuy2clm5e.jpg"],
    deposit_settings: { required: true },
  },
  {
    seed_key: "cadena-chata-mosqueta",
    name: "Set Folclórico para Bebé",
    name_en: "aby Girl Traditional Outfit Set",
    category: ["infantil", "paquete_completo", "pollera"],
    description: "Encantador conjunto folclórico para bebé. Incluye body blanco estampado con detalles turquesa en las mangas, faldita de zaraza floreada con encajes blancos y cintillo elástico decorado con tembleque/flor. Suave, cómodo y fácil de colocar.",
    description_en: "Adorable traditional outfit for baby girls. Features a printed bodysuit with matching sleeve trims, a turquoise floral skirt with lace, and a soft elastic headband with a tembleque flower. Soft, comfortable, and cute.",
    rental_price: 20,
    variants: [{ size: "6 meses", stock: 6, in_maintenance: false }],
    images: ["https://res.cloudinary.com/voeuxvfj/image/upload/f_auto,q_auto/v1784854424/snn3fkmmtfxldtpupqum.jpg"],
    deposit_settings: { required: true },
  },
  {
    seed_key: "paquete-pollera-gala",
    name: "Conjunto de Pollera Montuna Infantil en Tono Fucsia",
    name_en: "Bright Montuna Pollera set for girls",
    category: ["paquete_completo", "pollera", "infantil"],
    description: "Alegre conjunto de Pollera Montuna para niñas. Incluye faldón fucsia con estampado floral y camisa blanca adornada con detalles al tono y lazo verde de contraste. Ideal para eventos escolares y bailes.",
    description_en: "Bright Montuna Pollera set for girls. Features a fuchsia floral print skirt and a white blouse accented with matching trim and a green bow. Perfect for school parades and performances.",
    rental_price: 60,
    variants: [
      { size: "4-6", stock: 1, in_maintenance: false },
      { size: "6-8", stock: 1, in_maintenance: false },
      { size: "8-10", stock: 1, in_maintenance: false },
      { size: "10-12", stock: 1, in_maintenance: false },
    ],
    images: ["https://res.cloudinary.com/voeuxvfj/image/upload/f_auto,q_auto/v1784853505/et1o33zr03cpu7ucmz4g.jpg"],
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
    role: "owner",
    phone: "+507 6000-0002",
    preferredAddress: "Ciudad de Panamá",
  },
];

const SEED_RENTALS: RentalFixture[] = [
  {
    fixture_key: "staging-pending-rental",
    user_clerk_id: "seed_staging_client",
    product_seed_key: "pollera-santenena-clasica",
    selected_size: "Único",
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

const LEGACY_PRODUCT_NAMES: Record<string, string[]> = {
  "pollera-santenena-clasica": ["Pollera Santeñena Clásica"],
  "pollera-montuna": ["Pollera Montuna"],
  "pollera-gala-completa": ["Pollera de Gala Completa"],
  "cotona-pantalon-masculino": ["Cotona y Pantalón Masculino"],
  "camisilla-chacara": ["Camisilla Típica Panameña", "Camisilla y Chácara"],
  "pollera-infantil": ["Pollera Infantil"],
  "conjunto-infantil-masculino": ["Conjunto Típico Infantil Masculino"],
  "tembleques-blancos": ["Juego de Tembleques Blancos", "Juego de Flores para Pollera Congo"],
  "peinetas-pajuela-oro": ["Peinetas y Pajuela de Oro", "Conjunto de la Etnia Negra"],
  "cadena-chata-mosqueta": ["Cadena Chata y Mosqueta"],
  "paquete-pollera-gala": ["Paquete Completo Pollera de Gala"],
};

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

export function buildProductSeedUpdate(fixture: ProductFixture): {
  $setOnInsert: ProductFixture;
} {
  return {
    $setOnInsert: {
      ...fixture,
      images: [...fixture.images],
    },
  };
}

function productNameCandidates(fixture: ProductFixture): string[] {
  return [fixture.name, ...(LEGACY_PRODUCT_NAMES[fixture.seed_key] ?? [])];
}

function dateFromOffset(offsetDays: number): Date {
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date;
}

async function migrateLegacyProductKey(fixture: ProductFixture): Promise<void> {
  const legacy = await Product.findOne({
    name: { $in: productNameCandidates(fixture) },
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
      buildProductSeedUpdate(fixture),
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
