import fs from 'node:fs/promises';
import path from 'node:path';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

class NodeFileReader {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = result;
      this.onloadend?.();
    });
  }

  readAsDataURL(blob) {
    blob.arrayBuffer().then((buffer) => {
      const base64 = Buffer.from(buffer).toString('base64');
      this.result = `data:${blob.type};base64,${base64}`;
      this.onloadend?.();
    });
  }
}

globalThis.FileReader = NodeFileReader;

const scene = new THREE.Scene();
const ferry = new THREE.Group();
ferry.name = 'LowPolyFerry';
scene.add(ferry);

const material = (color, roughness = 0.72) => new THREE.MeshStandardMaterial({
  color,
  roughness,
  metalness: 0.05,
});
const white = material(0xf7f2e8);
const charcoal = material(0x243642);
const coral = material(0xd96b4d);
const blue = material(0x79b8cf, 0.45);
const deck = material(0xc9a978);

const hullGeometry = new THREE.BufferGeometry();
hullGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
  -3.8, -0.8, -1.15,
  -3.8, -0.8, 1.15,
  -3.8, 0.55, -0.92,
  -3.8, 0.55, 0.92,
  2.7, -0.8, -1.15,
  2.7, -0.8, 1.15,
  2.7, 0.55, -0.92,
  2.7, 0.55, 0.92,
  4.2, -0.25, 0,
  3.35, 0.55, 0,
], 3));
hullGeometry.setIndex([
  0, 4, 2, 2, 4, 6,
  1, 3, 5, 3, 7, 5,
  0, 1, 4, 1, 5, 4,
  2, 6, 3, 3, 6, 7,
  4, 8, 6, 6, 8, 9,
  5, 7, 8, 7, 9, 8,
  0, 2, 1, 1, 2, 3,
]);
hullGeometry.computeVertexNormals();
ferry.add(new THREE.Mesh(hullGeometry, white));

const addBox = (name, size, position, boxMaterial) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), boxMaterial);
  mesh.name = name;
  mesh.position.set(...position);
  ferry.add(mesh);
  return mesh;
};

addBox('Deck', [6.9, 0.22, 1.85], [-0.1, 0.62, 0], deck);
addBox('Cabin', [2.8, 1.2, 1.55], [-0.8, 1.28, 0], coral);
addBox('Roof', [3.15, 0.18, 1.75], [-0.8, 1.97, 0], charcoal);
addBox('FrontWindow', [0.1, 0.48, 1.05], [0.63, 1.5, 0], blue);
addBox('PortWindow', [1.55, 0.48, 0.08], [-0.95, 1.5, -0.79], blue);
addBox('StarboardWindow', [1.55, 0.48, 0.08], [-0.95, 1.5, 0.79], blue);
addBox('Chimney', [0.48, 0.8, 0.48], [-2.25, 2.35, 0], charcoal);

const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.2, 8), charcoal);
mast.name = 'Mast';
mast.position.set(1.55, 1.72, 0);
ferry.add(mast);

ferry.rotation.y = -Math.PI / 2;
ferry.scale.setScalar(0.65);

const exporter = new GLTFExporter();
const output = await new Promise((resolve, reject) => {
  exporter.parse(scene, resolve, reject, {
    binary: true,
    onlyVisible: true,
    trs: true,
  });
});

const target = path.resolve('public/models/low-poly_ferry.glb');
await fs.mkdir(path.dirname(target), { recursive: true });
await fs.writeFile(target, Buffer.from(output));
console.log(`Generated ${target}`);
