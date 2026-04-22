import { Hono } from "hono";
import { authMiddleware, type AuthVariables } from "../middleware/auth.js";
import { Rental } from "../models/Rental.js";
import { Product } from "../models/Product.js";
import { checkAvailability } from "../services/availability.js";
import { calculateTotal } from "../services/rental.js";

const stripe = new Hono<{ Variables: AuthVariables }>();

// POST /api/stripe/create-checkout-session
stripe.post("/create-checkout-session", authMiddleware, async (c) => {
  try {
    const user = c.get("user") as any;
    const { rentalId } = await c.req.json();

    const rental = await Rental.findOne({
      _id: rentalId,
      user_id: user._id,
      status: "pending",
    }).populate("product_id");

    if (!rental) {
      return c.json({ error: "Reserva no encontrada o ya procesada" }, 404);
    }

    if (!rental.terms_accepted) {
      return c.json({ error: "Debe aceptar los terminos y condiciones" }, 400);
    }

    // Re-check availability to prevent race conditions
    const isAvailable = await checkAvailability(
      rental.product_id._id.toString(),
      rental.start_date,
      rental.end_date,
      rental._id.toString()
    );

    if (!isAvailable) {
      rental.status = "cancelled";
      await rental.save();
      return c.json({ error: "El producto ya no esta disponible para estas fechas" }, 409);
    }

    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

    // If Stripe is not configured, simulate successful payment for demo
    if (!STRIPE_SECRET_KEY || STRIPE_SECRET_KEY === "sk_test_placeholder") {
      rental.status = "paid";
      rental.payment_status = "completed";
      rental.stripe_session_id = `demo_session_${Date.now()}`;
      await rental.save();

      return c.json({
        mode: "demo",
        message: "Pago simulado exitosamente (modo demo - Stripe no configurado)",
        rental: {
          id: rental._id,
          status: rental.status,
          total: rental.total,
        },
      });
    }

    // Real Stripe integration
    const stripeLib = (await import("stripe")).default;
    const stripeClient = new stripeLib(STRIPE_SECRET_KEY);
    const product = rental.product_id as any;

    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Alquiler: ${product.name}`,
              description: `${rental.start_date.toLocaleDateString()} - ${rental.end_date.toLocaleDateString()}`,
            },
            unit_amount: Math.round(rental.total * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${c.req.header("origin") || "http://localhost:5173"}/confirmation?rental=${rental._id}`,
      cancel_url: `${c.req.header("origin") || "http://localhost:5173"}/catalog`,
      metadata: {
        rentalId: rental._id.toString(),
        userId: user._id.toString(),
      },
    });

    rental.stripe_session_id = session.id;
    await rental.save();

    return c.json({ url: session.url, sessionId: session.id });
  } catch (error: any) {
    return c.json({ error: error.message || "Error al crear sesion de pago" }, 500);
  }
});

// POST /api/stripe/webhook
stripe.post("/webhook", async (c) => {
  try {
    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
    const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

    if (!STRIPE_SECRET_KEY || STRIPE_SECRET_KEY === "sk_test_placeholder") {
      return c.json({ received: true, mode: "demo" });
    }

    const stripeLib = (await import("stripe")).default;
    const stripeClient = new stripeLib(STRIPE_SECRET_KEY);

    const sig = c.req.header("stripe-signature");
    const body = await c.req.text();

    let event;
    try {
      event = stripeClient.webhooks.constructEvent(body, sig!, STRIPE_WEBHOOK_SECRET!);
    } catch {
      return c.json({ error: "Webhook signature verification failed" }, 400);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      const rentalId = session.metadata?.rentalId;

      if (rentalId) {
        await Rental.findByIdAndUpdate(rentalId, {
          status: "paid",
          payment_status: "completed",
        });
      }
    }

    return c.json({ received: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default stripe;
