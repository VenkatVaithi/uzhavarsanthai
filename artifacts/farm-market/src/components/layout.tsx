import React from 'react';
import { Link, useLocation } from 'wouter';
import { ShoppingBag, Menu, X, Leaf, ChevronDown, UserPlus, LogIn, LogOut, User } from 'lucide-react';
import { useCart } from '../context/cart';
import { useAuth } from '@workspace/replit-auth-web';
import { Button } from '@/components/ui/button';

export function Layout({ children }: { children: React.ReactNode }) {
  const { totalItems } = useCart();
  const { user, isAuthenticated, login, logout } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [farmersOpen, setFarmersOpen] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const farmersRef = React.useRef<HTMLDivElement>(null);
  const userMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (farmersRef.current && !farmersRef.current.contains(e.target as Node)) {
        setFarmersOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/products', label: 'Market' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/20 selection:text-primary">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="bg-primary text-primary-foreground p-1.5 rounded-md group-hover:bg-primary/90 transition-colors">
                <Leaf className="w-5 h-5" />
              </div>
              <span className="font-serif font-bold text-xl text-foreground tracking-tight">Farmers Market</span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link 
                  key={link.href} 
                  href={link.href}
                  className={`text-sm font-medium transition-colors hover:text-primary ${location === link.href ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  {link.label}
                </Link>
              ))}

              {/* Farmers dropdown */}
              <div ref={farmersRef} className="relative">
                <button
                  onClick={() => setFarmersOpen((o) => !o)}
                  className={`flex items-center gap-1 text-sm font-medium transition-colors hover:text-primary ${location.startsWith('/farmers') ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  Farmers <ChevronDown className={`w-3.5 h-3.5 transition-transform ${farmersOpen ? 'rotate-180' : ''}`} />
                </button>
                {farmersOpen && (
                  <div className="absolute left-0 top-full mt-2 w-52 bg-background border border-border rounded-xl shadow-lg py-1.5 z-50">
                    <Link
                      href="/farmers"
                      onClick={() => setFarmersOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <Leaf className="w-4 h-4 text-primary" />
                      Browse Farmers
                    </Link>
                    <div className="my-1 border-t border-border" />
                    <Link
                      href="/farmers/register"
                      onClick={() => setFarmersOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <UserPlus className="w-4 h-4 text-primary" />
                      Register as a Farmer
                    </Link>
                  </div>
                )}
              </div>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/cart" className="relative group p-2">
              <ShoppingBag className="w-5 h-5 text-foreground group-hover:text-primary transition-colors" />
              {totalItems > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center rounded-full">
                  {totalItems}
                </span>
              )}
            </Link>

            {/* Desktop auth */}
            <div className="hidden md:block">
              {isAuthenticated && user ? (
                <div ref={userMenuRef} className="relative">
                  <button
                    onClick={() => setUserMenuOpen((o) => !o)}
                    className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 hover:bg-muted transition-colors"
                  >
                    {user.profileImageUrl ? (
                      <img src={user.profileImageUrl} alt={user.firstName ?? ''} className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <User className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="text-sm font-medium text-foreground max-w-[100px] truncate">
                      {user.firstName ?? user.email ?? 'Account'}
                    </span>
                    <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-background border border-border rounded-xl shadow-lg py-1.5 z-50">
                      <Link
                        href="/orders"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                      >
                        <ShoppingBag className="w-4 h-4 text-primary" />
                        My Orders
                      </Link>
                      <div className="my-1 border-t border-border" />
                      <button
                        onClick={() => { setUserMenuOpen(false); logout(); }}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                      >
                        <LogOut className="w-4 h-4 text-muted-foreground" />
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={login} className="gap-1.5">
                  <LogIn className="w-4 h-4" /> Sign in
                </Button>
              )}
            </div>

            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background py-4 px-4 flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link 
                key={link.href} 
                href={link.href}
                className={`text-base font-medium ${location === link.href ? 'text-primary' : 'text-muted-foreground'}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/farmers"
              className={`text-base font-medium ${location === '/farmers' ? 'text-primary' : 'text-muted-foreground'}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Farmers
            </Link>
            <Link
              href="/farmers/register"
              className={`flex items-center gap-2 text-base font-medium ${location === '/farmers/register' ? 'text-primary' : 'text-muted-foreground'}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <UserPlus className="w-4 h-4" /> Register as a Farmer
            </Link>
            <div className="border-t border-border pt-2 mt-2">
              {isAuthenticated && user ? (
                <>
                  <p className="text-xs text-muted-foreground mb-2 px-0.5">
                    Signed in as {user.firstName ?? user.email ?? 'you'}
                  </p>
                  <button
                    onClick={() => { setMobileMenuOpen(false); logout(); }}
                    className="flex items-center gap-2 text-base font-medium text-muted-foreground"
                  >
                    <LogOut className="w-4 h-4" /> Sign out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { setMobileMenuOpen(false); login(); }}
                  className="flex items-center gap-2 text-base font-medium text-muted-foreground"
                >
                  <LogIn className="w-4 h-4" /> Sign in
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>

      <footer className="border-t border-border bg-card mt-auto">
        <div className="container mx-auto px-4 py-12 text-center md:text-left">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <Link href="/" className="flex items-center gap-2 justify-center md:justify-start mb-4">
                <Leaf className="w-5 h-5 text-primary" />
                <span className="font-serif font-bold text-xl text-foreground">Farmers Market</span>
              </Link>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto md:mx-0">
                Fresh, local, and abundant. Connecting communities with the people who grow their food.
              </p>
            </div>
            <div>
              <h4 className="font-serif font-semibold text-foreground mb-4">Explore</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/products" className="text-muted-foreground hover:text-primary transition-colors">All Products</Link></li>
                <li><Link href="/farmers" className="text-muted-foreground hover:text-primary transition-colors">Meet the Farmers</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-serif font-semibold text-foreground mb-4">Account</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/cart" className="text-muted-foreground hover:text-primary transition-colors">Shopping Cart</Link></li>
                <li><Link href="/orders" className="text-muted-foreground hover:text-primary transition-colors">Order History</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-12 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Farmers Market. Built with care.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
