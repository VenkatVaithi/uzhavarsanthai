import React, { useState } from "react";
import { useLocation } from "wouter";
import { useCreateFarmer } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Leaf, MapPin, User, FileText, ArrowRight, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export default function FarmerRegister() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [farmerId, setFarmerId] = useState<number | null>(null);

  const [form, setForm] = useState({
    name: "",
    location: "",
    bio: "",
  });

  const [errors, setErrors] = useState<Partial<typeof form>>({});

  const { mutate: createFarmer, isPending } = useCreateFarmer();

  function validate() {
    const errs: Partial<typeof form> = {};
    if (!form.name.trim()) errs.name = "Farm name is required";
    if (!form.location.trim()) errs.location = "Location is required";
    return errs;
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    createFarmer(
      { data: { name: form.name.trim(), location: form.location.trim(), bio: form.bio.trim() || undefined } },
      {
        onSuccess: (farmer) => {
          setFarmerId(farmer.id);
          setSubmitted(true);
        },
        onError: () => {
          toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
        },
      }
    );
  }

  if (submitted && farmerId) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-lg text-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
          <div className="flex justify-center mb-6">
            <div className="bg-primary/10 rounded-full p-5">
              <CheckCircle2 className="w-12 h-12 text-primary" />
            </div>
          </div>
          <h1 className="font-serif text-3xl font-bold text-foreground mb-3">Welcome to Uzhavar Santhai!</h1>
          <p className="text-muted-foreground mb-8">
            <span className="font-medium text-foreground">{form.name}</span> has been registered. You can now view your farmer profile and start adding products.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => navigate(`/farmers/${farmerId}`)} className="gap-2">
              View your profile <ArrowRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={() => navigate("/farmers")}>
              Browse all farmers
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-primary/10 rounded-full p-2">
            <Leaf className="w-5 h-5 text-primary" />
          </div>
          <span className="text-sm font-medium text-primary uppercase tracking-widest">Sell on Uzhavar Santhai</span>
        </div>
        <h1 className="font-serif text-4xl font-bold text-foreground mb-2">Register as a Farmer</h1>
        <p className="text-muted-foreground mb-10">
          Join our community of local growers. Share your story, list your products, and connect directly with buyers in your area.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {[
            { icon: <User className="w-5 h-5" />, title: "Your profile", desc: "Introduce your farm to local buyers" },
            { icon: <Leaf className="w-5 h-5" />, title: "List products", desc: "Add what you grow or make" },
            { icon: <MapPin className="w-5 h-5" />, title: "Sell locally", desc: "Connect with your community" },
          ].map((step) => (
            <div key={step.title} className="bg-card border border-border rounded-xl p-4 text-center">
              <div className="flex justify-center mb-2 text-primary">{step.icon}</div>
              <p className="font-medium text-sm text-foreground">{step.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-card border border-border rounded-2xl p-8">
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-1.5 text-sm font-medium">
              <User className="w-3.5 h-3.5 text-muted-foreground" /> Farm or Business Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Sunrise Valley Farm"
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-1.5 text-sm font-medium">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground" /> Location <span className="text-destructive">*</span>
            </Label>
            <Input
              id="location"
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="e.g. Portland, OR"
              className={errors.location ? "border-destructive" : ""}
            />
            {errors.location && <p className="text-xs text-destructive">{errors.location}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio" className="flex items-center gap-1.5 text-sm font-medium">
              <FileText className="w-3.5 h-3.5 text-muted-foreground" /> About your farm <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="bio"
              name="bio"
              value={form.bio}
              onChange={handleChange}
              placeholder="Tell buyers about your farm, what you grow, and what makes you special…"
              rows={4}
            />
          </div>

          <Button type="submit" disabled={isPending} className="w-full gap-2 text-base py-5">
            {isPending ? "Registering…" : "Register my farm"}
            {!isPending && <ArrowRight className="w-4 h-4" />}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
