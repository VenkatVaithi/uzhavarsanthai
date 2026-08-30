import React from "react";
import { Link } from "wouter";
import { useListFarmers } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { MapPin, Sprout } from "lucide-react";

export default function Farmers() {
  const { data: farmers, isLoading } = useListFarmers();

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="text-4xl font-serif font-bold text-foreground mb-2">Our Farmers</h1>
        <p className="text-muted-foreground">Meet the people who grow your food.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="rounded-2xl bg-card border border-border overflow-hidden animate-pulse">
              <div className="h-48 bg-muted" />
              <div className="p-6 space-y-3">
                <div className="h-5 bg-muted rounded w-1/2" />
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-12 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : farmers?.length === 0 ? (
        <div className="text-center py-24">
          <Sprout className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-serif font-semibold mb-2">No farmers yet</h3>
          <p className="text-muted-foreground text-sm">Check back soon as our community grows.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {farmers?.map((farmer, i) => (
            <motion.div key={farmer.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Link href={`/farmers/${farmer.id}`} className="group block rounded-2xl bg-card border border-border overflow-hidden hover:shadow-md transition-all duration-300">
                <div className="h-48 overflow-hidden bg-muted relative">
                  {farmer.imageUrl ? (
                    <img src={farmer.imageUrl} alt={farmer.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/5">
                      <Sprout className="w-12 h-12 text-primary/30" />
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-serif font-bold text-foreground group-hover:text-primary transition-colors mb-1">{farmer.name}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mb-3">
                    <MapPin className="w-3.5 h-3.5" />{farmer.location}
                  </p>
                  {farmer.bio && (
                    <p className="text-sm text-muted-foreground line-clamp-3">{farmer.bio}</p>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
