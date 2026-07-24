import type { FilterQuery } from "mongoose";
import { Rental } from "../models/Rental.js";
import { Product } from "../models/Product.js";
import type { IRental } from "../models/Rental.js";
import { MaintenanceBlock } from "../models/MaintenanceBlock.js";
import { hasAvailableStock, type AvailabilityConflict } from "./availability-rules.js";

/**
 * Checks whether a specific size variant of a product is available for the
 * given date range.
 *
 * Availability logic: a variant with stock N can have up to N concurrent
 * rentals/maintenance blocks. If overlapping active rentals + maintenance blocks
 * for the same product+size >= stock, the variant is unavailable.
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

  const query: FilterQuery<IRental> = {
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
  const conflictingBlocks = await MaintenanceBlock.find({
    product_id: productId,
    selected_size: selectedSize,
    start_date: { $lte: endDate },
    end_date: { $gte: startDate },
  }).select("start_date end_date");

  const conflicts: AvailabilityConflict[] = [
    ...conflictingRentals.map((rental) => ({
      startDate: rental.start_date,
      endDate: rental.end_date,
    })),
    ...conflictingBlocks.map((block) => ({
      startDate: block.start_date,
      endDate: block.end_date,
    })),
  ];

  return hasAvailableStock(variant.stock, startDate, endDate, conflicts);
}

/**
 * Returns booked date ranges and maintenance blocks for a product in a given window.
 * Also returns the selected_size for each booking so the frontend
 * can determine per-size availability.
 */
export async function getBookedDates(
  productId: string,
  from: Date,
  to: Date
): Promise<Array<{ start: Date; end: Date; size: string }>> {
  const [rentals, blocks] = await Promise.all([
    Rental.find({
      product_id: productId,
      status: { $nin: ["cancelled", "returned", "damaged"] },
      start_date: { $lte: to },
      end_date: { $gte: from },
    }).select("start_date end_date selected_size"),
    MaintenanceBlock.find({
      product_id: productId,
      start_date: { $lte: to },
      end_date: { $gte: from },
    }).select("start_date end_date selected_size"),
  ]);

  const rentalsMapped = rentals.map((r) => ({
    start: r.start_date,
    end: r.end_date,
    size: r.selected_size || "Único",
  }));

  const blocksMapped = blocks.map((b) => ({
    start: b.start_date,
    end: b.end_date,
    size: b.selected_size || "Único",
  }));

  return [...rentalsMapped, ...blocksMapped];
}
