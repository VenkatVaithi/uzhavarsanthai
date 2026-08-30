import React, { useState } from "react";
import { Link, useParams } from "wouter";
import { useGetProduct, useGetFarmer, getGetProductQueryKey, getGetFarmerQueryKey } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { ArrowLeft, Sprout, MapPin, ShoppingBag, Minus, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "../context/cart";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const productId = Number(id);
  const { data: product, isLoading } = useGetProduct(productId, { query: { enabled: !!productId, queryKey: getGetProductQueryKey(productId) } });
  const { data: farmer } = useGetFarmer(product?.farmerId ?? 0, { query: { enabled: !!product?.farmerId, queryKey: getGetFarmerQueryKey(product?.farmerId ?? 0) } });
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    if (!product) return;
    addItem(product, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (isLoading) return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 animate-pulse">
        <div className="aspect-square rounded-2xl bg-muted" />
        <div className="space-y-4">
          <div className="h-8 bg-muted rounded w-2/3" />
          <div className="h-5 bg-muted rounded w-1/2" />
          <div className="h-16 bg-muted rounded" />
          <div className="h-10 bg-muted rounded w-1/3" />
        </div>
      </div>
    </div>
  );

  if (!product) return (
    <div className="container mx-auto px-4 py-24 text-center">
      <h2 className="text-2xl font-serif font-bold mb-4">Product not found</h2>
      <Button asChild><Link href="/products">Back to market</Link></Button>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-12">
      <Link href="/products" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-8">
        <ArrowLeft className="w-4 h-4" /> Back to market
      </Link>

      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Image */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          <div className="aspect-square rounded-2xl overflow-hidden bg-muted">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"><Sprout className="w-16 h-16 text-muted-foreground/20" /></div>
            )}
          </div>
        </motion.div>

        {/* Details */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="flex flex-col">
          {product.categoryName && (
            <span className="text-sm font-medium text-secondary mb-2">{product.categoryName}</span>
          )}
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-3">{product.name}</h1>

          <div className="text-3xl font-serif font-bold text-primary mb-6">
            ${product.price.toFixed(2)} <span className="text-base font-sans font-normal text-muted-foreground">/ {product.unit}</span>
          </div>

          {product.description && (
            <p className="text-muted-foreground leading-relaxed mb-8">{product.description}</p>
          )}

          {/* Farmer info */}
          <div className="flex items-center gap-3 mb-8 p-4 rounded-xl bg-muted/50 border border-border">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              {farmer?.imageUrl ? (
                <img src={farmer.imageUrl} alt={farmer.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                <Sprout className="w-5 h-5 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <Link href={`/farmers/${product.farmerId}`} className="font-medium text-foreground hover:text-primary transition-colors text-sm">{product.farmerName}</Link>
              {product.farmerLocation && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{product.farmerLocation}</p>
              )}
            </div>
            <Link href={`/farmers/${product.farmerId}`}>
              <Button variant="ghost" size="sm" className="text-xs">View farm</Button>
            </Link>
          </div>

          {/* Add to cart */}
          {product.inStock ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-border rounded-full overflow-hidden">
                <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-9 h-9 flex items-center justify-center hover:bg-muted transition-colors"><Minus className="w-4 h-4" /></button>
                <span className="w-8 text-center text-sm font-medium">{qty}</span>
                <button onClick={() => setQty(q => q + 1)} className="w-9 h-9 flex items-center justify-center hover:bg-muted transition-colors"><Plus className="w-4 h-4" /></button>
              </div>
              <Button onClick={handleAdd} className="flex-1 rounded-full gap-2" size="lg">
                {added ? <><Check className="w-4 h-4" /> Added!</> : <><ShoppingBag className="w-4 h-4" /> Add to cart</>}
              </Button>
            </div>
          ) : (
            <div className="text-center py-4 rounded-xl bg-muted text-muted-foreground font-medium">Out of stock</div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
