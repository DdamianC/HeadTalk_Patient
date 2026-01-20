const letters = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ", " ", "<-"];
const needs = [
    {t: "Picie", i: "💧"}, {t: "Jedzenie", i: "🍎"}, {t: "Leki", i: "💊"}, {t: "Ból", i: "😫"},
    {t: "Zimno", i: "❄️"}, {t: "Pomoc", i: "🆘"}, {t: "TV", i: "📺"}, {t: "Toaleta", i: "🚻"},
    {t: "Książka", i: "📖"}, {t: "Sen", i: "😴"}
];

let state = { 
    view: 'menu', 
    dir: 'center', 
    dwell: 0, 
    sentence: "", 
    alphaIdx: 0, 
    needIdx: 0,
    entryTime: 0 
};

let alphaTimer = 0;
const START_DELAY = 60;    // 6 sekund (60 * 100ms)
const CHANGE_TIME = 40;    // 4 sekundy (40 * 100ms)
const DWELL_REQ = 25;      

function playAlarm() {
    const actx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = 'square'; 
    osc.frequency.setValueAtTime(600, actx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, actx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.3, actx.currentTime);
    osc.connect(gain); 
    gain.connect(actx.destination);
    osc.start(); 
    osc.stop(actx.currentTime + 0.8);
}

function initNeeds() {
    const nGrid = document.getElementById('needs-grid');
    if(!nGrid) return;
    nGrid.innerHTML = ''; 
    needs.forEach((n, i) => {
        const d = document.createElement('div');
        d.className = 'need-item'; d.id = `n-${i}`;
        d.innerHTML = `<div style="font-size:2.5rem">${n.i}</div>${n.t}`;
        nGrid.appendChild(d);
    });
}
initNeeds();

function execute(dir) {
    if (state.view === 'menu') {
        if (dir === 'left') setView('alpha');
        if (dir === 'right') setView('needs');
        if (dir === 'up') playAlarm();
    } 
    else if (state.view === 'alpha') {
        if (dir === 'up') { setView('menu'); return; } 
        if (dir === 'left') { state.sentence += letters[state.alphaIdx]; alphaTimer = 0; }
        if (dir === 'right') { state.sentence = state.sentence.slice(0, -1); alphaTimer = 0; }
        if (dir === 'down') {
            document.getElementById('final-output').innerText = state.sentence;
            state.sentence = "";
            setView('menu');
        }
    } 
    else if (state.view === 'needs') {
        if (dir === 'up') setView('menu');
        if (dir === 'left') {
            document.getElementById('final-output').innerText = "POTRZEBA: " + needs[state.needIdx].t;
            setView('menu');
        }
    }
}

function setView(v) {
    document.querySelectorAll('.view').forEach(e => e.classList.remove('active'));
    document.getElementById(`view-${v}`).classList.add('active');
    state.view = v;
    state.dwell = 0;
    state.dir = 'center';
    state.entryTime = 0; // Reset pauzy 6s
    alphaTimer = 0;      // Reset timera 4s
    document.querySelectorAll('.progress').forEach(b => b.style.width = '0%');
}

const faceMesh = new FaceMesh({locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`});
faceMesh.setOptions({maxNumFaces:1, refineLandmarks:true, minDetectionConfidence:0.5});

faceMesh.onResults(res => {
    const canvas = document.getElementById('cameraCanvas');
    const ctx = canvas.getContext('2d');
    
    // RYSOWANIE LUSTRZANE
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(-1, 1);
    ctx.translate(-canvas.width, 0);
    ctx.drawImage(res.image, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    if(!res.multiFaceLandmarks || res.multiFaceLandmarks.length === 0) return;

    const landmarks = res.multiFaceLandmarks[0];
    const leftEye = landmarks[33];   
    const rightEye = landmarks[263]; 
    const nose = landmarks[1]; 
    const forehead = landmarks[10];

    // POPRAWIONA LOGIKA LUSTRZANA (Twoje lewo = lewa strona)
    const eyeDiffY = rightEye.y - leftEye.y; 
    
    let move = 'center';

    if (nose.y < forehead.y + 0.08) move = 'up'; 
    else if (nose.y > forehead.y + 0.19) move = 'down';
    else if (eyeDiffY > 0.045) move = 'left';  
    else if (eyeDiffY < -0.045) move = 'right'; 

    if (move !== 'center' && move === state.dir) {
        state.dwell++;
    } else {
        state.dwell = 0;
        state.dir = move;
    }

    if (state.dwell >= DWELL_REQ) {
        execute(move);
        state.dwell = 0;
    }
    updateUI(move);
});

function updateUI(move) {
    const p = (state.dwell / DWELL_REQ) * 100;
    document.querySelectorAll('.progress:not(.auto-progress-bar)').forEach(b => b.style.width = '0%');
    
    if (state.view === 'menu') {
        let bar = document.getElementById(`bar-${move}-menu`);
        if(bar) bar.style.width = p + '%';
    } 
    else if (state.view === 'alpha') {
        if (move !== 'center') {
            let bar = document.getElementById(`bar-${move}-alpha`);
            if(bar) bar.style.width = p + '%';
        }

        const autoBar = document.getElementById('auto-letter-bar');
        if (autoBar) {
            const timePercent = (alphaTimer / CHANGE_TIME) * 100;
            // Pasek rośnie tylko po upływie 6s pauzy startowej
            autoBar.style.width = (state.entryTime < START_DELAY) ? '0%' : timePercent + '%';
        }
        document.getElementById('sentence').innerText = state.sentence || "---";
    } 
    else if (state.view === 'needs') {
        if (move === 'left') document.getElementById('bar-left-needs').style.width = p + '%';
        if (move === 'up') document.getElementById('bar-up-needs').style.width = p + '%';
    }
}

// PĘTLA CZASOWA
setInterval(() => {
    if (state.view === 'alpha' || state.view === 'needs') {
        // 1. Pauza 6s na start
        if (state.entryTime < START_DELAY) {
            state.entryTime++;
            return;
        }

        // 2. Zmiana co 4s (tylko gdy głowa prosto i brak wyboru w toku)
        if (state.dir === 'center' && state.dwell === 0) {
            alphaTimer++;
            
            if (alphaTimer >= CHANGE_TIME) {
                if (state.view === 'alpha') {
                    state.alphaIdx = (state.alphaIdx + 1) % letters.length;
                    document.getElementById('cur-let').innerText = letters[state.alphaIdx];
                } else {
                    state.needIdx = (state.needIdx + 1) % needs.length;
                    document.querySelectorAll('.need-item').forEach(e => e.classList.remove('active'));
                    const activeItem = document.getElementById(`n-${state.needIdx}`);
                    if(activeItem) activeItem.classList.add('active');
                }
                alphaTimer = 0;
            }
        }
    }
}, 100);

const cam = new Camera(document.getElementById('video'), {
    onFrame: async () => { await faceMesh.send({image: document.getElementById('video')}) },
    width: 640, height: 480
});
cam.start();
