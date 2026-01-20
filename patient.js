const DB="https://bci-komunikacja-default-rtdb.europe-west1.firebasedatabase.app";

const letters=[..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
let letterIndex=0;
let sentence="";
let view="menu";

let neutralX=null;
let neutralY=null;
let currentDir="center";
let dwell=0;
const DWELL_TIME=20;

const video=document.getElementById("video");
const canvas=document.getElementById("camCanvas");
const ctx=canvas.getContext("2d");

const letterTile=document.getElementById("letterTile");
const sentenceEl=document.getElementById("sentence");

/* ===== MEDIAPIPE ===== */
const faceMesh=new FaceMesh({
 locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`
});

faceMesh.setOptions({maxNumFaces:1,minDetectionConfidence:0.7});

faceMesh.onResults(r=>{
 ctx.save();
 ctx.scale(-1,1);
 ctx.drawImage(r.image,-canvas.width,0,canvas.width,canvas.height);
 ctx.restore();

 if(!r.multiFaceLandmarks){
  document.getElementById("trackLabel").innerText="🔴 BRAK TWARZY";
  neutralX=null;
  return;
 }

 document.getElementById("trackLabel").innerText="🟢 TRACKING";

 const lm=r.multiFaceLandmarks[0];

 lm.forEach(p=>{
  ctx.beginPath();
  ctx.arc(p.x*canvas.width,p.y*canvas.height,1.5,0,2*Math.PI);
  ctx.fillStyle="#00ff88";
  ctx.fill();
 });

 const nose=lm[1].x;
 const eyes=(lm[234].x+lm[454].x)/2;
 const forehead=lm[10].y;

 if(neutralX===null){
  neutralX=eyes-nose;
  neutralY=forehead;
  return;
 }

 const dx=(eyes-nose)-neutralX;
 const dy=forehead-neutralY;

 let dir="center";
 if(dx<-0.05)dir="left";
 else if(dx>0.05)dir="right";
 else if(dy>0.04)dir="down";
 else if(dy<-0.04)dir="up";

 if(dir===currentDir){
  dwell++;
 }else{
  dwell=0;
  currentDir=dir;
  resetProgress();
 }

 if(dwell>DWELL_TIME){
  trigger(dir);
  dwell=0;
  resetProgress();
 }

 updateProgress(dwell/DWELL_TIME*100);
});

/* ===== CAMERA ===== */
navigator.mediaDevices.getUserMedia({video:{width:320,height:240}})
.then(s=>{
 video.srcObject=s;
 const cam=new Camera(video,{
  onFrame:()=>faceMesh.send({image:video}),
  fps:10
 });
 cam.start();
});

/* ===== UI ===== */
function resetProgress(){
 document.querySelectorAll(".progress").forEach(p=>p.style.width="0%");
}

function updateProgress(p){
 if(view==="menu"){
  if(currentDir==="left") document.getElementById("progAlphabet").style.width=p+"%";
  if(currentDir==="right") document.getElementById("progYesNo").style.width=p+"%";
 }
 if(view==="yesno"){
  if(currentDir==="left") document.getElementById("progYes").style.width=p+"%";
  if(currentDir==="right") document.getElementById("progNo").style.width=p+"%";
 }
}

function trigger(dir){
 if(view==="menu"){
  if(dir==="left") openAlphabet();
  if(dir==="right") openYesNo();
 }

 if(view==="alphabet"){
  if(dir==="left") sentence+=letterTile.innerText;
  if(dir==="right") sentence=sentence.slice(0,-1);
  if(dir==="down") sendSentence();
  if(dir==="up") backToMenu();
  sentenceEl.innerText=sentence;
 }

 if(view==="yesno"){
  if(dir==="left") sendAnswer("TAK");
  if(dir==="right") sendAnswer("NIE");
  if(dir==="up") backToMenu();
 }
}

function openAlphabet(){
 view="alphabet";
 document.getElementById("menu").hidden=true;
 document.getElementById("alphabetView").hidden=false;
 cycleLetters();
}

function openYesNo(){
 view="yesno";
 document.getElementById("menu").hidden=true;
 document.getElementById("yesnoView").hidden=false;
}

function backToMenu(){
 view="menu";
 document.getElementById("menu").hidden=false;
 document.getElementById("alphabetView").hidden=true;
 document.getElementById("yesnoView").hidden=true;
}

function cycleLetters(){
 if(view!=="alphabet")return;
 letterTile.innerText=letters[letterIndex];
 letterIndex=(letterIndex+1)%letters.length;
 setTimeout(cycleLetters,2000);
}

function sendSentence(){
 if(!sentence)return;
 fetch(`${DB}/messages.json`,{
  method:"POST",
  body:JSON.stringify({text:sentence,time:Date.now()})
 });
 sentence="";
 sentenceEl.innerText="";
 backToMenu();
}

function sendAnswer(v){
 fetch(`${DB}/answers.json`,{
  method:"POST",
  body:JSON.stringify({value:v,time:Date.now()})
 });
 backToMenu();
}
