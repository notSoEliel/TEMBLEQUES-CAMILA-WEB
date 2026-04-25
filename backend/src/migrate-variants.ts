import { Product } from "./models/Product.js";

/**
 * One-time migration: converts legacy flat Product fields
 * (size, stock, condition_status) into the new `variants` array format.
 *
 * Safe to run multiple times — skips products that already have variants.
 */
export async function migrateToVariants() {
  try {
    // Find products that have NO variants but DO have the legacy `size` or `stock` field
    const legacy = await Product.collection
      .find({
        $or: [
          { variants: { $exists: false } },
          { variants: { $size: 0 } },
        ],
      })
      .toArray();

    if (legacy.length === 0) {
      return;
    }

    console.log(`[Migration] Found ${legacy.length} products to migrate to variants format...`);

    for (const doc of legacy) {
      const size = (doc as any).size || "Único";
      const stock = typeof (doc as any).stock === "number" ? (doc as any).stock : 1;
      const conditionStatus = (doc as any).condition_status || "disponible";

      const variant = {
        size,
        stock,
        in_maintenance: conditionStatus === "mantenimiento",
      };

      await Product.collection.updateOne(
        { _id: doc._id },
        {
          $set: { variants: [variant] },
          $unset: { size: "", stock: "", condition_status: "" },
        }
      );
    }

    console.log(`[Migration] Successfully migrated ${legacy.length} products to variants format.`);
  } catch (error) {
    console.error("[Migration] Error migrating products:", error);
  }
}
