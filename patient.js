const video = document.getElementById("video");
const canvas = document.getElementById("cameraCanvas");
const ctx = canvas.getContext("2d");

const menu = document.getElementById("menu");
const alphabetView = document.getElementById("alphabetView");
const yesnoView = document.getElementById("yesnoView");

const tileAlphabet = document.getElementById("tileAlphabet");
const tileYesNo = document.getElementById("tileYesNo");

const menuLeft = document.getElementById("menuLeft");
const menuRight = document.getElementById("menuRight");

const letterTile = document.getElementById("letterTile");
const alphabetProgress = document.getElementById("alphabetProgress");
const sentenceEl = document.getElementById("sentence");
const backProgress = document.getElementById("backProgress");

const yesTile = document.getElementById("yesTile");
const noTile = document.getElementById("noTile");
const yesProgress = document.getElementById("yesProgress");
const noProgress = document.getElementById("noProgress");

let view = "menu";
let neutralX = null;
let neutralY = null;
let currentDir = "center";
let timer = null;

const letters = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
let letterIndex = 0;
let sentence = "";

// ===== FACE MESH =====
const faceMesh = new FaceMesh({
  locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`
});

faceMesh.setOptions({
  maxNumFaces:1,
  refineLandmarks:false,
  minDetectionConfidence:0.7,
  minTrackingConfidence:0.7
});

faceMesh.onResults(r=>{
  // ✅ PRAWDZIWE ODBICIE LUSTRZANE
  ctx.save();
  ctx.scale(-1,1);
  ctx.drawImage(r.image,-canvas.width,0,canvas.width,canvas.height);
  ctx.restore();

  if(!r.multiFaceLandmarks) return;

  const lm = r.multiFaceLandmarks[0];
  const nose = lm[1];
  const eyes = (lm[234].x + lm[454].x)/2;
  const forehead = lm[10].y;

  if(neutralX===null){
    neutralX = eyes - nose.x;
    neutralY = forehead;
    return;
  }

  detect((eyes - nose.x) - neutralX, forehead - neutralY);
});

// ===== KAMERA (OPTYMALNA) =====
navigator.mediaDevices.getUserMedia({
  video:{facingMode:"user",width:480,height:360}
}).then(stream=>{
  video.srcObject = stream;
  const cam = new Camera(video,{
    onFrame: async()=>await faceMesh.send({image:video}),
    fps:15
  });
  cam.start();
});

// ===== DETEKCJA =====
function detect(x,y){
  let dir="center";
  if(x < -0.05) dir="left";
  else if(x > 0.05) dir="right";
  else if(y < -0.04) dir="up";

  if(dir!==currentDir){
    currentDir=dir;
    reset();
    if(dir!=="center") start(dir);
  }
}

function reset(){
  clearInterval(timer);
  document.querySelectorAll(".progress").forEach(p=>p.style.width="0%");
  document.querySelectorAll(".tile").forEach(t=>t.classList.remove("active"));
}

function start(dir){
  if(view==="menu"){
    const tile = dir==="left"?tileAlphabet:tileYesNo;
    const bar = dir==="left"?menuLeft:menuRight;
    tile.classList.add("active");
    fill(bar,2000,()=>dir==="left"?openAlphabet():openYesNo());
  }

  if(view==="alphabet"){
    if(dir==="up"){
      fill(backProgress,1500,backToMenu);
      return;
    }
    fill(alphabetProgress,1500,()=>{
      if(dir==="right") sentence+=letters[letterIndex];
      if(dir==="left") sentence=sentence.slice(0,-1);
      sentenceEl.innerText=sentence;
    });
  }

  if(view==="yesno"){
    if(dir==="up") backToMenu();
    if(dir==="left") fill(yesProgress,1500,backToMenu);
    if(dir==="right") fill(noProgress,1500,backToMenu);
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
function openAlphabet(){
  view="alphabet";
  menu.hidden=true;
  alphabetView.hidden=false;
  cycleLetters();
}

function openYesNo(){
  view="yesno";
  menu.hidden=true;
  yesnoView.hidden=false;
}

function backToMenu(){
  view="menu";
  alphabetView.hidden=true;
  yesnoView.hidden=true;
  menu.hidden=false;
}

function cycleLetters(){
  letterTile.innerText=letters[letterIndex];
  setTimeout(()=>{
    if(view!=="alphabet") return;
    letterIndex=(letterIndex+1)%letters.length;
    cycleLetters();
  },3000);
}
