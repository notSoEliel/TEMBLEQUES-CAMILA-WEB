import { Rental } from "../models/Rental.js";
import { Product } from "../models/Product.js";

/**
 * Checks whether a specific size variant of a product is available for the
 * given date range.
 *
 * Availability logic: a variant with stock N can have up to N concurrent
 * rentals. If overlapping active rentals for the same product+size >= stock,
 * the variant is unavailable.
 */
export async function checkAvailability(
  productId: string,
  startDate: Date,
  endDate: Date,
  selectedSize: string,
  excludeRentalId?: string
): Promise<boolean> {
  const product = await Product.findById(productId);
  if (!product) return false;

  const variant = product.variants.find((v) => v.size === selectedSize);
  if (!variant || variant.in_maintenance || variant.stock <= 0) return false;

  const query: any = {
    product_id: productId,
    selected_size: selectedSize,
    status: { $nin: ["cancelled", "returned", "damaged"] },
    start_date: { $lte: endDate },
    end_date: { $gte: startDate },
  };

  if (excludeRentalId) {
    query._id = { $ne: excludeRentalId };
  }

  const conflictingRentals = await Rental.find(query).select("start_date end_date");

  // Calculate maximum concurrent rentals for any single day in the requested range
  let maxConcurrent = 0;
  let current = new Date(startDate);
  current.setUTCHours(12, 0, 0, 0); // use middle of the day to avoid timezone edge cases
  const end = new Date(endDate);
  end.setUTCHours(12, 0, 0, 0);

  while (current <= end) {
    let count = 0;
    for (const r of conflictingRentals) {
      if (current >= r.start_date && current <= r.end_date) {
        count++;
      }
    }
    if (count > maxConcurrent) maxConcurrent = count;
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return maxConcurrent < variant.stock;
}

/**
 * Returns booked date ranges for a product in a given window.
 * Also returns the selected_size for each booking so the frontend
 * can determine per-size availability.
 */
export async function getBookedDates(
  productId: string,
  from: Date,
  to: Date
): Promise<Array<{ start: Date; end: Date; size: string }>> {
  const rentals = await Rental.find({
    product_id: productId,
    status: { $nin: ["cancelled", "returned", "damaged"] },
    start_date: { $lte: to },
    end_date: { $gte: from },
  }).select("start_date end_date selected_size");

  return rentals.map((r) => ({
    start: r.start_date,
    end: r.end_date,
    size: r.selected_size || "Único",
  }));
}
