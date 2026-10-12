// Shared studio for the three service images (gears, PCB, PLC) so their
// backgrounds, floor, fog and lighting match exactly. Scenes override only the
// camera, focus and size.
export const SERVICE_STUDIO = {
  bg: '#161b20', floor: '#1d2329', fogNear: 8, fogFar: 22,
  fov: 30, softness: 1.0, key: [3, 7, 3], keyIntensity: 2.8,
  rim: [-5, 3, -4], rimIntensity: 2.4, rimColor: '#a9cdf5',
  envIntensity: 0.5, fillIntensity: 0.15, shadowSize: 5,
};
