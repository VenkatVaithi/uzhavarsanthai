import React, { useState } from "react";
import { Link } from "wouter";
import { useListProducts, useListCategories, useListFarmers } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Search, Sprout, Filter, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "../context/cart";

export default function Products() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [farmerId, setFarmerId] = useState<number | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchTimeout = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { data: products, isLoading } = useListProducts({ categoryId: categoryId ?? undefined, farmerId: farmerId ?? undefined, search: debouncedSearch || undefined });
  const { data: categories } = useListCategories();
  const { data: farmers } = useListFarmers();
  const { addItem } = useCart();

  const handleSearch = (val: string) => {
    setSearch(val);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setDebouncedSearch(val), 400);
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="text-4xl font-serif font-bold text-foreground mb-2">The Market</h1>
        <p className="text-muted-foreground">Fresh from local farms, delivered to your door.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setCategoryId(null)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${categoryId === null ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary hover:text-primary"}`}
          >
            All
          </button>
          {categories?.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategoryId(cat.id === categoryId ? null : cat.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${categoryId === cat.id ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary hover:text-primary"}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Farmer filter */}
      {farmers && farmers.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-8 items-center">
          <span className="text-sm text-muted-foreground flex items-center gap-1"><Filter className="w-3.5 h-3.5" /> By farmer:</span>
          <button
            onClick={() => setFarmerId(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${farmerId === null ? "bg-secondary text-secondary-foreground border-secondary" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            All farmers
          </button>
          {farmers.map(f => (
            <button
              key={f.id}
              onClick={() => setFarmerId(f.id === farmerId ? null : f.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${farmerId === f.id ? "bg-secondary text-secondary-foreground border-secondary" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              {f.name}
            </button>
          ))}
        </div>
      )}

      {/* Products grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="rounded-xl bg-card border border-border overflow-hidden animate-pulse">
              <div className="h-48 bg-muted" />
              <div className="p-4 space-y-2">
                <div className="h-5 bg-muted rounded w-2/3" />
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-4 bg-muted rounded w-1/4 mt-2" />
              </div>
            </div>
          ))}
        </div>
      ) : products?.length === 0 ? (
        <div className="text-center py-24">
          <Sprout className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-serif font-semibold text-foreground mb-2">Nothing found</h3>
          <p className="text-muted-foreground text-sm">Try adjusting your filters or search terms.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products?.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <div className="group rounded-xl bg-card border border-border overflow-hidden hover:shadow-md transition-all duration-300 flex flex-col h-full">
                <Link href={`/products/${product.id}`} className="block">
                  <div className="relative h-48 overflow-hidden bg-muted">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Sprout className="w-8 h-8 text-muted-foreground/20" /></div>
                    )}
                    {!product.inStock && (
                      <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                        <span className="text-sm font-medium text-muted-foreground">Out of stock</span>
                      </div>
                    )}
                    {product.featured && (
                      <span className="absolute top-2 right-2 bg-accent text-accent-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">Featured</span>
                    )}
                  </div>
                </Link>
                <div className="p-4 flex flex-col flex-1">
                  <Link href={`/products/${product.id}`}>
                    <h3 className="font-serif font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1 mb-1">{product.name}</h3>
                  </Link>
                  <p className="text-xs text-muted-foreground mb-1">{product.farmerName} · {product.farmerLocation}</p>
                  <p className="text-xs text-secondary font-medium mb-3">{product.categoryName}</p>
                  <div className="mt-auto flex items-center justify-between pt-3 border-t border-border">
                    <span className="font-serif font-bold text-foreground">${product.price.toFixed(2)}<span className="text-xs font-sans font-normal text-muted-foreground">/{product.unit}</span></span>
                    <Button
                      size="sm"
                      disabled={!product.inStock}
                      onClick={() => addItem(product, 1)}
                      className="rounded-full h-8 px-3 text-xs gap-1"
                    >
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
