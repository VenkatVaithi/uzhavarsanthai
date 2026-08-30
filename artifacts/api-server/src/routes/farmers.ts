import { Router } from "express";
import { db } from "@workspace/db";
import { farmersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

router.get("/farmers", async (req, res): Promise<void> => {
  const farmers = await db.select().from(farmersTable).orderBy(farmersTable.createdAt);
  res.json(farmers.map(f => ({
    id: f.id,
    name: f.name,
    bio: f.bio,
    location: f.location,
    imageUrl: f.imageUrl,
    createdAt: f.createdAt.toISOString(),
  })));
});

router.post("/farmers", async (req, res): Promise<void> => {
  const schema = z.object({
    name: z.string().min(1),
    bio: z.string().optional(),
    location: z.string().min(1),
    imageUrl: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [farmer] = await db.insert(farmersTable).values(parsed.data).returning();
  res.status(201).json({
    id: farmer.id,
    name: farmer.name,
    bio: farmer.bio,
    location: farmer.location,
    imageUrl: farmer.imageUrl,
    createdAt: farmer.createdAt.toISOString(),
  });
});

router.get("/farmers/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [farmer] = await db.select().from(farmersTable).where(eq(farmersTable.id, id));
  if (!farmer) {
    res.status(404).json({ error: "Farmer not found" });
    return;
  }
  res.json({
    id: farmer.id,
    name: farmer.name,
    bio: farmer.bio,
    location: farmer.location,
    imageUrl: farmer.imageUrl,
    createdAt: farmer.createdAt.toISOString(),
  });
});

router.patch("/farmers/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const schema = z.object({
    name: z.string().min(1).optional(),
    bio: z.string().optional(),
    location: z.string().optional(),
    imageUrl: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [farmer] = await db.update(farmersTable).set(parsed.data).where(eq(farmersTable.id, id)).returning();
  if (!farmer) {
    res.status(404).json({ error: "Farmer not found" });
    return;
  }
  res.json({
    id: farmer.id,
    name: farmer.name,
    bio: farmer.bio,
    location: farmer.location,
    imageUrl: farmer.imageUrl,
    createdAt: farmer.createdAt.toISOString(),
  });
});

router.delete("/farmers/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  await db.delete(farmersTable).where(eq(farmersTable.id, id));
  res.status(204).send();
});

export default router;
