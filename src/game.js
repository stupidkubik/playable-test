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

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const startOverlay = document.querySelector("#start-overlay");
const gameOverOverlay = document.querySelector("#game-over-overlay");
const finalScoreLabel = document.querySelector("#final-score");

const startBtn = document.querySelector("#start-btn");
const retryBtn = document.querySelector("#retry-btn");

const state = {
  mode: "idle",
  score: 0,
  bestScore: 0,
  obstacleTimer: 0,
  elapsed: 0,
  groundOffset: 0,
  hillOffset: 0,
  player: {
    x: 88,
    y: GROUND_Y - 128,
    width: 84,
    height: 128,
    velocityY: 0,
    canDoubleJump: false
  },
  obstacles: []
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
  state.hillOffset = 0;
  state.player.y = GROUND_Y - state.player.height;
  state.player.velocityY = 0;
  state.player.canDoubleJump = false;
  state.obstacles = [];
  hideOverlays();
  showStartOverlay();
}

function startGame() {
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
    return;
  }

  if (state.player.canDoubleJump) {
    state.player.velocityY = jumpVelocity() * 0.85;
    state.player.canDoubleJump = false;
  }
}

function spawnObstacle() {
  const tall = Math.random() > 0.55;
  const width = tall ? 84 : 70;
  const height = tall ? 128 : 92;

  state.obstacles.push({
    x: GAME_WIDTH + 40,
    y: GROUND_Y - height,
    width,
    height
  });
}

function updatePlaying(deltaTime) {
  state.elapsed += deltaTime;

  const currentSpeed = obstacleSpeed(state.score);
  state.groundOffset = (state.groundOffset + currentSpeed * deltaTime) % 96;
  state.hillOffset = (state.hillOffset + currentSpeed * 0.2 * deltaTime) % GAME_WIDTH;

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

    if (intersects(state.player, obstacle)) {
      endGame();
      return;
    }
  }

  state.obstacles = state.obstacles.filter((obstacle) => obstacle.x + obstacle.width > -10);
  state.score += scoreStep(deltaTime, currentSpeed);
}

function drawSky() {
  const gradient = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  gradient.addColorStop(0, "#b7e6ff");
  gradient.addColorStop(1, "#7ec4f5");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, GAME_WIDTH, GROUND_Y);
}

function drawHills() {
  ctx.fillStyle = "#6ca6cf";
  for (let i = -1; i <= 2; i += 1) {
    const baseX = i * 320 - state.hillOffset;
    ctx.beginPath();
    ctx.moveTo(baseX, GROUND_Y);
    ctx.quadraticCurveTo(baseX + 100, GROUND_Y - 120, baseX + 220, GROUND_Y);
    ctx.closePath();
    ctx.fill();
  }
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

function drawPlayer() {
  const player = state.player;

  ctx.save();
  ctx.translate(player.x, player.y);

  ctx.fillStyle = "#f4cba8";
  ctx.beginPath();
  ctx.arc(player.width * 0.5, 18, 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#1e1f34";
  ctx.fillRect(player.width * 0.3, 30, player.width * 0.4, 54);

  ctx.fillStyle = "#f56f53";
  ctx.fillRect(8, 48, player.width - 16, 48);

  ctx.fillStyle = "#2c2d44";
  ctx.fillRect(18, 96, 18, 32);
  ctx.fillRect(player.width - 36, 96, 18, 32);

  ctx.restore();
}

function drawObstacles() {
  for (const obstacle of state.obstacles) {
    ctx.fillStyle = "#1f2f3f";
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);

    ctx.fillStyle = "#51677d";
    ctx.fillRect(obstacle.x + 8, obstacle.y + 8, obstacle.width - 16, 16);
    ctx.fillRect(obstacle.x + 8, obstacle.y + obstacle.height - 24, obstacle.width - 16, 14);
  }
}

function drawHud() {
  ctx.fillStyle = "rgba(7, 20, 32, 0.52)";
  ctx.fillRect(16, 16, 188, 72);

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 26px Trebuchet MS";
  ctx.fillText(`Score: ${Math.floor(state.score)}`, 28, 48);

  ctx.font = "600 18px Trebuchet MS";
  ctx.fillText(`Best: ${state.bestScore}`, 28, 74);

  if (state.mode === "idle") {
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.font = "700 28px Trebuchet MS";
    ctx.fillText("Tap to start", GAME_WIDTH / 2 - 78, 170);
  }
}

function render() {
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  drawSky();
  drawHills();
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

resetGame();
render();
rafId = requestAnimationFrame(gameLoop);

window.addEventListener("beforeunload", () => {
  cancelAnimationFrame(rafId);
});
