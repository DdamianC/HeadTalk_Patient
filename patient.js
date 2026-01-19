/* ================= ALERT TESTOWY ================= */
console.log("NOWA WERSJA PATIENT.JS");

/* ================= ELEMENTY ================= */
const video = document.getElementById("video");
const menuCanvas = document.getElementById("menuCanvas");
const ctx = menuCanvas.getContext("2d");

const leftTile = document.getElementById("left");
const rightTile = document.getElementById("right");
const leftBar = document.getElementById("leftBar");
const rightBar = document.getElementById("rightBar");

let view = "menu";
let neutralX = null;
let lock = false;

/* ================= ALFABET ================= */
const letters = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ", " "];
let currentIndex = 0;
let sentence = "";
let cycleInterval = null;
let lockAlphabet = false;

/* ================= TAK/NIE ================= */
let yesnoLock = false;
let answer = null;

/* ================= FACE MESH ================= */
const faceMesh = new FaceMesh({
  locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`
});

faceMesh.setOptions({
  maxNumFaces:1,
  refineLandmarks:true,
  minDetectionConfidence:0.7,
  minTrackingConfidence:0.7
});

/* ================= OBSŁUGA WYNIKÓW ================= */
faceMesh.onResults(results=>{
  ctx.clearRect(0,0,menuCanvas.width,menuCanvas.height);
  if(!results.multiFaceLandmarks) return;

  ctx.drawImage(results.image,0,0,menuCanvas.width,menuCanvas.height);

  const lm = results.multiFaceLandmarks[0];
  lm.forEach(p=>{
    ctx.beginPath();
    ctx.arc(p.x*menuCanvas.width,p.y*menuCanvas.height,2,0,2*Math.PI);
    ctx.fillStyle="red";
    ctx.fill();
  });

  const nose = lm[1], leftEye = lm[234], rightEye = lm[454];
  const dx = nose.x - (leftEye.x + rightEye.x)/2;

  if(neutralX === null) {
    neutralX = dx;
    return;
  }

  const diffX = dx - neutralX;
  const diffY = nose.y - 0.5; // prosty przybliżony UP

  if(view==="menu") handleMenu(diffX);
  if(view==="alphabet") handleAlphabet(diffX, diffY);
  if(view==="yesno") handleYesNo(diffX);
});

/* ================= MENU ================= */
function handleMenu(diffX){
  const LEFT = -0.06;
  const RIGHT = 0.06;

  leftTile.classList.toggle("active", diffX<LEFT);
  rightTile.classList.toggle("active", diffX>RIGHT);

  if(diffX<LEFT && !lock) fillBar(leftBar, enterAlphabet);
  if(diffX>RIGHT && !lock) fillBar(rightBar, enterYesNo);
}

/* ================= PASEK ================= */
function fillBar(bar, callback){
  lock = true;
  let width = 0;
  const interval = setInterval(()=>{
    width+=5;
    bar.style.width = width+"%";
    if(width>=100){
      clearInterval(interval);
      bar.style.width="0%";
      lock=false;
      callback();
    }
  },100);
}

/* ================= NAWIGACJA ================= */
function enterAlphabet(){
  view="alphabet";
  document.getElementById("menu").hidden=true;
  document.getElementById("alphabetView").hidden=false;
  startAlphabet();
  startAlphabetCamera();
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
  clearInterval(cycleInterval);
}

/* ================= ALFABET ================= */
function startAlphabet(){
  const grid = document.getElementById("alphabetGrid");
  grid.innerHTML="";
  letters.forEach(l=>{
    const div = document.createElement("div");
    div.className="letter";
    div.innerText=l;
    grid.appendChild(div);
  });
  highlightLetter();
  cycleInterval = setInterval(nextLetter, 8000);
}

function highlightLetter(){
  document.querySelectorAll(".letter").forEach((l,i)=>{
    l.classList.toggle("active", i===currentIndex);
  });
}

function nextLetter(){
  currentIndex = (currentIndex +1) % letters.length;
  highlightLetter();
}

function handleAlphabet(diffX, diffY){
  const LEFT=-0.06, RIGHT=0.06, UP=-0.04;
  if(diffX<LEFT) addLetter();
  if(diffX>RIGHT) removeLetter();
  if(diffY<UP) finishAlphabet();
}

function addLetter(){
  if(lockAlphabet) return;
  lockAlphabet=true;
  let width=0;
  const bar=document.getElementById("alphabetProgress");
  const interval=setInterval(()=>{
    width+=5;
    bar.style.width=width+"%";
    if(width>=100){
      clearInterval(interval);
      const char = letters[currentIndex]===" "? "": letters[currentIndex];
      sentence += char;
      document.getElementById("sentenceOutput").innerText=sentence;
      bar.style.width="0%";
      lockAlphabet=false;
    }
  },100);
}

function removeLetter(){
  if(lockAlphabet) return;
  lockAlphabet=true;
  let width=0;
  const bar=document.getElementById("alphabetProgress");
  const interval=setInterval(()=>{
    width+=5;
    bar.style.width=width+"%";
    if(width>=100){
      clearInterval(interval);
      sentence=sentence.slice(0,-1);
      document.getElementById("sentenceOutput").innerText=sentence;
      bar.style.width="0%";
      lockAlphabet=false;
    }
  },100);
}

function finishAlphabet(){
  // WYŚLIJ do opiekuna tutaj
  backToMenu();
}

/* ================= KAMERA ALFABET ================= */
function startAlphabetCamera(){
  const canvas = document.getElementById("alphabetCamera");
  const ctxCam = canvas.getContext("2d");

  const faceMeshCam = new FaceMesh({locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`});
  faceMeshCam.setOptions({
    maxNumFaces:1, refineLandmarks:true,
    minDetectionConfidence:0.7, minTrackingConfidence:0.7
  });

  faceMeshCam.onResults(results=>{
    ctxCam.clearRect(0,0,canvas.width,canvas.height);
    if(!results.multiFaceLandmarks) return;
    ctxCam.drawImage(results.image,0,0,canvas.width,canvas.height);
    const lm=results.multiFaceLandmarks[0];
    lm.forEach(p=>{
      ctxCam.beginPath();
      ctxCam.arc(p.x*canvas.width,p.y*canvas.height,2,0,2*Math.PI);
      ctxCam.fillStyle="red";
      ctxCam.fill();
    });
  });

  new Camera(video,{
    onFrame: async()=>await faceMeshCam.send({image:video}),
    width:640,height:480,fps:30
  }).start();
}

/* ================= TAK/NIE ================= */
function startYesNo(){
  answer=null;
  yesnoLock=false;
  document.getElementById("yesTile").classList.remove("active");
  document.getElementById("noTile").classList.remove("active");
}

function handleYesNo(diffX){
  const LEFT=-0.06, RIGHT=0.06;
  const yesTile=document.getElementById("yesTile");
  const noTile=document.getElementById("noTile");

  yesTile.classList.toggle("active", diffX<LEFT);
  noTile.classList.toggle("active", diffX>RIGHT);

  if(diffX<LEFT) chooseYes();
  if(diffX>RIGHT) chooseNo();
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
  const bar=document.getElementById("yesnoProgress");
  let w=0;
  const interval=setInterval(()=>{
    w+=5;
    bar.style.width=w+"%";
    if(w>=100){
      clearInterval(interval);
      bar.style.width="0%";
      console.log("Odpowiedź:", answer);
      backToMenu();
      yesnoLock=false;
    }
  },100);
}

/* ================= KAMERA MENU ================= */
new Camera(video,{
  onFrame: async()=>await faceMesh.send({image:video}),
  width:640,height:480,fps:30
}).start();
