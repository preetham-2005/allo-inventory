'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Warehouse {
  warehouseId: string;
  warehouseName: string;
  location: string;
  totalUnits: number;
  reservedUnits: number;
  availableUnits: number;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  createdAt: string;
  warehouses: Warehouse[];
}

interface CartItem {
  productId: string;
  warehouseId: string;
  quantity: number;
  product: Product;
  warehouse: Warehouse;
}

export default function Home() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isReserving, setIsReserving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictItems, setConflictItems] = useState<string[]>([]);
  const [darkMode, setDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      const data = await response.json();
      if (data.success) {
        setProducts(data.products);
        setError(null);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load dark mode preference from localStorage
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(isDarkMode);
    setMounted(true);
    
    // Apply dark mode to document
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', String(newDarkMode));
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const addToCart = (product: Product, warehouse: Warehouse) => {
    if (warehouse.availableUnits <= 0) {
      toast.error('This item is out of stock');
      return;
    }

    const existingItem = cart.find(
      (item) => item.productId === product.id && item.warehouseId === warehouse.warehouseId
    );

    if (existingItem) {
      if (existingItem.quantity >= warehouse.availableUnits) {
        toast.error('Not enough inventory for this quantity');
        return;
      }
      setCart(
        cart.map((item) =>
          item === existingItem ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          productId: product.id,
          warehouseId: warehouse.warehouseId,
          quantity: 1,
          product,
          warehouse,
        },
      ]);
    }

    toast.success('Added to cart');
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const updateQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(index);
      return;
    }

    const item = cart[index];
    if (quantity > item.warehouse.availableUnits) {
      toast.error('Not enough inventory');
      return;
    }

    const newCart = [...cart];
    newCart[index].quantity = quantity;
    setCart(newCart);
  };

  const handleReserve = async () => {
    if (cart.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    setIsReserving(true);
    setError(null);
    setConflictItems([]);

    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: cart.map((item) => ({
            productId: item.productId,
            warehouseId: item.warehouseId,
            quantity: item.quantity,
          })),
        }),
      });

      if (response.status === 409) {
        const errorData = await response.json();
        const errorMsg = errorData.error || 'Inventory conflict occurred';
        
        // Extract product name from error message
        const conflictItem = errorMsg;
        setError(errorMsg);
        setConflictItems([conflictItem]);
        
        // Refresh inventory to show current availability
        await fetchProducts();
        
        toast.error('Reservation failed - inventory updated');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        const errorMsg = errorData.error || 'Failed to create reservation';
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      const data = await response.json();
      const reservationId = data.reservation.id;

      toast.success('Reservation created! Proceeding to checkout...');
      setCart([]);
      setError(null);
      setConflictItems([]);

      // Redirect to reservation page
      setTimeout(() => {
        router.push(`/reservation/${reservationId}`);
      }, 1000);
    } catch (error) {
      console.error('Error creating reservation:', error);
      const errorMsg = 'An unexpected error occurred';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsReserving(false);
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-black">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">📦</div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Loading products...</p>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">Please wait</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-black">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">📦</span>
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-400 dark:to-blue-500 bg-clip-text text-transparent">
                  Inventory & Reservations
                </h1>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Discover our products, manage reservations efficiently
              </p>
            </div>
            {mounted && (
              <button
                onClick={toggleDarkMode}
                className="ml-4 p-2.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition-all duration-200 transform hover:scale-110 active:scale-95 flex items-center justify-center"
                title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Error Alert - Enhanced */}
        {error && (
          <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-300 p-5 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950/40 dark:to-red-900/40 border border-red-200 dark:border-red-800 rounded-xl shadow-lg backdrop-blur-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="text-2xl mt-0.5">⚠️</div>
                <div className="flex-1">
                  <h3 className="font-bold text-red-900 dark:text-red-100 mb-1">
                    Inventory Conflict
                  </h3>
                  <p className="text-red-800 dark:text-red-200 text-sm leading-relaxed mb-3">
                    {error}
                  </p>
                  {conflictItems.length > 0 && (
                    <div className="text-sm text-red-700 dark:text-red-300 bg-white/40 dark:bg-black/40 rounded-lg p-3">
                      <p className="font-semibold mb-2">Affected Items:</p>
                      <ul className="space-y-1 ml-2">
                        {conflictItems.map((item, idx) => (
                          <li key={idx} className="flex gap-2">
                            <span>•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setError(null);
                  setConflictItems([]);
                }}
                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex-shrink-0 text-2xl transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={fetchProducts}
                className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all transform hover:scale-105"
              >
                🔄 Refresh Inventory
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Products Section */}
          <div className="lg:col-span-2">
            <div className="space-y-5">
              {products.length === 0 ? (
                <div className="p-12 bg-white dark:bg-slate-900 rounded-2xl text-center border border-slate-200 dark:border-slate-800">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-slate-600 dark:text-slate-400">No products available</p>
                </div>
              ) : (
                products.map((product, idx) => (
                  <div
                    key={product.id}
                    className="group bg-white dark:bg-slate-900/50 rounded-2xl shadow-sm hover:shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-300 hover:border-blue-300 dark:hover:border-blue-700/50"
                  >
                    {/* Product Header with Gradient */}
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800/50 dark:to-slate-900/50">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">{'🏪'}</span>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {product.name}
                            </h2>
                          </div>
                          <p className="text-xs font-mono px-2 py-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded w-fit">
                            {product.sku}
                          </p>
                        </div>
                        <span className="text-3xl">#{idx + 1}</span>
                      </div>
                    </div>

                    {/* Warehouses Grid */}
                    <div className="p-6">
                      <div className="grid gap-3">
                        {product.warehouses.map((warehouse) => {
                          const stockPercentage = (warehouse.availableUnits / warehouse.totalUnits) * 100;
                          const isLowStock = warehouse.availableUnits < 10;
                          const isOutOfStock = warehouse.availableUnits === 0;

                          return (
                            <div
                              key={warehouse.warehouseId}
                              className="group/warehouse p-4 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/40 dark:to-slate-900/40 border border-slate-200 dark:border-slate-700/50 hover:border-blue-300 dark:hover:border-blue-700/50 transition-all duration-200"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-lg">📍</span>
                                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                                      {warehouse.warehouseName}
                                    </p>
                                  </div>
                                  <p className="text-sm text-slate-600 dark:text-slate-400 ml-6">
                                    {warehouse.location}
                                  </p>
                                </div>
                                {/* Stock Badge */}
                                <div className={`px-3 py-1 rounded-lg font-semibold text-xs whitespace-nowrap ${
                                  isOutOfStock
                                    ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                                    : isLowStock
                                    ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                                    : 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                                }`}>
                                  {warehouse.availableUnits === 0 ? 'Out of Stock' : `${warehouse.availableUnits} Available`}
                                </div>
                              </div>

                              {/* Stock Bar */}
                              <div className="mb-3">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                    Stock Level
                                  </span>
                                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    {warehouse.availableUnits} / {warehouse.totalUnits}
                                  </span>
                                </div>
                                <div className="h-2 bg-slate-300 dark:bg-slate-700 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      isOutOfStock
                                        ? 'bg-red-500'
                                        : isLowStock
                                        ? 'bg-amber-500'
                                        : 'bg-gradient-to-r from-green-400 to-emerald-500'
                                    }`}
                                    style={{ width: `${Math.max(5, stockPercentage)}%` }}
                                  />
                                </div>
                              </div>

                              {/* Add to Cart Button */}
                              <button
                                onClick={() => addToCart(product, warehouse)}
                                disabled={warehouse.availableUnits <= 0}
                                className={`w-full py-2.5 px-4 rounded-lg font-semibold text-sm transition-all duration-200 transform ${
                                  warehouse.availableUnits <= 0
                                    ? 'bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md hover:shadow-lg hover:scale-105 active:scale-95'
                                }`}
                              >
                                {warehouse.availableUnits <= 0 ? '❌ Out of Stock' : '🛒 Add to Cart'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Cart Section */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-900/50 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden sticky top-24 transition-all hover:shadow-xl">
              {/* Cart Header */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-slate-800/50 dark:to-slate-900/50">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🛍️</span>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                    Cart
                  </h2>
                  {cart.length > 0 && (
                    <span className="ml-auto bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      {cart.length} items
                    </span>
                  )}
                </div>
              </div>

              <div className="p-6">
              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-5xl mb-3">📭</div>
                  <p className="text-slate-600 dark:text-slate-400 font-medium">
                    Your cart is empty
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                    Add items to get started
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-6 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                    {cart.map((item, index) => {
                      const currentProduct = products.find(
                        (p) => p.id === item.productId
                      );
                      const currentWarehouse = currentProduct?.warehouses.find(
                        (w) => w.warehouseId === item.warehouseId
                      );
                      const hasConflict =
                        currentWarehouse &&
                        item.quantity > currentWarehouse.availableUnits;

                      return (
                        <div
                          key={index}
                          className={`p-4 rounded-xl border transition-all duration-200 ${
                            hasConflict
                              ? 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800/50 shadow-md'
                              : 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800/40 dark:to-slate-900/40 border-blue-200 dark:border-slate-700/50'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">
                                {item.product.name}
                              </p>
                              <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                                {item.warehouse.warehouseName}
                              </p>
                              {hasConflict && (
                                <p className="text-xs text-red-600 dark:text-red-400 font-semibold mt-1.5 flex items-center gap-1">
                                  <span>⚠️</span> Only {currentWarehouse?.availableUnits} left
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => removeFromCart(index)}
                              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors flex-shrink-0 ml-2 text-lg"
                            >
                              ✕
                            </button>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <button
                              onClick={() =>
                                updateQuantity(index, item.quantity - 1)
                              }
                              className="flex-1 py-2 px-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-300 transition-all transform hover:scale-105 active:scale-95"
                            >
                              −
                            </button>
                            <span className="flex-1 text-center font-bold text-lg text-slate-900 dark:text-slate-50 bg-white/50 dark:bg-slate-800/50 py-2 rounded-lg">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateQuantity(index, item.quantity + 1)
                              }
                              disabled={
                                item.quantity >=
                                (currentWarehouse?.availableUnits ||
                                  item.warehouse.availableUnits)
                              }
                              className={`flex-1 py-2 px-2 rounded-lg text-sm font-bold transition-all transform ${
                                item.quantity >=
                                (currentWarehouse?.availableUnits ||
                                  item.warehouse.availableUnits)
                                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                                  : 'bg-blue-200 dark:bg-blue-900/50 hover:bg-blue-300 dark:hover:bg-blue-800/50 text-blue-700 dark:text-blue-300 hover:scale-105 active:scale-95'
                              }`}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Cart Summary */}
                  <div className="space-y-4">
                    <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          Total Items
                        </span>
                        <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-400 dark:to-blue-500 bg-clip-text text-transparent">
                          {cartTotal}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-500">
                        Ready for checkout
                      </p>
                    </div>

                    {error && (
                      <div className="p-3 bg-red-100 dark:bg-red-950/40 border border-red-300 dark:border-red-800/50 rounded-lg">
                        <p className="text-xs text-red-700 dark:text-red-300 font-medium">
                          ⚠️ Resolve issues before checkout
                        </p>
                      </div>
                    )}

                    <button
                      onClick={handleReserve}
                      disabled={isReserving || error !== null}
                      className={`w-full font-bold py-3 px-4 rounded-xl transition-all duration-200 transform text-white text-sm flex items-center justify-center gap-2 ${
                        isReserving || error !== null
                          ? 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed'
                          : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95'
                      }`}
                    >
                      {isReserving ? (
                        <>
                          <span className="animate-spin">⏳</span>
                          Reserving...
                        </>
                      ) : error ? (
                        <>
                          <span>⚠️</span>
                          Fix Issues
                        </>
                      ) : (
                        <>
                          <span>✓</span>
                          Proceed to Checkout
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
