'use client';

import { useEffect, useRef } from 'react';
import { App } from '@capacitor/app';
import { useRouter, usePathname } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { usePlayer } from '@/contexts/PlayerContext';

export default function CapacitorBackButton() {
  const router = useRouter();
  const pathname = usePathname();
  const { state, setFullPlayer } = usePlayer();

  const pathnameRef = useRef(pathname);
  const isFullPlayerOpenRef = useRef(state.isFullPlayerOpen);
  const routerRef = useRef(router);
  const setFullPlayerRef = useRef(setFullPlayer);

  useEffect(() => { pathnameRef.current = pathname; }, [pathname]);
  useEffect(() => { isFullPlayerOpenRef.current = state.isFullPlayerOpen; }, [state.isFullPlayerOpen]);
  useEffect(() => { routerRef.current = router; }, [router]);
  useEffect(() => { setFullPlayerRef.current = setFullPlayer; }, [setFullPlayer]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let listenerHandle: Awaited<ReturnType<typeof App.addListener>> | null = null;

    App.addListener('backButton', () => {
      if (isFullPlayerOpenRef.current) {
        if (document.startViewTransition) {
          document.startViewTransition(() => setFullPlayerRef.current(false));
        } else {
          setFullPlayerRef.current(false);
        }
        return;
      }
      if (pathnameRef.current === '/') {
        App.exitApp();
      } else {
        if (document.startViewTransition) {
          document.startViewTransition(() => routerRef.current.back());
        } else {
          routerRef.current.back();
        }
      }
    }).then((handle) => {
      listenerHandle = handle;
    });

    return () => {
      listenerHandle?.remove();
    };
  }, []);

  return null;
}