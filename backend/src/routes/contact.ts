import { Hono } from "hono";
import { z } from "zod";
import { Contact } from "../models/Contact.js";

const contact = new Hono();

const contactSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(120, "El nombre es demasiado largo"),
  email: z.string().trim().email("Ingresa un correo electrónico válido").max(160, "El correo es demasiado largo"),
  message: z.string().trim().min(10, "El mensaje debe tener al menos 10 caracteres").max(2000, "El mensaje es demasiado largo"),
});

contact.post("/", async (c) => {
  const body = await c.req.json();
  const data = contactSchema.parse(body);

  await Contact.create({
    ...data,
    ipAddress: c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown",
    userAgent: c.req.header("user-agent") || "unknown",
  });

  return c.json({
    message: "Mensaje recibido correctamente. Te contactaremos pronto.",
  }, 201);
});

export default contact;
