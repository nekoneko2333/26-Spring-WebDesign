import * as THREE from 'three';
import { scene } from '../core/scene.js';

// ==================== 小车视觉分组 ====================
export const carVisualGroup = new THREE.Group();
scene.add(carVisualGroup);

export const wheelBindings = [null, null, null, null];
export let carModelRoot = null;

// 卡通低多边形调色板
const C_BODY    = 0xff6b35; // 暖橙 — 车身
const C_ROOF    = 0xff8c42; // 浅橙 — 车顶
const C_GLASS   = 0xa8daff; // 天蓝 — 玻璃
const C_WHEEL   = 0x2d3561; // 深蓝 — 轮胎
const C_HUB     = 0xf5f0e8; // 米白 — 轮毂
const C_BUMPER  = 0xffd166; // 亮黄 — 保险杠
const C_LIGHT   = 0xfffde7; // 近白黄 — 车灯

function mat(color, rough = 0.55, metal = 0.05) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, flatShading: true });
}

export function createCustomCarVisual() {
  carVisualGroup.clear();

  // === 底盘（宽扁）===
  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, 0.38, 3.8),
    mat(C_BODY, 0.5)
  );
  chassis.position.y = 0.44;
  chassis.castShadow = true;
  carVisualGroup.add(chassis);

  // === 车顶舱（梯形感：用两段叠加）===
  const roofBase = new THREE.Mesh(
    new THREE.BoxGeometry(1.65, 0.55, 2.0),
    mat(C_ROOF, 0.45)
  );
  roofBase.position.set(0, 0.9, -0.15);
  roofBase.castShadow = true;
  carVisualGroup.add(roofBase);

  const roofTop = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.28, 1.55),
    mat(C_ROOF, 0.42)
  );
  roofTop.position.set(0, 1.28, -0.22);
  roofTop.castShadow = true;
  carVisualGroup.add(roofTop);

  // === 挡风玻璃（前）===
  const windF = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 0.42, 0.08),
    mat(C_GLASS, 0.05, 0.12)
  );
  windF.position.set(0, 0.94, 0.8);
  windF.rotation.x = -0.32;
  windF.castShadow = false;
  carVisualGroup.add(windF);

  // === 挡风玻璃（后）===
  const windR = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 0.38, 0.08),
    mat(C_GLASS, 0.05, 0.12)
  );
  windR.position.set(0, 0.96, -1.14);
  windR.rotation.x = 0.28;
  carVisualGroup.add(windR);

  // === 保险杠（前 / 后）===
  [1.88, -1.88].forEach((z) => {
    const bumper = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.22, 0.2),
      mat(C_BUMPER, 0.6)
    );
    bumper.position.set(0, 0.26, z);
    carVisualGroup.add(bumper);
  });

  // === 车灯（前）===
  [-0.58, 0.58].forEach((x) => {
    const light = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.16, 0.06),
      mat(C_LIGHT, 0.1, 0.3)
    );
    light.position.set(x, 0.5, 1.93);
    carVisualGroup.add(light);
  });

  // === 车轮（低多边形 8 边形）===
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 8);
  wheelGeo.rotateZ(Math.PI / 2);
  const hubGeo   = new THREE.CylinderGeometry(0.18, 0.18, 0.30, 8);
  hubGeo.rotateZ(Math.PI / 2);

  const wheelPositions = [
    new THREE.Vector3(-1.06, 0.38, 1.38),
    new THREE.Vector3( 1.06, 0.38, 1.38),
    new THREE.Vector3(-1.06, 0.38, -1.38),
    new THREE.Vector3( 1.06, 0.38, -1.38),
  ];

  wheelPositions.forEach((pos, i) => {
    const node = new THREE.Object3D();
    node.position.copy(pos);

    const tire = new THREE.Mesh(wheelGeo, mat(C_WHEEL, 0.9, 0.0));
    tire.castShadow = true;
    node.add(tire);

    const hub = new THREE.Mesh(hubGeo, mat(C_HUB, 0.6, 0.1));
    node.add(hub);

    wheelBindings[i] = node;
    carVisualGroup.add(node);
  });

  carModelRoot = chassis;
  return chassis;
}
