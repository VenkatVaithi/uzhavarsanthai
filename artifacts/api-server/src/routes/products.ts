import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable, farmersTable, categoriesTable } from "@workspace/db";
import { eq, and, ilike, isNull, or } from "drizzle-orm";
import { z } from "zod";

const router = Router();

function formatProduct(p: {
  id: number; name: string; description: string | null; price: string; unit: string;
  imageUrl: string | null; farmerId: number; categoryId: number; inStock: boolean;
  featured: boolean; createdAt: Date;
  farmerName?: string | null; farmerLocation?: string | null;
  categoryName?: string | null;
}) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    price: parseFloat(p.price),
    unit: p.unit,
    imageUrl: p.imageUrl,
    farmerId: p.farmerId,
    farmerName: p.farmerName ?? null,
    farmerLocation: p.farmerLocation ?? null,
    categoryId: p.categoryId,
    categoryName: p.categoryName ?? null,
    inStock: p.inStock,
    featured: p.featured,
    createdAt: p.createdAt.toISOString(),
  };
}

async function getProductsWithJoins(filters: {
  categoryId?: number | null;
  farmerId?: number | null;
  search?: string | null;
  featuredOnly?: boolean;
}) {
  const rows = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      description: productsTable.description,
      price: productsTable.price,
      unit: productsTable.unit,
      imageUrl: productsTable.imageUrl,
      farmerId: productsTable.farmerId,
      farmerName: farmersTable.name,
      farmerLocation: farmersTable.location,
      categoryId: productsTable.categoryId,
      categoryName: categoriesTable.name,
      inStock: productsTable.inStock,
      featured: productsTable.featured,
      createdAt: productsTable.createdAt,
    })
    .from(productsTable)
    .leftJoin(farmersTable, eq(productsTable.farmerId, farmersTable.id))
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(
      and(
        filters.categoryId != null ? eq(productsTable.categoryId, filters.categoryId) : undefined,
        filters.farmerId != null ? eq(productsTable.farmerId, filters.farmerId) : undefined,
        filters.search ? ilike(productsTable.name, `%${filters.search}%`) : undefined,
        filters.featuredOnly ? eq(productsTable.featured, true) : undefined,
      )
    )
    .orderBy(productsTable.createdAt);
  return rows;
}

router.get("/products/featured", async (req, res): Promise<void> => {
  const rows = await getProductsWithJoins({ featuredOnly: true });
  res.json(rows.map(formatProduct));
});

router.get("/products", async (req, res): Promise<void> => {
  const categoryId = req.query.categoryId ? Number(req.query.categoryId) : null;
  const farmerId = req.query.farmerId ? Number(req.query.farmerId) : null;
  const search = req.query.search ? String(req.query.search) : null;
  const rows = await getProductsWithJoins({ categoryId, farmerId, search });
  res.json(rows.map(formatProduct));
});

router.post("/products", async (req, res): Promise<void> => {
  const schema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    price: z.number().positive(),
    unit: z.string().min(1),
    imageUrl: z.string().optional(),
    farmerId: z.number().int(),
    categoryId: z.number().int(),
    inStock: z.boolean().optional(),
    featured: z.boolean().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [product] = await db.insert(productsTable).values({
    ...parsed.data,
    price: String(parsed.data.price),
  }).returning();
  const rows = await getProductsWithJoins({ farmerId: null, categoryId: null });
  const full = rows.find(r => r.id === product.id);
  res.status(201).json(formatProduct(full ?? { ...product, farmerName: null, farmerLocation: null, categoryName: null }));
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const rows = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      description: productsTable.description,
      price: productsTable.price,
      unit: productsTable.unit,
      imageUrl: productsTable.imageUrl,
      farmerId: productsTable.farmerId,
      farmerName: farmersTable.name,
      farmerLocation: farmersTable.location,
      categoryId: productsTable.categoryId,
      categoryName: categoriesTable.name,
      inStock: productsTable.inStock,
      featured: productsTable.featured,
      createdAt: productsTable.createdAt,
    })
    .from(productsTable)
    .leftJoin(farmersTable, eq(productsTable.farmerId, farmersTable.id))
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(eq(productsTable.id, id));
  if (!rows[0]) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(formatProduct(rows[0]));
});

router.patch("/products/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const schema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    price: z.number().positive().optional(),
    unit: z.string().optional(),
    imageUrl: z.string().optional(),
    categoryId: z.number().int().optional(),
    inStock: z.boolean().optional(),
    featured: z.boolean().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.price !== undefined) updateData.price = String(parsed.data.price);
  const [product] = await db.update(productsTable).set(updateData).where(eq(productsTable.id, id)).returning();
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  const rows = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      description: productsTable.description,
      price: productsTable.price,
      unit: productsTable.unit,
      imageUrl: productsTable.imageUrl,
      farmerId: productsTable.farmerId,
      farmerName: farmersTable.name,
      farmerLocation: farmersTable.location,
      categoryId: productsTable.categoryId,
      categoryName: categoriesTable.name,
      inStock: productsTable.inStock,
      featured: productsTable.featured,
      createdAt: productsTable.createdAt,
    })
    .from(productsTable)
    .leftJoin(farmersTable, eq(productsTable.farmerId, farmersTable.id))
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(eq(productsTable.id, id));
  res.json(formatProduct(rows[0]));
});

router.delete("/products/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  await db.delete(productsTable).where(eq(productsTable.id, id));
  res.status(204).send();
});

export default router;
