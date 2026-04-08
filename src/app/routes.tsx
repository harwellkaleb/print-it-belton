import { createBrowserRouter } from "react-router";
import RootLayout from "./components/RootLayout";
import { Layout } from "./components/Layout";
import ManagerLayout from "./pages/manager/ManagerLayout";
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Account from "./pages/Account";
import NotFound from "./pages/NotFound";
import ManagerDashboard from "./pages/manager/ManagerDashboard";
import ImageManagement from "./pages/manager/ImageManagement";
import OrderManagement from "./pages/manager/OrderManagement";
import ManagerSettings from "./pages/manager/ManagerSettings";
import OrderTracking from "./pages/OrderTracking";

export const router = createBrowserRouter([
  {
    Component: RootLayout,
    children: [
      {
        path: "/",
        Component: Layout,
        children: [
          { index: true, Component: Home },
          { path: "shop", Component: Shop },
          { path: "product/:id", Component: ProductDetail },
          { path: "cart", Component: Cart },
          { path: "checkout", Component: Checkout },
          { path: "login", Component: Login },
          { path: "signup", Component: Signup },
          { path: "account", Component: Account },
          { path: "track/:id", Component: OrderTracking },
          { path: "*", Component: NotFound },
        ],
      },
      {
        path: "/manager",
        Component: ManagerLayout,
        children: [
          { index: true, Component: ManagerDashboard },
          { path: "images", Component: ImageManagement },
          { path: "orders", Component: OrderManagement },
          { path: "settings", Component: ManagerSettings },
        ],
      },
    ],
  },
]);