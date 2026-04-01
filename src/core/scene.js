import * as THREE from 'three';
import { THEME } from '../config/theme.js';
// 地面由 mapTiles.js 的 buildMapGround() 负责生成，此处不再添加绿色地面

// ==================== 场景 ====================
export const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb8ddfa); // 柔和白天蓝
scene.fog = new THREE.FogExp2(0xd8edff, 0.0026); // 轻雾

// ==================== 相机 ====================
export const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

// ==================== 渲染器 ====================
export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.appendChild(renderer.domElement);

// ==================== 灯光 ====================
const hemisphereLight = new THREE.HemisphereLight(THEME.hemiSky, THEME.hemiGround, 0.85);
scene.add(hemisphereLight);

const directionalLight = new THREE.DirectionalLight(THEME.sun, 1.25);
directionalLight.position.set(42, 58, 24);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(2048, 2048);
directionalLight.shadow.camera.left = -120;
directionalLight.shadow.camera.right = 120;
directionalLight.shadow.camera.top = 120;
directionalLight.shadow.camera.bottom = -120;
directionalLight.shadow.camera.near = 1;
directionalLight.shadow.camera.far = 320;
scene.add(directionalLight);

// ==================== 响应式尺寸 ====================
export function onResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}
window.addEventListener('resize', onResize);
