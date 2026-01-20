const DB="https://bci-komunikacja-default-rtdb.europe-west1.firebasedatabase.app";

const letters=[..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
let li=0, sentence="", view="menu";
let neutralX=null, neutralY=null, current="center";

const video=document.getElementById("video");
const canvas=document.getElementById("camCanvas");
const ctx=canvas.getContext("2d");

const letterTile=document.getElementById("letterTile");
const sentenceEl=document.getElementById("sentence");

function setMode(m){
 document.getElementById("modeLabel").innerText="TRYB: "+m;
}

/* ===== MEDIA PIPE ===== */
const faceMesh=new FaceMesh({
 locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`
});

faceMesh.setOptions({maxNumFaces:1,minDetectionConfidence:.7});
faceMesh.onResults(r=>{
 if(!r.multiFaceLandmarks)return;

 ctx.drawImage(r.image,0,0,canvas.width,canvas.height);
 sendFrame();

 const lm=r.multiFaceLandmarks[0];
 const nose=lm[1].x;
 const eyes=(lm[234].x+lm[454].x)/2;
 const y=lm[10].y;

 if(neutralX===null){neutralX=eyes-nose;neutralY=y;return;}

 const dx=(eyes-nose)-neutralX;
 const dy=y-neutralY;

 let dir="center";
 if(dx<-0.05)dir="left";
 else if(dx>0.05)dir="right";
 else if(dy>0.04)dir="down";
 else if(dy<-0.04)dir="up";

 if(dir!==current){
  current=dir;
  handle(dir);
 }
});

/* ===== KAMERA ===== */
navigator.mediaDevices.getUserMedia({video:{width:320,height:240}})
.then(s=>{
 video.srcObject=s;
 const cam=new Camera(video,{
  onFrame:()=>faceMesh.send({image:video}),
  fps:10
 });
 cam.start();
});

/* ===== LOGIKA ===== */
function handle(dir){
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

function cycle(){
 if(view!=="alphabet")return;
 letterTile.innerText=letters[li];
 li=(li+1)%letters.length;
 setTimeout(cycle,2000);
}

function openAlphabet(){
 view="alphabet"; setMode("ALFABET");
 document.getElementById("menu").hidden=true;
 document.getElementById("alphabetView").hidden=false;
 cycle();
}

function openYesNo(){
 view="yesno"; setMode("TAK / NIE");
 document.getElementById("menu").hidden=true;
 document.getElementById("yesnoView").hidden=false;
}

function backToMenu(){
 view="menu"; setMode("MENU");
 document.getElementById("menu").hidden=false;
 document.getElementById("alphabetView").hidden=true;
 document.getElementById("yesnoView").hidden=true;
}

/* ===== FIREBASE ===== */
function sendSentence(){
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

/* ===== KAMERA STREAM ===== */
function sendFrame(){
 const img=canvas.toDataURL("image/jpeg",0.4);
 fetch(`${DB}/camera/current.json`,{
  method:"PUT",
  body:JSON.stringify({img,time:Date.now()})
 });
}

/* ===== PYTANIA ===== */
async function loadQ(){
 const r=await fetch(`${DB}/questions/current.json`);
 const d=await r.json();
 if(d) document.getElementById("questionText").innerText=d.text;
}
setInterval(loadQ,2000);
