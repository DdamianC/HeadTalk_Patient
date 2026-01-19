// ================= ELEMENTY =================
const video = document.getElementById("video");
const menuCanvas = document.getElementById("menuCanvas");
const menuCtx = menuCanvas.getContext("2d");

const leftTile = document.getElementById("left");
const rightTile = document.getElementById("right");
const leftBar = document.getElementById("leftBar");
const rightBar = document.getElementById("rightBar");

let neutralX = null;
let lock = false;
let view = "menu";

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

// ================= WYNIKI =================
faceMesh.onResults(results=>{
  menuCtx.clearRect(0,0,menuCanvas.width,menuCanvas.height);
  if(!results.multiFaceLandmarks) return;

  menuCtx.drawImage(results.image,0,0,menuCanvas.width,menuCanvas.height);
  const lm = results.multiFaceLandmarks[0];
  lm.forEach(p=>{
    menuCtx.beginPath();
    menuCtx.arc(p.x*menuCanvas.width, p.y*menuCanvas.height,2,0,2*Math.PI);
    menuCtx.fillStyle="red";
    menuCtx.fill();
  });

  const nose = lm[1], leftEye = lm[234], rightEye = lm[454];
  const dx = nose.x - (leftEye.x + rightEye.x)/2;
  const dy = nose.y - (leftEye.y + rightEye.y)/2;

  if(neutralX===null){ neutralX=dx; return; }

  const diffX = dx-neutralX;
  const diffY = dy; // jeśli chcesz góra/dół

  if(view==="menu") handleMenu(diffX);
});

function handleMenu(diffX){
  const LEFT = -0.06;   // mocne w lewo
  const RIGHT = 0.06;   // mocne w prawo

  leftTile.classList.toggle("active", diffX<LEFT);
  rightTile.classList.toggle("active", diffX>RIGHT);

  if(diffX<LEFT && !lock) fillBar(leftBar, enterAlphabet);
  if(diffX>RIGHT && !lock) fillBar(rightBar, enterYesNo);
}

// ================= PASEK =================
function fillBar(bar,callback){
  lock=true;
  let width=0;
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

// ================= NAWIGACJA =================
function enterAlphabet(){
  view="alphabet";
  document.getElementById("menu").hidden=true;
  document.getElementById("alphabetView").hidden=false;
  if(typeof startAlphabet==="function") startAlphabet();
}

function enterYesNo(){
  view="yesno";
  document.getElementById("menu").hidden=true;
  // tutaj możesz załączyć startYesNo();
}

function backToMenu(){
  view="menu";
  document.getElementById("menu").hidden=false;
  document.getElementById("alphabetView").hidden=true;
  document.getElementById("yesnoView").hidden=true;
}

// ================= KAMERA =================
const camera = new Camera(video,{
  onFrame: async()=>await faceMesh.send({image:video}),
  width:640,
  height:480,
  fps:30
});
camera.start();
