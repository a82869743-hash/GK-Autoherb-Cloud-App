import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE = 5 * 60 * 1000;      // Show warning 5 min before logout

/**
 * Auto-logout hook: tracks mouse, keyboard, touch, and scroll events.
 * After 30 minutes of inactivity, logs the user out.
 * Shows a warning toast at 25 minutes.
 */
export function useInactivityTimer() {
  const { isAuthenticated, logout } = useAuthStore();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningShownRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    warningShownRef.current = false;
  }, []);

  const resetTimer = useCallback(() => {
    if (!isAuthenticated) return;

    clearTimers();

    // Warning timer (5 min before logout)
    warningRef.current = setTimeout(() => {
      if (!warningShownRef.current) {
        warningShownRef.current = true;
        // Dispatch a custom event that the Toast component can listen to
        window.dispatchEvent(new CustomEvent('gk-inactivity-warning', {
          detail: { message: 'You will be logged out in 5 minutes due to inactivity.' }
        }));
      }
    }, INACTIVITY_TIMEOUT - WARNING_BEFORE);

    // Logout timer
    timeoutRef.current = setTimeout(() => {
      console.log('[SESSION] Auto-logout due to inactivity');
      logout();
    }, INACTIVITY_TIMEOUT);
  }, [isAuthenticated, logout, clearTimers]);

  useEffect(() => {
    if (!isAuthenticated) {
      clearTimers();
      return;
    }

    // Track user activity events
    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
    
    // Throttle — only reset timer at most once per 30 seconds to reduce overhead
    let lastReset = 0;
    const throttledReset = () => {
      const now = Date.now();
      if (now - lastReset > 30000) {
        lastReset = now;
        resetTimer();
      }
    };

    events.forEach(event => {
      document.addEventListener(event, throttledReset, { passive: true });
    });

    // Initial timer start
    resetTimer();

    return () => {
      clearTimers();
      events.forEach(event => {
        document.removeEventListener(event, throttledReset);
      });
    };
  }, [isAuthenticated, resetTimer, clearTimers]);
}
