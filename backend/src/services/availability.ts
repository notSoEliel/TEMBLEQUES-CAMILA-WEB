import { Rental } from "../models/Rental.js";

/**
 * Checks whether a product is available for the given date range.
 * A product is unavailable if there's any active rental (not cancelled/returned)
 * whose dates overlap with the requested range.
 */
export async function checkAvailability(
  productId: string,
  startDate: Date,
  endDate: Date,
  excludeRentalId?: string
): Promise<boolean> {
  const query: any = {
    product_id: productId,
    status: { $nin: ["cancelled", "returned", "damaged"] },
    $or: [
      {
        start_date: { $lte: endDate },
        end_date: { $gte: startDate },
      },
    ],
  };

  if (excludeRentalId) {
    query._id = { $ne: excludeRentalId };
  }

  const conflicting = await Rental.countDocuments(query);
  return conflicting === 0;
}

/**
 * Returns booked date ranges for a product in a given month/year window.
 */
export async function getBookedDates(
  productId: string,
  from: Date,
  to: Date
): Promise<Array<{ start: Date; end: Date }>> {
  const rentals = await Rental.find({
    product_id: productId,
    status: { $nin: ["cancelled", "returned", "damaged"] },
    start_date: { $lte: to },
    end_date: { $gte: from },
  }).select("start_date end_date");

  return rentals.map((r) => ({
    start: r.start_date,
    end: r.end_date,
  }));
}
