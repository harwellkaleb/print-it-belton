import { Link } from "react-router";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-8xl font-black text-orange-500 mb-4">404</div>
        <h1 className="text-3xl font-black text-white mb-3">Page not found</h1>
        <p className="text-gray-400 mb-8 max-w-sm mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            to="/"
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-xl transition-colors"
          >
            <Home className="w-4 h-4" /> Go Home
          </Link>
          <Link
            to="/shop"
            className="flex items-center gap-2 border border-gray-700 text-gray-300 hover:text-white font-semibold px-6 py-3 rounded-xl hover:bg-gray-800 transition-colors"
          >
            <Search className="w-4 h-4" /> Browse Shop
          </Link>
        </div>
      </div>
    </div>
  );
}
