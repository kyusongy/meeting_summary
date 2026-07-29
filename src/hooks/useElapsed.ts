"use client";

import { useState, useEffect } from "react";

/** Seconds since mount. Remount (or key) it to restart the clock. */
export function useElapsed(): number {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const id = setInterval(
      () => setSeconds(Math.floor((Date.now() - started) / 1000)),
      1000
    );
    return () => clearInterval(id);
  }, []);

  return seconds;
}
