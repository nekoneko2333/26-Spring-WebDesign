import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { THEME } from '../config/theme.js';
import { scene } from './scene.js';

// ==================== 物理世界 ====================
export const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
world.broadphase = new CANNON.SAPBroadphase(world);
world.defaultContactMaterial.friction = 0.68;
world.defaultContactMaterial.restitution = 0.02;

// ==================== 地面材质（供车轮 ContactMaterial 引用） ====================
export const groundMaterial = new CANNON.Material('ground');
export const wheelMaterial = new CANNON.Material('wheel');

world.addContactMaterial(
  new CANNON.ContactMaterial(wheelMaterial, groundMaterial, {
    friction: 1.25,
    restitution: 0,
    contactEquationStiffness: 1e7,
    contactEquationRelaxation: 3,
  })
);

// ==================== 地面刚体 ====================
export const groundBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
groundBody.material = groundMaterial;
world.addBody(groundBody);

// ==================== 地面渲染网格 ====================
const groundMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(240, 240),
  new THREE.MeshStandardMaterial({ color: THEME.ground, roughness: 0.94, metalness: 0.03 })
);
groundMesh.rotation.x = -Math.PI / 2;
groundMesh.receiveShadow = true;
scene.add(groundMesh);
