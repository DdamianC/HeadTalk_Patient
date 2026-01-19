// ===== ELEMENTY =====
const video = document.getElementById("video");
const canvas = document.getElementById("cameraCanvas");
const ctx = canvas.getContext("2d");

const menu = document.getElementById("menu");
const alphabetView = document.getElementById("alphabetView");

const tileAlphabet = document.getElementById("tileAlphabet");
const tileYesNo = document.getElementById("tileYesNo");
const menuProgressLeft = document.getElementById("menuProgressLeft");
const menuProgressRight = document.getElementById("menuProgressRight");

const letterTile = document.getElementById("letterTile");
const alphabetProgress = document.getElementById("alphabetProgress");
const sentenceEl = document.getElementById("sentence");

// ===== STAN =====
let view = "menu";
let neutralX = null;
let currentDir = "center";
let timer = null;

const letters = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
let letterIndex = 0;
let sentence = "";

// ===== FACE MESH =====
const faceMesh = new FaceMesh({
  locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`
});

faceMesh.setOptions({
  maxNumFaces:1,
  refineLandmarks:true,
  minDetectionConfidence:0.7,
  minTrackingConfidence:0.7
});

faceMesh.onResults(results=>{
  ctx.save();
  ctx.scale(-1,1);               // 🔴 ODBICIE LUSTRZANE
  ctx.drawImage(results.image,-canvas.width,0,canvas.width,canvas.height);
  ctx.restore();

  if(!results.multiFaceLandmarks) return;
  const lm = results.multiFaceLandmarks[0];

  const nose = lm[1];
  const eyes = (lm[234].x + lm[454].x)/2;

  const dx = eyes - nose.x;      // 🔴 ODWROTNA LOGIKA
  if(neutralX === null){ neutralX = dx; return; }

  detect(dx - neutralX);
});

// ===== KAMERA =====
navigator.mediaDevices.getUserMedia({
  video:{facingMode:"user",width:640,height:480}
}).then(stream=>{
  video.srcObject = stream;
  const cam = new Camera(video,{
    onFrame: async()=>await faceMesh.send({image:video})
  });
  cam.start();
});

// ===== DETEKCJA =====
function detect(x){
  let dir="center";
  if(x > 0.05) dir="left";
  else if(x < -0.05) dir="right";

  if(dir!==currentDir){
    currentDir=dir;
    resetTimers();
    if(dir!=="center") startAction(dir);
  }
}

function resetTimers(){
  clearInterval(timer);
  menuProgressLeft.style.width="0%";
  menuProgressRight.style.width="0%";
  alphabetProgress.style.width="0%";
  tileAlphabet.classList.remove("active");
  tileYesNo.classList.remove("active");
}

function startAction(dir){
  if(view==="menu"){
    const tile = dir==="left"?tileAlphabet:tileYesNo;
    const bar = dir==="left"?menuProgressLeft:menuProgressRight;
    tile.classList.add("active");
    fill(bar,2000,()=>enterAlphabet());
  }
  if(view==="alphabet"){
    fill(alphabetProgress,1500,()=>{
      if(dir==="right"){ sentence+=letters[letterIndex]; }
      if(dir==="left"){ sentence=sentence.slice(0,-1); }
      sentenceEl.innerText=sentence;
    });
  }
}

function fill(bar,time,done){
  let w=0;
  timer=setInterval(()=>{
    w+=100/(time/100);
    bar.style.width=w+"%";
    if(w>=100){
      clearInterval(timer);
      bar.style.width="0%";
      done();
    }
  },100);
}

// ===== WIDOKI =====
function enterAlphabet(){
  view="alphabet";
  menu.hidden=true;
  alphabetView.hidden=false;
  cycleLetters();
}

function cycleLetters(){
  letterTile.innerText=letters[letterIndex];
  setTimeout(()=>{
    if(view!=="alphabet") return;
    letterIndex=(letterIndex+1)%letters.length;
    cycleLetters();
  },3000);
}
