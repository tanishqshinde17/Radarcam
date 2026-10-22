import { useEffect, useState } from 'react';

// Keeps an element mounted long enough to play its exit transition.
// `state` flips to 'open' one frame after mount so the closed styles are painted first.
export function usePresence(open: boolean, exitMs: number) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setVisible(true));
      });
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), exitMs);
    return () => clearTimeout(t);
  }, [open, exitMs]);

  return { mounted, state: visible ? 'open' : 'closed' } as const;
}
