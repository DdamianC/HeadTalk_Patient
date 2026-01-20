// ===== ELEMENTY =====
const menu = document.getElementById("menu");
const alphabet = document.getElementById("alphabet");
const needsView = document.getElementById("needs");

const tileAlphabet = document.getElementById("tileAlphabet");
const tileNeeds = document.getElementById("tileNeeds");
const tileAlarm = document.getElementById("tileAlarm");

const letterEl = document.getElementById("letter");
const sentenceEl = document.getElementById("sentence");
const statusEl = document.getElementById("status");

const video = document.getElementById("video");
const cam = document.getElementById("cam");
const ctx = cam.getContext("2d");

// ===== DANE =====
const letters = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
const needs = [
"Woda","Jedzenie","Toaleta","Ból",
"Zimno","Gorąco","Pomoc","Pozycja",
"Leki","Sen","Duszność","Inne"
];

let view = "menu";
let letterIndex = 0;
let sentence = "";
let needIndex = 0;

// ===== FACE TRACKING =====
let neutralX = null;
let neutralY = null;
let dwell = 0;
let currentDir = "center";
const DWELL_MAX = 20;

// ===== POTRZEBY =====
const needsGrid = document.getElementById("needsGrid");
needs.forEach(n=>{
  const d=document.createElement("div");
  d.className="tile";
  d.innerHTML = `${n}<div class="fill"></div>`;
  needsGrid.appendChild(d);
});

// ===== MEDIAPIPE =====
const fm = new FaceMesh({
  locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`
});
fm.setOptions({maxNumFaces:1});

fm.onResults(r=>{
  ctx.save();
  ctx.scale(-1,1);
  ctx.drawImage(r.image,-cam.width,0,cam.width,cam.height);
  ctx.restore();

  if(!r.multiFaceLandmarks){
    statusEl.innerText="🔴 brak twarzy";
    neutralX=null;
    return;
  }

  statusEl.innerText="🟢 tracking";
  const lm = r.multiFaceLandmarks[0];

  lm.forEach(p=>{
    ctx.beginPath();
    ctx.arc(p.x*cam.width,p.y*cam.height,1.5,0,2*Math.PI);
    ctx.fillStyle="#00ff88";
    ctx.fill();
  });

  const nose = lm[1].x;
  const eyes = (lm[234].x + lm[454].x)/2;
  const forehead = lm[10].y;

  if(neutralX===null){
    neutralX = eyes-nose;
    neutralY = forehead;
    return;
  }

  const dx = (eyes-nose) - neutralX;
  const dy = forehead - neutralY;

  let dir="center";
  if(dx < -0.05) dir="left";
  else if(dx > 0.05) dir="right";
  else if(dy < -0.05) dir="up";
  else if(dy > 0.05) dir="down";

  if(dir===currentDir) dwell++;
  else{
    dwell=0;
    currentDir=dir;
    resetFill();
  }

  if(dwell > DWELL_MAX){
    handle(dir);
    dwell=0;
    resetFill();
  }

  fill(dwell/DWELL_MAX*100);
});

// ===== KAMERA =====
navigator.mediaDevices.getUserMedia({video:{width:320,height:240}})
.then(s=>{
  video.srcObject=s;
  new Camera(video,{
    onFrame:()=>fm.send({image:video}),
    fps:10
  }).start();
});

// ===== UI =====
function resetFill(){
  document.querySelectorAll(".fill").forEach(f=>f.style.width="0%");
}

function fill(p){
  if(view==="menu"){
    if(currentDir==="left") tileAlphabet.querySelector(".fill").style.width=p+"%";
    if(currentDir==="right") tileNeeds.querySelector(".fill").style.width=p+"%";
    if(currentDir==="up") tileAlarm.querySelector(".fill").style.width=p+"%";
  }
}

function handle(dir){
  if(view==="menu"){
    if(dir==="left") openAlphabet();
    if(dir==="right") openNeeds();
    if(dir==="up") triggerAlarm();
  }
}

function openAlphabet(){
  view="alphabet";
  menu.hidden=true;
  alphabet.hidden=false;
  cycleLetters();
}

function openNeeds(){
  view="needs";
  menu.hidden=true;
  needsView.hidden=false;
}

function triggerAlarm(){
  alert("⛔ WEZWANO OPIEKUNA");
}
  
function cycleLetters(){
  if(view!=="alphabet") return;
  letterEl.innerText = letters[letterIndex];
  letterIndex = (letterIndex+1)%letters.length;
  setTimeout(cycleLetters,2500);
}
