const letters = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
const needs = [
  {t:"Picie",i:"💧"},{t:"Jedzenie",i:"🍎"},{t:"Leki",i:"💊"},
  {t:"Ból",i:"😫"},{t:"Zimno",i:"❄️"},{t:"Pomoc",i:"🆘"},
  {t:"TV",i:"📺"},{t:"Toaleta",i:"🚻"}
];

let state = {
  view: 'menu',
  dir: 'center',
  dwell: 0,
  alphaIdx: 0,
  needIdx: 0
};

const DWELL_REQ = 20;
let timer = 0;

/* ================= VIEW ================= */

function setView(v){
  document.querySelectorAll('.view').forEach(e=>e.classList.remove('active'));
  document.getElementById(`view-${v}`).classList.add('active');
  state.view = v;
  state.dwell = 0;
  state.dir = 'center';
  timer = 0;
}

/* ================= EXECUTE ================= */

function execute(dir){
  if(state.view === 'menu'){
    if(dir === 'left') setView('alpha');
    if(dir === 'right') setView('needs');
  }

  else if(state.view === 'alpha'){
    if(dir === 'up') setView('menu');
  }

  else if(state.view === 'needs'){
    if(dir === 'up') setView('menu');
    if(dir === 'left'){
      document.getElementById('final-output').innerText =
        needs[state.needIdx].t;
      setView('menu');
    }
  }
}

/* ================= CAMERA SETUP ================= */

const video = document.getElementById('video');
const canvas = document.getElementById('cameraCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 320;
canvas.height = 240;

/* ================= FACE MESH ================= */

const faceMesh = new FaceMesh({
  locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`
});

faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true
});

faceMesh.onResults(res => {
  if(!res.image) return;

  /* 🔴 RYSOWANIE KAMERY – TOGO BRAKOWAŁO */
  ctx.save();
  ctx.scale(-1,1);                 // lustro wizualne
  ctx.drawImage(res.image, -canvas.width, 0, canvas.width, canvas.height);
  ctx.restore();

  if(!res.multiFaceLandmarks?.length) return;

  const lm = res.multiFaceLandmarks[0];

  const nose = lm[1];
  const leftFace = lm[234];
  const rightFace = lm[454];

  const centerX = (leftFace.x + rightFace.x) / 2;

  /* 🔴 KLUCZ: ODWRÓCONY ZNAK */
  const diff = centerX - nose.x;

  let move = 'center';

  if(diff > 0.035) move = 'left';
  else if(diff < -0.035) move = 'right';

  if(move === state.dir && move !== 'center'){
    state.dwell++;
  } else {
    state.dir = move;
    state.dwell = 0;
  }

  if(state.dwell >= DWELL_REQ){
    execute(move);
    state.dwell = 0;
  }
});

/* ================= TIMER ================= */

setInterval(()=>{
  if(state.view === 'alpha'){
    timer++;
    if(timer >= 15){
      state.alphaIdx = (state.alphaIdx + 1) % letters.length;
      document.getElementById('cur-let').innerText =
        letters[state.alphaIdx];
      timer = 0;
    }
  }

  if(state.view === 'needs'){
    timer++;
    if(timer >= 10){
      state.needIdx = (state.needIdx + 1) % needs.length;
      document.querySelectorAll('.need-item')
        .forEach(e=>e.classList.remove('active'));
      document.getElementById(`n-${state.needIdx}`)
        .classList.add('active');
      timer = 0;
    }
  }
}, 100);

/* ================= CAMERA START ================= */

const cam = new Camera(video, {
  onFrame: async () => {
    await faceMesh.send({ image: video });
  },
  width: 640,
  height: 480
});

cam.start();
