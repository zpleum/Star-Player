'use client';

import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { useRouter, usePathname } from 'next/navigation';
import { Capacitor } from '@capacitor/core';

export default function CapacitorBackButton() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Only run this on native mobile platforms (Android/iOS)
    if (!Capacitor.isNativePlatform()) return;

    const backButtonListener = App.addListener('backButton', ({ canGoBack }) => {
      // If we are on the root page, exit the app
      if (pathname === '/') {
        App.exitApp();
      } else if (canGoBack) {
        // Otherwise use Next.js router to navigate back
        router.back();
      } else {
        // Fallback exit
        App.exitApp();
      }
    });

    return () => {
      backButtonListener.then((listener) => listener.remove());
    };
  }, [router, pathname]);

  return null; // This is a logic-only component
}
