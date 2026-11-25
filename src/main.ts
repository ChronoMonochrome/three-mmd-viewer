import * as THREE from 'three';
import { WebGPURenderer } from 'three/webgpu';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MMDLoader, MMDAnimationHelper } from '@takahirox/three-mmd';
import { ensureAmmoLoaded } from './ammo';
import { createBreastSpringController } from './breastSpring';
import {
  BREAST_SPRING_PRESETS,
  DEFAULT_BREAST_SPRING_PRESET,
  ENABLE_BREAST_SPRING_MOD,
  ENABLE_BREAST_SPRING_MOD_LOGGING,
  ENABLE_FPS_COUNTER,
  type BreastSpringPresetName,
} from './config';
import { addSceneLighting, DEFAULT_LIGHTING_SETTINGS, type LightingSettings } from './lighting';
import {
  applyMaterialCompatibility,
  DEFAULT_MATERIAL_COMPATIBILITY_SETTINGS,
  type MaterialCompatibilitySettings,
} from './materialCompatibility';
import { createMMDOutlineEffect, type MMDOutlineEffectLike } from './outline';
import { createViewerUI } from './viewerUI';

const DEFAULT_MODEL_PATH = '/models/model.pmx';
const DEFAULT_ANIMATION_PATH = '/animations/run.vmd';
const ASSET_MANIFEST_PATH = '/mmd-assets.json';

type AnimationSelection = string | null | 'none';

interface AssetManifest {
  models: string[];
  animations: string[];
}

let activeBreastSpringPreset: BreastSpringPresetName = DEFAULT_BREAST_SPRING_PRESET;

