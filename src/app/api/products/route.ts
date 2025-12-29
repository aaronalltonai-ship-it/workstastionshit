import { NextResponse } from "next/server";

import { logError, logEvent } from "@/lib/logger";
import prisma from "@/lib/prisma";

function parseColors(colors: string | null) {
  if (!colors) return [];
  try {
    const parsed = JSON.parse(colors);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function GET() {
  const started = Date.now();
  await logEvent({ source: "products", message: "GET /api/products start" });
  try {
    const [categoryRows, productRows] = await Promise.all([
      prisma.category.findMany({ orderBy: { name: "asc" } }),
      prisma.product.findMany({ orderBy: { id: "asc" }, include: { category: true } }),
    ]);

    const products = productRows.map((product) => ({
      id: product.slug,
      name: product.name,
      description: product.description,
      price: product.priceCents / 100,
      category: product.category.name,
      badge: product.badge ?? undefined,
      rating: product.rating,
      reviews: product.reviews,
      colors: parseColors(product.colors),
      inventory: product.inventory,
      accent: product.accent,
    }));

    const categories = categoryRows.map((category) => category.name);
    const featured = products.slice(0, 3);

    await logEvent({
      source: "products",
      message: "GET /api/products success",
      durationMs: Date.now() - started,
      detail: { products: products.length, categories: categories.length },
    });

    return NextResponse.json({ products, categories, featured });
  } catch (error) {
    await logError("products", "GET /api/products failed", {
      durationMs: Date.now() - started,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ error: "Failed to load products" }, { status: 500 });
  }
}
