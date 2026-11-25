import * as THREE from 'three';

export interface MaterialCompatibilitySettings {
  forceDoubleSided: boolean;
  forceOutlines: boolean;
  outlineThicknessScale: number;
}

export const DEFAULT_MATERIAL_COMPATIBILITY_SETTINGS: Readonly<MaterialCompatibilitySettings> = {
  forceDoubleSided: false,
  forceOutlines: false,
  outlineThicknessScale: 1.0,
};

interface OutlineParameters {
  visible?: boolean;
  thickness?: number;
  color?: number[];
  alpha?: number;
  [key: string]: unknown;
}

interface OriginalMaterialState {
  side: THREE.Material['side'];
  hadOutlineParameters: boolean;
  outlineParameters?: OutlineParameters;
}

const originalMaterialStates = new WeakMap<THREE.Material, OriginalMaterialState>();

function cloneOutlineParameters(value: unknown): OutlineParameters | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const parameters = value as OutlineParameters;
  return {
    ...parameters,
    ...(Array.isArray(parameters.color) ? { color: [...parameters.color] } : {}),
  };
}

function getOriginalState(material: THREE.Material): OriginalMaterialState {
  const cached = originalMaterialStates.get(material);
  if (cached) return cached;

  const userData = material.userData as Record<string, unknown>;
  const hadOutlineParameters = Object.prototype.hasOwnProperty.call(
    userData,
    'outlineParameters',
  );
  const state: OriginalMaterialState = {
    side: material.side,
    hadOutlineParameters,
    ...(hadOutlineParameters
      ? { outlineParameters: cloneOutlineParameters(userData.outlineParameters) }
      : {}),
  };

  originalMaterialStates.set(material, state);
  return state;
}

export function applyMaterialCompatibility(
  root: THREE.Object3D,
  settings: MaterialCompatibilitySettings,
): void {
  const thicknessScale = THREE.MathUtils.clamp(
    Number.isFinite(settings.outlineThicknessScale) ? settings.outlineThicknessScale : 1,
    0.25,
    3,
  );

  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

    for (const material of materials) {
      const original = getOriginalState(material);
      const targetSide = settings.forceDoubleSided ? THREE.DoubleSide : original.side;

      if (material.side !== targetSide) {
        material.side = targetSide;
        material.needsUpdate = true;
      }

      const userData = material.userData as Record<string, unknown>;
      const originalOutline = cloneOutlineParameters(original.outlineParameters);
      const originalVisible = originalOutline?.visible === true;
      const shouldRenderOutline = originalVisible || settings.forceOutlines;

      if (shouldRenderOutline) {
        const source = originalOutline ?? {};
        userData.outlineParameters = {
          ...source,
          visible: true,
          thickness: (typeof source.thickness === 'number' && source.thickness > 0
            ? source.thickness
            : 0.003) * thicknessScale,
          color: Array.isArray(source.color) ? [...source.color] : [0, 0, 0],
          alpha: typeof source.alpha === 'number' ? source.alpha : 1,
        } satisfies OutlineParameters;
      } else if (original.hadOutlineParameters) {
        userData.outlineParameters = originalOutline ?? {};
      } else {
        delete userData.outlineParameters;
      }
    }
  });
}
