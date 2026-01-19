const letters=[..."ABCDEFGHIJKLMNOPQRSTUVWXYZ","␣"];
let currentIndex=0,sentence="",lockAlphabet=false;
let cycleInterval=null;

const grid=document.getElementById("alphabetGrid");
const sentenceOutput=document.getElementById("sentenceOutput");
const progress=document.getElementById("alphabetProgress");
const camCanvas=document.getElementById("alphabetCamera");
const ctxCam=camCanvas.getContext("2d");

document.getElementById("backMenu").onclick=()=>backToMenu();
document.getElementById("sendSentence").onclick=()=>{sentence=""; sentenceOutput.innerText=sentence; backToMenu();};

function startAlphabet(){
  grid.innerHTML="";
  letters.forEach(l=>{
    const div=document.createElement("div");
    div.className="letter";
    div.innerText=l;
    grid.appendChild(div);
  });
  highlightLetter();
  cycleInterval=setInterval(nextLetter,8000);
  startAlphabetCamera();
}

function highlightLetter(){
  document.querySelectorAll(".letter").forEach((l,i)=>{
    l.classList.toggle("active",i===currentIndex);
  });
}

function nextLetter(){
  currentIndex=(currentIndex+1)%letters.length;
  highlightLetter();
}

function addLetter(){
  if(lockAlphabet) return;
  lockAlphabet=true;
  let width=0;
  const interval=setInterval(()=>{
    width+=5;
    progress.style.width=width+"%";
    if(width>=100){
      clearInterval(interval);
      const char = letters[currentIndex]==="␣"?" ":letters[currentIndex];
      sentence+=char;
      sentenceOutput.innerText=sentence;
      progress.style.width="0%";
      lockAlphabet=false;
    }
  },100);
}

function removeLetter(){
  if(lockAlphabet) return;
  lockAlphabet=true;
  let width=0;
  const interval=setInterval(()=>{
    width+=5;
    progress.style.width=width+"%";
    if(width>=100){
      clearInterval(interval);
      sentence=sentence.slice(0,-1);
      sentenceOutput.innerText=sentence;
      progress.style.width="0%";
      lockAlphabet=false;
    }
  },100);
}

// ================= KAMERA =================
function startAlphabetCamera(){
  const video=document.getElementById("video");
  const faceMesh=new FaceMesh({locateFile: f=>`https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`});
  faceMesh.setOptions({maxNumFaces:1,refineLandmarks:true,minDetectionConfidence:0.7,minTrackingConfidence:0.7});

  faceMesh.onResults(results=>{
    ctxCam.clearRect(0,0,camCanvas.width,camCanvas.height);
    if(!results.multiFaceLandmarks) return;
    ctxCam.drawImage(results.image,0,0,camCanvas.width,camCanvas.height);
    const lm=results.multiFaceLandmarks[0];
    lm.forEach(p=>{
      ctxCam.beginPath();
      ctxCam.arc(p.x*camCanvas.width,p.y*camCanvas.height,2,0,2*Math.PI);
      ctxCam.fillStyle="red";
      ctxCam.fill();
    });

    const nose=lm[1], leftEye=lm[234], rightEye=lm[454];
    const dx=nose.x-(leftEye.x+rightEye.x)/2;
    const dy=nose.y-(leftEye.y+rightEye.y)/2;

    const LEFT=-0.06, RIGHT=0.06, UP=-0.04;

    if(dx<LEFT) addLetter();
    if(dx>RIGHT) removeLetter();
    if(dy<UP) {sentence=""; sentenceOutput.innerText=""; backToMenu();}
  });

  const cam=new Camera(video,{onFrame: async()=>await faceMesh.send({image:video}), width:640, height:480, fps:30});
  cam.start();
}
