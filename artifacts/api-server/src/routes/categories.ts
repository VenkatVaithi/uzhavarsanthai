import { Router } from "express";
import { db } from "@workspace/db";
import { categoriesTable, productsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

const router = Router();

router.get("/categories", async (req, res): Promise<void> => {
  const categories = await db.select().from(categoriesTable).orderBy(categoriesTable.name);
  res.json(categories);
});

router.post("/categories", async (req, res): Promise<void> => {
  const schema = z.object({
    name: z.string().min(1),
    slug: z.string().min(1),
    icon: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [cat] = await db.insert(categoriesTable).values(parsed.data).returning();
  res.status(201).json(cat);
});

router.get("/categories/summary", async (req, res): Promise<void> => {
  const rows = await db
    .select({
      id: categoriesTable.id,
      name: categoriesTable.name,
      slug: categoriesTable.slug,
      icon: categoriesTable.icon,
      productCount: sql<number>`count(${productsTable.id})::int`,
    })
    .from(categoriesTable)
    .leftJoin(productsTable, eq(productsTable.categoryId, categoriesTable.id))
    .groupBy(categoriesTable.id, categoriesTable.name, categoriesTable.slug, categoriesTable.icon)
    .orderBy(categoriesTable.name);
  res.json(rows);
});

export default router;
