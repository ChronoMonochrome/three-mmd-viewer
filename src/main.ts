import * as THREE from 'three';
import { WebGPURenderer } from 'three/webgpu';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MMDLoader, MMDAnimationHelper } from '@takahirox/three-mmd';

// Глобальный флаг включения рантайм-мода пружинной физики груди.
const ENABLE_BREAST_SPRING_MOD = true;

// Пресеты пружинной физики груди: от едва заметного до максимально выраженного.
// Для переключения поменяй ACTIVE_BREAST_SPRING_PRESET.
// Рекомендуемый стартовый вариант: 'strong'.
const BREAST_SPRING_PRESETS = {
  // 1. Едва заметное движение, почти без дополнительного раскачивания.
  subtle: {
    stiffness: 55,
    damping: 11.5,
    pitchFromAccelY: 0.13,
    pitchFromAccelZ: 0.035,
    yawFromAccelX: 0.0025,
    rollFromAccelX: 0.010,
    accelSmoothing: 0.32,
    invertPitch: false,
    maxAccel: 70,
    maxPitchRad: 0.20, // 11.5°
    maxYawRad: 0.06,
    maxRollRad: 0.10,
  },

  // 2. Мягкое, относительно естественное движение.
  natural: {
    stiffness: 45,
    damping: 9.5,
    pitchFromAccelY: 0.20,
    pitchFromAccelZ: 0.06,
    yawFromAccelX: 0.0035,
    rollFromAccelX: 0.014,
    accelSmoothing: 0.34,
    invertPitch: false,
    maxAccel: 80,
    maxPitchRad: 0.28, // 16.0°
    maxYawRad: 0.075,
    maxRollRad: 0.13,
  },

  // 3. Хорошо заметное движение без намеренно экстремальной амплитуды.
  noticeable: {
    stiffness: 36,
    damping: 8.0,
    pitchFromAccelY: 0.28,
    pitchFromAccelZ: 0.09,
    yawFromAccelX: 0.005,
    rollFromAccelX: 0.020,
    accelSmoothing: 0.36,
    invertPitch: false,
    maxAccel: 95,
    maxPitchRad: 0.38, // 21.8°
    maxYawRad: 0.10,
    maxRollRad: 0.17,
  },

  // 4. Сильный bounce. Выбран по умолчанию, чтобы эффект был явно виден.
  strong: {
    stiffness: 30,
    damping: 7.0,
    pitchFromAccelY: 0.38,
    pitchFromAccelZ: 0.12,
    yawFromAccelX: 0.0065,
    rollFromAccelX: 0.027,
    accelSmoothing: 0.40,
    invertPitch: false,
    maxAccel: 110,
    maxPitchRad: 0.48, // 27.5°
    maxYawRad: 0.12,
    maxRollRad: 0.21,
  },

  // 5. Максимальная амплитуда. Может выглядеть преувеличенно на некоторых моделях.
  extreme: {
    stiffness: 25,
    damping: 6.0,
    pitchFromAccelY: 0.50,
    pitchFromAccelZ: 0.16,
    yawFromAccelX: 0.008,
    rollFromAccelX: 0.035,
    accelSmoothing: 0.43,
    invertPitch: false,
    maxAccel: 120,
    maxPitchRad: 0.56, // 32.1°
    maxYawRad: 0.15,
    maxRollRad: 0.25,
  },
  extreme2: {
    stiffness: 23,
    damping: 5.8,
    pitchFromAccelY: 0.58,
    pitchFromAccelZ: 0.185,
    yawFromAccelX: 0.0085,
    rollFromAccelX: 0.037,
    accelSmoothing: 0.44,
    invertPitch: false,
    maxAccel: 135,
    maxPitchRad: 0.64, // 36.7°
    maxYawRad: 0.16,
    maxRollRad: 0.265,
  },

  extreme3: {
    stiffness: 22,
    damping: 5.6,
    pitchFromAccelY: 0.66,
    pitchFromAccelZ: 0.21,
    yawFromAccelX: 0.009,
    rollFromAccelX: 0.039,
    accelSmoothing: 0.45,
    invertPitch: false,
    maxAccel: 150,
    maxPitchRad: 0.72, // 41.3°
    maxYawRad: 0.17,
    maxRollRad: 0.28,
  },

  extreme4: {
    stiffness: 21,
    damping: 5.4,
    pitchFromAccelY: 0.74,
    pitchFromAccelZ: 0.235,
    yawFromAccelX: 0.0095,
    rollFromAccelX: 0.041,
    accelSmoothing: 0.46,
    invertPitch: false,
    maxAccel: 165,
    maxPitchRad: 0.80, // 45.8°
    maxYawRad: 0.18,
    maxRollRad: 0.295,
  },

  extreme5: {
    stiffness: 20,
    damping: 5.2,
    pitchFromAccelY: 0.82,
    pitchFromAccelZ: 0.26,
    yawFromAccelX: 0.010,
    rollFromAccelX: 0.043,
    accelSmoothing: 0.47,
    invertPitch: false,
    maxAccel: 180,
    maxPitchRad: 0.88, // 50.4°
    maxYawRad: 0.19,
    maxRollRad: 0.31,
  },

  extreme6: {
    stiffness: 19,
    damping: 5.0,
    pitchFromAccelY: 0.90,
    pitchFromAccelZ: 0.285,
    yawFromAccelX: 0.0105,
    rollFromAccelX: 0.045,
    accelSmoothing: 0.48,
    invertPitch: false,
    maxAccel: 195,
    maxPitchRad: 0.96, // 55.0°
    maxYawRad: 0.20,
    maxRollRad: 0.325,
  },

  extreme7: {
    stiffness: 18,
    damping: 4.8,
    pitchFromAccelY: 0.98,
    pitchFromAccelZ: 0.31,
    yawFromAccelX: 0.011,
    rollFromAccelX: 0.047,
    accelSmoothing: 0.49,
    invertPitch: false,
    maxAccel: 210,
    maxPitchRad: 1.04, // 59.6°
    maxYawRad: 0.21,
    maxRollRad: 0.34,
  },

  extreme8: {
    stiffness: 17,
    damping: 4.6,
    pitchFromAccelY: 1.06,
    pitchFromAccelZ: 0.335,
    yawFromAccelX: 0.0115,
    rollFromAccelX: 0.049,
    accelSmoothing: 0.50,
    invertPitch: false,
    maxAccel: 225,
    maxPitchRad: 1.12, // 64.2°
    maxYawRad: 0.22,
    maxRollRad: 0.355,
  },

  extreme9: {
    stiffness: 16,
    damping: 4.4,
    pitchFromAccelY: 1.14,
    pitchFromAccelZ: 0.36,
    yawFromAccelX: 0.012,
    rollFromAccelX: 0.051,
    accelSmoothing: 0.51,
    invertPitch: false,
    maxAccel: 240,
    maxPitchRad: 1.20, // 68.8°
    maxYawRad: 0.23,
    maxRollRad: 0.37,
  },

  extreme10: {
    stiffness: 15,
    damping: 4.2,
    pitchFromAccelY: 1.22,
    pitchFromAccelZ: 0.385,
    yawFromAccelX: 0.0125,
    rollFromAccelX: 0.053,
    accelSmoothing: 0.52,
    invertPitch: false,
    maxAccel: 255,
    maxPitchRad: 1.28, // 73.3°
    maxYawRad: 0.24,
    maxRollRad: 0.385,
  },

  extreme11: {
    stiffness: 14,
    damping: 4.0,
    pitchFromAccelY: 1.30,
    pitchFromAccelZ: 0.41,
    yawFromAccelX: 0.013,
    rollFromAccelX: 0.055,
    accelSmoothing: 0.53,
    invertPitch: false,
    maxAccel: 270,
    maxPitchRad: 1.36, // 77.9°
    maxYawRad: 0.25,
    maxRollRad: 0.40,
  }
} as const;

