const letters = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ", " ", "<-"];
const needs = [
    {t: "Picie", i: "💧"}, {t: "Jedzenie", i: "🍎"}, {t: "Leki", i: "💊"}, {t: "Ból", i: "😫"},
    {t: "Zimno", i: "❄️"}, {t: "Ciepło", i: "🔥"}, {t: "Pomoc", i: "🆘"}, {t: "Toaleta", i: "🚻"},
    {t: "TV", i: "📺"}, {t: "Książka", i: "📖"}, {t: "Światło", i: "💡"}, {t: "Sen", i: "😴"}
];

let state = { 
    view: 'menu', 
    dir: 'center', 
    dwell: 0, 
    sentence: "", 
    alphaIdx: 0, 
    needIdx: 0 
};

const DWELL_REQ = 25; // Szybkość ładowania (ok. 1.5 sekundy)

// Funkcja Alarmu z wyraźniejszym dźwiękiem
function playAlarm() {
    const actx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    
    osc.type = 'square'; 
    osc.frequency.setValueAtTime(600, actx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, actx.currentTime + 0.4);
    
    gain.gain.setValueAtTime(0.3, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.9);
    
    osc.connect(gain);
    gain.connect(actx.destination);
    
    osc.start();
    osc.stop(actx.currentTime + 1);
}

// Inicjalizacja Potrzeb
function initNeeds() {
    const nGrid = document.getElementById('needs-grid');
    if(!nGrid) return;
    nGrid.innerHTML = ''; 
    needs.forEach((n, i) => {
        const d = document.createElement('div');
        d.className = 'need-item';
        d.id = `n-${i}`;
        d.innerHTML = `<div style="font-size:3rem; margin-bottom:10px;">${n.i}</div>${n.t}`;
        nGrid.appendChild(d);
    });
}
initNeeds();

function execute(dir) {
    if (state.view === 'menu') {
        if (dir === 'left') setView('alpha');
        if (dir === 'right') setView('needs');
        if (dir === 'up') playAlarm();
    } else if (state.view === 'alpha') {
        if (dir === 'up') setView('menu');
        if (dir === 'left') state.sentence += letters[state.alphaIdx];
        if (dir === 'right') state.sentence = state.sentence.slice(0, -1);
        if (dir === 'down') {
            document.getElementById('final-output').innerText = state.sentence;
            state.sentence = "";
            setView('menu');
        }
    } else if (state.view === 'needs') {
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
}

const faceMesh = new FaceMesh({locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`});
faceMesh.setOptions({maxNumFaces:1, refineLandmarks:true, minDetectionConfidence:0.5});

faceMesh.onResults(res => {
    const canvas = document.getElementById('cameraCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height);
    
    if(!res.multiFaceLandmarks || res.multiFaceLandmarks.length === 0) return;

    ctx.drawImage(res.image, 0, 0, canvas.width, canvas.height);
    const landmarks = res.multiFaceLandmarks[0];
    
    // Punkt nosa (1), lewe oko (33), prawe oko (263)
    const nose = landmarks[1];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const forehead = landmarks[10];

    // OBLICZANIE PRZECHYŁU (TILT) zamiast obrotu
    // Wykorzystujemy różnicę wysokości między oczami
    const eyeDiffY = leftEye.y - rightEye.y; 
    
    let move = 'center';

    // Detekcja przechyłu bocznego (głowa w bok)
    if (eyeDiffY < -0.04) move = 'left'; 
    else if (eyeDiffY > 0.04) move = 'right'; 
    // Detekcja góra/dół (bazując na pozycji nosa względem czoła)
    else if (nose.y < forehead.y + 0.08) move = 'up'; // Zwiększony margines dla ALARMU
    else if (nose.y > forehead.y + 0.18) move = 'down';

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
    document.querySelectorAll('.progress').forEach(b => b.style.width = '0%');
    
    if (state.view === 'menu') {
        if (move === 'left') document.getElementById('bar-left').style.width = p + '%';
        if (move === 'right') document.getElementById('bar-right').style.width = p + '%';
        if (move === 'up') document.getElementById('bar-up').style.width = p + '%';
    }
    
    if (state.view === 'alpha') {
        document.getElementById('sentence').innerText = state.sentence || "---";
    }
}

setInterval(() => {
    if (state.view === 'alpha') {
        state.alphaIdx = (state.alphaIdx + 1) % letters.length;
        document.getElementById('cur-let').innerText = letters[state.alphaIdx];
    } else if (state.view === 'needs') {
        state.needIdx = (state.needIdx + 1) % needs.length;
        document.querySelectorAll('.need-item').forEach(e => e.classList.remove('active'));
        const activeItem = document.getElementById(`n-${state.needIdx}`);
        if(activeItem) activeItem.classList.add('active');
    }
}, 3500);

const cam = new Camera(document.getElementById('video'), {
    onFrame: async () => { await faceMesh.send({image: document.getElementById('video')}) },
    width: 640, height: 480
});
cam.start();
