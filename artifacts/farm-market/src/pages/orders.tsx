import { Link, useLocation } from "wouter";
import { useListOrders, getListOrdersQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { motion } from "framer-motion";
import {
  ShoppingBag,
  ArrowRight,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const statusConfig: Record<
  string,
  { label: string; color: string; Icon: React.ElementType }
> = {
  pending: {
    label: "Pending",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    Icon: Clock,
  },
  confirmed: {
    label: "Confirmed",
    color: "bg-primary/10 text-primary border-primary/20",
    Icon: CheckCircle2,
  },
  shipped: {
    label: "Shipped",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    Icon: Truck,
  },
  delivered: {
    label: "Delivered",
    color: "bg-green-50 text-green-700 border-green-200",
    Icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-muted text-muted-foreground border-border",
    Icon: XCircle,
  },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? statusConfig.pending;
  const { Icon } = cfg;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border capitalize ${cfg.color}`}
    >
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

export default function Orders() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  const params = { buyerEmail: user?.email ?? "" };
  const { data: orders, isLoading: ordersLoading } = useListOrders(params, {
    query: {
      enabled: !!user?.email,
      queryKey: getListOrdersQueryKey(params),
    },
  });

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-3xl space-y-4 animate-pulse">
        <div className="h-8 bg-muted rounded w-48" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-card border border-border rounded-xl" />
        ))}
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
        <h1 className="font-serif text-2xl font-bold text-foreground mb-3">
          Sign in to view your orders
        </h1>
        <p className="text-muted-foreground mb-6">
          Your order history is tied to your account. Sign in to see everything you've ordered.
        </p>
        <Button onClick={() => navigate("/login")} className="gap-2">
          Sign in <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  const isLoading = ordersLoading;
  const displayName = user?.firstName ?? user?.email ?? "there";

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-4xl font-bold text-foreground mb-1">
          Your Orders
        </h1>
        <p className="text-muted-foreground">
          Hi {displayName} — here's everything you've ordered from the market.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 bg-card border border-border rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : orders?.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-24"
        >
          <div className="flex justify-center mb-6">
            <div className="bg-muted rounded-full p-6">
              <Package className="w-12 h-12 text-muted-foreground/40" />
            </div>
          </div>
          <h3 className="text-xl font-serif font-bold text-foreground mb-3">
            No orders yet
          </h3>
          <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
            When you place your first order, it'll show up here so you can track
            it from farm to door.
          </p>
          <Button asChild className="rounded-full px-8">
            <Link href="/products">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Shop the market
            </Link>
          </Button>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {orders?.map((order, i) => {
            const cfg = statusConfig[order.status] ?? statusConfig.pending;
            const { Icon } = cfg;
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  href={`/orders/${order.id}`}
                  className="block rounded-xl bg-card border border-border hover:border-primary hover:shadow-md transition-all group p-5"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 rounded-lg p-2 shrink-0">
                        <ShoppingBag className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-serif font-semibold text-foreground group-hover:text-primary transition-colors">
                          Order #{order.id}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }
                          )}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>

                  {/* Progress track */}
                  <div className="flex items-center gap-1 mb-4">
                    {["pending", "confirmed", "shipped", "delivered"].map(
                      (s, idx) => {
                        const steps = [
                          "pending",
                          "confirmed",
                          "shipped",
                          "delivered",
                        ];
                        const currentIdx = steps.indexOf(order.status);
                        const active =
                          order.status !== "cancelled" && idx <= currentIdx;
                        return (
                          <div
                            key={s}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              active ? "bg-primary" : "bg-muted"
                            }`}
                          />
                        );
                      }
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Icon className="w-4 h-4" />
                      <span>
                        {order.items.length} item
                        {order.items.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-serif font-bold text-foreground">
                        ${order.totalAmount.toFixed(2)}
                      </span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}

      {orders && orders.length > 0 && (
        <div className="mt-10 text-center">
          <Button asChild variant="outline" className="rounded-full px-8">
            <Link href="/products">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Continue shopping
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
