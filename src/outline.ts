import * as THREE from 'three';

export interface MMDOutlineEffectLike {
  enabled: boolean;
  render: (scene: THREE.Scene, camera: THREE.Camera) => void;
  dispose: () => void;
}

type OutlineEffectConstructor = new (renderer: unknown) => MMDOutlineEffectLike;

export async function createMMDOutlineEffect(
  renderer: unknown,
): Promise<MMDOutlineEffectLike | null> {
  try {
    // Resolve the optional export dynamically so older package versions still load the viewer.
    const mmdModule = await import('@takahirox/three-mmd') as unknown as Record<string, unknown>;
    const constructor = mmdModule.MMDOutlineEffect;

    if (typeof constructor !== 'function') return null;

    return new (constructor as OutlineEffectConstructor)(renderer);
  } catch {
    return null;
  }
}
