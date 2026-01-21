/* =====================================================
   STREFY (LOGICZNE + ESTETYCZNE)
===================================================== */
const ZONE = {
    LEFT: 0.33,
    RIGHT: 0.67,
    UP1: 0.46,
    UP2: 0.32
};

const DWELL_REQ = 20;

/* =====================================================
   DANE
===================================================== */
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
    needIdx: 0
};

/* =====================================================
   ALARM
===================================================== */
function playAlarm() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.value = 880;
    gain.gain.value = 0.15;

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 1);
}

/* =====================================================
   POTRZEBY
===================================================== */
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

function highlightNeed() {
    document.querySelectorAll('.need-item').forEach(e => e.classList.remove('active'));
    document.getElementById(`n-${state.needIdx}`)?.classList.add('active');
}

/* =====================================================
   WIDOKI
===================================================== */
function setView(v) {
    document.querySelectorAll('.view').forEach(e => e.classList.remove('active'));
    document.getElementById(`view-${v}`).classList.add('active');
    state.view = v;
    state.dir = 'center';
    state.dwell = 0;
    clearBars();
    if (v === 'needs') highlightNeed();
}

/* =====================================================
   AKCJE
===================================================== */
function execute(dir) {

    if (state.view === 'menu') {
        if (dir === 'left') setView('alpha');
        if (dir === 'right') setView('needs');
        if (dir === 'up2') {
            document.getElementById('final-output').innerText = "!!! ALARM !!!";
            playAlarm();
        }
    }

    else if (state.view === 'alpha') {
        if (dir === 'left') state.sentence += letters[state.alphaIdx];
        if (dir === 'right') state.sentence = state.sentence.slice(0, -1);
        if (dir === 'up1') state.alphaIdx = (state.alphaIdx + 1) % letters.length;
        if (dir === 'up2') setView('menu');

        document.getElementById('cur-let').innerText = letters[state.alphaIdx];
        document.getElementById('sentence').innerText = state.sentence || "---";
    }

    else if (state.view === 'needs') {
        if (dir === 'left') {
            document.getElementById('final-output').innerText =
                "POTRZEBA: " + needs[state.needIdx].t;
            setView('menu');
        }
        if (dir === 'right') {
            state.needIdx = (state.needIdx + needs.length - 1) % needs.length;
            highlightNeed();
        }
        if (dir === 'up1') {
            state.needIdx = (state.needIdx + 1) % needs.length;
            highlightNeed();
        }
        if (dir === 'up2') setView('menu');
    }
}

/* =====================================================
   FACE MESH
===================================================== */
const video = document.getElementById('video');
const canvas = document.getElementById('cameraCanvas');
const ctx = canvas.getContext('2d');

const faceMesh = new FaceMesh({
    locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`
});

faceMesh.setOptions({ maxNumFaces: 1 });

faceMesh.onResults(res => {
    if (!res.image || !res.multiFaceLandmarks?.length) return;

    ctx.drawImage(res.image, 0, 0, canvas.width, canvas.height);

    const nose = res.multiFaceLandmarks[0][1];

    const nx = 1 - nose.x; // logika lustrzana
    const ny = nose.y;

    let zone = 'center';

    if (nx < ZONE.LEFT) zone = 'left';
    else if (nx > ZONE.RIGHT) zone = 'right';
    else if (ny < ZONE.UP2) zone = 'up2';
    else if (ny < ZONE.UP1) zone = 'up1';

    if (zone === state.dir && zone !== 'center') {
        state.dwell++;
    } else {
        state.dwell = 0;
        state.dir = zone;
    }

    if (state.dwell >= DWELL_REQ) {
        execute(zone);
        state.dwell = 0;
    }

    drawZones();
    drawNose(nose.x, nose.y); // ✅ POPRAWIONA KROPKA
    updateBars(zone);
});

/* =====================================================
   PASKI POSTĘPU – DODANE, NIC NIE USUNIĘTE
===================================================== */
function clearBars() {
    document.querySelectorAll('.progress, .auto-progress-bar')
        .forEach(b => b.style.width = '0%');
}

function updateBars(dir) {
    clearBars();

    const bar = document.getElementById(`bar-${dir}-${state.view}`);
    if (bar) bar.style.width = (state.dwell / DWELL_REQ * 100) + '%';

    if (state.view === 'alpha' && dir === 'up1') {
        document.getElementById('auto-letter-bar-alpha').style.width =
            (state.dwell / DWELL_REQ * 100) + '%';
    }

    if (state.view === 'needs' && (dir === 'up1' || dir === 'right')) {
        document.getElementById('auto-letter-bar-needs').style.width =
            (state.dwell / DWELL_REQ * 100) + '%';
    }
}

/* =====================================================
   ESTETYCZNE STREFY
===================================================== */
function drawZones() {

    ctx.fillStyle = 'rgba(34,197,94,0.15)';
    ctx.fillRect(0, 0, canvas.width * ZONE.LEFT, canvas.height);

    ctx.fillStyle = 'rgba(249,115,22,0.15)';
    ctx.fillRect(canvas.width * ZONE.RIGHT, 0,
        canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(56,189,248,0.18)';
    ctx.fillRect(0, 0, canvas.width, canvas.height * ZONE.UP1);

    ctx.fillStyle = 'rgba(239,68,68,0.22)';
    ctx.fillRect(0, 0, canvas.width, canvas.height * ZONE.UP2);

    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
}

function drawNose(x, y) {
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(x * canvas.width, y * canvas.height, 6, 0, Math.PI * 2);
    ctx.fill();
}

/* =====================================================
   KAMERA
===================================================== */
const camera = new Camera(video, {
    onFrame: async () => await faceMesh.send({ image: video }),
    width: 640,
    height: 480
});
camera.start();
