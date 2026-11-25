import * as THREE from 'three';
import { WebGPURenderer } from 'three/webgpu';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MMDLoader, MMDAnimationHelper } from '@takahirox/three-mmd';

// Глобальный флаг включения рантайм-мода пружинной физики груди.
const ENABLE_BREAST_SPRING_MOD = true;

// Пресеты пружинной физики груди: от едва заметного до максимально выраженного.
// Пресет можно переключать в интерфейсе; по умолчанию используется extreme5.
const BREAST_SPRING_PRESETS = {
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
  },
} as const;

type BreastSpringPresetName = keyof typeof BREAST_SPRING_PRESETS;
type BreastSpringConfig = (typeof BREAST_SPRING_PRESETS)[BreastSpringPresetName];

// Этот пресет выбран по умолчанию. Его также можно менять в интерфейсе.
let activeBreastSpringPreset: BreastSpringPresetName = 'extreme9';

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

function createBreastSpringController(
  mesh: THREE.SkinnedMesh,
  getConfig: () => BreastSpringConfig,
) {
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

  console.info('[BreastSpringMod] Контроллер пружины создан.');

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

      // Конфигурация перечитывается каждый кадр, поэтому пресет можно менять на лету.
      const config = getConfig();

      // Защищаем интегратор от слишком больших скачков времени.
      const safeDt = Math.min(dt, 0.033);

      debugAccumTime += dt;
      const shouldLog = debugAccumTime >= 0.5;
      if (shouldLog) {
        debugAccumTime = 0;
      }

      let appliedAny = false;
      const pitchSign = config.invertPitch ? -1 : 1;

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
          config.accelSmoothing,
        );

        const ax = THREE.MathUtils.clamp(
          state.smoothedLocalAccel.x,
          -config.maxAccel,
          config.maxAccel,
        );
        const ay = THREE.MathUtils.clamp(
          state.smoothedLocalAccel.y,
          -config.maxAccel,
          config.maxAccel,
        );
        const az = THREE.MathUtils.clamp(
          state.smoothedLocalAccel.z,
          -config.maxAccel,
          config.maxAccel,
        );

        const forceX =
        pitchSign *
        (ay * config.pitchFromAccelY +
        az * config.pitchFromAccelZ);
        const forceY = ax * config.yawFromAccelX;
        const forceZ = -ax * config.rollFromAccelX;

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
          config.stiffness * state.angle.x -
          config.damping * state.angularVel.x;
        const accelAngleY =
        forceY -
          config.stiffness * state.angle.y -
          config.damping * state.angularVel.y;
        const accelAngleZ =
        forceZ -
          config.stiffness * state.angle.z -
          config.damping * state.angularVel.z;

        state.angularVel.x += accelAngleX * safeDt;
        state.angularVel.y += accelAngleY * safeDt;
        state.angularVel.z += accelAngleZ * safeDt;

        state.angle.x = THREE.MathUtils.clamp(
          state.angle.x + state.angularVel.x * safeDt,
          -config.maxPitchRad,
          config.maxPitchRad,
        );
        state.angle.y = THREE.MathUtils.clamp(
          state.angle.y + state.angularVel.y * safeDt,
          -config.maxYawRad,
          config.maxYawRad,
        );
        state.angle.z = THREE.MathUtils.clamp(
          state.angle.z + state.angularVel.z * safeDt,
          -config.maxRollRad,
          config.maxRollRad,
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


const PRESET_DESCRIPTIONS: Record<BreastSpringPresetName, string> = {
  subtle: 'едва заметный',
  natural: 'мягкий',
  noticeable: 'заметный',
  strong: 'сильный',
  extreme: 'экстремальный',
  extreme2: 'экстремальный 2',
  extreme3: 'экстремальный 3',
  extreme4: 'экстремальный 4',
  extreme5: 'экстремальный 5',
  extreme6: 'экстремальный 6',
  extreme7: 'экстремальный 7',
  extreme8: 'экстремальный 8',
  extreme9: 'экстремальный 9',
  extreme10: 'экстремальный 10',
  extreme11: 'экстремальный 11',
};

function installViewerStyles(): void {
  if (document.getElementById('mmd-viewer-ui-styles')) return;

  const style = document.createElement('style');
  style.id = 'mmd-viewer-ui-styles';
  style.textContent = `
  #mmd-viewer-panel {
  position: fixed;
  z-index: 20;
  top: 14px;
  right: 14px;
  width: min(360px, calc(100vw - 28px));
  max-height: calc(100vh - 28px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: #e8edf5;
  background: rgba(20, 24, 32, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.38);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  font: 13px/1.4 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  #mmd-viewer-panel * { box-sizing: border-box; }
  #mmd-viewer-panel .mmd-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 13px 15px;
  border-bottom: 1px solid rgba(255,255,255,.10);
  }
  #mmd-viewer-panel .mmd-panel-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: .02em;
  }
  #mmd-viewer-panel .mmd-panel-subtitle {
  color: #98a4b6;
  font-size: 11px;
  }
  #mmd-viewer-panel .mmd-panel-content {
  overflow: auto;
  padding: 10px 12px 14px;
  }
  #mmd-viewer-panel .mmd-section {
  padding: 8px 2px 12px;
  border-bottom: 1px solid rgba(255,255,255,.10);
  }
  #mmd-viewer-panel .mmd-section:last-child { border-bottom: 0; }
  #mmd-viewer-panel .mmd-section-title {
  margin: 0 0 9px;
  color: #c9d4e4;
  font-size: 12px;
  font-weight: 700;
  }
  #mmd-viewer-panel .mmd-field-label {
  display: block;
  margin: 9px 0 5px;
  color: #aeb9c9;
  font-size: 11px;
  }
  #mmd-viewer-panel select {
  width: 100%;
  min-height: 34px;
  padding: 6px 9px;
  color: #f2f5fa;
  background: #2a313d;
  border: 1px solid #465163;
  border-radius: 7px;
  outline: none;
  font: inherit;
  }
  #mmd-viewer-panel select:focus { border-color: #7da7ff; }
  #mmd-viewer-panel .mmd-check-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 28px;
  color: #e2e8f1;
  cursor: pointer;
  user-select: none;
  }
  #mmd-viewer-panel input[type="checkbox"] {
  width: 15px;
  height: 15px;
  margin: 0;
  accent-color: #72a4ff;
  cursor: pointer;
  flex: 0 0 auto;
  }
  #mmd-viewer-panel .mmd-active-preset {
  margin-top: 6px;
  color: #9eacc0;
  font-size: 11px;
  }
  #mmd-viewer-panel .mmd-tree-help {
  margin: 0 0 8px;
  color: #94a1b4;
  font-size: 11px;
  }
  #mmd-viewer-panel .mmd-tree {
  padding: 5px 0 0;
  color: #e0e7f0;
  }
  #mmd-viewer-panel .mmd-tree details { margin: 2px 0; }
  #mmd-viewer-panel .mmd-tree summary {
  display: flex;
  align-items: center;
  min-height: 27px;
  gap: 6px;
  padding: 3px 5px;
  border-radius: 5px;
  cursor: pointer;
  list-style: none;
  }
  #mmd-viewer-panel .mmd-tree summary::-webkit-details-marker { display: none; }
  #mmd-viewer-panel .mmd-tree summary::before {
  content: '›';
  display: inline-block;
  width: 10px;
  color: #93a2b7;
  transition: transform .12s ease;
  }
  #mmd-viewer-panel .mmd-tree details[open] > summary::before { transform: rotate(90deg); }
  #mmd-viewer-panel .mmd-tree .mmd-tree-leaf {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 27px;
  padding: 3px 5px 3px 22px;
  border-radius: 5px;
  }
  #mmd-viewer-panel .mmd-tree summary:hover,
  #mmd-viewer-panel .mmd-tree .mmd-tree-leaf:hover { background: rgba(255,255,255,.06); }
  #mmd-viewer-panel .mmd-tree .mmd-tree-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  }
  #mmd-viewer-panel .mmd-tree .mmd-tree-children {
  margin-left: 13px;
  padding-left: 7px;
  border-left: 1px solid rgba(255,255,255,.12);
  }
  #mmd-viewer-panel .mmd-tree .mmd-tree-group > summary {
  color: #aebed4;
  font-size: 11px;
  font-weight: 650;
  }
  #mmd-viewer-panel .mmd-tree .mmd-tree-group > summary::before { content: '›'; }
  #mmd-viewer-panel .mmd-tree-empty {
  padding: 8px 5px;
  color: #a4afbf;
  }
  @media (max-width: 600px) {
    #mmd-viewer-panel {
    top: 8px;
    right: 8px;
    width: min(330px, calc(100vw - 16px));
    max-height: calc(100vh - 16px);
    }
  }
  `;
  document.head.appendChild(style);
}

function createTreeLeaf(
  label: string,
  checked: boolean,
  onChange: (visible: boolean) => void,
): HTMLElement {
  const row = document.createElement('label');
  row.className = 'mmd-tree-leaf';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = checked;
  checkbox.addEventListener('change', () => onChange(checkbox.checked));

  const text = document.createElement('span');
  text.className = 'mmd-tree-label';
  text.textContent = label;

  row.append(checkbox, text);
  return row;
}

function createTreeGroup(label: string, children: HTMLElement[]): HTMLElement {
  const details = document.createElement('details');
  details.className = 'mmd-tree-group';
  details.open = true;

  const summary = document.createElement('summary');
  const text = document.createElement('span');
  text.className = 'mmd-tree-label';
  text.textContent = label;
  summary.append(text);

  const childContainer = document.createElement('div');
  childContainer.className = 'mmd-tree-children';
  childContainer.append(...children);

  details.append(summary, childContainer);
  return details;
}

function createObjectTreeNode(object: THREE.Object3D, fallbackLabel: string): HTMLElement | null {
  // Кости скелета не являются отдельными деталями геометрии, поэтому не засоряем ими дерево.
  if ((object as THREE.Bone).isBone) return null;

  const label = object.name.trim() || fallbackLabel;
  const children: HTMLElement[] = [];

  const meshObject = object as THREE.Mesh;
  if (meshObject.isMesh && meshObject.material) {
    const materials = Array.isArray(meshObject.material)
    ? meshObject.material
    : [meshObject.material];

    const materialRows = materials.map((material, index) => {
      const materialLabel = material.name.trim() || `Материал ${index + 1}`;
      return createTreeLeaf(materialLabel, material.visible, (visible) => {
        material.visible = visible;
      });
    });

    if (materialRows.length > 0) {
      children.push(createTreeGroup(`Материалы / детали (${materials.length})`, materialRows));
    }
  }

  object.children.forEach((child, index) => {
    const childNode = createObjectTreeNode(child, `${child.type} ${index + 1}`);
    if (childNode) children.push(childNode);
  });

    const details = document.createElement('details');
    details.open = true;

    const summary = document.createElement('summary');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = object.visible;
    checkbox.addEventListener('click', (event) => event.stopPropagation());
    checkbox.addEventListener('change', () => {
      object.visible = checkbox.checked;
    });

    const text = document.createElement('span');
    text.className = 'mmd-tree-label';
    text.textContent = label;
    summary.append(checkbox, text);

    const childContainer = document.createElement('div');
    childContainer.className = 'mmd-tree-children';
    childContainer.append(...children);

    details.append(summary, childContainer);
    return details;
}

interface ViewerUICallbacks {
  onPresetChange: (preset: BreastSpringPresetName) => void;
  onSpringEnabledChange: (enabled: boolean) => void;
}

function createViewerUI(
  callbacks: ViewerUICallbacks,
): { setModel: (mesh: THREE.SkinnedMesh) => void } {
  installViewerStyles();

  const panel = document.createElement('aside');
  panel.id = 'mmd-viewer-panel';

  const header = document.createElement('header');
  header.className = 'mmd-panel-header';
  const titleWrap = document.createElement('div');
  const title = document.createElement('h1');
  title.className = 'mmd-panel-title';
  title.textContent = 'MMD Viewer';
  const subtitle = document.createElement('div');
  subtitle.className = 'mmd-panel-subtitle';
  subtitle.textContent = 'Настройки модели и физики';
  titleWrap.append(title, subtitle);
  header.append(titleWrap);

  const content = document.createElement('div');
  content.className = 'mmd-panel-content';

  const physicsSection = document.createElement('section');
  physicsSection.className = 'mmd-section';
  const physicsTitle = document.createElement('h2');
  physicsTitle.className = 'mmd-section-title';
  physicsTitle.textContent = 'Физика груди';

  const springLabel = document.createElement('label');
  springLabel.className = 'mmd-check-row';
  const springCheckbox = document.createElement('input');
  springCheckbox.type = 'checkbox';
  springCheckbox.checked = ENABLE_BREAST_SPRING_MOD;
  const springText = document.createElement('span');
  springText.textContent = 'Дополнительная пружина';
  springLabel.append(springCheckbox, springText);

  const presetLabel = document.createElement('label');
  presetLabel.className = 'mmd-field-label';
  presetLabel.textContent = 'Интенсивность';
  const presetSelect = document.createElement('select');
  (Object.keys(BREAST_SPRING_PRESETS) as BreastSpringPresetName[]).forEach((preset) => {
    const option = document.createElement('option');
    option.value = preset;
    option.textContent = `${preset} · ${PRESET_DESCRIPTIONS[preset]}`;
    option.selected = preset === activeBreastSpringPreset;
    presetSelect.append(option);
  });

  const activePresetText = document.createElement('div');
  activePresetText.className = 'mmd-active-preset';
  activePresetText.textContent = `Активный пресет: ${activeBreastSpringPreset}`;

  springCheckbox.addEventListener('change', () => {
    callbacks.onSpringEnabledChange(springCheckbox.checked);
  });

  presetSelect.addEventListener('change', () => {
    const preset = presetSelect.value as BreastSpringPresetName;
    if (!(preset in BREAST_SPRING_PRESETS)) return;
    activePresetText.textContent = `Активный пресет: ${preset}`;
    callbacks.onPresetChange(preset);
  });

  physicsSection.append(
    physicsTitle,
    springLabel,
    presetLabel,
    presetSelect,
    activePresetText,
  );

  const treeSection = document.createElement('section');
  treeSection.className = 'mmd-section';
  const treeTitle = document.createElement('h2');
  treeTitle.className = 'mmd-section-title';
  treeTitle.textContent = 'Дерево модели';
  const treeHelp = document.createElement('p');
  treeHelp.className = 'mmd-tree-help';
  treeHelp.textContent =
  'Отключай объекты целиком или отдельные материалы. В PMX материалы часто соответствуют отдельным деталям модели.';
  const treeContainer = document.createElement('div');
  treeContainer.className = 'mmd-tree';
  const loadingText = document.createElement('div');
  loadingText.className = 'mmd-tree-empty';
  loadingText.textContent = 'Ожидание загрузки модели…';
  treeContainer.append(loadingText);

  treeSection.append(treeTitle, treeHelp, treeContainer);
  content.append(physicsSection, treeSection);
  panel.append(header, content);
  document.body.appendChild(panel);

  return {
    setModel(mesh: THREE.SkinnedMesh) {
      treeContainer.replaceChildren();
      const root = createObjectTreeNode(mesh, mesh.isSkinnedMesh ? 'Модель (SkinnedMesh)' : 'Модель');
      if (root) {
        treeContainer.append(root);
      } else {
        const empty = document.createElement('div');
        empty.className = 'mmd-tree-empty';
        empty.textContent = 'Не удалось построить дерево объектов модели.';
        treeContainer.append(empty);
      }
    },
  };
}

async function init() {
  window.__BREAST_SPRING_MOD__ = ENABLE_BREAST_SPRING_MOD;

  let breastSpring: ReturnType<typeof createBreastSpringController> | null = null;
  const viewerUI = createViewerUI({
    onPresetChange: (preset) => {
      activeBreastSpringPreset = preset;
      console.info(
        `[BreastSpringMod] Выбран пресет: ${preset}`,
        BREAST_SPRING_PRESETS[preset],
      );
    },
    onSpringEnabledChange: (enabled) => {
      window.__BREAST_SPRING_MOD__ = enabled;
      breastSpring?.reset();
      console.info(
        `[BreastSpringMod] ${enabled ? 'Включена' : 'Отключена'} дополнительная пружина.`,
      );
    },
  });

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
