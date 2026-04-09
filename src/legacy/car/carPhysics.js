import * as THREE from 'three';
import { carVisualGroup, createCustomCarVisual } from './carVisual.js';
import { worldPosToHeight } from '../core/mapTiles.js';
import { roadCurve } from '../landmarks/landmarkLoader.js';

// ==================== 小车状态（平面 kinematic 驱动） ====================
const GROUND_Y = 0.65; // 车底距地高度（底盘高 0.7 / 2 + 少量余量）

export const carState = {
  position: new THREE.Vector3(0, GROUND_Y, 0),
  angle: 0,           // 绕 Y 轴偏航角（弧度）
  speed: 0,           // 当前速度（m/s，正向前）
  autoDrive: false,   // 是否处于自动驾驶模式
  autoDriveT: 0,      // 自动驾驶在曲线上的位置 (0~1)
};

// 驾驶参数
const MAX_SPEED       = 18;    // m/s
const MAX_SPEED_BOOST = 30;
const ACCEL           = 22;    // m/s²
const BRAKE_DECEL     = 30;
const DRAG            = 6;     // 无输入时的自然减速
const MAX_STEER_RATE  = 1.8;   // rad/s，速度为 0 时
const MIN_STEER_RATE  = 0.55;  // rad/s，高速时

// 用于视觉同步的四元数
const _quat = new THREE.Quaternion();

/**
 * 初始化小车视觉（无物理引擎依赖）。
 */
export function initPhysicsCar() {
  createCustomCarVisual();
  syncVisual();
}

/**
 * 每帧更新：根据 controls 推进 carState，然后同步视觉。
 * @param {number} delta - 帧间隔秒数
 * @param {{ forward:boolean, backward:boolean, left:boolean, right:boolean, boost:boolean }} controls
 * @param {boolean} drivingEnabled
 */
export function updateCar(delta, controls, drivingEnabled) {
  if (!drivingEnabled) {
    carState.speed = decayToZero(carState.speed, BRAKE_DECEL, delta);
    syncVisual();
    return;
  }

  if (carState.autoDrive && roadCurve) {
    const hasManualInput = controls.forward || controls.backward || controls.left || controls.right;
    if (hasManualInput) {
      carState.autoDrive = false;
    } else {
      updateAutoDrive(delta);
      syncVisual();
      return;
    }
  }

  const maxSpd = controls.boost ? MAX_SPEED_BOOST : MAX_SPEED;

  // --- 纵向加速 ---
  if (controls.forward && !controls.backward) {
    carState.speed = Math.min(carState.speed + ACCEL * delta, maxSpd);
  } else if (controls.backward && !controls.forward) {
    carState.speed = Math.max(carState.speed - BRAKE_DECEL * delta, -maxSpd * 0.5);
  } else {
    carState.speed = decayToZero(carState.speed, DRAG, delta);
  }

  // --- 转向（速度越快转向率越低，静止时不转向） ---
  const speedRatio = Math.min(Math.abs(carState.speed) / MAX_SPEED, 1);
  const steerRate  = THREE.MathUtils.lerp(MAX_STEER_RATE, MIN_STEER_RATE, speedRatio);
  const steerDir   = carState.speed >= 0 ? 1 : -1; // 倒车时方向反转

  if (controls.left)  carState.angle += steerRate * steerDir * delta;
  if (controls.right) carState.angle -= steerRate * steerDir * delta;

  // --- 沿朝向移动，Y 轴跟随地形高度 ---
  carState.position.x += Math.sin(carState.angle) * carState.speed * delta;
  carState.position.z += Math.cos(carState.angle) * carState.speed * delta;
  // 从高程图采样当前位置的地面高度，加上车底偏移
  const terrainY = worldPosToHeight(carState.position.x, carState.position.z);
  carState.position.y = terrainY + GROUND_Y;

  syncVisual();
}

function decayToZero(value, rate, delta) {
  if (value > 0) return Math.max(0, value - rate * delta);
  if (value < 0) return Math.min(0, value + rate * delta);
  return 0;
}

function syncVisual() {
  carVisualGroup.position.copy(carState.position);
  _quat.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, carState.angle);
  carVisualGroup.quaternion.copy(_quat);
}

const _tempVec = new THREE.Vector3();
const _lookAtVec = new THREE.Vector3();

function updateAutoDrive(delta) {
  const speed = 15; // 自动驾驶速度
  const length = roadCurve.getLength();
  const dt = (speed * delta) / length;
  
  carState.autoDriveT = (carState.autoDriveT + dt) % 1.0;
  
  // 当前位置
  roadCurve.getPointAt(carState.autoDriveT, _tempVec);
  carState.position.x = _tempVec.x;
  carState.position.z = _tempVec.z;
  
  // 朝向
  const lookAtT = (carState.autoDriveT + 0.01) % 1.0;
  roadCurve.getPointAt(lookAtT, _lookAtVec);
  const angle = Math.atan2(_lookAtVec.x - _tempVec.x, _lookAtVec.z - _tempVec.z);
  carState.angle = angle;

  const terrainY = worldPosToHeight(carState.position.x, carState.position.z);
  carState.position.y = terrainY + GROUND_Y;
  carState.speed = speed;
}

// chassisMesh 兼容层：相机控制器通过它读取位置/旋转
export const chassisMesh = {
  get position() { return carState.position; },
  get quaternion() { return carVisualGroup.quaternion; },
};
