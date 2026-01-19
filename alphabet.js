const letters = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ", "␣"];
let currentIndex = 0;
let sentence = "";
let cycleInterval = null;
let lockAlphabet = false;

const grid = document.getElementById("alphabetGrid");
const sentenceOutput = document.getElementById("sentenceOutput");
const progress = document.getElementById("alphabetProgress");
const cameraCanvas = document.getElementById("alphabetCamera");
const ctxCam = cameraCanvas.getContext("2d");

function startAlphabet() {
  grid.innerHTML = "";
  letters.forEach(l=>{
    const div = document.createElement("div");
    div.className = "letter";
    div.innerText = l;
    grid.appendChild(div);
  });

  highlightLetter();
  cycleInterval = setInterval(nextLetter, 8000); // 8 sekund

  startAlphabetCamera();
}

function highlightLetter() {
  document.querySelectorAll(".letter").forEach((l,i)=>{
    l.classList.toggle("active", i===currentIndex);
  });
}

function nextLetter() {
  currentIndex = (currentIndex + 1) % letters.length;
  highlightLetter();
}

// Dodaj literę do zdania
function addLetter() {
  if(lockAlphabet) return;
  lockAlphabet = true;
  let width=0;
  const interval = setInterval(()=>{
    width+=5;
    progress.style.width = width + "%";
    if(width>=100){
      clearInterval(interval);
      const char = letters[currentIndex]==="␣" ? " " : letters[currentIndex];
      sentence += char;
      sentenceOutput.innerText = sentence;
      progress.style.width="0%";
      lockAlphabet=false;
    }
  },100);
}

// Usuń literę
function removeLetter() {
  if(lockAlphabet) return;
  lockAlphabet = true;
  let width=0;
  const interval = setInterval(()=>{
    width+=5;
    progress.style.width = width + "%";
    if(width>=100){
      clearInterval(interval);
      sentence = sentence.slice(0,-1);
      sentenceOutput.innerText = sentence;
      progress.style.width="0%";
      lockAlphabet=false;
    }
  },100);
}

// Kamera z punktami twarzy
function startAlphabetCamera(){
  const video = document.getElementById("video");
  const faceMesh = new FaceMesh({locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`});
  faceMesh.setOptions({
    maxNumFaces:1,
    refineLandmarks:true,
    minDetectionConfidence:0.7,
    minTrackingConfidence:0.7
  });

  faceMesh.onResults(results=>{
    ctxCam.clearRect(0,0,cameraCanvas.width,cameraCanvas.height);
    if(!results.multiFaceLandmarks) return;
    ctxCam.drawImage(results.image,0,0,cameraCanvas.width,cameraCanvas.height);
    const lm = results.multiFaceLandmarks[0];
    lm.forEach(p=>{
      ctxCam.beginPath();
      ctxCam.arc(p.x*cameraCanvas.width, p.y*cameraCanvas.height,2,0,2*Math.PI);
      ctxCam.fillStyle="red";
      ctxCam.fill();
    });
  });

  const cam = new Camera(video,{
    onFrame: async()=>await faceMesh.send({image:video}),
    width:640, height:480, fps:30
  });
  cam.start();
}
