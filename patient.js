// ================= ELEMENTY =================
const video = document.getElementById("video");
const cameraCanvas = document.getElementById("cameraCanvas");
const ctx = cameraCanvas.getContext("2d");

const leftTile = document.getElementById("left");
const rightTile = document.getElementById("right");
const leftBar = document.getElementById("leftBar");
const rightBar = document.getElementById("rightBar");

const alphabetGrid = document.getElementById("alphabetGrid");
const sentenceOutput = document.getElementById("sentenceOutput");
const alphabetProgress = document.getElementById("alphabetProgress");

const yesTile = document.getElementById("yesTile");
const noTile = document.getElementById("noTile");
const yesnoProgress = document.getElementById("yesnoProgress");

// ================= STAN =================
let view = "menu";
let neutralX = null;
let headDirection = "center";
let headTimer = null;
let lock = false;

let letters = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ", " "];
let currentIndex = 0;
let sentence = "";
let cycleTimeout = null;
let lockAlphabet = false;

let yesnoLock = false;
let answer = null;

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

// ================= KAMERA =================
const camera = new Camera(video,{
  onFrame: async()=>await faceMesh.send({image:video}),
  width:640,height:480,fps:30
});
camera.start();

// ================= OBSŁUGA WYNIKÓW =================
faceMesh.onResults(results=>{
  ctx.clearRect(0,0,cameraCanvas.width,cameraCanvas.height);
  if(!results.multiFaceLandmarks) return;

  ctx.drawImage(results.image,0,0,cameraCanvas.width,cameraCanvas.height);
  const lm = results.multiFaceLandmarks[0];
  lm.forEach(p=>{
    ctx.beginPath();
    ctx.arc(p.x*cameraCanvas.width, p.y*cameraCanvas.height,2,0,2*Math.PI);
    ctx.fillStyle="red";
    ctx.fill();
  });

  const nose = lm[1];
  const leftEye = lm[234];
  const rightEye = lm[454];
  const dx = nose.x - (leftEye.x + rightEye.x)/2;
  const dy = nose.y - 0.5;

  if(neutralX===null){ neutralX = dx; return; }
  const diffX = dx - neutralX;
  const diffY = dy;

  checkHeadDirection(diffX,diffY);
});

// ================= FUNKCJE DYNAMICZNE =================
function checkHeadDirection(diffX,diffY){
  const LEFT=-0.06, RIGHT=0.06, UP=-0.05;
  let dir = "center";
  if(diffX<LEFT) dir="left";
  else if(diffX>RIGHT) dir="right";
  else if(diffY<UP) dir="up";

  if(dir !== headDirection){
    headDirection = dir;
    clearTimeout(headTimer);
    if(dir!=="center"){
      headTimer = setTimeout(()=>{ confirmHeadAction(dir); },5000);
    }
  }
}

function confirmHeadAction(dir){
  if(view==="menu"){
    if(dir==="left") enterAlphabet();
    if(dir==="right") enterYesNo();
  } else if(view==="alphabet"){
    if(dir==="left") addLetter();
    if(dir==="right") removeLetter();
    if(dir==="up") backToMenu();
  } else if(view==="yesno"){
    if(dir==="left") chooseYes();
    if(dir==="right") chooseNo();
    if(dir==="up") backToMenu();
  }
}

// ================= MENU =================
function enterAlphabet(){
  view="alphabet";
  document.getElementById("menu").hidden=true;
  document.getElementById("alphabetView").hidden=false;
  startAlphabet();
}

function enterYesNo(){
  view="yesno";
  document.getElementById("menu").hidden=true;
  document.getElementById("yesnoView").hidden=false;
  startYesNo();
}

function backToMenu(){
  view="menu";
  document.getElementById("menu").hidden=false;
  document.getElementById("alphabetView").hidden=true;
  document.getElementById("yesnoView").hidden=true;
  clearTimeout(cycleTimeout);
}

// ================= ALFABET =================
function startAlphabet(){
  currentIndex=0;
  sentence="";
  showLetter();
}

function showLetter(){
  alphabetGrid.innerText = letters[currentIndex];
  cycleTimeout = setTimeout(()=>{
    currentIndex=(currentIndex+1)%letters.length;
    showLetter();
  },5000);
}

function addLetter(){
  if(lockAlphabet) return;
  lockAlphabet=true;
  let width=0;
  const interval = setInterval(()=>{
    width+=5;
    alphabetProgress.style.width=width+"%";
    if(width>=100){
      clearInterval(interval);
      sentence+=letters[currentIndex]===" "? "":letters[currentIndex];
      sentenceOutput.innerText=sentence;
      alphabetProgress.style.width="0%";
      lockAlphabet=false;
    }
  },100);
}

function removeLetter(){
  if(lockAlphabet) return;
  lockAlphabet=true;
  let width=0;
  const interval = setInterval(()=>{
    width+=5;
    alphabetProgress.style.width=width+"%";
    if(width>=100){
      clearInterval(interval);
      sentence=sentence.slice(0,-1);
      sentenceOutput.innerText=sentence;
      alphabetProgress.style.width="0%";
      lockAlphabet=false;
    }
  },100);
}

// ================= TAK/NIE =================
function startYesNo(){
  answer=null;
  yesnoLock=false;
  yesTile.classList.remove("active");
  noTile.classList.remove("active");
}

function chooseYes(){
  if(yesnoLock) return;
  yesnoLock=true;
  answer="TAK";
  fillYesNo();
}

function chooseNo(){
  if(yesnoLock) return;
  yesnoLock=true;
  answer="NIE";
  fillYesNo();
}

function fillYesNo(){
  let width=0;
  const interval = setInterval(()=>{
    width+=5;
    yesnoProgress.style.width=width+"%";
    if(width>=100){
      clearInterval(interval);
      yesnoProgress.style.width="0%";
      console.log("Odpowiedź:",answer);
      backToMenu();
      yesnoLock=false;
    }
  },100);
}