async function fetchAssetManifest(): Promise<AssetManifest> {
  const response = await fetch(ASSET_MANIFEST_PATH, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Asset manifest request failed: ${response.status} ${response.statusText}`);
  }

  const data: unknown = await response.json();
  if (!data || typeof data !== 'object') {
    throw new Error('Asset manifest has an invalid format.');
  }

  const manifest = data as Partial<AssetManifest>;
  return {
    models: Array.isArray(manifest.models)
      ? manifest.models.filter((path): path is string => typeof path === 'string' && path.toLowerCase().endsWith('.pmx'))
      : [],
    animations: Array.isArray(manifest.animations)
      ? manifest.animations.filter((path): path is string => typeof path === 'string' && path.toLowerCase().endsWith('.vmd'))
      : [],
  };
}

function disposeModelResources(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();

  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) geometries.add(mesh.geometry);

    if (!mesh.material) return;
    const meshMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

    for (const material of meshMaterials) {
      materials.add(material);

      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) textures.add(value);
      }
    }
  });

  for (const texture of textures) texture.dispose();
  for (const material of materials) material.dispose();
  for (const geometry of geometries) geometry.dispose();

  const skinnedMesh = root as THREE.SkinnedMesh;
  if (skinnedMesh.isSkinnedMesh) skinnedMesh.skeleton.dispose();
}

async function init(): Promise<void> {
  window.__BREAST_SPRING_MOD__ = ENABLE_BREAST_SPRING_MOD;

  let breastSpring: ReturnType<typeof createBreastSpringController> | null = null;
  let activeMesh: THREE.SkinnedMesh | null = null;
  let helperMesh: THREE.SkinnedMesh | null = null;
  let activeModelPath: string | null = null;
  let selectedModelPath: string | null = null;
  let selectedAnimation: AnimationSelection = null;
  let modelRequestId = 0;
  let animationRequestId = 0;
  let fpsCounterEnabled = ENABLE_FPS_COUNTER;
  let fpsFrameCount = 0;
  let fpsWindowStart = performance.now();
  let lightingSettings: LightingSettings = { ...DEFAULT_LIGHTING_SETTINGS };
  let materialCompatibilitySettings: MaterialCompatibilitySettings = {
    ...DEFAULT_MATERIAL_COMPATIBILITY_SETTINGS,
  };
  let outlineEnabled = true;

  const hasAmmo = await ensureAmmoLoaded();
  if (!hasAmmo) {
    console.warn(
      '[MMD] ammo.js is unavailable. MMD Physics is disabled; VMD animation and the breast spring modifier will continue.',
    );
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x22252a);

  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  );
  camera.position.set(0, 14, 28);

  const renderer = new WebGPURenderer({
    antialias: true,
    forceWebGL: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  await renderer.init();

  document.body.style.margin = '0';
  document.body.style.overflow = 'hidden';
  document.body.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 11, 0);
  controls.update();

  const sceneLighting = addSceneLighting(scene, lightingSettings);
  let outlineEffect: MMDOutlineEffectLike | null = await createMMDOutlineEffect(renderer);
  if (!outlineEffect) {
    console.warn(
      '[MMD] Outlines are unavailable. Update @takahirox/three-mmd to a version that exports MMDOutlineEffect to enable PMX outlines.',
    );
  }
  scene.add(new THREE.GridHelper(30, 30));

  const helper = new MMDAnimationHelper({ physics: hasAmmo });
  const loader = new MMDLoader();

  const viewerUI = createViewerUI(
    {
      onPresetChange: (preset) => {
        activeBreastSpringPreset = preset;

        if (ENABLE_BREAST_SPRING_MOD_LOGGING) {
          console.info(`[BreastSpringMod] Preset selected: ${preset}`, BREAST_SPRING_PRESETS[preset]);
        }
      },
      onSpringEnabledChange: (enabled) => {
        window.__BREAST_SPRING_MOD__ = enabled;
        breastSpring?.reset();

        if (ENABLE_BREAST_SPRING_MOD_LOGGING) {
          console.info(`[BreastSpringMod] Spring ${enabled ? 'enabled' : 'disabled'}.`);
        }
      },
      onFpsCounterChange: (enabled) => {
        fpsCounterEnabled = enabled;
        fpsFrameCount = 0;
        fpsWindowStart = performance.now();
      },
      onModelChange: (path) => {
        selectedModelPath = path;
        loadModel(path ?? DEFAULT_MODEL_PATH);
      },
      onAnimationChange: (selection) => {
        selectedAnimation = selection;
        if (activeMesh) applySelectedAnimation(activeMesh);
      },
      onLightingChange: (settings) => {
        lightingSettings = { ...settings };
        sceneLighting.update(lightingSettings);
      },
      onOutlineEnabledChange: (enabled) => {
        outlineEnabled = enabled;
        if (outlineEffect) outlineEffect.enabled = enabled;
      },
      onMaterialCompatibilityChange: (settings) => {
        materialCompatibilitySettings = { ...settings };
        if (activeMesh) applyMaterialCompatibility(activeMesh, materialCompatibilitySettings);
      },
    },
    {
      initialSpringEnabled: ENABLE_BREAST_SPRING_MOD,
      initialFpsEnabled: ENABLE_FPS_COUNTER,
      initialPreset: DEFAULT_BREAST_SPRING_PRESET,
      initialLighting: lightingSettings,
      initialMaterialCompatibility: materialCompatibilitySettings,
      initialOutlineEnabled: outlineEnabled,
      outlineAvailable: outlineEffect !== null,
    },
  );

  function removeMeshFromHelper(mesh: THREE.SkinnedMesh): void {
    if (helperMesh !== mesh) return;

    breastSpring?.restoreBasePose();
    helper.remove(mesh);
    helperMesh = null;
  }

  function applySelectedAnimation(mesh: THREE.SkinnedMesh): void {
    const requestId = ++animationRequestId;
    const animationPath = selectedAnimation === 'none'
      ? null
      : selectedAnimation ?? DEFAULT_ANIMATION_PATH;

    const attachToHelper = (clip?: THREE.AnimationClip): void => {
      if (requestId !== animationRequestId || activeMesh !== mesh) return;

      removeMeshFromHelper(mesh);

      if (clip) {
        clip.tracks = clip.tracks.filter(
          (track) => !track.name.endsWith('.position'),
        );
      }

      helper.add(mesh, {
        ...(clip ? { animation: clip } : {}),
        physics: hasAmmo,
        warmup: hasAmmo ? 60 : 0,
      });
      helperMesh = mesh;
      breastSpring?.reset();

      viewerUI.setAssetStatus(
        animationPath
          ? `Анимация: ${animationPath}`
          : 'Модель загружена без VMD-анимации.',
      );
    };

    if (!animationPath) {
      attachToHelper();
      return;
    }

    viewerUI.setAssetStatus(`Загрузка анимации: ${animationPath}`);
    loader.loadAnimation(
      animationPath,
      mesh,
      (clip) => attachToHelper(clip),
      undefined,
      (error) => {
        if (requestId !== animationRequestId || activeMesh !== mesh) return;
        console.error(`[MMD] Failed to load VMD animation: ${animationPath}`, error);

        if (helperMesh !== mesh) attachToHelper();
        viewerUI.setAssetStatus(`Не удалось загрузить анимацию: ${animationPath}`);
      },
    );
  }

  function loadModel(path: string): void {
    if (activeMesh && activeModelPath === path) {
      viewerUI.setAssetStatus(`Уже загружена модель: ${path}`);
      return;
    }

    const requestId = ++modelRequestId;
    viewerUI.setAssetStatus(`Загрузка модели: ${path}`);

    loader.load(
      path,
      (mesh) => {
        if (requestId !== modelRequestId) {
          disposeModelResources(mesh);
          return;
        }

        if (activeMesh) {
          removeMeshFromHelper(activeMesh);
          scene.remove(activeMesh);
          disposeModelResources(activeMesh);
        }

        activeMesh = mesh;
        activeModelPath = path;
        applyMaterialCompatibility(mesh, materialCompatibilitySettings);
        scene.add(mesh);
        viewerUI.setModel(mesh);

        breastSpring = createBreastSpringController(
          mesh,
          () => BREAST_SPRING_PRESETS[activeBreastSpringPreset],
        );

        applySelectedAnimation(mesh);
      },
      (xhr) => {
        if (requestId !== modelRequestId || xhr.total <= 0) return;
        const percent = Math.round((xhr.loaded / xhr.total) * 100);
        viewerUI.setAssetStatus(`Загрузка модели: ${percent}% · ${path}`);
      },
      (error) => {
        if (requestId !== modelRequestId) return;
        console.error(`[MMD] Failed to load model: ${path}`, error);
        viewerUI.setAssetStatus(`Не удалось загрузить модель: ${path}`);
      },
    );
  }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  let previousFrameTime = performance.now();

  function animate(now: number): void {
    requestAnimationFrame(animate);

    const delta = Math.min((now - previousFrameTime) / 1000, 0.05);
    previousFrameTime = now;

    // Remove the spring rotation from the previous frame before MMD updates the pose.
    breastSpring?.restoreBasePose();

    // Update VMD animation and MMD physics for the current frame.
    helper.update(delta);

    // Store the current animation pose before applying the spring rotation.
    breastSpring?.captureBasePose();

    // Apply the spring rotation on top of the current animation pose.
    breastSpring?.update(delta);

    if (fpsCounterEnabled) {
      fpsFrameCount++;
      const elapsedMs = now - fpsWindowStart;

      if (elapsedMs >= 500) {
        viewerUI.setFPS((fpsFrameCount * 1000) / elapsedMs);
        fpsFrameCount = 0;
        fpsWindowStart = now;
      }
    }

    controls.update();
    if (outlineEffect && outlineEnabled) {
      outlineEffect.enabled = true;
      outlineEffect.render(scene, camera);
    } else {
      renderer.render(scene, camera);
    }
  }

  requestAnimationFrame(animate);

  loadModel(DEFAULT_MODEL_PATH);

  void fetchAssetManifest()
    .then((manifest) => {
      viewerUI.setAssetOptions(manifest.models, manifest.animations);

      if (selectedModelPath === null) {
        viewerUI.setAssetStatus(
          `Найдено моделей: ${manifest.models.length}, анимаций: ${manifest.animations.length}. Загружен путь по умолчанию.`,
        );
      }
    })
    .catch((error: unknown) => {
      console.warn('[MMD] Could not read the public asset manifest. Default paths remain available.', error);
      viewerUI.setAssetStatus('Список файлов недоступен. Используются пути по умолчанию.');
    });
}

init().catch((error) => {
  console.error('[MMD] Initialization failed:', error);
});
