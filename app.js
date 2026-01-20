const letters = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ", " ", "<-"];

const needs = [
    {t: "Picie", i: "💧"}, {t: "Jedzenie", i: "🍎"}, {t: "Leki", i: "💊"},
    {t: "Ból", i: "😫"}, {t: "Zimno", i: "❄️"}, {t: "Pomoc", i: "🆘"},
    {t: "TV", i: "📺"}, {t: "Toaleta", i: "🚻"},
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

let autoTimer = 0;

const START_DELAY = 60;
const CHANGE_TIME = 30; // szybciej dla potrzeb
const DWELL_REQ = 25;

/* ================== POTRZEBY ================== */

function initNeeds() {
    const g = document.getElementById('needs-grid');
    g.innerHTML = '';
    needs.forEach((n, i) => {
        const d = document.createElement('div');
        d.className = 'need-item';
        d.id = `n-${i}`;
        d.innerHTML = `<div style="font-size:2.5rem">${n.i}</div>${n.t}`;
        g.appendChild(d);
    });
}
initNeeds();

/* ================== AKCJE ================== */

function execute(dir) {
    if (state.view === 'menu') {
        if (dir === 'left') setView('alpha');
        if (dir === 'right') setView('needs');
        if (dir === 'up') playAlarm();
    }

    else if (state.view === 'alpha') {
        if (dir === 'up') setView('menu');
        if (dir === 'left') state.sentence += letters[state.alphaIdx];
        if (dir === 'right') state.sentence = state.sentence.slice(0, -1);
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

/* ================== WIDOK ================== */

function setView(v) {
    document.querySelectorAll('.view').forEach(e => e.classList.remove('active'));
    document.getElementById(`view-${v}`).classList.add('active');

    state.view = v;
    state.dwell = 0;
    state.dir = 'center';
    state.entryTime = 0;
    autoTimer = 0;

    if (v === 'needs') highlightNeed();
}

/* ================== FACE ================== */

const faceMesh = new FaceMesh({
    locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`
});

faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5
});

faceMesh.onResults(res => {
    const canvas = document.getElementById('cameraCanvas');
    const ctx = canvas.getContext('2d');

    canvas.width = 640;
    canvas.height = 480;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(-1, 1);
    ctx.translate(-canvas.width, 0);
    ctx.drawImage(res.image, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    if (!res.multiFaceLandmarks?.length) return;

    const lm = res.multiFaceLandmarks[0];
    const leftEye = lm[33];
    const rightEye = lm[263];
    const nose = lm[1];
    const forehead = lm[10];

    let move = 'center';

    const eyeDiff = rightEye.y - leftEye.y; // ✔ poprawny kierunek

    if (nose.y < forehead.y + 0.08) move = 'up';
    else if (nose.y > forehead.y + 0.19) move = 'down';
    else if (eyeDiff > 0.045) move = 'left';
    else if (eyeDiff < -0.045) move = 'right';

    if (move === state.dir && move !== 'center') state.dwell++;
    else {
        state.dir = move;
        state.dwell = 0;
    }

    if (state.dwell >= DWELL_REQ) {
        execute(move);
        state.dwell = 0;
    }

    updateUI(move);
});

/* ================== UI ================== */

function updateUI(move) {
    document.querySelectorAll('.progress').forEach(p => p.style.width = '0%');
    const p = (state.dwell / DWELL_REQ) * 100;
    const bar = document.getElementById(`bar-${move}-${state.view}`);
    if (bar) bar.style.width = p + '%';

    if (state.view === 'alpha') {
        document.getElementById('cur-let').innerText = letters[state.alphaIdx];
        document.getElementById('sentence').innerText = state.sentence || "---";
    }
}

/* ================== AUTO LOOP ================== */

setInterval(() => {
    if (!['alpha', 'needs'].includes(state.view)) return;

    if (state.entryTime < START_DELAY) {
        state.entryTime++;
        return;
    }

    autoTimer++;

    if (autoTimer >= CHANGE_TIME) {
        autoTimer = 0;

        if (state.view === 'alpha') {
            state.alphaIdx = (state.alphaIdx + 1) % letters.length;
        }

        if (state.view === 'needs') {
            state.needIdx = (state.needIdx + 1) % needs.length;
            highlightNeed();
        }
    }
}, 100);

/* ================== HELPERS ================== */

function highlightNeed() {
    document.querySelectorAll('.need-item').forEach(e => e.classList.remove('active'));
    document.getElementById(`n-${state.needIdx}`)?.classList.add('active');
}

function playAlarm() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square';
    o.frequency.value = 900;
    g.gain.value = 0.3;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.8);
}

/* ================== CAMERA ================== */

const cam = new Camera(video, {
    onFrame: async () => await faceMesh.send({ image: video }),
    width: 640,
    height: 480
});
cam.start();
