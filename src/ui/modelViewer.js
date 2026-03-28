import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// ==================== DOM ====================
const overlayEl  = document.getElementById('model-viewer-overlay');
const titleEl    = document.getElementById('mv-title');
const descEl     = document.getElementById('mv-desc');
const closeEl    = document.getElementById('mv-close');
const canvasEl   = document.getElementById('mv-canvas');

// ==================== 独立渲染器 ====================
const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = false;
renderer.setClearColor(0x000000, 0);

const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1000);
camera.position.set(0, 1.2, 4);

// 灯光
scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const dirLight = new THREE.DirectionalLight(0xfff4e0, 1.4);
dirLight.position.set(3, 6, 4);
scene.add(dirLight);
const fillLight = new THREE.DirectionalLight(0xc9e4ff, 0.5);
fillLight.position.set(-4, 2, -3);
scene.add(fillLight);

// ==================== 状态 ====================
let currentModel = null;
let rafId        = null;
let isOpen       = false;

// 旋转交互
const pointer  = { down: false, x: 0, y: 0 };
let rotX = 0, rotY = 0;   // 当前欧拉角
let targetRotX = 0, targetRotY = 0;
let zoom = 4, targetZoom = 4;

// ==================== 渲染循环 ====================
function resizeRenderer() {
  const w = canvasEl.clientWidth;
  const h = canvasEl.clientHeight;
  if (renderer.domElement.width !== w || renderer.domElement.height !== h) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
}

function renderLoop() {
  if (!isOpen) return;
  rafId = requestAnimationFrame(renderLoop);
  resizeRenderer();

  // 平滑插值
  rotX += (targetRotX - rotX) * 0.12;
  rotY += (targetRotY - rotY) * 0.12;
  zoom += (targetZoom - zoom) * 0.10;
  camera.position.set(
    Math.sin(rotY) * Math.cos(rotX) * zoom,
    Math.sin(rotX) * zoom,
    Math.cos(rotY) * Math.cos(rotX) * zoom
  );
  camera.lookAt(0, 0.6, 0);

  renderer.render(scene, camera);
}

// ==================== 鼠标 / 触摸旋转 ====================
canvasEl.addEventListener('pointerdown', (e) => {
  pointer.down = true;
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  canvasEl.setPointerCapture(e.pointerId);
});

canvasEl.addEventListener('pointermove', (e) => {
  if (!pointer.down) return;
  const dx = e.clientX - pointer.x;
  const dy = e.clientY - pointer.y;
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  targetRotY += dx * 0.012;
  targetRotX -= dy * 0.012;
  targetRotX = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, targetRotX));
});

canvasEl.addEventListener('pointerup',   () => { pointer.down = false; });
canvasEl.addEventListener('pointercancel', () => { pointer.down = false; });

canvasEl.addEventListener('wheel', (e) => {
  e.preventDefault();
  targetZoom = Math.max(1.2, Math.min(12, targetZoom + e.deltaY * 0.005));
}, { passive: false });

// ==================== 加载模型 ====================
const loader = new GLTFLoader();
const modelCache = new Map();

function clearModel() {
  if (currentModel) {
    scene.remove(currentModel);
    currentModel = null;
  }
}

function fitModelToView(model) {
  const box = new THREE.Box3().setFromObject(model);
  const size   = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  // 居中
  model.position.sub(center);
  model.position.y += size.y / 2; // 底部对齐原点

  // 初始相机距离
  const maxDim = Math.max(size.x, size.y, size.z);
  zoom = targetZoom = maxDim * 2.0;
  rotX = targetRotX = 0.22;
  rotY = targetRotY = 0.4;
}

function loadModel(modelPath) {
  clearModel();

  if (modelCache.has(modelPath)) {
    const cached = modelCache.get(modelPath).clone();
    fitModelToView(cached);
    currentModel = cached;
    scene.add(currentModel);
    return;
  }

  loader.load(
    modelPath,
    (gltf) => {
      const model = gltf.scene;
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = false;
          child.receiveShadow = false;
        }
      });
      modelCache.set(modelPath, model.clone());
      fitModelToView(model);
      clearModel();
      currentModel = model;
      scene.add(currentModel);
    },
    undefined,
    (err) => console.error('模型加载失败', err)
  );
}

// ==================== 开关 ====================
export function openModelViewer(poi) {
  if (!overlayEl) return;
  titleEl.textContent = poi.name;
  descEl.textContent  = poi.description;
  overlayEl.classList.add('is-visible');
  overlayEl.setAttribute('aria-hidden', 'false');
  isOpen = true;
  loadModel(poi.modelPath);
  renderLoop();
}

export function closeModelViewer() {
  if (!overlayEl) return;
  overlayEl.classList.remove('is-visible');
  overlayEl.setAttribute('aria-hidden', 'true');
  isOpen = false;
  cancelAnimationFrame(rafId);
  clearModel();
}

// 关闭按钮 & 点击遮罩
if (closeEl)   closeEl.addEventListener('click', closeModelViewer);
if (overlayEl) overlayEl.addEventListener('click', (e) => {
  if (e.target === overlayEl) closeModelViewer();
});
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && isOpen) closeModelViewer();
});
