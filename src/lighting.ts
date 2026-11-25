import * as THREE from 'three';

export interface LightingSettings {
  hemisphereIntensity: number;
  directionalIntensity: number;
  ambientFillIntensity: number;
}

export const DEFAULT_LIGHTING_SETTINGS: Readonly<LightingSettings> = {
  hemisphereIntensity: 0.45,
  directionalIntensity: 0.55,
  ambientFillIntensity: 0,
};

export interface SceneLightingController {
  update: (settings: LightingSettings) => void;
  getSettings: () => LightingSettings;
}

function clampIntensity(value: number, maximum: number): number {
  return THREE.MathUtils.clamp(Number.isFinite(value) ? value : 0, 0, maximum);
}

export function addSceneLighting(
  scene: THREE.Scene,
  initialSettings: LightingSettings = DEFAULT_LIGHTING_SETTINGS,
): SceneLightingController {
  const hemisphereLight = new THREE.HemisphereLight(
    0xdfe7f2,
    0x34313a,
    initialSettings.hemisphereIntensity,
  );
  hemisphereLight.position.set(0, 30, 0);

  const directionalLight = new THREE.DirectionalLight(
    0xffffff,
    initialSettings.directionalIntensity,
  );
  directionalLight.position.set(10, 20, 15);

  // This neutral fill light lifts dark areas without changing the key light direction.
  const ambientFillLight = new THREE.AmbientLight(
    0xffffff,
    initialSettings.ambientFillIntensity,
  );

  scene.add(hemisphereLight, directionalLight, ambientFillLight);

  let currentSettings: LightingSettings = { ...initialSettings };

  const update = (settings: LightingSettings): void => {
    currentSettings = {
      hemisphereIntensity: clampIntensity(settings.hemisphereIntensity, 2),
      directionalIntensity: clampIntensity(settings.directionalIntensity, 2),
      ambientFillIntensity: clampIntensity(settings.ambientFillIntensity, 1.5),
    };

    hemisphereLight.intensity = currentSettings.hemisphereIntensity;
    directionalLight.intensity = currentSettings.directionalIntensity;
    ambientFillLight.intensity = currentSettings.ambientFillIntensity;
  };

  update(initialSettings);

  return {
    update,
    getSettings: () => ({ ...currentSettings }),
  };
}
