import { Link, useParams, useLocation } from "wouter";
import { useGetOrder, getGetOrderQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  Package,
  LogIn,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const statusConfig: Record<
  string,
  { label: string; color: string; Icon: React.ElementType; description: string }
> = {
  pending: {
    label: "Pending",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    Icon: Clock,
    description: "Your order has been received and is awaiting confirmation.",
  },
  confirmed: {
    label: "Confirmed",
    color: "bg-primary/10 text-primary border-primary/20",
    Icon: CheckCircle2,
    description: "Your order has been confirmed by the farmer.",
  },
  shipped: {
    label: "On its way",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    Icon: Truck,
    description: "Your order is on its way to you.",
  },
  delivered: {
    label: "Delivered",
    color: "bg-green-50 text-green-700 border-green-200",
    Icon: CheckCircle2,
    description: "Your order has been delivered. Enjoy your fresh produce!",
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-muted text-muted-foreground border-border",
    Icon: XCircle,
    description: "This order has been cancelled.",
  },
};

const steps = ["pending", "confirmed", "shipped", "delivered"] as const;

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const orderId = Number(id);
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  const { data: order, isLoading: orderLoading } = useGetOrder(orderId, {
    query: {
      enabled: !!orderId && isAuthenticated,
      queryKey: getGetOrderQueryKey(orderId),
    },
  });

  if (authLoading || orderLoading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl animate-pulse">
        <div className="h-5 bg-muted rounded w-24 mb-8" />
        <div className="h-8 bg-muted rounded w-1/2 mb-4" />
        <div className="h-4 bg-muted rounded w-36 mb-8" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-card border border-border rounded-xl" />
          ))}
        </div>
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
          Sign in to view this order
        </h1>
        <p className="text-muted-foreground mb-6">
          Order details are only visible to the buyer who placed them.
        </p>
        <Button onClick={() => navigate("/login")} className="gap-2">
          Sign in <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-24 text-center max-w-lg">
        <div className="flex justify-center mb-6">
          <div className="bg-muted rounded-full p-5">
            <Package className="w-10 h-10 text-muted-foreground/40" />
          </div>
        </div>
        <h2 className="text-2xl font-serif font-bold mb-3">Order not found</h2>
        <p className="text-muted-foreground mb-6">
          This order doesn't exist or doesn't belong to your account.
        </p>
        <Button asChild variant="outline">
          <Link href="/orders">Back to your orders</Link>
        </Button>
      </div>
    );
  }

  const cfg = statusConfig[order.status] ?? statusConfig.pending;
  const { Icon } = cfg;
  const currentStepIdx = steps.indexOf(order.status as (typeof steps)[number]);
  const isCancelled = order.status === "cancelled";

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <Link
        href="/orders"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" /> Your orders
      </Link>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        {/* Title row */}
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="font-serif text-3xl font-bold text-foreground">
            Order #{order.id}
          </h1>
          <span
            className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full border ${cfg.color}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {cfg.label}
          </span>
        </div>
        <p className="text-muted-foreground text-sm mb-8">
          Placed on{" "}
          {new Date(order.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>

        {/* Status banner */}
        <div
          className={`flex items-center gap-3 rounded-xl p-4 mb-8 border ${cfg.color}`}
        >
          <Icon className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{cfg.description}</p>
        </div>

        {/* Progress stepper */}
        {!isCancelled && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              {steps.map((s, idx) => {
                const active = idx <= currentStepIdx;
                const StepIcon =
                  statusConfig[s]?.Icon ?? Clock;
                return (
                  <div key={s} className="flex flex-col items-center flex-1 relative">
                    {idx < steps.length - 1 && (
                      <div
                        className={`absolute top-4 left-1/2 w-full h-0.5 ${
                          active && idx < currentStepIdx ? "bg-primary" : "bg-muted"
                        }`}
                      />
                    )}
                    <div
                      className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                        active
                          ? "bg-primary border-primary text-primary-foreground"
                          : "bg-card border-muted text-muted-foreground"
                      }`}
                    >
                      <StepIcon className="w-3.5 h-3.5" />
                    </div>
                    <p
                      className={`text-xs mt-1.5 font-medium capitalize ${
                        active ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {statusConfig[s]?.label ?? s}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Buyer info */}
        <div className="rounded-xl bg-muted/30 border border-border p-5 mb-6">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2">
            Delivery details
          </p>
          <p className="font-medium text-foreground text-sm">{order.buyerName}</p>
          <p className="text-muted-foreground text-sm">{order.buyerEmail}</p>
          {order.notes && (
            <p className="text-muted-foreground text-sm italic mt-1">
              "{order.notes}"
            </p>
          )}
        </div>

        {/* Items */}
        <h2 className="text-lg font-serif font-semibold text-foreground mb-3">
          Items ordered
        </h2>
        <div className="space-y-3 mb-6">
          {order.items.map((item, i) => (
            <motion.div
              key={item.productId}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-center justify-between p-4 rounded-xl bg-card border border-border"
            >
              <div>
                <p className="font-medium text-foreground text-sm">
                  {item.productName ?? `Product #${item.productId}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.quantity} {item.unit} × ${item.priceAtOrder.toFixed(2)}
                </p>
              </div>
              <span className="font-serif font-bold text-foreground text-sm">
                ${(item.quantity * item.priceAtOrder).toFixed(2)}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Total */}
        <div className="border-t border-border pt-5 flex items-center justify-between mb-8">
          <span className="font-medium text-muted-foreground">Total</span>
          <span className="text-2xl font-serif font-bold text-foreground">
            ${order.totalAmount.toFixed(2)}
          </span>
        </div>

        <div className="flex gap-3 flex-wrap">
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/orders">
              <ArrowLeft className="w-4 h-4 mr-1.5" /> All orders
            </Link>
          </Button>
          <Button asChild className="rounded-full">
            <Link href="/products">Continue shopping</Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
