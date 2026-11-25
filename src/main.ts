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
import { addSceneLighting } from './lighting';
import { createViewerUI } from './viewerUI';

let activeBreastSpringPreset: BreastSpringPresetName = DEFAULT_BREAST_SPRING_PRESET;

async function init(): Promise<void> {
  window.__BREAST_SPRING_MOD__ = ENABLE_BREAST_SPRING_MOD;

  let breastSpring: ReturnType<typeof createBreastSpringController> | null = null;
  let fpsCounterEnabled = ENABLE_FPS_COUNTER;
  let fpsFrameCount = 0;
  let fpsWindowStart = performance.now();

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
    },
    {
      initialSpringEnabled: ENABLE_BREAST_SPRING_MOD,
      initialFpsEnabled: ENABLE_FPS_COUNTER,
      initialPreset: DEFAULT_BREAST_SPRING_PRESET,
    },
  );

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

  addSceneLighting(scene);
  scene.add(new THREE.GridHelper(30, 30));

  const helper = new MMDAnimationHelper({
    physics: hasAmmo,
  });
  const loader = new MMDLoader();

  loader.load(
    '/models/model.pmx',
    (mesh) => {
      scene.add(mesh);
      viewerUI.setModel(mesh);

      breastSpring = createBreastSpringController(
        mesh,
        () => BREAST_SPRING_PRESETS[activeBreastSpringPreset],
      );

      loader.loadAnimation(
        '/animations/run.vmd',
        mesh,
        (clip) => {
          clip.tracks = clip.tracks.filter(
            (track) => !track.name.endsWith('.position'),
          );

          helper.add(mesh, {
            animation: clip,
            physics: hasAmmo,
            warmup: hasAmmo ? 60 : 0,
          });

          breastSpring?.reset();
        },
        undefined,
        (error) => {
          console.error('[MMD] Failed to load VMD animation:', error);

          if (!helper.meshes.includes(mesh)) {
            helper.add(mesh, {
              physics: hasAmmo,
              warmup: hasAmmo ? 60 : 0,
            });
            breastSpring?.reset();
          }
        },
      );
    },
    (xhr) => {
      if (xhr.total > 0) {
        console.log(`Model loading: ${Math.round((xhr.loaded / xhr.total) * 100)}%`);
      }
    },
    (error) => {
      console.error('[MMD] Failed to load model:', error);
    },
  );

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
    renderer.render(scene, camera);
  }

  requestAnimationFrame(animate);
}

init().catch((error) => {
  console.error('[MMD] Initialization failed:', error);
});
