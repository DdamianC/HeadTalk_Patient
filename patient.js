/* ================= ELEMENTY ================= */
const video = document.getElementById("video");
const canvas = document.getElementById("menuCanvas");
const ctx = canvas.getContext("2d");

const leftTile = document.getElementById("left");
const rightTile = document.getElementById("right");
const leftBar = document.getElementById("leftBar");
const rightBar = document.getElementById("rightBar");

/* ================= STAN ================= */
let neutralX = null;
let lock = false;
let currentView = "menu";

/* ================= FACE MESH ================= */
const faceMesh = new FaceMesh({
  locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`
});

faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
});

/* ================= WYNIKI ================= */
faceMesh.onResults(results => {

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!results.multiFaceLandmarks) return;

  ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

  const lm = results.multiFaceLandmarks[0];

  // Rysowanie punktów
  lm.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x * canvas.width, p.y * canvas.height, 2, 0, 2 * Math.PI);
    ctx.fillStyle = "red";
    ctx.fill();
  });

  // Detekcja ruchu głowy
  const nose = lm[1];
  const leftEye = lm[234];
  const rightEye = lm[454];

  const dx = nose.x - (leftEye.x + rightEye.x) / 2;

  if (neutralX === null) {
    neutralX = dx;
    return;
  }

  const diffX = dx - neutralX;

  const LEFT = -0.035;
  const RIGHT = 0.035;

  if (currentView === "menu") {
    handleMenu(diffX, LEFT, RIGHT);
  }
});

/* ================= MENU ================= */
function handleMenu(diffX, LEFT, RIGHT) {

  leftTile.classList.toggle("active", diffX < LEFT);
  rightTile.classList.toggle("active", diffX > RIGHT);

  if (diffX < LEFT && !lock) {
    fillBar(leftBar, enterAlphabet);
  }

  if (diffX > RIGHT && !lock) {
    fillBar(rightBar, enterYesNo);
  }
}

/* ================= PASEK POSTĘPU ================= */
function fillBar(bar, callback) {
  lock = true;
  let width = 0;

  const interval = setInterval(() => {
    width += 5;
    bar.style.width = width + "%";

    if (width >= 100) {
      clearInterval(interval);
      bar.style.width = "0%";
      lock = false;
      callback();
    }
  }, 100);
}

/* ================= NAWIGACJA ================= */
function enterAlphabet() {
  currentView = "alphabet";
  document.getElementById("menu").hidden = true;
  document.getElementById("alphabetView").hidden = false;
  startAlphabet();
}

function enterYesNo() {
  currentView = "yesno";
  document.getElementById("menu").hidden = true;
  document.getElementById("yesnoView").hidden = false;
  startYesNo();
}

function backToMenu() {
  currentView = "menu";
  document.getElementById("menu").hidden = false;
  document.getElementById("alphabetView").hidden = true;
  document.getElementById("yesnoView").hidden = true;
}

/* ================= KAMERA ================= */
const camera = new Camera(video, {
  onFrame: async () => {
    await faceMesh.send({ image: video });
  },
  width: 640,
  height: 480,
  fps: 30
});

camera.start();
