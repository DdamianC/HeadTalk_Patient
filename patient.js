const letters=[..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
const needs=[
"Woda","Jedzenie","Toaleta","Ból",
"Zimno","Gorąco","Pomoc","Pozycja",
"Leki","Sen","Duszność","Inne"
];

let view="menu";
let letterIndex=0;
let sentence="";
let needIndex=0;

let neutralX=null,neutralY=null;
let dwell=0,currentDir="center";
const DWELL=20;

const video=document.getElementById("video");
const cam=document.getElementById("cam");
const ctx=cam.getContext("2d");

const status=document.getElementById("status");
const letterEl=document.getElementById("letter");
const sentenceEl=document.getElementById("sentence");

/* ===== NEEDS ===== */
const grid=document.getElementById("needsGrid");
needs.forEach(n=>{
 const d=document.createElement("div");
 d.className="tile";
 d.innerText=n;
 d.innerHTML+=`<div class="fill"></div>`;
 grid.appendChild(d);
});

/* ===== FACE ===== */
const fm=new FaceMesh({
 locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`
});
fm.setOptions({maxNumFaces:1});
fm.onResults(r=>{
 ctx.clearRect(0,0,cam.width,cam.height);
 ctx.save();ctx.scale(-1,1);
 ctx.drawImage(r.image,-cam.width,0,cam.width,cam.height);
 ctx.restore();

 if(!r.multiFaceLandmarks){
  status.innerText="🔴 brak twarzy";
  neutralX=null;
  return;
 }

 status.innerText="🟢 tracking";
 const lm=r.multiFaceLandmarks[0];

 lm.forEach(p=>{
  ctx.beginPath();
  ctx.arc(p.x*cam.width,p.y*cam.height,1.5,0,2*Math.PI);
  ctx.fillStyle="#00ff88";ctx.fill();
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
 else if(dy>0.05)dir="down";
 else if(dy<-0.05)dir="up";

 if(dir===currentDir) dwell++;
 else{ dwell=0; currentDir=dir; resetFill(); }

 if(dwell>DWELL){ action(dir); dwell=0; resetFill(); }
 fill(dwell/DWELL*100);
});

/* ===== CAMERA ===== */
navigator.mediaDevices.getUserMedia({video:{width:320,height:240}})
.then(s=>{
 video.srcObject=s;
 new Camera(video,{onFrame:()=>fm.send({image:video}),fps:10}).start();
});

/* ===== UI LOGIC ===== */
function resetFill(){
 document.querySelectorAll(".fill").forEach(f=>f.style.width="0%");
}

function fill(p){
 if(view==="menu"){
  if(currentDir==="left") document.querySelector("#menuAlphabet .fill").style.width=p+"%";
  if(currentDir==="right") document.querySelector("#menuNeeds .fill").style.width=p+"%";
  if(currentDir==="up") document.querySelector("#menuAlarm .fill").style.width=p+"%";
 }
}

function action(dir){
 if(view==="menu"){
  if(dir==="left") openAlphabet();
  if(dir==="right") openNeeds();
  if(dir==="up") alarm();
 }

 if(view==="alphabet"){
  if(dir==="left") sentence+=letterEl.innerText;
  if(dir==="right") sentence=sentence.slice(0,-1);
  if(dir==="down") alert("ZDANIE: "+sentence);
  if(dir==="up") back();
  sentenceEl.innerText=sentence;
 }

 if(view==="needs"){
  if(dir==="left") sentence=needs[needIndex];
  if(dir==="down") alert("POTRZEBA: "+sentence);
  if(dir==="up") back();
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
 needs.hidden=false;
 cycleNeeds();
}

function back(){
 view="menu";
 menu.hidden=false;
 alphabet.hidden=true;
 needs.hidden=true;
}

function cycleLetters(){
 if(view!=="alphabet")return;
 letterEl.innerText=letters[letterIndex];
 letterIndex=(letterIndex+1)%letters.length;
 setTimeout(cycleLetters,2500);
}

function cycleNeeds(){
 if(view!=="needs")return;
 document.querySelectorAll("#needsGrid .tile").forEach((t,i)=>{
  t.style.outline=i===needIndex?"3px solid #00ff88":"none";
 });
 needIndex=(needIndex+1)%needs.length;
 setTimeout(cycleNeeds,5000);
}

function alarm(){
 const a=new Audio("https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg");
 a.loop=true;a.play();
 alert("⛔ WEZWANO OPIEKUNA");
}
