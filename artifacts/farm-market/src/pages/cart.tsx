import React, { useState } from "react";
import { Link } from "wouter";
import { useCreateOrder, type Order } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import {
  Trash2,
  Minus,
  Plus,
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  Sprout,
  CheckCircle2,
  Mail,
  PackageCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "../context/cart";

export default function Cart() {
  const { items, removeItem, updateQuantity, clearCart, totalPrice } = useCart();
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [step, setStep] = useState<"cart" | "checkout" | "confirmation">("cart");
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [submitError, setSubmitError] = useState("");
  const createOrder = useCreateOrder();

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (!buyerName.trim() || !buyerEmail.trim() || items.length === 0) {
      setSubmitError("Please provide your name and email before placing the order.");
      return;
    }

    try {
      const order = await createOrder.mutateAsync({
        data: {
          buyerName: buyerName.trim(),
          buyerEmail: buyerEmail.trim(),
          notes: notes.trim() || undefined,
          items: items.map(i => ({ productId: i.product.id, quantity: i.quantity })),
        },
      });
      clearCart();
      setPlacedOrder(order);
      setStep("confirmation");
    } catch (error) {
      setSubmitError(
        error instanceof Error && error.message.includes("Product")
          ? "One of the items is no longer available. Please review your cart and try again."
          : "We couldn't place your order right now. Please try again.",
      );
    }
  };

  if (items.length === 0 && step === "cart") {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <ShoppingBag className="w-16 h-16 text-muted-foreground/20 mx-auto mb-6" />
        <h2 className="text-3xl font-serif font-bold text-foreground mb-3">Your cart is empty</h2>
        <p className="text-muted-foreground mb-8">Head to the market and find something fresh.</p>
        <Button asChild size="lg" className="rounded-full px-8">
          <Link href="/products">Browse the market</Link>
        </Button>
      </div>
    );
  }

  if (step === "confirmation" && placedOrder) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-9 w-9 text-primary" />
          </div>
          <p className="mb-2 text-sm font-medium uppercase tracking-[0.18em] text-primary">
            Order received
          </p>
          <h1 className="mb-3 text-4xl font-serif font-bold text-foreground">
            Thank you, {placedOrder.buyerName.split(" ")[0]}.
          </h1>
          <p className="mx-auto max-w-md text-muted-foreground">
            Your order is on its way to the farmer. We saved the details and will
            use your email for order updates.
          </p>

          <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card text-left">
            <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-5 py-4">
              <PackageCheck className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Order #{placedOrder.id}
                </p>
                <p className="text-xs text-muted-foreground">
                  {placedOrder.items.length} item
                  {placedOrder.items.length === 1 ? "" : "s"} · Pending confirmation
                </p>
              </div>
              <span className="ml-auto font-serif text-lg font-bold text-foreground">
                ${placedOrder.totalAmount.toFixed(2)}
              </span>
            </div>
            <div className="space-y-3 px-5 py-4">
              {placedOrder.items.map((item) => (
                <div key={item.productId} className="flex justify-between gap-4 text-sm">
                  <span className="text-foreground">
                    {item.productName ?? `Product #${item.productId}`} × {item.quantity}
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    ${(item.quantity * item.priceAtOrder).toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                Confirmation for {placedOrder.buyerEmail}
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild className="rounded-full px-7">
              <Link href={`/orders/${placedOrder.id}`}>View order details</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full px-7">
              <Link href="/products">Continue shopping</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="text-4xl font-serif font-bold text-foreground mb-8">
        {step === "cart" ? "Your Cart" : "Checkout"}
      </h1>

      {step === "cart" ? (
        <>
          <div className="space-y-4 mb-8">
            {items.map((item, i) => (
              <motion.div key={item.product.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border"
              >
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {item.product.imageUrl ? (
                    <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Sprout className="w-6 h-6 text-muted-foreground/20" /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-serif font-semibold text-foreground text-sm line-clamp-1">{item.product.name}</h4>
                  <p className="text-xs text-muted-foreground">{item.product.farmerName}</p>
                  <p className="text-xs font-medium text-primary mt-0.5">${(item.product.price * item.quantity).toFixed(2)}</p>
                </div>
                <div className="flex items-center border border-border rounded-full overflow-hidden">
                  <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="w-7 h-7 flex items-center justify-center hover:bg-muted transition-colors"><Minus className="w-3 h-3" /></button>
                  <span className="w-6 text-center text-xs font-medium">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="w-7 h-7 flex items-center justify-center hover:bg-muted transition-colors"><Plus className="w-3 h-3" /></button>
                </div>
                <button onClick={() => removeItem(item.product.id)} className="text-muted-foreground hover:text-destructive transition-colors ml-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>

          <div className="border-t border-border pt-6 flex items-center justify-between mb-6">
            <div>
              <p className="text-muted-foreground text-sm">Total</p>
              <p className="text-3xl font-serif font-bold text-foreground">${totalPrice.toFixed(2)}</p>
            </div>
            <Button size="lg" onClick={() => setStep("checkout")} className="rounded-full px-8 gap-2">
              Checkout <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </>
      ) : (
        <form onSubmit={handleCheckout} className="space-y-6">
          {/* Order summary */}
          <div className="rounded-xl border border-border p-4 space-y-2 bg-muted/30 mb-2">
            {items.map(item => (
              <div key={item.product.id} className="flex justify-between text-sm">
                <span className="text-foreground">{item.product.name} × {item.quantity}</span>
                <span className="text-muted-foreground">${(item.product.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t border-border pt-2 flex justify-between font-serif font-bold text-foreground">
              <span>Total</span>
              <span>${totalPrice.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Your name</label>
              <Input value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="Jane Smith" required />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Email address</label>
              <Input type="email" value={buyerEmail} onChange={e => setBuyerEmail(e.target.value)} placeholder="jane@example.com" required />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Notes (optional)</label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any special requests..." />
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => { setSubmitError(""); setStep("cart"); }} className="rounded-full">
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
            </Button>
            <Button type="submit" size="lg" className="flex-1 rounded-full" disabled={createOrder.isPending}>
              {createOrder.isPending ? "Placing order..." : "Place order"}
            </Button>
          </div>
          {submitError && (
            <p role="alert" className="text-destructive text-sm text-center">{submitError}</p>
          )}
        </form>
      )}
    </div>
  );
}
