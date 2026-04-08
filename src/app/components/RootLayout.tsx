import { Outlet } from "react-router";

/**
 * RootLayout is the top-most route component.
 * AuthProvider, CartProvider, and Toaster now live in App.tsx above the
 * RouterProvider so they are available to every route unconditionally.
 */
export default function RootLayout() {
  return <Outlet />;
}
