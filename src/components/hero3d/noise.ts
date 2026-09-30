// Deterministic 1D noise for the ridge silhouettes. No Math.random: the same
// seed always gives the same mountains, so the scene is stable across renders,
// StrictMode double-mounts and reloads.

function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

export function valueNoise1D(x: number, seed: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash(i + seed * 57.13) * (1 - u) + hash(i + 1 + seed * 57.13) * u;
}

/** Ridged multi-octave noise, 0…1, with sharp peaks (good for mountain crests). */
export function ridged1D(x: number, seed: number, octaves = 4): number {
  let amplitude = 0.5;
  let frequency = 1;
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    const n = valueNoise1D(x * frequency, seed + o * 3.7);
    sum += (1 - Math.abs(2 * n - 1)) * amplitude;
    norm += amplitude;
    amplitude *= 0.5;
    frequency *= 2.1;
  }
  return sum / norm;
}

export function seededUnit(index: number, salt: number): number {
  return hash(index * 12.9898 + salt * 78.233);
}
