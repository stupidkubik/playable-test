import {
  GAME_HEIGHT,
  GAME_WIDTH,
  GROUND_Y,
  gravity,
  intersects,
  jumpVelocity,
  nextSpawnDelay,
  obstacleSpeed,
  scoreStep
} from "./gameLogic.js";
import { ASSETS } from "./assets/extractedAssets.js";

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const startOverlay = document.querySelector("#start-overlay");
const gameOverOverlay = document.querySelector("#game-over-overlay");
const finalScoreLabel = document.querySelector("#final-score");
const startCopy = document.querySelector("#start-copy");
const failImage = document.querySelector("#fail-image");

const startBtn = document.querySelector("#start-btn");
const retryBtn = document.querySelector("#retry-btn");

const state = {
  mode: "loading",
  score: 0,
  bestScore: 0,
  obstacleTimer: 0,
  elapsed: 0,
  groundOffset: 0,
  skyOffset: 0,
  player: {
    x: 92,
    y: GROUND_Y - 128,
    width: 84,
    height: 128,
    velocityY: 0,
    canDoubleJump: false
  },
  obstacles: [],
  resources: {
    images: {},
    audio: {}
  }
};

let rafId = 0;
let lastTime = 0;

function hideOverlays() {
  startOverlay.classList.remove("overlay-visible");
  gameOverOverlay.classList.remove("overlay-visible");
}

function showStartOverlay() {
  startOverlay.classList.add("overlay-visible");
}

function showGameOverOverlay() {
  finalScoreLabel.textContent = `Score: ${Math.floor(state.score)}`;
  gameOverOverlay.classList.add("overlay-visible");
}

function resetGame() {
  state.mode = "idle";
  state.score = 0;
  state.elapsed = 0;
  state.obstacleTimer = 0;
  state.groundOffset = 0;
  state.skyOffset = 0;
  state.player.y = GROUND_Y - state.player.height;
  state.player.velocityY = 0;
  state.player.canDoubleJump = false;
  state.obstacles = [];

  hideOverlays();
  showStartOverlay();
}

function startGame() {
  if (state.mode === "loading") {
    return;
  }

  hideOverlays();
  state.mode = "playing";
  state.score = 0;
  state.elapsed = 0;
  state.obstacleTimer = nextSpawnDelay(0);
  state.obstacles = [];
  state.player.y = GROUND_Y - state.player.height;
  state.player.velocityY = 0;
  state.player.canDoubleJump = true;
}

function endGame() {
  playSound("hit");
  state.mode = "gameover";
  state.bestScore = Math.max(state.bestScore, Math.floor(state.score));
  showGameOverOverlay();
}

function jump() {
  if (state.mode === "idle") {
    startGame();
  }

  if (state.mode !== "playing") {
    return;
  }

  const playerBottom = state.player.y + state.player.height;
  const onGround = playerBottom >= GROUND_Y - 0.5;

  if (onGround) {
    state.player.velocityY = jumpVelocity();
    state.player.canDoubleJump = true;
    playSound("jump");
    return;
  }

  if (state.player.canDoubleJump) {
    state.player.velocityY = jumpVelocity() * 0.85;
    state.player.canDoubleJump = false;
    playSound("jump");
  }
}

function spawnObstacle() {
  const frameList = ASSETS.frames.enemyRun;
  const frameIndex = Math.floor(Math.random() * frameList.length);
  const frame = frameList[frameIndex];
  const scale = 0.33;

  const width = Math.round(frame.w * scale);
  const height = Math.round(frame.h * scale);

  state.obstacles.push({
    x: GAME_WIDTH + 40,
    y: GROUND_Y - height,
    width,
    height,
    frameIndex,
    passed: false,
    animationOffset: Math.floor(Math.random() * frameList.length)
  });
}

