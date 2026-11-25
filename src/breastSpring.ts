import * as THREE from 'three';
import {
  ENABLE_BREAST_SPRING_MOD,
  ENABLE_BREAST_SPRING_MOD_LOGGING,
  type BreastSpringConfig,
} from './config';

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
  hasAppliedSpring: boolean;
}

const BREAST_BONE_INCLUDE_REGEX = /(左胸|右胸|胸|乳|breast|boob|bust|oppai)/i;
const BREAST_BONE_EXCLUDE_REGEX = /(親|ジンバル|アンカー|先|parent|gimbal|anchor|tip)/i;
const PAIRED_BREAST_BONE_REGEX = /(左胸|右胸|breast.*[_.\s-]?(l|r)|left.*breast|right.*breast)/i;

function springLog(...args: unknown[]): void {
  if (ENABLE_BREAST_SPRING_MOD_LOGGING) console.info(...args);
}

function springWarn(...args: unknown[]): void {
  if (ENABLE_BREAST_SPRING_MOD_LOGGING) console.warn(...args);
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

export function createBreastSpringController(
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

  springLog('[BreastSpringMod] Controller created.');

  if (states.length > 0) {
    springLog(
      '[BreastSpringMod] Selected breast bones:',
      states.map((state) => state.bone.name),
    );
  } else {
    springWarn(
      '[BreastSpringMod] No breast bones matched the naming rules. Available bones:',
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
    restoreBasePose(): void {
      let restoredAny = false;

      for (const state of states) {
        if (!state.hasAppliedSpring) continue;

        state.bone.quaternion.copy(state.baseQuat);
        state.hasAppliedSpring = false;
        restoredAny = true;
      }

      if (restoredAny) mesh.updateMatrixWorld(true);
    },

    reset(): void {
      debugAccumTime = 0;

      for (const state of states) {
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

    captureBasePose(): void {
      for (const state of states) {
        state.baseQuat.copy(state.bone.quaternion);
      }
    },

    update(dt: number): void {
      if (!isBreastSpringModEnabled() || states.length === 0 || dt <= 0) {
        return;
      }

      const config = getConfig();
      const safeDt = Math.min(dt, 0.033);

      debugAccumTime += dt;
      const shouldLog = ENABLE_BREAST_SPRING_MOD_LOGGING && debugAccumTime >= 0.5;
      if (shouldLog) debugAccumTime = 0;

      let appliedAny = false;
      const pitchSign = config.invertPitch ? -1 : 1;

      for (let index = 0; index < states.length; index++) {
        const state = states[index];
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
        state.smoothedLocalAccel.lerp(localAccel, config.accelSmoothing);

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
          (ay * config.pitchFromAccelY + az * config.pitchFromAccelZ);
        const forceY = ax * config.yawFromAccelX;
        const forceZ = -ax * config.rollFromAccelX;

        if (shouldLog && index === 0) {
          springLog(
            `[BreastSpringMod][${state.bone.name}] ` +
              `localAccel=(${localAccel.x.toFixed(2)}, ${localAccel.y.toFixed(2)}, ${localAccel.z.toFixed(2)}) | ` +
              `clamped=(${ax.toFixed(1)}, ${ay.toFixed(1)}, ${az.toFixed(1)}) | ` +
              `force=(${forceX.toFixed(3)}, ${forceY.toFixed(3)}, ${forceZ.toFixed(3)}) | ` +
              `angleDeg=(${THREE.MathUtils.radToDeg(state.angle.x).toFixed(1)}, ${THREE.MathUtils.radToDeg(state.angle.y).toFixed(1)}, ${THREE.MathUtils.radToDeg(state.angle.z).toFixed(1)})`,
          );
        }

        const angularAccelX =
          forceX -
          config.stiffness * state.angle.x -
          config.damping * state.angularVel.x;
        const angularAccelY =
          forceY -
          config.stiffness * state.angle.y -
          config.damping * state.angularVel.y;
        const angularAccelZ =
          forceZ -
          config.stiffness * state.angle.z -
          config.damping * state.angularVel.z;

        state.angularVel.x += angularAccelX * safeDt;
        state.angularVel.y += angularAccelY * safeDt;
        state.angularVel.z += angularAccelZ * safeDt;

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

        springEuler.set(state.angle.x, state.angle.y, state.angle.z, 'YXZ');
        springQuat.setFromEuler(springEuler);
        state.bone.quaternion.multiply(springQuat);
        state.hasAppliedSpring = true;
        appliedAny = true;
      }

      if (appliedAny) mesh.updateMatrixWorld(true);
    },
  };
}
