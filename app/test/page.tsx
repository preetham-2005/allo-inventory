'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  sku: string;
  inventory: number;
}

export default function TestPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [lastResult, setLastResult] = useState<any>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      const data = await response.json();
      setProducts(data.products || []);
      if (data.products?.length > 0) {
        setSelectedProduct(data.products[0].id);
      }
    } catch (error) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleReserve = async () => {
    if (!selectedProduct || quantity <= 0) {
      toast.error('Please select a product and quantity');
      return;
    }

    setReserving(true);
    const startTime = Date.now();

    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [
            {
              productId: selectedProduct,
              quantity,
            },
          ],
        }),
      });

      const data = await response.json();
      const duration = Date.now() - startTime;

      const result = {
        status: response.status,
        statusText: response.statusText,
        data,
        duration,
        timestamp: new Date().toLocaleTimeString(),
      };

      setLastResult(result);

      if (response.ok) {
        toast.success(`✅ Reservation created! (${duration}ms)`);
      } else if (response.status === 409) {
        toast.error(`⚠️ Conflict: ${data.error} (${duration}ms)`);
      } else {
        toast.error(`❌ Error: ${data.error} (${duration}ms)`);
      }

      // Refresh products to see updated inventory
      await fetchProducts();
    } catch (error) {
      toast.error('Failed to create reservation');
    } finally {
      setReserving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-black p-4">
      <main className="w-full max-w-2xl bg-white dark:bg-zinc-950 rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-6">
          Concurrent Reservation Test
        </h1>

        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            💡 Open this page in 2 browser tabs and click "Reserve" simultaneously
            to test concurrent requests. One should succeed, the other should get
            409 Conflict.
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Select Product
            </label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
            >
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} (SKU: {product.sku}) - Stock: {product.inventory}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Quantity
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
            />
          </div>
        </div>

        <button
          onClick={handleReserve}
          disabled={reserving}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-lg transition-colors mb-6"
        >
          {reserving ? 'Reserving...' : 'Reserve'}
        </button>

        {lastResult && (
          <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 bg-zinc-50 dark:bg-zinc-900">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              Last Result - {lastResult.timestamp}
            </h2>
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium">Status:</span>{' '}
                <span
                  className={
                    lastResult.status === 200
                      ? 'text-green-600'
                      : lastResult.status === 409
                        ? 'text-yellow-600'
                        : 'text-red-600'
                  }
                >
                  {lastResult.status} {lastResult.statusText}
                </span>
              </p>
              <p>
                <span className="font-medium">Duration:</span> {lastResult.duration}ms
              </p>
              <p>
                <span className="font-medium">Message:</span>{' '}
                {lastResult.data.message || lastResult.data.error}
              </p>
              {lastResult.data.reservation && (
                <p>
                  <span className="font-medium">Reservation ID:</span>{' '}
                  {lastResult.data.reservation.id}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="mt-8">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
            All Products (Live Inventory)
          </h3>
          <div className="space-y-2">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex justify-between items-center p-3 border border-zinc-200 dark:border-zinc-700 rounded-lg"
              >
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    {product.name}
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    SKU: {product.sku}
                  </p>
                </div>
                <span
                  className={`text-lg font-semibold ${
                    product.inventory === 0
                      ? 'text-red-600'
                      : 'text-green-600'
                  }`}
                >
                  {product.inventory}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
