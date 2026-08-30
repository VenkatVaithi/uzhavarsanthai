import React from "react";
import { Link } from "wouter";
import { useGetMarketStats, useGetFeaturedProducts } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { ArrowRight, Sprout, Store, Users, ShoppingBasket } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { data: stats, isLoading: statsLoading } = useGetMarketStats();
  const { data: featuredProducts, isLoading: productsLoading } = useGetFeaturedProducts();

  return (
    <div className="w-full flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full bg-card overflow-hidden relative border-b border-border/50">
        <div className="absolute inset-0 opacity-10 mix-blend-multiply bg-[url('https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=2000')] bg-cover bg-center" />
        <div className="container mx-auto px-4 py-24 md:py-32 relative z-10 text-center flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6"
          >
            <Sprout className="w-4 h-4" />
            <span>Fresh from local fields</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-serif font-bold tracking-tight text-foreground max-w-4xl mb-6 leading-tight"
          >
            The season's best, <br />
            <span className="text-primary italic">direct to your table.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10"
          >
            Support local agriculture and enjoy the freshest produce, dairy, and handcrafted goods from farmers right in your community.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center gap-4"
          >
            <Button size="lg" className="w-full sm:w-auto text-lg px-8 h-14 rounded-full" asChild>
              <Link href="/products">
                Shop the Market <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 h-14 rounded-full bg-transparent" asChild>
              <Link href="/farmers">
                Meet our Farmers
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="w-full py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-border/50">
            {[
              { label: "Local Farmers", value: stats?.totalFarmers || "-", icon: Users },
              { label: "Fresh Products", value: stats?.totalProducts || "-", icon: Store },
              { label: "Happy Orders", value: stats?.totalOrders || "-", icon: ShoppingBasket },
              { label: "Community Value", value: stats ? `$${stats.totalRevenue.toLocaleString()}` : "-", icon: Sprout },
            ].map((stat, i) => (
              <motion.div 
                key={stat.label}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex flex-col items-center text-center px-4"
              >
                <div className="w-12 h-12 rounded-full bg-secondary/10 text-secondary flex items-center justify-center mb-4">
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className="text-3xl font-serif font-bold text-foreground mb-1">
                  {statsLoading ? <div className="h-8 w-16 bg-muted animate-pulse rounded" /> : stat.value}
                </div>
                <div className="text-sm text-muted-foreground font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="w-full py-24 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">Market Highlights</h2>
              <p className="text-muted-foreground max-w-xl">Curated seasonal favorites and hand-picked goods from our most loved stalls.</p>
            </div>
            <Button variant="ghost" className="hidden md:flex" asChild>
              <Link href="/products">View all <ArrowRight className="ml-2 w-4 h-4" /></Link>
            </Button>
          </div>

          {productsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="rounded-xl bg-card border border-border overflow-hidden h-[360px] animate-pulse">
                  <div className="h-48 bg-muted" />
                  <div className="p-4 space-y-3">
                    <div className="h-5 bg-muted rounded w-2/3" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                    <div className="h-8 bg-muted rounded w-1/3 mt-4" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts?.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Link href={`/products/${product.id}`} className="group block h-full rounded-xl bg-card border border-border overflow-hidden hover:shadow-lg transition-all duration-300">
                    <div className="relative h-48 overflow-hidden bg-muted">
                      {product.imageUrl ? (
                        <img 
                          src={product.imageUrl} 
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <Sprout className="w-8 h-8 opacity-20" />
                        </div>
                      )}
                      <div className="absolute top-3 left-3 bg-background/90 backdrop-blur px-2 py-1 rounded text-xs font-bold text-foreground">
                        ${product.price.toFixed(2)} / {product.unit}
                      </div>
                    </div>
                    <div className="p-5 flex flex-col h-[calc(100%-12rem)]">
                      <h3 className="font-serif font-semibold text-lg text-foreground group-hover:text-primary transition-colors mb-1 line-clamp-1">{product.name}</h3>
                      <p className="text-sm text-muted-foreground mb-4">{product.farmerName}</p>
                      
                      <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
                        <span className="text-xs font-medium text-secondary">{product.categoryName}</span>
                        <Button size="sm" variant="secondary" className="rounded-full opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0">
                          View details
                        </Button>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
          <div className="mt-8 flex justify-center md:hidden">
            <Button variant="outline" asChild>
              <Link href="/products">View all products <ArrowRight className="ml-2 w-4 h-4" /></Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
