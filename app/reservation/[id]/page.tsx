'use client';

import { CountdownTimer } from '@/app/components/CountdownTimer';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface ReservationItem {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    sku: string;
  };
  stock: {
    id: string;
    warehouse: {
      id: string;
      name: string;
      location: string;
    };
  };
  quantity: number;
}

interface Reservation {
  id: string;
  status: string;
  expiresAt: string;
  confirmedAt: string | null;
  createdAt: string;
  items: ReservationItem[];
}

export default function ReservationPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);

  useEffect(() => {
    const fetchReservation = async () => {
      try {
        const response = await fetch(`/api/reservations/${id}`);
        if (!response.ok) {
          toast.error('Reservation not found');
          router.push('/');
          return;
        }
        const data = await response.json();
        setReservation(data.reservation);
      } catch (error) {
        console.error('Error fetching reservation:', error);
        toast.error('Failed to load reservation');
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    fetchReservation();
  }, [id, router]);

  const handleTimerComplete = () => {
    setIsExpired(true);
    toast.info('Reservation has expired. Units have been released.');
  };

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      const response = await fetch(`/api/reservations/${id}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 410) {
        const errorData = await response.json();
        toast.error(errorData.error || 'Reservation has expired');
        setIsExpired(true);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to confirm reservation');
        return;
      }

      const data = await response.json();
      setReservation(data.reservation);
      toast.success('Reservation confirmed successfully!');
      setTimeout(() => router.push('/'), 2000);
    } catch (error) {
      console.error('Error confirming reservation:', error);
      toast.error('An error occurred while confirming the reservation');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleRelease = async () => {
    setIsReleasing(true);
    try {
      const response = await fetch(`/api/reservations/${id}/release`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to release reservation');
        return;
      }

      const data = await response.json();
      setReservation(data.reservation);
      toast.success('Reservation released. Units are now available again.');
      setTimeout(() => router.push('/'), 2000);
    } catch (error) {
      console.error('Error releasing reservation:', error);
      toast.error('An error occurred while releasing the reservation');
    } finally {
      setIsReleasing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-zinc-600 dark:text-zinc-400">Loading reservation...</p>
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-600 dark:text-red-400">Reservation not found</p>
      </div>
    );
  }

  const expiresAt = new Date(reservation.expiresAt);
  const now = new Date();
  const secondsRemaining = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
  const hasExpired = secondsRemaining === 0 || isExpired;
  const isConfirmed = reservation.status === 'confirmed';
  const isReleased = reservation.status === 'released';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-black p-4">
      <main className="w-full max-w-3xl bg-white dark:bg-zinc-950 rounded-lg shadow-lg p-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              Reservation #{reservation.id.slice(0, 8)}
            </h1>
            <span
              className={`px-3 py-1 rounded-full text-sm font-semibold ${
                isConfirmed
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                  : isReleased
                    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                    : hasExpired
                      ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
              }`}
            >
              {reservation.status === 'pending' && hasExpired
                ? 'Expired'
                : reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)}
            </span>
          </div>
          <p className="text-zinc-600 dark:text-zinc-400">
            Created on {new Date(reservation.createdAt).toLocaleString()}
          </p>
        </div>

        {!isConfirmed && !isReleased && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-600 dark:text-blue-400 mb-3">
              Time to confirm booking:
            </p>
            {hasExpired ? (
              <div className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                ⏰ Time expired!
              </div>
            ) : (
              <CountdownTimer
                initialSeconds={secondsRemaining}
                onComplete={handleTimerComplete}
              />
            )}
          </div>
        )}

        {isConfirmed && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-green-800 dark:text-green-200 font-semibold">
              ✅ Reservation confirmed on{' '}
              {reservation.confirmedAt
                ? new Date(reservation.confirmedAt).toLocaleString()
                : 'unknown time'}
            </p>
          </div>
        )}

        {isReleased && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200 font-semibold">
              ❌ Reservation has been released. Units are available again.
            </p>
          </div>
        )}

        {hasExpired && !isConfirmed && !isReleased && (
          <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg">
            <p className="text-orange-800 dark:text-orange-200 font-semibold">
              ⏰ Your reservation has expired and been automatically released.
            </p>
          </div>
        )}

        {/* Reservation Items */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
            Order Details
          </h2>
          <div className="space-y-3">
            {(reservation.items || []).map((item) => (
              <div
                key={item.id}
                className="p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg flex justify-between items-start"
              >
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    {item.product.name}
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    SKU: {item.product.sku}
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {item.stock.warehouse.name} ({item.stock.warehouse.location})
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {item.quantity} unit{item.quantity > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        {!isConfirmed && !isReleased && (
          <div className="space-y-3">
            <button
              onClick={handleConfirm}
              disabled={isConfirming || hasExpired}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {isConfirming ? 'Confirming...' : 'Confirm Purchase'}
            </button>
            <button
              onClick={handleRelease}
              disabled={isReleasing}
              className="w-full bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 text-red-700 dark:text-red-100 font-semibold py-3 rounded-lg transition-colors"
            >
              {isReleasing ? 'Cancelling...' : 'Cancel Order'}
            </button>
          </div>
        )}

        {(isConfirmed || isReleased) && (
          <button
            onClick={() => router.push('/')}
            className="w-full bg-zinc-600 hover:bg-zinc-700 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Back to Products
          </button>
        )}
      </main>
    </div>
  );
}
