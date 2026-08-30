import React from "react";
import { Link, useParams } from "wouter";
import { useGetFarmer, useListProducts, getListProductsQueryKey, getGetFarmerQueryKey } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Sprout, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "../context/cart";

export default function FarmerDetail() {
  const { id } = useParams<{ id: string }>();
  const farmerId = Number(id);
  const { data: farmer, isLoading: farmerLoading } = useGetFarmer(farmerId, { query: { enabled: !!farmerId, queryKey: getGetFarmerQueryKey(farmerId) } });
  const { data: products, isLoading: productsLoading } = useListProducts(
    { farmerId },
    { query: { enabled: !!farmerId, queryKey: getListProductsQueryKey({ farmerId }) } }
  );
  const { addItem } = useCart();

  if (farmerLoading) return (
    <div className="container mx-auto px-4 py-12 animate-pulse">
      <div className="max-w-4xl mx-auto">
        <div className="h-6 bg-muted rounded w-32 mb-8" />
        <div className="flex gap-8 mb-12">
          <div className="w-32 h-32 rounded-full bg-muted flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="h-16 bg-muted rounded" />
          </div>
        </div>
      </div>
    </div>
  );

  if (!farmer) return (
    <div className="container mx-auto px-4 py-24 text-center">
      <h2 className="text-2xl font-serif font-bold mb-4">Farmer not found</h2>
      <Button asChild><Link href="/farmers">Back to farmers</Link></Button>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-12">
      <Link href="/farmers" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-8">
        <ArrowLeft className="w-4 h-4" /> All farmers
      </Link>

      {/* Farmer profile */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row gap-8 mb-16 items-start">
        <div className="w-32 h-32 rounded-full overflow-hidden bg-primary/10 flex-shrink-0">
          {farmer.imageUrl ? (
            <img src={farmer.imageUrl} alt={farmer.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><Sprout className="w-10 h-10 text-primary/40" /></div>
          )}
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-2">{farmer.name}</h1>
          <p className="text-muted-foreground flex items-center gap-1.5 mb-4 text-sm"><MapPin className="w-4 h-4" />{farmer.location}</p>
          {farmer.bio && <p className="text-muted-foreground leading-relaxed max-w-2xl">{farmer.bio}</p>}
        </div>
      </motion.div>

      {/* Products */}
      <h2 className="text-2xl font-serif font-bold text-foreground mb-6">Products from {farmer.name}</h2>
      {productsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="rounded-xl bg-card border border-border h-64 animate-pulse" />)}
        </div>
      ) : products?.length === 0 ? (
        <p className="text-muted-foreground">No products listed yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products?.map((product, i) => (
            <motion.div key={product.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <div className="group rounded-xl bg-card border border-border overflow-hidden hover:shadow-md transition-all flex flex-col">
                <Link href={`/products/${product.id}`}>
                  <div className="h-44 overflow-hidden bg-muted">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Sprout className="w-8 h-8 text-muted-foreground/20" /></div>
                    )}
                  </div>
                </Link>
                <div className="p-4 flex flex-col flex-1">
                  <Link href={`/products/${product.id}`}>
                    <h3 className="font-serif font-semibold text-foreground hover:text-primary transition-colors line-clamp-1 mb-1">{product.name}</h3>
                  </Link>
                  <p className="text-xs text-secondary font-medium mb-3">{product.categoryName}</p>
                  <div className="mt-auto flex items-center justify-between pt-3 border-t border-border">
                    <span className="font-serif font-bold text-foreground text-sm">${product.price.toFixed(2)}<span className="text-xs font-sans font-normal text-muted-foreground">/{product.unit}</span></span>
                    <Button size="sm" disabled={!product.inStock} onClick={() => addItem(product, 1)} className="rounded-full h-7 px-2.5 text-xs gap-1">
                      <ShoppingBag className="w-3 h-3" /> Add
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
