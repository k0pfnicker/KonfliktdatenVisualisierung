import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// ─── Scene ────────────────────────────────────────────────────────────────────
export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020617);

// ─── Camera ───────────────────────────────────────────────────────────────────
export const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  5000,
);
camera.position.set(0, 0, 300);

// ─── Renderer ─────────────────────────────────────────────────────────────────
export const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
renderer.xr.enabled = true;

// ─── Controls ─────────────────────────────────────────────────────────────────
export const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 105; // Prevents clipping inside the globe (radius is 100)
controls.maxDistance = 800; // Prevents zooming out too far into the void

// ─── Lights ───────────────────────────────────────────────────────────────────
export const ambient = new THREE.AmbientLight(0x404040, 2);
scene.add(ambient);

export const camLight = new THREE.DirectionalLight(0xffffff, 1.5);
camLight.position.set(0, 0, 1);
scene.add(camLight);
scene.add(camLight.target);
scene.add(camera);

// ─── World root & groups ──────────────────────────────────────────────────────
export const worldRoot = new THREE.Group();
scene.add(worldRoot);

export const globeRadius = 100;

export const earthModel = new THREE.Group();
worldRoot.add(earthModel);

export const map2D = new THREE.Group();
map2D.visible = false;
worldRoot.add(map2D);

export const reference2DGroup = new THREE.Group();
worldRoot.add(reference2DGroup);

export const chartGroup = new THREE.Group();
worldRoot.add(chartGroup);

export const haloMesh = new THREE.Group();
worldRoot.add(haloMesh);

// ─── Raycaster ────────────────────────────────────────────────────────────────
export const raycaster = new THREE.Raycaster();
export const mouse = new THREE.Vector2();

// ─── Globe GLTF loader ────────────────────────────────────────────────────────
/**
 * Attaches the container div to the DOM and loads the 3D earth model.
 * @param {HTMLElement} container
 */
export function mountRendererAndLoadGlobe(container) {
  container.appendChild(renderer.domElement);

  const loader = new GLTFLoader();
  loader.load("./earth3D_1.glb", (gltf) => {
    const model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = (globeRadius * 2) / maxDim;
    model.scale.set(scale, scale, scale);
    model.rotation.y = Math.PI / 2;
    box.setFromObject(model);
    const center = new THREE.Vector3();
    box.getCenter(center);
    model.position.sub(center);
    earthModel.clear();
    earthModel.add(model);
  });

  const texLoader = new THREE.TextureLoader();
  texLoader.load("./earth2D_2.jpg", (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    const mapWidth  = 2 * Math.PI * globeRadius;
    const mapHeight = Math.PI * globeRadius;
    const geometry = new THREE.PlaneGeometry(mapWidth, mapHeight, 32, 32);
    // Darken the background significantly so glowing particles (especially yellow ones) pop out beautifully against the yellow desert
    const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, color: 0x444444 });
    const plane = new THREE.Mesh(geometry, material);
    plane.position.z = -1; // sit slightly behind particles
    map2D.clear();
    map2D.add(plane);
  });
}
