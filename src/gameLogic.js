export const GAME_WIDTH = 540;
export const GAME_HEIGHT = 960;
export const GROUND_Y = 720;

export function intersects(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function nextSpawnDelay(score) {
  const maxDelay = 1.65;
  const minDelay = 0.72;
  const reduction = score * 0.01;
  return Math.max(minDelay, maxDelay - reduction);
}

export function obstacleSpeed(score) {
  return Math.min(580, 360 + score * 2.4);
}

export function scoreStep(deltaTime, speed) {
  return deltaTime * speed * 0.05;
}

export function jumpVelocity() {
  return -970;
}

export function gravity() {
  return 2500;
}
