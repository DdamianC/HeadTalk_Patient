const letters = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ", " ", "<-"];
const needs = [
    {t: "Picie", i: "💧"}, {t: "Jedzenie", i: "🍎"}, {t: "Leki", i: "💊"}, {t: "Ból", i: "😫"},
    {t: "Zimno", i: "❄️"}, {t: "Ciepło", i: "🔥"}, {t: "Pomoc", i: "🆘"}, {t: "Toaleta", i: "🚻"},
    {t: "TV", i: "📺"}, {t: "Książka", i: "📖"}, {t: "Światło", i: "💡"}, {t: "Sen", i: "😴"}
];

let state = { view: 'menu', dir: 'center', dwell: 0, sentence: "", alphaIdx: 0, needIdx: 0 };
const DWELL_REQ = 35; // Czas przytrzymania głowy

// Dźwięk Alarmu
function playAlarm() {
    const actx = new AudioContext();
    const osc = actx.createOscillator();
    osc.type = 'sawtooth';
    osc.connect(actx.destination);
    osc.start();
    osc.stop(actx.currentTime + 0.6);
}

// Inicjalizacja Potrzeb
const nGrid = document.getElementById('needs-grid');
needs.forEach((n, i) => {
    const d = document.createElement('div');
    d.className = 'need-item';
    d.id = `n-${i}`;
    d.innerHTML = `<div style="font-size:3rem; margin-bottom:10px;">${n.i}</div>${n.t}`;
    nGrid.appendChild(d);
});

function execute(dir) {
    if (state.view === 'menu') {
        if (dir === 'up') playAlarm();
        if (dir === 'left') setView('alpha');
        if (dir === 'right') setView('needs');
    } else if (state.view === 'alpha') {
        if (dir === 'up') setView('menu');
        if (dir === 'left') state.sentence += letters[state.alphaIdx];
        if (dir === 'right') state.sentence = state.sentence.slice(0, -1);
        if (dir === 'down') { // WYSYŁANIE
            document.getElementById('final-output').innerText = state.sentence;
            state.sentence = "";
            setView('menu');
        }
    } else if (state.view === 'needs') {
        if (dir === 'up') setView('menu');
        if (dir === 'left') { // DODAWANIE POTRZEBY
            document.getElementById('final-output').innerText = needs[state.needIdx].t;
            setView('menu');
        }
    }
}

function setView(v) {
    document.querySelectorAll('.view').forEach(e => e.classList.remove('active'));
    document.getElementById(`view-${v}`).classList.add('active');
    state.view = v;
    state.dwell = 0;
}

// MediaPipe
const faceMesh = new FaceMesh({locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`});
faceMesh.setOptions({maxNumFaces:1, refineLandmarks:true, minDetectionConfidence:0.5});

faceMesh.onResults(res => {
    const canvas = document.getElementById('cameraCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(!res.multiFaceLandmarks || res.multiFaceLandmarks.length === 0) return;

    ctx.drawImage(res.image, 0, 0, canvas.width, canvas.height);
    const nose = res.multiFaceLandmarks[0][1];
    const forehead = res.multiFaceLandmarks[0][10];

    let move = 'center';
    // Poprawiona czułość Alarmu (Góra)
    if (nose.x > 0.65) move = 'left';
    else if (nose.x < 0.35) move = 'right';
    else if (nose.y < forehead.y - 0.02) move = 'up'; // Alarm tylko przy mocnym wychyleniu
    else if (nose.y > 0.75) move = 'down';

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

    // UI Progress
    const p = (state.dwell / DWELL_REQ) * 100;
    document.querySelectorAll('.progress').forEach(b => b.style.width = '0%');
    if (state.view === 'menu') {
        if (move === 'left') document.getElementById('bar-left').style.width = p + '%';
        if (move === 'right') document.getElementById('bar-right').style.width = p + '%';
        if (move === 'up') document.getElementById('bar-up').style.width = p + '%';
    }
    if (state.view === 'alpha') document.getElementById('sentence').innerText = state.sentence || "---";
});

// Pętla skanująca
setInterval(() => {
    if (state.view === 'alpha') {
        state.alphaIdx = (state.alphaIdx + 1) % letters.length;
        document.getElementById('cur-let').innerText = letters[state.alphaIdx];
    } else if (state.view === 'needs') {
        state.needIdx = (state.needIdx + 1) % needs.length;
        document.querySelectorAll('.need-item').forEach(e => e.classList.remove('active'));
        document.getElementById(`n-${state.needIdx}`).classList.add('active');
    }
}, 3500);

const cam = new Camera(document.getElementById('video'), {
    onFrame: async () => { await faceMesh.send({image: document.getElementById('video')}) },
    width: 640, height: 480
});
cam.start();
