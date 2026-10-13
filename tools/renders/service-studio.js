// Shared studio for the three service images (gears, PCB, PLC) so their
// backgrounds, floor, fog and lighting match exactly. Scenes override only the
// camera, focus and size.
export const SERVICE_STUDIO = {
  bg: '#161b20', floor: '#1d2329', backdrop: ['#323a42', '#13171b'], shadowOpacity: 0.55, fogNear: 8, fogFar: 22,
  fov: 30, softness: 1.0, key: [3, 7, 3], keyIntensity: 2.8,
  rim: [-5, 3, -4], rimIntensity: 2.4, rimColor: '#a9cdf5',
  envIntensity: 0.5, fillIntensity: 0.15, shadowSize: 5,
};

// The lit grey metal base plate from the gears image, which gives the service
// shots their highlights. Top face sits at y = top.
import { THREE, mat, add } from './studio.js';
export function servicePlate(scene, w, d, pos = [0, 0, 0], top = 0) {
  return add(scene, new THREE.BoxGeometry(w, 0.2, d), mat.metal('#8a949b', 0.42), [pos[0], top - 0.1, pos[2]]);
}
