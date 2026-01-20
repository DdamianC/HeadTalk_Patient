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
const CHANGE_TIME = 40;
const DWELL_REQ = 25;

/* ================= NEEDS INIT ================= */

function initNeeds() {
    const grid = document.getElementById('needs-grid');
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

/* ================= VIEW ================= */

function setView(v) {
    document.querySelectorAll('.view').forEach(e => e.classList.remove('active'));
    document.getElementById(`view-${v}`).classList.add('active');

    state.view = v;
    state.dwell = 0;
    state.dir = 'center';
    state.entryTime = 0;
    alphaTimer = 0;

    document.querySelectorAll('.progress').forEach(b => b.style.width = '0%');

    if (v === 'needs') highlightNeed();
}

/* ================= EXECUTE ================= */

function execute(dir) {
    if (state.view === 'menu') {
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

/* ================= CAMERA ================= */

const video = document.getElementById('video');
const canvas = document.getElementById('cameraCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 320;
canvas.height = 240;

/* ================= FACE MESH ================= */

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

    /* ✅ OBRAZ 1:1 – BEZ LUSTRZANIA */
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(res.image, 0, 0, canvas.width, canvas.height);

    if (!res.multiFaceLandmarks || res.multiFaceLandmarks.length === 0) return;

    const lm = res.multiFaceLandmarks[0];
    const leftEye = lm[33];
    const rightEye = lm[263];
    const nose = lm[1];
    const forehead = lm[10];

    let move = 'center';

    const eyeDiffY = leftEye.y - rightEye.y;

    if (nose.y < forehead.y + 0.08) {
        move = 'up';
    } else if (nose.y > forehead.y + 0.19) {
        move = 'down';
    } else if (eyeDiffY > 0.045) {
        // Zmieniono z 'right' na 'left'
        move = 'left';
    } else if (eyeDiffY < -0.045) {
        // Zmieniono z 'left' na 'right'
        move = 'right';
    }

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

/* ================= UI ================= */

function updateUI(move) {
    const p = (state.dwell / DWELL_REQ) * 100;
    document.querySelectorAll('.progress:not(.auto-progress-bar)')
        .forEach(b => b.style.width = '0%');

    const bar = document.getElementById(`bar-${move}-${state.view}`);
    if (bar) bar.style.width = p + '%';

    if (state.view === 'alpha') {
        document.getElementById('cur-let').innerText = letters[state.alphaIdx];
        document.getElementById('sentence').innerText = state.sentence || "---";

        const autoBar = document.getElementById('auto-letter-bar');
        autoBar.style.width =
            state.entryTime < START_DELAY ? '0%' :
            (alphaTimer / CHANGE_TIME) * 100 + '%';
    }
}

/* ================= NEEDS ================= */

function highlightNeed() {
    document.querySelectorAll('.need-item').forEach(e => e.classList.remove('active'));
    const el = document.getElementById(`n-${state.needIdx}`);
    if (el) el.classList.add('active');
}

/* ================= TIMER ================= */

setInterval(() => {
    if (state.view !== 'alpha' && state.view !== 'needs') return;

    if (state.entryTime < START_DELAY) {
        state.entryTime++;
        return;
    }

    if (state.dir !== 'center') return;

    alphaTimer++;

    if (alphaTimer >= CHANGE_TIME) {
        alphaTimer = 0;

        if (state.view === 'alpha') {
            state.alphaIdx = (state.alphaIdx + 1) % letters.length;
        }

        if (state.view === 'needs') {
            state.needIdx = (state.needIdx + 1) % needs.length;
            highlightNeed();
        }
    }
}, 100);

/* ================= CAMERA START ================= */

const cam = new Camera(video, {
    onFrame: async () => {
        await faceMesh.send({ image: video });
    },
    width: 640,
    height: 480
});

cam.start();