type BreastSpringPresetName = keyof typeof BREAST_SPRING_PRESETS;

// Доступные варианты: 'subtle' | 'natural' | 'noticeable' | 'strong' | 'extreme'.
const ACTIVE_BREAST_SPRING_PRESET: BreastSpringPresetName = 'extreme5';
const BREAST_SPRING_CONFIG = BREAST_SPRING_PRESETS[ACTIVE_BREAST_SPRING_PRESET];

const BREAST_BONE_INCLUDE_REGEX = /(左胸|右胸|胸|乳|breast|boob|bust|oppai)/i;
const BREAST_BONE_EXCLUDE_REGEX = /(親|ジンバル|アンカー|先|parent|gimbal|anchor|tip)/i;
const PAIRED_BREAST_BONE_REGEX = /(左胸|右胸|breast.*[_.\s-]?(l|r)|left.*breast|right.*breast)/i;

type AmmoFactory = (cfg?: { locateFile?: (path: string) => string }) => Promise<unknown>;

declare global {
  interface Window {
    Ammo: AmmoFactory | unknown;
    __BREAST_SPRING_MOD__?: boolean;
  }
}

interface BreastSpringState {
  bone: THREE.Bone;
  parent: THREE.Object3D | null;
  baseQuat: THREE.Quaternion;
  prevParentWorldPos: THREE.Vector3;
  prevParentWorldVel: THREE.Vector3;
  smoothedLocalAccel: THREE.Vector3;
  hasPrevSample: boolean;
  angle: THREE.Vector3;
  angularVel: THREE.Vector3;

