import { Hono } from "hono";
import { csrf } from "hono/csrf";
import { DomainError, PgFailure } from "@noodle/core/action";
import { auth } from "./routes/auth";
import { days } from "./routes/days";
import { driver } from "./routes/driver";
import { factories } from "./routes/factories";
import { factory } from "./routes/factory";
import { files } from "./routes/files";
import { orders } from "./routes/orders";
import { payments } from "./routes/payments";
import { products } from "./routes/products";
import { reviews } from "./routes/reviews";
import { sale } from "./routes/sale";
import { shop } from "./routes/shop";
import { staff } from "./routes/staff";

const v1 = new Hono()
  .route("/auth", auth)
  .route("/shop", shop)
  .route("/orders", orders)
  .route("/reviews", reviews)
  .route("/days", days)
  .route("/products", products)
  .route("/factories", factories)
  .route("/staff", staff)
  .route("/driver", driver)
  .route("/factory", factory)
  .route("/payments", payments)
  .route("/sale", sale);

const app = new Hono();

// Cookie sessions need an Origin check on form posts; Bearer-token clients (mobile) carry no ambient credentials.
app.use("/api/*", (c, next) => (c.req.header("authorization") ? next() : csrf()(c, next)));

app.onError((e: unknown, c) => {
  if (e instanceof DomainError) return c.json({ error: e.message }, 400);
  // P0001 = RAISE EXCEPTION from our SQL functions; their text is user-facing Vietnamese.
  if (e instanceof PgFailure && e.code === "P0001") return c.json({ error: e.message }, 400);
  console.error(e);
  return c.json({ error: "Có lỗi xảy ra, vui lòng thử lại" }, 500);
});

const routes = app.route("/api/v1", v1).route("/files", files);

export type AppType = typeof routes;
export default app;