function updatePlaying(deltaTime) {
  state.elapsed += deltaTime;

  const currentSpeed = obstacleSpeed(state.score);
  state.groundOffset = (state.groundOffset + currentSpeed * deltaTime) % 96;
  state.skyOffset = (state.skyOffset + currentSpeed * 0.1 * deltaTime) % GAME_WIDTH;

  state.player.velocityY += gravity() * deltaTime;
  state.player.y += state.player.velocityY * deltaTime;

  if (state.player.y + state.player.height >= GROUND_Y) {
    state.player.y = GROUND_Y - state.player.height;
    state.player.velocityY = 0;
  }

  state.obstacleTimer -= deltaTime;
  if (state.obstacleTimer <= 0) {
    spawnObstacle();
    state.obstacleTimer = nextSpawnDelay(state.score) + Math.random() * 0.25;
  }

  for (const obstacle of state.obstacles) {
    obstacle.x -= currentSpeed * deltaTime;

    if (!obstacle.passed && obstacle.x + obstacle.width < state.player.x) {
      obstacle.passed = true;
      state.score += 25;
      playSound("collect");
    }

    if (intersects(state.player, obstacle)) {
      endGame();
      return;
    }
  }

  state.obstacles = state.obstacles.filter((obstacle) => obstacle.x + obstacle.width > -10);
  state.score += scoreStep(deltaTime, currentSpeed);
}

function createImage(dataUri) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUri;
  });
}

function createAudio(source, volume) {
  const audio = new Audio(source);
  audio.preload = "auto";
  audio.volume = volume;
  return audio;
}

function playSound(key) {
  const sound = state.resources.audio[key];
  if (!sound) {
    return;
  }

  sound.currentTime = 0;
  sound.play().catch(() => {
    // Ignore autoplay restrictions; user input will unlock audio.
  });
}

async function loadResources() {
  const entries = Object.entries(ASSETS.images);
  const loaded = await Promise.all(entries.map(async ([key, dataUri]) => [key, await createImage(dataUri)]));

  state.resources.images = Object.fromEntries(loaded);
  state.resources.audio = Object.fromEntries(
    Object.entries(ASSETS.audio).map(([key, value]) => [key, createAudio(value.url, value.volume)])
  );

  failImage.src = state.resources.images.failBanner.src;
}

function drawSky() {
  const backdrop = state.resources.images.backdropPortrait;

  if (backdrop) {
    const x = -state.skyOffset;
    const y = 0;

    ctx.drawImage(backdrop, x, y, GAME_WIDTH, GROUND_Y);
    ctx.drawImage(backdrop, x + GAME_WIDTH, y, GAME_WIDTH, GROUND_Y);
    return;
  }

  const gradient = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  gradient.addColorStop(0, "#b7e6ff");
  gradient.addColorStop(1, "#7ec4f5");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, GAME_WIDTH, GROUND_Y);
}

function drawGround() {
  ctx.fillStyle = "#2a4153";
  ctx.fillRect(0, GROUND_Y, GAME_WIDTH, GAME_HEIGHT - GROUND_Y);

  ctx.fillStyle = "#213342";
  for (let i = -1; i < GAME_WIDTH / 48 + 2; i += 1) {
    const x = i * 48 - (state.groundOffset % 48);
    ctx.fillRect(x, GROUND_Y + 36, 28, 10);
  }
}

function currentPlayerFrame() {
  if (state.mode === "gameover") {
    const hurtFrames = ASSETS.frames.playerHurt;
    return hurtFrames[Math.floor(state.elapsed * 10) % hurtFrames.length];
  }

  const airborne = state.player.y + state.player.height < GROUND_Y - 2;
  if (airborne) {
    const jumpFrames = ASSETS.frames.playerJump;
    return jumpFrames[Math.floor(state.elapsed * 12) % jumpFrames.length];
  }

  const runFrames = ASSETS.frames.playerRun;
  return runFrames[Math.floor(state.elapsed * 12) % runFrames.length];
}

