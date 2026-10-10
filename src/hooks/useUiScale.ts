import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'nexus_ui_scale';
const DEFAULT_SCALE = 1.0;
const MIN_SCALE = 0.75;
const MAX_SCALE = 1.50;

export function useUiScale() {
  const [scale, setScaleState] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_SCALE;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= MIN_SCALE && parsed <= MAX_SCALE) {
          return Math.round(parsed * 100) / 100;
        }
      }
    } catch {
      // fallback
    }
    return DEFAULT_SCALE;
  });

  const applyScale = useCallback((newScale: number) => {
    const clamped = Math.round(Math.min(Math.max(newScale, MIN_SCALE), MAX_SCALE) * 100) / 100;
    setScaleState(clamped);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, clamped.toString());
      } catch {
        // ignore
      }
      try {
        (document.body.style as any).zoom = String(clamped);
        document.documentElement.style.setProperty('--ui-scale', String(clamped));
        window.dispatchEvent(new CustomEvent('nexus_ui_scale_changed', { detail: clamped }));
      } catch (err) {
        console.error('[useUiScale] Error applying zoom:', err);
      }
    }
  }, []);

  useEffect(() => {
    try {
      (document.body.style as any).zoom = String(scale);
      document.documentElement.style.setProperty('--ui-scale', String(scale));
    } catch {
      // ignore
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const val = parseFloat(e.newValue);
        if (!isNaN(val) && val >= MIN_SCALE && val <= MAX_SCALE) {
          const rounded = Math.round(val * 100) / 100;
          setScaleState(rounded);
          (document.body.style as any).zoom = String(rounded);
          document.documentElement.style.setProperty('--ui-scale', String(rounded));
        }
      }
    };

    const handleCustom = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      if (typeof customEvent.detail === 'number') {
        const rounded = Math.round(customEvent.detail * 100) / 100;
        setScaleState(rounded);
        (document.body.style as any).zoom = String(rounded);
        document.documentElement.style.setProperty('--ui-scale', String(rounded));
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('nexus_ui_scale_changed', handleCustom);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('nexus_ui_scale_changed', handleCustom);
    };
  }, [scale]);

  const setScalePreset = useCallback((presetScale: number) => {
    applyScale(presetScale);
  }, [applyScale]);

  const stepScale = useCallback((delta: number) => {
    setScaleState(curr => {
      const target = Math.round((curr + delta) * 100) / 100;
      applyScale(target);
      return Math.min(Math.max(target, MIN_SCALE), MAX_SCALE);
    });
  }, [applyScale]);

  const resetScale = useCallback(() => {
    applyScale(DEFAULT_SCALE);
  }, [applyScale]);

  return {
    scale,
    percentage: Math.round(scale * 100),
    applyScale,
    setScalePreset,
    stepScale,
    resetScale,
    isDefault: Math.abs(scale - DEFAULT_SCALE) < 0.01,
    minScale: MIN_SCALE,
    maxScale: MAX_SCALE,
  };
}
