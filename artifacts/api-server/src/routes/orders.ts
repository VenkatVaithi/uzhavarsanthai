import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, orderItemsTable, productsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

const router = Router();

async function getOrderWithItems(orderId: number) {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) return null;
  const items = await db
    .select({
      productId: orderItemsTable.productId,
      productName: productsTable.name,
      quantity: orderItemsTable.quantity,
      priceAtOrder: orderItemsTable.priceAtOrder,
      unit: productsTable.unit,
    })
    .from(orderItemsTable)
    .leftJoin(productsTable, eq(orderItemsTable.productId, productsTable.id))
    .where(eq(orderItemsTable.orderId, orderId));
  return {
    id: order.id,
    buyerName: order.buyerName,
    buyerEmail: order.buyerEmail,
    status: order.status,
    totalAmount: parseFloat(order.totalAmount),
    notes: order.notes,
    createdAt: order.createdAt.toISOString(),
    items: items.map(i => ({
      productId: i.productId,
      productName: i.productName ?? null,
      quantity: parseFloat(i.quantity),
      priceAtOrder: parseFloat(i.priceAtOrder),
      unit: i.unit ?? null,
    })),
  };
}

router.get("/orders", async (req, res): Promise<void> => {
  const { buyerEmail } = req.query;
  let query = db.select().from(ordersTable).orderBy(ordersTable.createdAt).$dynamic();
  if (typeof buyerEmail === "string" && buyerEmail.trim()) {
    query = query.where(eq(ordersTable.buyerEmail, buyerEmail.trim()));
  }
  const orders = await query;
  const results = await Promise.all(orders.map(o => getOrderWithItems(o.id)));
  res.json(results.filter(Boolean));
});

router.post("/orders", async (req, res): Promise<void> => {
  const schema = z.object({
    buyerName: z.string().min(1),
    buyerEmail: z.string().min(1),
    notes: z.string().optional(),
    items: z.array(z.object({
      productId: z.number().int(),
      quantity: z.number().positive(),
    })).min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const productIds = parsed.data.items.map(i => i.productId);
  const products = await db
    .select()
    .from(productsTable)
    .where(inArray(productsTable.id, productIds));
  const productMap = new Map(products.map(p => [p.id, p]));

  let total = 0;
  for (const item of parsed.data.items) {
    const product = productMap.get(item.productId);
    if (!product) {
      res.status(400).json({ error: `Product ${item.productId} not found` });
      return;
    }
    total += parseFloat(product.price) * item.quantity;
  }

  const [order] = await db.insert(ordersTable).values({
    buyerName: parsed.data.buyerName,
    buyerEmail: parsed.data.buyerEmail,
    notes: parsed.data.notes,
    totalAmount: String(total.toFixed(2)),
    status: "pending",
  }).returning();

  await db.insert(orderItemsTable).values(
    parsed.data.items.map(item => ({
      orderId: order.id,
      productId: item.productId,
      quantity: String(item.quantity),
      priceAtOrder: productMap.get(item.productId)!.price,
    }))
  );

  const result = await getOrderWithItems(order.id);
  res.status(201).json(result);
});

router.get("/orders/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const order = await getOrderWithItems(id);
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(order);
});

router.patch("/orders/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const schema = z.object({ status: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [updated] = await db.update(ordersTable).set({ status: parsed.data.status }).where(eq(ordersTable.id, id)).returning();
  if (!updated) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  const result = await getOrderWithItems(id);
  res.json(result);
});

export default router;
