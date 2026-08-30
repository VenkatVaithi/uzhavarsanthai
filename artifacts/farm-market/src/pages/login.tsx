import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { ShoppingBag, Leaf, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

function loginAs(role: "consumer" | "farmer") {
  const returnTo = role === "farmer" ? "/farmer/portal" : "/";
  window.location.href = `/api/login?returnTo=${encodeURIComponent(returnTo)}`;
}

export default function Login() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, isLoading, navigate]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="text-center mb-10">
            <div className="flex justify-center mb-5">
              <div className="bg-primary/10 rounded-2xl p-4">
                <Leaf className="w-10 h-10 text-primary" />
              </div>
            </div>
            <h1 className="font-serif text-3xl font-bold text-foreground mb-2">
              Sign in to Farmers Market
            </h1>
            <p className="text-muted-foreground">
              Tell us who you are so we can get you to the right place.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Consumer card */}
            <motion.button
              onClick={() => loginAs("consumer")}
              disabled={isLoading}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
              className="group text-left bg-card border-2 border-border hover:border-primary rounded-2xl p-8 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="bg-primary/10 rounded-xl p-3 w-fit mb-5 group-hover:bg-primary/20 transition-colors">
                <ShoppingBag className="w-7 h-7 text-primary" />
              </div>
              <h2 className="font-serif text-xl font-bold text-foreground mb-2">
                I'm a Shopper
              </h2>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                Browse fresh produce, dairy, meats, and handmade goods. Add items to your cart and support local farms.
              </p>
              <ul className="space-y-1.5 text-sm text-muted-foreground mb-8">
                {["Browse the full market", "Track your orders", "Discover local farmers"].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary group-hover:gap-2.5 transition-all">
                Continue as shopper <ArrowRight className="w-4 h-4" />
              </span>
            </motion.button>

            {/* Farmer card */}
            <motion.button
              onClick={() => loginAs("farmer")}
              disabled={isLoading}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
              className="group text-left bg-card border-2 border-border hover:border-accent rounded-2xl p-8 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <div className="bg-accent/20 rounded-xl p-3 w-fit mb-5 group-hover:bg-accent/30 transition-colors">
                <Leaf className="w-7 h-7 text-accent-foreground" />
              </div>
              <h2 className="font-serif text-xl font-bold text-foreground mb-2">
                I'm a Farmer
              </h2>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                List your products, manage your farm profile, and connect directly with buyers in your community.
              </p>
              <ul className="space-y-1.5 text-sm text-muted-foreground mb-8">
                {["Manage your farm profile", "List products for sale", "Reach local buyers"].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-foreground group-hover:gap-2.5 transition-all">
                Continue as farmer <ArrowRight className="w-4 h-4" />
              </span>
            </motion.button>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-8">
            Already have an account? Just pick your role — you'll be signed in automatically.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