  // true, если в текущем/предыдущем кадре мы добавили свой spring-поворот.
  hasAppliedSpring: boolean;
}

function isBreastSpringModEnabled(): boolean {
  if (typeof window.__BREAST_SPRING_MOD__ === 'boolean') {
    return window.__BREAST_SPRING_MOD__;
  }

  return ENABLE_BREAST_SPRING_MOD;
}

function selectTargetBreastBones(bones: THREE.Bone[]): THREE.Bone[] {
  const valid = bones.filter(
    (bone) =>
    BREAST_BONE_INCLUDE_REGEX.test(bone.name) &&
    !BREAST_BONE_EXCLUDE_REGEX.test(bone.name),
  );

  const paired = valid.filter((bone) => PAIRED_BREAST_BONE_REGEX.test(bone.name));
  return paired.length > 0 ? paired : valid;
}

function loadScriptTag(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(
      `script[src="${src}"]`,
    ) as HTMLScriptElement | null;

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

async function ensureAmmoLoaded(): Promise<boolean> {
  const globalAny = globalThis as typeof globalThis & {
    Ammo?: unknown;
  };

  let ammoCandidate: unknown = window.Ammo ?? globalAny.Ammo;

  if (!ammoCandidate) {
    try {
      await loadScriptTag('/ammo/ammo.js');
      ammoCandidate = window.Ammo ?? globalAny.Ammo;
    } catch (error) {
      console.warn('[MMD] Не удалось загрузить ammo.js:', error);
      return false;
    }
  }

  if (typeof ammoCandidate === 'function') {
    const instance = await (ammoCandidate as AmmoFactory)({
      locateFile: (path: string) => `/ammo/${path}`,
    });

    window.Ammo = instance;
    globalAny.Ammo = instance;
    return true;
  }

  if (
    ammoCandidate &&
    typeof ammoCandidate === 'object' &&
    'btDefaultCollisionConfiguration' in ammoCandidate
  ) {
    window.Ammo = ammoCandidate;
    globalAny.Ammo = ammoCandidate;
    return true;
  }

  return false;
}

function createBreastSpringController(mesh: THREE.SkinnedMesh) {
  const bones = mesh.skeleton?.bones ?? [];
  const targetBones = selectTargetBreastBones(bones);

  const states: BreastSpringState[] = targetBones.map((bone) => ({
    bone,
    parent: bone.parent,
    baseQuat: bone.quaternion.clone(),
                                                                 prevParentWorldPos: new THREE.Vector3(),
                                                                 prevParentWorldVel: new THREE.Vector3(),
                                                                 smoothedLocalAccel: new THREE.Vector3(),
                                                                 hasPrevSample: false,
                                                                 angle: new THREE.Vector3(),
                                                                 angularVel: new THREE.Vector3(),
                                                                 hasAppliedSpring: false,
  }));

  console.info(
    `[BreastSpringMod] Пресет: ${ACTIVE_BREAST_SPRING_PRESET}`,
    BREAST_SPRING_CONFIG,
  );

  if (states.length > 0) {
    console.log(
      '[BreastSpringMod] Выбраны кости груди:',
      states.map((state) => state.bone.name),
    );
  } else {
    console.warn(
      '[BreastSpringMod] Кости груди не найдены по стандартным именам. Список костей:',
      bones.map((bone) => bone.name),
    );
  }

  const parentWorldPos = new THREE.Vector3();
  const parentWorldVel = new THREE.Vector3();
  const parentWorldAccel = new THREE.Vector3();
  const localAccel = new THREE.Vector3();
  const parentQuatInv = new THREE.Quaternion();
  const springQuat = new THREE.Quaternion();
  const springEuler = new THREE.Euler(0, 0, 0, 'YXZ');
  let debugAccumTime = 0;

  return {
    /**
     * Удаляет только тот поворот, который добавила наша пружина.
     * Вызывать ДО helper.update(delta).
     *
     * Важно: baseQuat хранит позу после MMD/VMD предыдущего кадра,
     * но до наложения spring-поворота. Поэтому копирование baseQuat
     * не даёт spring-вращению накапливаться от кадра к кадру.
     */
    restoreBasePose() {
      for (const state of states) {
        if (!state.hasAppliedSpring) continue;

        state.bone.quaternion.copy(state.baseQuat);
        state.hasAppliedSpring = false;
      }

      mesh.updateMatrixWorld(true);
    },

    reset() {
      debugAccumTime = 0;

      for (const state of states) {
        // Сначала снимаем добавленный spring-поворот, если он был.
        if (state.hasAppliedSpring) {
          state.bone.quaternion.copy(state.baseQuat);
        }

        state.baseQuat.copy(state.bone.quaternion);
        state.hasAppliedSpring = false;

        state.hasPrevSample = false;
        state.prevParentWorldPos.set(0, 0, 0);
        state.prevParentWorldVel.set(0, 0, 0);
        state.smoothedLocalAccel.set(0, 0, 0);
        state.angle.set(0, 0, 0);
        state.angularVel.set(0, 0, 0);
      }

      mesh.updateMatrixWorld(true);
    },

    /**
     * Сохраняет позу, выставленную MMD/VMD в текущем кадре.
     * Вызывать ПОСЛЕ helper.update(delta), когда spring-поворот уже снят.
     */
    captureBasePose() {
      for (const state of states) {
        state.baseQuat.copy(state.bone.quaternion);
      }
    },

    update(dt: number) {
      if (!isBreastSpringModEnabled() || states.length === 0 || dt <= 0) {
        return;
      }

      // Защищаем интегратор от слишком больших скачков времени.
      const safeDt = Math.min(dt, 0.033);

      debugAccumTime += dt;
      const shouldLog = debugAccumTime >= 0.5;
      if (shouldLog) {
        debugAccumTime = 0;
      }

      let appliedAny = false;
      const pitchSign = BREAST_SPRING_CONFIG.invertPitch ? -1 : 1;

      for (let i = 0; i < states.length; i++) {
        const state = states[i];

        // Защитное восстановление: update всегда начинает с базовой позы.
        state.bone.quaternion.copy(state.baseQuat);

        const targetObject = state.parent ?? state.bone;
        targetObject.getWorldPosition(parentWorldPos);

        if (!state.hasPrevSample) {
          state.prevParentWorldPos.copy(parentWorldPos);
          state.prevParentWorldVel.set(0, 0, 0);
          state.hasPrevSample = true;
          continue;
        }

        parentWorldVel
        .subVectors(parentWorldPos, state.prevParentWorldPos)
        .divideScalar(safeDt);

        parentWorldAccel
        .subVectors(parentWorldVel, state.prevParentWorldVel)
        .divideScalar(safeDt);

        state.prevParentWorldPos.copy(parentWorldPos);
        state.prevParentWorldVel.copy(parentWorldVel);

        targetObject.getWorldQuaternion(parentQuatInv).invert();
        localAccel.copy(parentWorldAccel).applyQuaternion(parentQuatInv);

        state.smoothedLocalAccel.lerp(
          localAccel,
          BREAST_SPRING_CONFIG.accelSmoothing,
        );

        const ax = THREE.MathUtils.clamp(
          state.smoothedLocalAccel.x,
          -BREAST_SPRING_CONFIG.maxAccel,
          BREAST_SPRING_CONFIG.maxAccel,
        );
        const ay = THREE.MathUtils.clamp(
          state.smoothedLocalAccel.y,
          -BREAST_SPRING_CONFIG.maxAccel,
          BREAST_SPRING_CONFIG.maxAccel,
        );
        const az = THREE.MathUtils.clamp(
          state.smoothedLocalAccel.z,
          -BREAST_SPRING_CONFIG.maxAccel,
          BREAST_SPRING_CONFIG.maxAccel,
        );

        const forceX =
        pitchSign *
        (ay * BREAST_SPRING_CONFIG.pitchFromAccelY +
        az * BREAST_SPRING_CONFIG.pitchFromAccelZ);
        const forceY = ax * BREAST_SPRING_CONFIG.yawFromAccelX;
        const forceZ = -ax * BREAST_SPRING_CONFIG.rollFromAccelX;

        if (shouldLog && i === 0) {
          console.log(
            `[BreastSpringMod][${state.bone.name}] ` +
            `localAccel=(${localAccel.x.toFixed(2)}, ${localAccel.y.toFixed(2)}, ${localAccel.z.toFixed(2)}) | ` +
            `clamped=(${ax.toFixed(1)}, ${ay.toFixed(1)}, ${az.toFixed(1)}) | ` +
            `force=(${forceX.toFixed(3)}, ${forceY.toFixed(3)}, ${forceZ.toFixed(3)}) | ` +
            `angleDeg=(${THREE.MathUtils.radToDeg(state.angle.x).toFixed(1)}, ${THREE.MathUtils.radToDeg(state.angle.y).toFixed(1)}, ${THREE.MathUtils.radToDeg(state.angle.z).toFixed(1)})`,
          );
        }

        // Угловое ускорение: внешняя инерционная сила + возврат к нулю + демпфирование.
        const accelAngleX =
        forceX -
          BREAST_SPRING_CONFIG.stiffness * state.angle.x -
          BREAST_SPRING_CONFIG.damping * state.angularVel.x;
        const accelAngleY =
        forceY -
          BREAST_SPRING_CONFIG.stiffness * state.angle.y -
          BREAST_SPRING_CONFIG.damping * state.angularVel.y;
        const accelAngleZ =
        forceZ -
          BREAST_SPRING_CONFIG.stiffness * state.angle.z -
          BREAST_SPRING_CONFIG.damping * state.angularVel.z;

        state.angularVel.x += accelAngleX * safeDt;
        state.angularVel.y += accelAngleY * safeDt;
        state.angularVel.z += accelAngleZ * safeDt;

        state.angle.x = THREE.MathUtils.clamp(
          state.angle.x + state.angularVel.x * safeDt,
          -BREAST_SPRING_CONFIG.maxPitchRad,
          BREAST_SPRING_CONFIG.maxPitchRad,
        );
        state.angle.y = THREE.MathUtils.clamp(
          state.angle.y + state.angularVel.y * safeDt,
          -BREAST_SPRING_CONFIG.maxYawRad,
          BREAST_SPRING_CONFIG.maxYawRad,
        );
        state.angle.z = THREE.MathUtils.clamp(
          state.angle.z + state.angularVel.z * safeDt,
          -BREAST_SPRING_CONFIG.maxRollRad,
          BREAST_SPRING_CONFIG.maxRollRad,
        );

        springEuler.set(
          state.angle.x,
          state.angle.y,
          state.angle.z,
          'YXZ',
        );
        springQuat.setFromEuler(springEuler);

        // Накладываем spring-поворот поверх базовой позы этого кадра.
        state.bone.quaternion.multiply(springQuat);
        state.hasAppliedSpring = true;
        appliedAny = true;
      }

      if (appliedAny) {
        mesh.updateMatrixWorld(true);
      }
    },
  };
}

async function init() {
  window.__BREAST_SPRING_MOD__ = ENABLE_BREAST_SPRING_MOD;

  const hasAmmo = await ensureAmmoLoaded();
  if (!hasAmmo) {
    console.warn(
      '[MMD] ammo.js не загрузился: MMDPhysics отключён, но VMD-анимация и spring-мод продолжат работу.',
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

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444455, 1.1);
  hemiLight.position.set(0, 30, 0);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(10, 20, 15);
  scene.add(dirLight);

  scene.add(new THREE.GridHelper(30, 30));

  const helper = new MMDAnimationHelper({
    physics: hasAmmo,
  });

  let breastSpring: ReturnType<typeof createBreastSpringController> | null = null;
  const loader = new MMDLoader();

  loader.load(
    '/models/model.pmx',
    (mesh) => {
      scene.add(mesh);
      breastSpring = createBreastSpringController(mesh);

      loader.loadAnimation(
        '/animations/run.vmd',
        mesh,
        (clip) => {
          // Не используем position-треки модели, как и в исходном варианте.
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
          console.error('Ошибка загрузки VMD:', error);

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
        console.log(
          `Загрузка модели: ${Math.round((xhr.loaded / xhr.total) * 100)}%`,
        );
      }
    },
    (error) => {
      console.error('Ошибка загрузки модели:', error);
    },
  );

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  let prevTime = performance.now();

  function animate(now: number) {
    requestAnimationFrame(animate);

    const delta = Math.min((now - prevTime) / 1000, 0.05);
    prevTime = now;

    // ПРАВИЛЬНЫЙ ПОРЯДОК:
    // 1. Убираем spring-поворот прошлого кадра.
    breastSpring?.restoreBasePose();

    // 2. MMD/VMD выставляет позу текущего кадра.
    helper.update(delta);

    // 3. Запоминаем позу текущего кадра без spring-поворота.
    breastSpring?.captureBasePose();

    // 4. Рассчитываем и накладываем новый spring-поворот.
    breastSpring?.update(delta);

    controls.update();
    renderer.render(scene, camera);
  }

  requestAnimationFrame(animate);
}

init().catch((error) => {
  console.error('[MMD] Ошибка инициализации:', error);
});
