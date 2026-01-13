const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// -----------------
// 遊戲狀態
// -----------------
let birdY = 300;
let velocity = 0;
const gravity = 0.25;
const jumpPower = -6;

let pipes = [];
let score = 0;
let lastPipeTime = 0;
const pipeInterval = 2200;
const pipeWidth = 26;

let started = false;
let gameOver = false;
let controlMode = null;

// -----------------
// 聲控
// -----------------
let audioContext, analyser, dataArray;
const threshold = 8;

// -----------------
// 小灰塵設定
// -----------------
const dustSize = 32;

// -----------------
// 音效
// -----------------
const hitSound = new Audio("hit.mp3");

// -----------------
// 模式選擇
// -----------------
function startClickMode() {
  controlMode = "click";
  startGame();
}

async function startVoiceMode() {
  controlMode = "voice";
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  const source = audioContext.createMediaStreamSource(stream);
  source.connect(analyser);
  dataArray = new Uint8Array(analyser.frequencyBinCount);

  document.getElementById("level").style.display = "block";
  startGame();
}

// -----------------
// 開始遊戲
// -----------------
function startGame() {
  document.getElementById("menu").style.display = "none";
  canvas.style.display = "block";
  document.getElementById("level").style.display = controlMode === "voice" ? "block" : "none";

  started = true;
  resetGame();
  requestAnimationFrame(update);
}

// -----------------
// 顯示封面
// -----------------
function showMenu() {
  document.getElementById("menu").style.display = "flex";
  canvas.style.display = "none";
  document.getElementById("level").style.display = "none";
  started = false;
}

// -----------------
// 聲控音量
// -----------------
function getVolume() {
  analyser.getByteTimeDomainData(dataArray);
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    let v = dataArray[i] - 128;
    sum += v * v;
  }
  return Math.sqrt(sum / dataArray.length);
}

// -----------------
// 水管生成
// -----------------
function spawnPipe() {
  const gap = 220;
  const top = Math.random() * 220 + 60;
  pipes.push({ x: canvas.width, top, bottom: top + gap, passed: false });
}

// -----------------
// 重置
// -----------------
function resetGame() {
  birdY = 300;
  velocity = 0;
  pipes = [];
  score = 0;
  lastPipeTime = performance.now();
  gameOver = false;
}

// -----------------
// 畫 Q版灰塵（乾淨版）
// -----------------
function drawCuteDust() {
  ctx.save();
  ctx.translate(120, birdY);

  // 旋轉角度：跳時微抬頭，下落微俯
  const rotate = velocity * 0.05;
  ctx.rotate(rotate);

  // 主體：灰色圓
  ctx.beginPath();
  ctx.fillStyle = "#AAAAAA";
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.fill();

  // 眼睛
  ctx.beginPath();
  ctx.fillStyle = "black";
  ctx.arc(-6, -4, 3, 0, Math.PI * 2); // 左眼
  ctx.arc(6, -4, 3, 0, Math.PI * 2);  // 右眼
  ctx.fill();

  // 嘴巴：跳時微笑，下落時微微驚訝
  ctx.beginPath();
  if (velocity < 0) { // 往上跳
    ctx.arc(0, 4, 6, 0, Math.PI); // 笑臉
  } else { // 下落
    ctx.arc(0, 6, 4, 0, Math.PI, true); // 驚訝
  }
  ctx.strokeStyle = "black";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}

// -----------------
// 更新排行榜
// -----------------
function updateLeaderboard(score) {
    let leaderboard = JSON.parse(localStorage.getItem("flappyDustLeaderboard") || "[]");
    leaderboard.push(score);
    leaderboard.sort((a,b)=>b-a);
    if (leaderboard.length>5) leaderboard = leaderboard.slice(0,5);
    localStorage.setItem("flappyDustLeaderboard", JSON.stringify(leaderboard));
    return leaderboard;
}

// -----------------
// 主迴圈
// -----------------
function update(timestamp) {
  if (gameOver) {
    drawGameOver();
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 聲控
  if (controlMode === "voice") {
    const volume = getVolume();
    const maxWidth = 900;
    const newWidth = Math.min(volume * 4, maxWidth);
    document.getElementById("level-fill").style.width = newWidth + "px";

    if (volume > threshold) velocity = jumpPower;
  }

  // 物理
  velocity += gravity;
  velocity *= 0.96;
  birdY += velocity;

  if (birdY < 0) birdY = 0;
  if (birdY > canvas.height - dustSize) birdY = canvas.height - dustSize;

  // 畫灰塵
  drawCuteDust();

  // 水管生成
  if (timestamp - lastPipeTime > pipeInterval) {
    spawnPipe();
    lastPipeTime = timestamp;
  }

  // 水管與碰撞
  for (let p of pipes) {
    p.x -= 2;
    ctx.fillStyle = "green";
    ctx.fillRect(p.x, 0, pipeWidth, p.top);
    ctx.fillRect(p.x, p.bottom, pipeWidth, canvas.height - p.bottom);

    if (120 + dustSize / 2 > p.x && 120 - dustSize / 2 < p.x + pipeWidth &&
        (birdY - dustSize / 2 < p.top || birdY + dustSize / 2 > p.bottom)) {
      hitSound.currentTime = 0;
      hitSound.play();
      gameOver = true;
    }

    if (!p.passed && p.x + pipeWidth < 120) {
      p.passed = true;
      score++;
    }
  }

  pipes = pipes.filter(p => p.x > -pipeWidth);

  // 分數
  ctx.fillStyle = "black";
  ctx.font = "22px Arial";
  ctx.fillText("Score: " + score, 50, 40);

  requestAnimationFrame(update);
}

// -----------------
// Game Over 顯示 + 排行榜
// -----------------
function drawGameOver() {
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  ctx.fillStyle = "white";
  ctx.font = "44px Arial";
  ctx.textAlign = "center";
  ctx.fillText("GAME OVER", canvas.width/2, canvas.height/2 - 60);

  ctx.font = "20px Arial";
  ctx.fillText("Press ENTER to Return to Menu", canvas.width/2, canvas.height/2 - 30);

  // 顯示排行榜
  const leaderboard = updateLeaderboard(score);
  ctx.fillText("🏆 Leaderboard 🏆", canvas.width/2, canvas.height/2 + 10);
  ctx.font = "18px Arial";
  for (let i = 0; i < leaderboard.length; i++) {
      ctx.fillText(`${i+1}. ${leaderboard[i]} pts`, canvas.width/2, canvas.height/2 + 40 + i*25);
  }
}

// -----------------
// Enter 返回封面
// -----------------
document.addEventListener("keydown", e => {
  if (e.key === "Enter" && gameOver) {
    showMenu();
  }
});

// -----------------
// 滑鼠跳躍
// -----------------
canvas.addEventListener("click", () => {
  if (!started) return;
  if (!gameOver && controlMode === "click") {
    velocity = jumpPower;
  }
});
