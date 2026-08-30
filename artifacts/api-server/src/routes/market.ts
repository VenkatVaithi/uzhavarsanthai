import { Router } from "express";
import { db } from "@workspace/db";
import { farmersTable, productsTable, ordersTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

router.get("/market/stats", async (req, res): Promise<void> => {
  const [[farmerCount], [productCount], [orderStats]] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(farmersTable),
    db.select({ count: sql<number>`count(*)::int` }).from(productsTable),
    db.select({
      count: sql<number>`count(*)::int`,
      total: sql<string>`coalesce(sum(total_amount), 0)`,
    }).from(ordersTable),
  ]);
  res.json({
    totalFarmers: farmerCount.count,
    totalProducts: productCount.count,
    totalOrders: orderStats.count,
    totalRevenue: parseFloat(orderStats.total),
  });
});

export default router;
