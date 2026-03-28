import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { THEME } from '../config/theme.js';
import { scene } from '../core/scene.js';

const gltfLoader = new GLTFLoader();

/** 可点击的地标根节点列表（供射线检测使用） */
export const landmarkClickableRoots = [];

/** id → poi 数据映射 */
export const landmarkById = new Map();

/** 当前加载完毕的 POI 列表 */
export let pointsOfInterest = [];

// ==================== 数据规范化 ====================
function normalizeLandmarkData(landmark) {
  const [x, y, z] = landmark.coordinates;

  const presets = {
    colosseum: { scale: [3.2, 3.2, 3.2], rotation: [0, Math.PI * 0.15, 0], triggerRadius: 15 },
    pisa: { scale: [3.6, 3.6, 3.6], rotation: [0, -Math.PI * 0.2, 0], triggerRadius: 14 },
  };

  const preset = presets[landmark.id] || { scale: [3, 3, 3], rotation: [0, 0, 0], triggerRadius: 14 };

  return {
    id: landmark.id,
    name: landmark.name,
    description: landmark.description,
    modelPath: landmark.model_path,
    position: new THREE.Vector3(x, y, z),
    scale: preset.scale,
    rotation: preset.rotation,
    triggerRadius: preset.triggerRadius,
  };
}

// ==================== API 请求 ====================
async function fetchLandmarks() {
  const response = await fetch('http://127.0.0.1:8000/api/landmarks');
  if (!response.ok) throw new Error(`landmarks API failed: ${response.status}`);
  const data = await response.json();
  return data.map(normalizeLandmarkData);
}

// ==================== GLTF 加载 ====================
function loadGLTFModel({ poi, targetSize = 10 }) {
  return new Promise((resolve, reject) => {
    gltfLoader.load(
      poi.modelPath,
      (gltf) => {
        const model = gltf.scene;
        model.rotation.set(poi.rotation[0], poi.rotation[1], poi.rotation[2]);
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        const boxBefore = new THREE.Box3().setFromObject(model);
        const sizeBefore = new THREE.Vector3();
        boxBefore.getSize(sizeBefore);
        const maxDimension = Math.max(sizeBefore.x, sizeBefore.y, sizeBefore.z);
        const uniformScale = maxDimension > 0 ? targetSize / maxDimension : 1;
        model.scale.setScalar(uniformScale);

        const boxAfter = new THREE.Box3().setFromObject(model);
        const centerAfter = new THREE.Vector3();
        boxAfter.getCenter(centerAfter);
        model.position.set(
          poi.position.x - centerAfter.x,
          poi.position.y - boxAfter.min.y,
          poi.position.z - centerAfter.z
        );

        model.userData.poiId = poi.id;
        landmarkClickableRoots.push(model);
        landmarkById.set(poi.id, poi);
        scene.add(model);

        resolve({ model, scaleFactor: uniformScale });
      },
      undefined,
      (error) => reject(error)
    );
  });
}

// ==================== 触发区（隐形球体） ====================
function createInvisibleTrigger(poi) {
  const triggerMesh = new THREE.Mesh(
    new THREE.SphereGeometry(poi.triggerRadius, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0, depthWrite: false })
  );
  triggerMesh.position.copy(poi.position);
  triggerMesh.position.y = 1.8;
  triggerMesh.userData.poiId = poi.id;
  scene.add(triggerMesh);
}

// ==================== 道路生成（平面条带，无 TubeGeometry） ====================
function buildRoadFromLandmarks(landmarks) {
  if (landmarks.length < 2) return;

  const roadPoints = [
    new THREE.Vector3(-30, 0, 30),
    ...landmarks.map((poi) => new THREE.Vector3(poi.position.x, 0, poi.position.z)),
    new THREE.Vector3(-45, 0, -10),
  ];

  const roadCurve = new THREE.CatmullRomCurve3(roadPoints, false, 'catmullrom', 0.2);
  const ROAD_WIDTH = 2.2;
  const SEGMENTS = 200;

  // 沿曲线逐段构建平面条带顶点
  const positions = [];
  const uvs = [];
  const indices = [];
  const points = roadCurve.getPoints(SEGMENTS);

  for (let i = 0; i < points.length; i++) {
    const curr = points[i];
    const next = points[Math.min(i + 1, points.length - 1)];
    const prev = points[Math.max(i - 1, 0)];

    // 切线方向（用前后点差分）
    const tangent = new THREE.Vector3().subVectors(next, prev).normalize();
    // 垂直于切线的法线（在 XZ 平面内）
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x);

    const halfW = ROAD_WIDTH / 2;
    const t = i / (points.length - 1);

    // 左侧顶点
    positions.push(
      curr.x - normal.x * halfW, 0.02, curr.z - normal.z * halfW
    );
    // 右侧顶点
    positions.push(
      curr.x + normal.x * halfW, 0.02, curr.z + normal.z * halfW
    );

    uvs.push(0, t, 1, t);
  }

  for (let i = 0; i < points.length - 1; i++) {
    const a = i * 2;
    const b = i * 2 + 1;
    const c = i * 2 + 2;
    const d = i * 2 + 3;
    indices.push(a, b, c, b, d, c);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const roadMesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      color: THEME.road,
      roughness: 0.88,
      metalness: 0.04,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    })
  );
  roadMesh.receiveShadow = true;
  scene.add(roadMesh);

  // 中心虚线（用同样方法但更窄）
  const linePositions = [];
  const lineUvs = [];
  const lineIndices = [];
  const LINE_WIDTH = 0.18;

  for (let i = 0; i < points.length; i++) {
    const curr = points[i];
    const next = points[Math.min(i + 1, points.length - 1)];
    const prev = points[Math.max(i - 1, 0)];
    const tangent = new THREE.Vector3().subVectors(next, prev).normalize();
    const normal  = new THREE.Vector3(-tangent.z, 0, tangent.x);
    const t = i / (points.length - 1);
    linePositions.push(
      curr.x - normal.x * LINE_WIDTH / 2, 0.04, curr.z - normal.z * LINE_WIDTH / 2,
      curr.x + normal.x * LINE_WIDTH / 2, 0.04, curr.z + normal.z * LINE_WIDTH / 2
    );
    lineUvs.push(0, t, 1, t);
  }
  for (let i = 0; i < points.length - 1; i++) {
    const a = i * 2; const b = a + 1; const c = a + 2; const d = a + 3;
    lineIndices.push(a, b, c, b, d, c);
  }

  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
  lineGeo.setAttribute('uv',       new THREE.Float32BufferAttribute(lineUvs, 2));
  lineGeo.setIndex(lineIndices);
  lineGeo.computeVertexNormals();

  const lineMesh = new THREE.Mesh(
    lineGeo,
    new THREE.MeshStandardMaterial({
      color: THEME.roadLine,
      roughness: 0.7,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    })
  );
  scene.add(lineMesh);
}

// ==================== 主入口 ====================
export async function initLandmarksFromAPI() {
  try {
    pointsOfInterest = await fetchLandmarks();
    pointsOfInterest.forEach(createInvisibleTrigger);
    buildRoadFromLandmarks(pointsOfInterest);
    await Promise.all(pointsOfInterest.map((poi) => loadGLTFModel({ poi, targetSize: 10 })));
  } catch (error) {
    console.error('地标初始化失败：', error);
  }
}
