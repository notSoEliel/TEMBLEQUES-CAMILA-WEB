import { Hono } from "hono";
import { authMiddleware, type AuthVariables } from "../middleware/auth.js";
import { AppError } from "../lib/errors.js";
import { createPaginatedResponse, getPaginationParams } from "../lib/pagination.js";
import { listUserNotifications, markNotificationAsRead } from "../services/notifications.js";

const notifications = new Hono<{ Variables: AuthVariables }>();
notifications.use("/*", authMiddleware);

notifications.get("/", async (c) => {
  const { page, limit, skip } = getPaginationParams(c);
  const user = c.get("user");
  const result = await listUserNotifications({ userId: user._id.toString(), page, limit, skip });
  return c.json({
    ...createPaginatedResponse(result.data, result.total, page, limit),
    unreadCount: result.unreadCount,
  });
});

notifications.patch("/:id/read", async (c) => {
  const notificationId = c.req.param("id");
  if (!/^[a-f\d]{24}$/i.test(notificationId)) {
    throw new AppError("Notificación inválida.", 400, "NOTIFICATION_ID_INVALID");
  }
  const notification = await markNotificationAsRead(c.get("user")._id.toString(), notificationId);
  if (!notification) throw new AppError("Notificación no encontrada.", 404, "NOTIFICATION_NOT_FOUND");
  return c.json({ notification });
});

export default notifications;
