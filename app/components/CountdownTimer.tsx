'use client';

import { useEffect, useState } from 'react';

interface CountdownTimerProps {
  initialSeconds: number;
  onComplete?: () => void;
}

export function CountdownTimer({ initialSeconds, onComplete }: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!isActive || timeRemaining <= 0) {
      if (timeRemaining === 0 && onComplete) {
        onComplete();
      }
      setIsActive(false);
      return;
    }

    const intervalId = setInterval(() => {
      setTimeRemaining((prevTime) => {
        const newTime = prevTime - 1;
        if (newTime <= 0) {
          setIsActive(false);
          if (onComplete) {
            onComplete();
          }
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isActive, timeRemaining, onComplete]);

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-2">
      <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        {formattedTime}
      </span>
      <span className="text-sm text-zinc-600 dark:text-zinc-400">remaining</span>
    </div>
  );
}