function drawPlayer() {
  const spriteSheet = state.resources.images.playerSheet;
  const player = state.player;

  if (!spriteSheet) {
    ctx.fillStyle = "#f56f53";
    ctx.fillRect(player.x, player.y, player.width, player.height);
    return;
  }

  const frame = currentPlayerFrame();
  const drawWidth = player.width * 1.55;
  const drawHeight = player.height * 1.55;
  const drawX = player.x - (drawWidth - player.width) * 0.56;
  const drawY = player.y - (drawHeight - player.height) * 0.66;

  ctx.drawImage(
    spriteSheet,
    frame.x,
    frame.y,
    frame.w,
    frame.h,
    drawX,
    drawY,
    drawWidth,
    drawHeight
  );
}

function drawObstacles() {
  const spriteSheet = state.resources.images.enemySheet;

  for (const obstacle of state.obstacles) {
    if (!spriteSheet) {
      ctx.fillStyle = "#1f2f3f";
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
      continue;
    }

    const sequence = ASSETS.frames.enemyRun;
    const frame = sequence[(Math.floor(state.elapsed * 10) + obstacle.animationOffset) % sequence.length];

    ctx.drawImage(
      spriteSheet,
      frame.x,
      frame.y,
      frame.w,
      frame.h,
      obstacle.x - 4,
      obstacle.y - 8,
      obstacle.width + 12,
      obstacle.height + 16
    );
  }
}

function drawHud() {
  const hud = state.resources.images.hudCounter;

  if (hud) {
    ctx.drawImage(hud, 14, 12, 236, 90);
  } else {
    ctx.fillStyle = "rgba(7, 20, 32, 0.52)";
    ctx.fillRect(16, 16, 188, 72);
  }

  const coin = state.resources.images.collectibleIcon;
  if (coin) {
    ctx.drawImage(coin, 18, 20, 42, 42);
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 26px Trebuchet MS";
  ctx.fillText(`${Math.floor(state.score)}`, 66, 49);

  ctx.font = "600 18px Trebuchet MS";
  ctx.fillText(`Best: ${state.bestScore}`, 66, 76);

  if (state.mode === "idle") {
    const hand = state.resources.images.tutorialHand;
    if (hand) {
      ctx.drawImage(hand, GAME_WIDTH / 2 - 42, GROUND_Y - 190, 84, 84);
    }

    ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
    ctx.font = "700 28px Trebuchet MS";
    ctx.fillText("Tap to jump", GAME_WIDTH / 2 - 64, 170);
  }
}

function render() {
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  drawSky();
  drawGround();
  drawObstacles();
  drawPlayer();
  drawHud();
}

function gameLoop(time) {
  if (!lastTime) {
    lastTime = time;
  }

  const deltaTime = Math.min(0.033, (time - lastTime) / 1000);
  lastTime = time;

  if (state.mode === "playing") {
    updatePlaying(deltaTime);
  }

  render();
  rafId = requestAnimationFrame(gameLoop);
}

function onPrimaryInput(event) {
  if (event.type === "keydown" && event.code !== "Space") {
    return;
  }

  event.preventDefault();

  if (state.mode === "gameover") {
    resetGame();
    startGame();
    return;
  }

  jump();
}

startBtn.addEventListener("click", startGame);
retryBtn.addEventListener("click", () => {
  resetGame();
  startGame();
});

canvas.addEventListener("pointerdown", onPrimaryInput, { passive: false });
window.addEventListener("keydown", onPrimaryInput, { passive: false });

async function boot() {
  startBtn.disabled = true;
  startCopy.textContent = "Loading extracted assets...";

  try {
    await loadResources();
    resetGame();
    startCopy.textContent = "Tap or press Space to jump over obstacles.";
  } catch {
    startCopy.textContent = "Assets failed to load. Reload and try again.";
  } finally {
    startBtn.disabled = false;
    render();
    rafId = requestAnimationFrame(gameLoop);
  }
}

boot();

window.addEventListener("beforeunload", () => {
  cancelAnimationFrame(rafId);
});
