type AmmoFactory = (config?: { locateFile?: (path: string) => string }) => Promise<unknown>;

interface AmmoWindow extends Window {
  Ammo?: unknown;
}

function loadScriptTag(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;

    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
        return;
      }

      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error(`Failed to load ${src}`)),
        { once: true },
      );
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.addEventListener(
      'load',
      () => {
        script.dataset.loaded = 'true';
        resolve();
      },
      { once: true },
    );
    script.addEventListener(
      'error',
      () => reject(new Error(`Failed to load ${src}`)),
      { once: true },
    );
    document.head.appendChild(script);
  });
}

function isAmmoModule(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'btDefaultCollisionConfiguration' in value
  );
}

export async function ensureAmmoLoaded(): Promise<boolean> {
  const windowWithAmmo = window as AmmoWindow;
  const globalWithAmmo = globalThis as typeof globalThis & { Ammo?: unknown };
  let candidate = windowWithAmmo.Ammo ?? globalWithAmmo.Ammo;

  if (!candidate) {
    try {
      await loadScriptTag('/ammo/ammo.js');
      candidate = windowWithAmmo.Ammo ?? globalWithAmmo.Ammo;
    } catch (error) {
      console.warn('[MMD] Failed to load ammo.js:', error);
      return false;
    }
  }

  if (typeof candidate === 'function') {
    const instance = await (candidate as AmmoFactory)({
      locateFile: (path: string) => `/ammo/${path}`,
    });

    windowWithAmmo.Ammo = instance;
    globalWithAmmo.Ammo = instance;
    return isAmmoModule(instance);
  }

  if (isAmmoModule(candidate)) {
    windowWithAmmo.Ammo = candidate;
    globalWithAmmo.Ammo = candidate;
    return true;
  }

  return false;
}
