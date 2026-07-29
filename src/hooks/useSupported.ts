"use client";

import { useSyncExternalStore } from "react";

/**
 * Tab audio capture needs desktop Chrome/Edge; mobile browsers have no
 * getDisplayMedia at all, so we tell her up front rather than failing on Start.
 *
 * Read through useSyncExternalStore so the server renders `null` (unknown) and
 * the client swaps in the real answer after hydration, with no mismatch.
 */
const subscribe = () => () => {};

const clientSnapshot = () =>
  typeof navigator.mediaDevices?.getDisplayMedia === "function" &&
  typeof window.MediaRecorder === "function";

const serverSnapshot = () => null;

export function useSupported(): boolean | null {
  return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
}
