'use client';

import { CountdownTimer } from '@/app/components/CountdownTimer';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

export default function ReservationPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [isExpired, setIsExpired] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // Example: 10 minutes countdown (600 seconds)
  const COUNTDOWN_DURATION = 600;

  const handleTimerComplete = () => {
    setIsExpired(true);
    console.log('Reservation timer expired!');
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

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to confirm reservation');
        return;
      }

      const data = await response.json();
      toast.success(data.message || 'Reservation confirmed successfully!');
      router.push('/');
    } catch (error) {
      console.error('Error confirming reservation:', error);
      toast.error('An error occurred while confirming the reservation');
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-black p-4">
      <main className="w-full max-w-2xl bg-white dark:bg-zinc-950 rounded-lg shadow-lg p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            Reservation #{id}
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Complete your booking before time runs out
          </p>
        </div>

        <div className="mb-6 p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
            Time to confirm booking:
          </p>
          <div className="flex items-center gap-4">
            <CountdownTimer
              initialSeconds={COUNTDOWN_DURATION}
              onComplete={handleTimerComplete}
            />
          </div>
        </div>

        {isExpired && (
          <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200 font-semibold">
              ⏰ Time expired! Your reservation has been cancelled.
            </p>
          </div>
        )}

        {!isExpired && (
          <div className="space-y-4">
            <div className="p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                Booking Details
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                Review and confirm your reservation details.
              </p>
            </div>
            <button
              onClick={handleConfirm}
              disabled={isConfirming}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {isConfirming ? 'Confirming...' : 'Confirm Booking'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
