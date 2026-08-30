import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "./context/cart";
import { Layout } from "./components/layout";
import Home from "./pages/home";
import Products from "./pages/products";
import ProductDetail from "./pages/product-detail";
import Farmers from "./pages/farmers";
import FarmerDetail from "./pages/farmer-detail";
import FarmerRegister from "./pages/farmer-register";
import Login from "./pages/login";
import FarmerPortal from "./pages/farmer-portal";
import Cart from "./pages/cart";
import Orders from "./pages/orders";
import OrderDetail from "./pages/order-detail";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/products" component={Products} />
        <Route path="/products/:id" component={ProductDetail} />
        <Route path="/login" component={Login} />
        <Route path="/farmer/portal" component={FarmerPortal} />
        <Route path="/farmers" component={Farmers} />
        <Route path="/farmers/register" component={FarmerRegister} />
        <Route path="/farmers/:id" component={FarmerDetail} />
        <Route path="/cart" component={Cart} />
        <Route path="/orders" component={Orders} />
        <Route path="/orders/:id" component={OrderDetail} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, "") || ""}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </CartProvider>
    </QueryClientProvider>
  );
}

export default App;
