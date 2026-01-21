const letters = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ", " ", "<-"];

const needs = [
    {t:"Picie",i:"💧"},{t:"Jedzenie",i:"🍎"},{t:"Leki",i:"💊"},
    {t:"Ból",i:"😫"},{t:"Zimno",i:"❄️"},{t:"Pomoc",i:"🆘"},
    {t:"TV",i:"📺"},{t:"Toaleta",i:"🚻"},
    {t:"Książka",i:"📖"},{t:"Sen",i:"😴"}
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

const START_DELAY = 60;
const CHANGE_TIME_ALPHA = 15;
const CHANGE_TIME_NEEDS = 40;
const DWELL_REQ = 20;

/* ===== DODANE: stabilizacja sterowania ===== */
const SMOOTHING = 0.7;
const DEADZONE_X = 0.015;
const DEADZONE_Y_UP = 0.06;
const DEADZONE_Y_DOWN = 0.10;

let neutral = null;
let smoothNose = { x: 0, y: 0 };

/* ================= AUDIO ALARM ================= */
function playAlarm() {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.5);
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1);
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 1);
}

/* ================= INICJALIZACJA POTRZEB ================= */
function initNeeds() {
    const grid = document.getElementById('needs-grid');
    if(!grid) return;
    grid.innerHTML = '';
    needs.forEach((n, i) => {
        const d = document.createElement('div');
        d.className = 'need-item';
        d.id = `n-${i}`;
        d.innerHTML = `<div style="font-size:2.5rem">${n.i}</div>${n.t}`;
        grid.appendChild(d);
    });
}
initNeeds();

function highlightNeed() {
    document.querySelectorAll('.need-item').forEach(e => e.classList.remove('active'));
    const el = document.getElementById(`n-${state.needIdx}`);
    if (el) el.classList.add('active');
}

function setView(v) {
    document.querySelectorAll('.view').forEach(e => e.classList.remove('active'));
    const targetView = document.getElementById(`view-${v}`);
    if(targetView) targetView.classList.add('active');

    state.view = v;
    state.dwell = 0;
    state.dir = 'center';
    state.entryTime = 0;
    alphaTimer = 0;

    document.querySelectorAll('.progress').forEach(b => b.style.width = '0%');
    if (v === 'needs') highlightNeed();
}

function execute(dir) {
    if (state.view === 'menu') {
        if (dir === 'up') {
            document.getElementById('final-output').innerText = "!!! ALARM !!!";
            playAlarm();
        }
        if (dir === 'left') setView('alpha');
        if (dir === 'right') setView('needs');
    }
    else if (state.view === 'alpha') {
        if (dir === 'up') return setView('menu');
        if (dir === 'left') state.sentence += letters[state.alphaIdx];
        if (dir === 'right') state.sentence = state.sentence.slice(0, -1);
        if (dir === 'down') {
            document.getElementById('final-output').innerText = state.sentence;
            state.sentence = "";
            setView('menu');
        }
    }
    else if (state.view === 'needs') {
        if (dir === 'up') setView('menu');
        if (dir === 'left') {
            document.getElementById('final-output').innerText =
                "POTRZEBA: " + needs[state.needIdx].t;
            setView('menu');
        }
    }
}

/* ================= FACE MESH & CAMERA ================= */
const video = document.getElementById('video');
const canvas = document.getElementById('cameraCanvas');
const ctx = canvas.getContext('2d');

const faceMesh = new FaceMesh({
    locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`
});

faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5
});

faceMesh.onResults(res => {
    if (!res.image) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(res.image, 0, 0, canvas.width, canvas.height);

    if (!res.multiFaceLandmarks || res.multiFaceLandmarks.length === 0) return;

    const lm = res.multiFaceLandmarks[0];
    const nose = lm[1];

    // ===== SMOOTHING =====
    smoothNose.x = smoothNose.x * SMOOTHING + nose.x * (1 - SMOOTHING);
    smoothNose.y = smoothNose.y * SMOOTHING + nose.y * (1 - SMOOTHING);

    // ===== POZYCJA ZERO =====
    if (!neutral) {
        neutral = { x: smoothNose.x, y: smoothNose.y };
    }

    const dx = smoothNose.x - neutral.x;
    const dy = smoothNose.y - neutral.y;

    let move = 'center';

    // ===== MARTWA STREFA =====
    if (dy < -DEADZONE_Y_UP) move = 'up';
    else if (dy > DEADZONE_Y_DOWN) move = 'down';
    else if (dx > DEADZONE_X) move = 'left';
    else if (dx < -DEADZONE_X) move = 'right';

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

    drawOverlay(neutral, smoothNose);
    updateUI(move);
});

function updateUI(move) {
    const p = (state.dwell / DWELL_REQ) * 100;
    document.querySelectorAll('.progress:not(.auto-progress-bar)')
        .forEach(b => b.style.width = '0%');

    const bar = document.getElementById(`bar-${move}-${state.view}`);
    if (bar) bar.style.width = p + '%';

    if (state.view === 'alpha') {
        document.getElementById('cur-let').innerText = letters[state.alphaIdx];
        document.getElementById('sentence').innerText = state.sentence || "---";
        const autoBarAlpha = document.getElementById('auto-letter-bar-alpha');
        if (autoBarAlpha)
            autoBarAlpha.style.width =
                state.entryTime < START_DELAY ? '0%' :
                (alphaTimer / CHANGE_TIME_ALPHA) * 100 + '%';
    }

    if (state.view === 'needs') {
        const autoBarNeeds = document.getElementById('auto-letter-bar-needs');
        if (autoBarNeeds)
            autoBarNeeds.style.width =
                state.entryTime < START_DELAY ? '0%' :
                (alphaTimer / CHANGE_TIME_NEEDS) * 100 + '%';
    }
}

/* ================= GŁÓWNY TIMER ================= */
setInterval(() => {
    if (state.view !== 'alpha' && state.view !== 'needs') return;
    if (state.entryTime < START_DELAY) {
        state.entryTime++;
        return;
    }
    if (state.dir !== 'center') return;

    alphaTimer++;
    const limit = state.view === 'alpha'
        ? CHANGE_TIME_ALPHA
        : CHANGE_TIME_NEEDS;

    if (alphaTimer >= limit) {
        alphaTimer = 0;
        if (state.view === 'alpha')
            state.alphaIdx = (state.alphaIdx + 1) % letters.length;
        if (state.view === 'needs') {
            state.needIdx = (state.needIdx + 1) % needs.length;
            highlightNeed();
        }
    }
}, 100);

/* ================= OVERLAY NA KAMERZE ================= */
function drawOverlay(neutral, nose) {
    if (!neutral) return;

    const cx = neutral.x * canvas.width;
    const cy = neutral.y * canvas.height;
    const nx = nose.x * canvas.width;
    const ny = nose.y * canvas.height;

    ctx.strokeStyle = 'rgba(56,189,248,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(239,68,68,0.8)';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(nx, ny);
    ctx.stroke();
}

/* ================= START KAMERY ================= */
const camera = new Camera(video, {
    onFrame: async () => {
        await faceMesh.send({ image: video });
    },
    width: 640,
    height: 480
});
camera.start();
