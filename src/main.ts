import * as THREE from 'three';
import { WebGPURenderer } from 'three/webgpu';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MMDLoader, MMDAnimationHelper } from '@takahirox/three-mmd';

type AmmoFactory = (cfg?: { locateFile?: (path: string) => string }) => Promise<unknown>;

declare global {
  interface Window {
    Ammo: AmmoFactory | unknown;
  }
}

async function init() {
  if (typeof window.Ammo === 'function') {
    window.Ammo = await (window.Ammo as AmmoFactory)({
      locateFile: (path: string) => `/ammo/${path}`,
    });
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x22252a);

  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 14, 28);

  const renderer = new WebGPURenderer({ antialias: true });
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

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444455, 1.4);
  hemiLight.position.set(0, 30, 0);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.6);
  dirLight.position.set(10, 20, 15);
  scene.add(dirLight);

  scene.add(new THREE.GridHelper(30, 30));

  const helper = new MMDAnimationHelper({
    physics: true,
  });

  const loader = new MMDLoader();
  loader.load(
    '/models/model.pmx',
    (mesh) => {
      scene.add(mesh);
      try {
        helper.add(mesh, {
          physics: true,
          warmup: 60,
        });
      } catch (e) {
        console.error('Ошибка добавления в MMDAnimationHelper:', e);
      }
    },
    (xhr) => {
      if (xhr.total > 0) {
        console.log(`Загрузка: ${Math.round((xhr.loaded / xhr.total) * 100)}%`);
      }
    },
    (err) => {
      console.error('Ошибка загрузки модели:', err);
    }
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

    helper.update(delta);
    controls.update();
    renderer.render(scene, camera);
  }

  requestAnimationFrame(animate);
}

init();
