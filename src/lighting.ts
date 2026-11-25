import * as THREE from 'three';

export function addSceneLighting(scene: THREE.Scene): void {
  const hemisphereLight = new THREE.HemisphereLight(
    0xdfe7f2,
    0x34313a,
    0.45,
  );
  hemisphereLight.position.set(0, 30, 0);
  scene.add(hemisphereLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.55);
  directionalLight.position.set(10, 20, 15);
  scene.add(directionalLight);
}
