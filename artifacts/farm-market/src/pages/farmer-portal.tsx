import { useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { useListFarmers } from "@workspace/api-client-react";
import { Leaf, Plus, User, ArrowRight, ShoppingBag, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function FarmerPortal() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { data: farmers } = useListFarmers();
  const [, navigate] = useLocation();

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-3xl animate-pulse">
        <div className="h-8 bg-muted rounded w-48 mb-4" />
        <div className="h-4 bg-muted rounded w-72" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-lg text-center">
        <div className="flex justify-center mb-6">
          <div className="bg-primary/10 rounded-full p-5">
            <LogIn className="w-10 h-10 text-primary" />
          </div>
        </div>
        <h1 className="font-serif text-2xl font-bold text-foreground mb-3">Sign in to access the Farmer Portal</h1>
        <p className="text-muted-foreground mb-6">You need to sign in as a farmer to manage your profile and products.</p>
        <Button onClick={() => navigate("/login")} className="gap-2">
          Sign in <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  const myFarm = farmers?.find(
    (f) =>
      user &&
      (f.name.toLowerCase().includes((user.firstName ?? "").toLowerCase()) ||
        f.name.toLowerCase().includes((user.lastName ?? "").toLowerCase()))
  );

  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}`
    : user?.email ?? "Farmer";

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          {user?.profileImageUrl ? (
            <img src={user.profileImageUrl} alt={displayName} className="w-14 h-14 rounded-full object-cover border-2 border-border" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-7 h-7 text-primary" />
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">Welcome back,</p>
            <h1 className="font-serif text-2xl font-bold text-foreground">{displayName}</h1>
          </div>
        </div>

        {/* My farm card */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-5">
          <div className="flex items-center gap-2 mb-1">
            <Leaf className="w-4 h-4 text-primary" />
            <h2 className="font-serif font-bold text-foreground">Your Farm</h2>
          </div>

          {myFarm ? (
            <div className="mt-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-foreground">{myFarm.name}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{myFarm.location}</p>
                  {myFarm.bio && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{myFarm.bio}</p>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate(`/farmers/${myFarm.id}`)} className="shrink-0 gap-1.5">
                  View profile <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-4">
                You don't have a farm profile yet. Register your farm to start listing products.
              </p>
              <Button onClick={() => navigate("/farmers/register")} className="gap-2">
                <Plus className="w-4 h-4" /> Register your farm
              </Button>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <h2 className="font-serif font-bold text-foreground mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              icon: <User className="w-5 h-5 text-primary" />,
              title: "Browse Farmer Profiles",
              desc: "See how other farmers present themselves on the market.",
              action: () => navigate("/farmers"),
              label: "View farmers",
            },
            {
              icon: <Plus className="w-5 h-5 text-primary" />,
              title: "Register a Farm",
              desc: "Create or update your farm profile to list products.",
              action: () => navigate("/farmers/register"),
              label: "Register farm",
            },
            {
              icon: <ShoppingBag className="w-5 h-5 text-primary" />,
              title: "Browse the Market",
              desc: "See what other farmers are selling this season.",
              action: () => navigate("/products"),
              label: "Go to market",
            },
            {
              icon: <Leaf className="w-5 h-5 text-primary" />,
              title: "Back to Home",
              desc: "Return to the Farmers Market homepage.",
              action: () => navigate("/"),
              label: "Go home",
            },
          ].map((item) => (
            <button
              key={item.title}
              onClick={item.action}
              className="group text-left bg-card border border-border hover:border-primary rounded-xl p-5 transition-colors"
            >
              <div className="bg-primary/10 rounded-lg p-2 w-fit mb-3">{item.icon}</div>
              <p className="font-medium text-foreground text-sm mb-1">{item.title}</p>
              <p className="text-xs text-muted-foreground mb-3">{item.desc}</p>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-primary group-hover:gap-2 transition-all">
                {item.label} <ArrowRight className="w-3 h-3" />
              </span>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
