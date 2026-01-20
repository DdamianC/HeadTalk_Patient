const letters = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ", " ", "<-"];
const needs = [
    {t: "Picie", i: "💧"}, {t: "Jedzenie", i: "🍎"}, {t: "Leki", i: "💊"}, {t: "Ból", i: "😫"},
    {t: "Zimno", i: "❄️"}, {t: "Ciepło", i: "🔥"}, {t: "Pomoc", i: "🆘"}, {t: "Sen", i: "😴"},
    {t: "Toaleta", i: "🚻"}, {t: "TV", i: "📺"}, {t: "Książka", i: "📖"}, {t: "Światło", i: "💡"}
];

let state = {
    view: 'menu',
    dir: 'center',
    dwell: 0,
    sentence: "",
    alphaIdx: 0,
    needIdx: 0
};

const DWELL_TIME = 35; // Czas ładowania

// Funkcja dźwięku alarmu
function playAlarmSound() {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
}

// Generowanie potrzeb
const container = document.getElementById('needs-container');
needs.forEach((n, i) => {
    const div = document.createElement('div');
    div.className = 'need-item';
    div.id = `need-${i}`;
    div.innerHTML = `<div style="font-size:3rem">${n.i}</div><div>${n.t}</div>`;
    container.appendChild(div);
});

// Logika Sterowania
function executeAction(dir) {
    if (state.view === 'menu') {
        if (dir === 'left') switchView('alpha');
        if (dir === 'right') switchView('needs');
        if (dir === 'up') playAlarmSound();
    } 
    else if (state.view === 'alpha') {
        if (dir === 'left') state.sentence += letters[state.alphaIdx];
        if (dir === 'right') state.sentence = state.sentence.slice(0, -1);
        if (dir === 'up') switchView('menu');
        if (dir === 'down') {
            document.getElementById('output-final').innerText = state.sentence;
            state.sentence = ""; 
            switchView('menu');
        }
    }
    else if (state.view === 'needs') {
        if (dir === 'left') {
            document.getElementById('output-final').innerText = needs[state.needIdx].t;
            switchView('menu');
        }
        if (dir === 'up') switchView('menu');
    }
}

function switchView(v) {
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    document.getElementById(`view-${v}`).classList.add('active');
    state.view = v;
    state.dwell = 0;
}

// MediaPipe Setup
const faceMesh = new FaceMesh({locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`});
faceMesh.setOptions({maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5});

faceMesh.onResults(results => {
    const canvas = document.getElementById('cameraCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) return;

    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    const nose = results.multiFaceLandmarks[0][1];
    const top = results.multiFaceLandmarks[0][10];
    const bottom = results.multiFaceLandmarks[0][152];

    let move = 'center';
    // Poprawiona czułość Alarmu (Góra) - nose.y musi być znacznie wyżej
    if (nose.x > 0.65) move = 'left';
    else if (nose.x < 0.35) move = 'right';
    else if (nose.y < top.y + 0.02) move = 'up'; // Bardziej wymagający ruch w górę
    else if (nose.y > bottom.y - 0.05) move = 'down';

    if (move !== 'center' && move === state.dir) {
        state.dwell++;
    } else {
        state.dwell = 0;
        state.dir = move;
    }

    if (state.dwell >= DWELL_TIME) {
        executeAction(move);
        state.dwell = 0;
    }

    updateInterface();
});

function updateInterface() {
    const p = (state.dwell / DWELL_TIME) * 100;
    document.querySelectorAll('.progress-fill').forEach(b => b.style.width = '0%');
    
    if (state.view === 'menu') {
        if (state.dir === 'up') document.getElementById('bar-up').style.width = p + '%';
        if (state.dir === 'left') document.getElementById('bar-left').style.width = p + '%';
        if (state.dir === 'right') document.getElementById('bar-right').style.width = p + '%';
    }
    if (state.view === 'alpha') {
        document.getElementById('sentence-preview').innerText = state.sentence || "---";
    }
}

setInterval(() => {
    if (state.view === 'alpha') {
        state.alphaIdx = (state.alphaIdx + 1) % letters.length;
        document.getElementById('current-letter').innerText = letters[state.alphaIdx];
    }
    if (state.view === 'needs') {
        state.needIdx = (state.needIdx + 1) % needs.length;
        document.querySelectorAll('.need-item').forEach(el => el.classList.remove('active'));
        document.getElementById(`need-${state.needIdx}`).classList.add('active');
    }
}, 3500);

const camera = new Camera(document.getElementById('video'), {
    onFrame: async () => { await faceMesh.send({image: document.getElementById('video')}) },
    width: 640, height: 480
});
camera.start();
