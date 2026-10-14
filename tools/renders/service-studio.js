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

// The exact studio, lighting and camera of the custom machine (gears) image,
// so other service images can share its background pixel for pixel: the lit
// floor (no fixed backdrop), the key light aimed as it was, and the same view.
import { studio } from './studio.js';
export function gearsStudio(q) {
  const S = studio({ ...SERVICE_STUDIO, backdrop: null, w: +(q.get('w') || 1600), h: +(q.get('h') || 1000),
    cam: [0, 3, 6], target: [0, 0.8, 0], aperture: 0.05, samples: +(q.get('n') || 56) });
  S.camPos.set(0.6, 4.2, 6.4); S.target.set(0, 0.4, -0.4);
  return S;
}
