const video = document.getElementById("video");
const menuCanvas = document.getElementById("menuCanvas");
const menuCtx = menuCanvas.getContext("2d");
const leftTile = document.getElementById("left");
const rightTile = document.getElementById("right");
const leftBar = document.getElementById("leftBar");
const rightBar = document.getElementById("rightBar");

let neutralX = null;
let lock = false;

// MEDIA PIPE
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
  menuCtx.clearRect(0,0,menuCanvas.width,menuCanvas.height);
  if(!results.multiFaceLandmarks) return;

  // rysowanie wideo
  menuCtx.drawImage(results.image,0,0,menuCanvas.width,menuCanvas.height);

  const lm = results.multiFaceLandmarks[0];
  for(let i=0;i<lm.length;i++){
    const x = lm[i].x*menuCanvas.width;
    const y = lm[i].y*menuCanvas.height;
    menuCtx.beginPath();
    menuCtx.arc(x,y,2,0,2*Math.PI);
    menuCtx.fillStyle="red";
    menuCtx.fill();
  }

  // wykrywanie ruchu głowy
  const nose = lm[1];
  const leftEye = lm[234];
  const rightEye = lm[454];
  const dx = nose.x - (leftEye.x + rightEye.x)/2;

  if(neutralX===null){
    neutralX = dx; // ustalenie pozycji neutralnej
    return;
  }

  const diffX = dx - neutralX;
  const LEFT = -0.035;
  const RIGHT = 0.035;

  leftTile.classList.toggle("active", diffX<LEFT);
  rightTile.classList.toggle("active", diffX>RIGHT);

  // wypełnianie paska przy ruchu
  if(diffX<LEFT && !lock){
    lock = true;
    let width = 0;
    const interval = setInterval(()=>{
      width += 5;
      leftBar.style.width = width+"%";
      if(width>=100){ clearInterval(interval); lock=false; alert("Wybrano ALFABET!"); leftBar.style.width="0%";}
    }, 100);
  }

  if(diffX>RIGHT && !lock){
    lock = true;
    let width = 0;
    const interval = setInterval(()=>{
      width += 5;
      rightBar.style.width = width+"%";
      if(width>=100){ clearInterval(interval); lock=false; alert("Wybrano TAK/NIE!"); rightBar.style.width="0%";}
    }, 100);
  }
});

// kamera
const cam = new Camera(video,{
  onFrame: async()=> await faceMesh.send({image:video}),
  width:640,
  height:480,
  fps:30
});
cam.start();
