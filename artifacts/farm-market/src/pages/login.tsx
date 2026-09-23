import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { Leaf, Loader2, AlertCircle, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { trackEvent } from "../lib/analytics";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address").max(320),
  password: z.string().min(1, "Password is required").max(128),
});

const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(80),
  lastName: z.string().max(80).optional(),
  email: z.string().email("Please enter a valid email address").max(320),
  password: z.string().min(10, "Password must be at least 10 characters").max(128),
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

async function readErrorResponse(response: Response, fallback: string): Promise<string> {
  const contentType = response.headers.get("content-type");
  if (!contentType?.includes("application/json")) return fallback;

  try {
    const result = (await response.json()) as { error?: unknown };
    return typeof result.error === "string" ? result.error : fallback;
  } catch {
    return fallback;
  }
}

export default function Login() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error") === "email_in_use") {
      setServerError(
        "This email already has a password account. Sign in with your email and password.",
      );
    }
  }, []);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: "", lastName: "", email: "", password: "" },
  });

  const onReplitSignIn = () => {
    trackEvent("replit_login_started", {});
    window.location.href = "/api/login?returnTo=/";
  };

  const onLoginSubmit = async (data: LoginForm) => {
    try {
      setIsSubmitting(true);
      setServerError(null);

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error(
          await readErrorResponse(
            res,
            "Failed to sign in. Please check your credentials.",
          ),
        );
      }

      trackEvent("local_login_success", {});
      window.location.href = "/";
    } catch (error: unknown) {
      setServerError(getErrorMessage(error, "Failed to sign in. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onRegisterSubmit = async (data: RegisterForm) => {
    try {
      setIsSubmitting(true);
      setServerError(null);

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error(
          await readErrorResponse(
            res,
            "Failed to create account. Please try again.",
          ),
        );
      }

      trackEvent("local_register_success", {});
      window.location.href = "/";
    } catch (error: unknown) {
      setServerError(getErrorMessage(error, "Failed to create account. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = (newMode: "login" | "register") => {
    setMode(newMode);
    setServerError(null);
    loginForm.reset();
    registerForm.reset();
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 relative overflow-hidden bg-background">
      <div className="absolute top-0 left-0 w-full h-[40vh] bg-primary/5 -skew-y-3 origin-top-left -z-10" />

      <div className="w-full max-w-[440px] relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="bg-card rounded-3xl shadow-xl shadow-primary/5 border border-border overflow-hidden"
        >
          <div className="px-8 pt-10 pb-6 text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-primary/10 rounded-2xl p-4 text-primary relative">
                <Leaf className="w-10 h-10" />
                <motion.div
                   animate={{ rotate: [0, 10, 0] }}
                   transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                   className="absolute -top-1 -right-1 text-accent"
                >
                  <Sparkles className="w-5 h-5" />
                </motion.div>
              </div>
            </div>
            <h1 className="font-serif text-3xl font-bold text-foreground mb-2 tracking-tight">
              Welcome to Ulavar Santhai
            </h1>
            <p className="text-muted-foreground text-sm">
              Fresh, local, and direct from the farmers.
            </p>
          </div>

          <div className="px-8">
            <div className="flex p-1 bg-muted rounded-xl mb-8">
              <button
                type="button"
                onClick={() => switchMode("login")}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                  mode === "login"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted-foreground/5"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode("register")}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                  mode === "register"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted-foreground/5"
                }`}
              >
                Create Account
              </button>
            </div>

            <AnimatePresence mode="wait">
              {serverError && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="bg-destructive/10 text-destructive px-4 py-3 rounded-xl flex items-start gap-3 text-sm overflow-hidden"
                >
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>{serverError}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              <AnimatePresence mode="wait" initial={false}>
                {mode === "login" ? (
                  <motion.form
                    key="login"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                    className="space-y-5"
                  >
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground ml-1" htmlFor="email-login">Email Address</label>
                      <input
                        id="email-login"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        {...loginForm.register("email")}
                        className={`w-full bg-background border-2 ${loginForm.formState.errors.email ? 'border-destructive/50 focus:border-destructive' : 'border-border focus:border-primary'} rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground transition-colors outline-none focus-visible:ring-4 focus-visible:ring-primary/20`}
                      />
                      {loginForm.formState.errors.email && (
                        <p className="text-destructive text-xs ml-1 mt-1">{loginForm.formState.errors.email.message}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground ml-1" htmlFor="password-login">Password</label>
                      <input
                        id="password-login"
                        type="password"
                        autoComplete="current-password"
                        placeholder="••••••••"
                        {...loginForm.register("password")}
                        className={`w-full bg-background border-2 ${loginForm.formState.errors.password ? 'border-destructive/50 focus:border-destructive' : 'border-border focus:border-primary'} rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground transition-colors outline-none focus-visible:ring-4 focus-visible:ring-primary/20`}
                      />
                      {loginForm.formState.errors.password && (
                        <p className="text-destructive text-xs ml-1 mt-1">{loginForm.formState.errors.password.message}</p>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-primary text-primary-foreground font-medium rounded-xl py-3.5 flex items-center justify-center gap-2 hover:bg-primary/90 focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none mt-2"
                    >
                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
                    </button>
                  </motion.form>
                ) : (
                  <motion.form
                    key="register"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
                    className="space-y-5"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground ml-1" htmlFor="firstName-register">First Name</label>
                        <input
                          id="firstName-register"
                          type="text"
                          autoComplete="given-name"
                          placeholder="Jane"
                          {...registerForm.register("firstName")}
                          className={`w-full bg-background border-2 ${registerForm.formState.errors.firstName ? 'border-destructive/50 focus:border-destructive' : 'border-border focus:border-primary'} rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground transition-colors outline-none focus-visible:ring-4 focus-visible:ring-primary/20`}
                        />
                        {registerForm.formState.errors.firstName && (
                          <p className="text-destructive text-xs ml-1 mt-1">{registerForm.formState.errors.firstName.message}</p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground ml-1" htmlFor="lastName-register">Last Name <span className="text-muted-foreground font-normal">(Optional)</span></label>
                        <input
                          id="lastName-register"
                          type="text"
                          autoComplete="family-name"
                          placeholder="Doe"
                          {...registerForm.register("lastName")}
                          className="w-full bg-background border-2 border-border focus:border-primary rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground transition-colors outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground ml-1" htmlFor="email-register">Email Address</label>
                      <input
                        id="email-register"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        {...registerForm.register("email")}
                        className={`w-full bg-background border-2 ${registerForm.formState.errors.email ? 'border-destructive/50 focus:border-destructive' : 'border-border focus:border-primary'} rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground transition-colors outline-none focus-visible:ring-4 focus-visible:ring-primary/20`}
                      />
                      {registerForm.formState.errors.email && (
                        <p className="text-destructive text-xs ml-1 mt-1">{registerForm.formState.errors.email.message}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between ml-1">
                        <label className="text-sm font-medium text-foreground" htmlFor="password-register">Password</label>
                        <span className="text-xs text-muted-foreground">Min 10 characters</span>
                      </div>
                      <input
                        id="password-register"
                        type="password"
                        autoComplete="new-password"
                        placeholder="••••••••••"
                        {...registerForm.register("password")}
                        className={`w-full bg-background border-2 ${registerForm.formState.errors.password ? 'border-destructive/50 focus:border-destructive' : 'border-border focus:border-primary'} rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground transition-colors outline-none focus-visible:ring-4 focus-visible:ring-primary/20`}
                      />
                      {registerForm.formState.errors.password && (
                        <p className="text-destructive text-xs ml-1 mt-1">{registerForm.formState.errors.password.message}</p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-primary text-primary-foreground font-medium rounded-xl py-3.5 flex items-center justify-center gap-2 hover:bg-primary/90 focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none mt-2"
                    >
                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>

            <div className="py-8">
              <div className="relative flex items-center text-sm py-2">
                <div className="flex-grow border-t border-border"></div>
                <span className="shrink-0 px-4 text-muted-foreground font-medium bg-card">Or continue with</span>
                <div className="flex-grow border-t border-border"></div>
              </div>

              <button
                type="button"
                onClick={onReplitSignIn}
                disabled={isSubmitting}
                className="mt-4 w-full bg-background border-2 border-border text-foreground font-medium rounded-xl py-3.5 flex items-center justify-center gap-3 hover:border-foreground/20 hover:bg-muted/50 focus:outline-none focus:ring-4 focus:ring-foreground/5 transition-all active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
              >
                <svg viewBox="0 0 32 32" className="w-5 h-5" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7 5.5C7 4.67157 7.67157 4 8.5 4H15.5C16.3284 4 17 4.67157 17 5.5V12H8.5C7.67157 12 7 11.3284 7 10.5V5.5Z" fill="currentColor"/>
                  <path d="M24.5 12H17V19.5C17 20.3284 17.6715 21 18.5 21H24.5C25.3284 21 26 20.3284 26 19.5V13.5C26 12.6715 25.3284 12 24.5 12Z" fill="currentColor"/>
                  <path d="M7 14.5C7 13.6715 7.67157 13 8.5 13H15.5C16.3284 13 17 13.6715 17 14.5V26.5C17 27.3284 16.3284 28 15.5 28H8.5C7.67157 28 7 27.3284 7 26.5V14.5Z" fill="currentColor"/>
                </svg>
                Replit
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
