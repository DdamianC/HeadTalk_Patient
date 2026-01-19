// ================= ELEMENTY =================
const video = document.getElementById("video");
const canvas = document.getElementById("cameraCanvas");
const ctx = canvas.getContext("2d");

const alphabetGrid = document.getElementById("alphabetGrid");
const sentenceOutput = document.getElementById("sentenceOutput");
const alphabetProgress = document.getElementById("alphabetProgress");

const yesnoProgress = document.getElementById("yesnoProgress");

// ================= STAN =================
let view = "menu";
let neutralX = null;
let headDirection = "center";
let headTimer = null;

let letters = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
let index = 0;
let sentence = "";
let lock = false;

// ================= FACE MESH =================
const faceMesh = new FaceMesh({
  locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`
});

faceMesh.setOptions({
  maxNumFaces:1,
  refineLandmarks:true,
  minDetectionConfidence:0.7,
  minTrackingConfidence:0.7
});

faceMesh.onResults(results => {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if(!results.multiFaceLandmarks) return;

  ctx.drawImage(results.image,0,0,canvas.width,canvas.height);
  const lm = results.multiFaceLandmarks[0];

  const nose = lm[1];
  const leftEye = lm[234];
  const rightEye = lm[454];

  const dx = nose.x - (leftEye.x + rightEye.x)/2;
  const dy = nose.y - 0.5;

  if(neutralX === null){
    neutralX = dx;
    return;
  }

  detectDirection(dx - neutralX, dy);
});

// ================= KAMERA LAPTOPA =================
navigator.mediaDevices.getUserMedia({
  video:{
    facingMode:"user",
    width:640,
    height:480
  },
  audio:false
}).then(stream=>{
  video.srcObject = stream;
  video.play();

  const camera = new Camera(video,{
    onFrame: async()=>{
      await faceMesh.send({image:video});
    },
    width:640,
    height:480
  });

  camera.start();
});

// ================= LOGIKA GŁOWY =================
function detectDirection(x,y){
  let dir = "center";
  if(x < -0.06) dir="left";
  else if(x > 0.06) dir="right";
  else if(y < -0.05) dir="up";

  if(dir !== headDirection){
    headDirection = dir;
    clearTimeout(headTimer);
    if(dir !== "center"){
      headTimer = setTimeout(()=>action(dir),4000);
    }
  }
}

function action(dir){
  if(view === "menu"){
    if(dir==="left") openAlphabet();
  }
  else if(view === "alphabet"){
    if(dir==="left") addLetter();
    if(dir==="right") removeLetter();
    if(dir==="up") backToMenu();
  }
}

// ================= WIDOKI =================
function openAlphabet(){
  view="alphabet";
  document.getElementById("menu").hidden=true;
  document.getElementById("alphabetView").hidden=false;
  cycleLetters();
}

function backToMenu(){
  view="menu";
  document.getElementById("menu").hidden=false;
  document.getElementById("alphabetView").hidden=true;
}

// ================= ALFABET =================
function cycleLetters(){
  alphabetGrid.innerText = letters[index];
  setTimeout(()=>{
    index = (index+1)%letters.length;
    if(view==="alphabet") cycleLetters();
  },4000);
}

function addLetter(){
  if(lock) return;
  lock=true;
  let w=0;
  const i=setInterval(()=>{
    w+=5;
    alphabetProgress.style.width=w+"%";
    if(w>=100){
      clearInterval(i);
      sentence+=letters[index];
      sentenceOutput.innerText=sentence;
      alphabetProgress.style.width="0%";
      lock=false;
    }
  },100);
}

function removeLetter(){
  if(lock) return;
  lock=true;
  let w=0;
  const i=setInterval(()=>{
    w+=5;
    alphabetProgress.style.width=w+"%";
    if(w>=100){
      clearInterval(i);
      sentence=sentence.slice(0,-1);
      sentenceOutput.innerText=sentence;
      alphabetProgress.style.width="0%";
      lock=false;
    }
  },100);
}
