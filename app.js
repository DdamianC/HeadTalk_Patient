/* ======================================================
   STREFY (SKORYGOWANE)
====================================================== */
const ZONE = {
    LEFT: 0.35,
    RIGHT: 0.65,
    UP1: 0.45,
    UP2: 0.32
};

const DWELL_REQ = 20;

/* ======================================================
   DANE
====================================================== */
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

/* ======================================================
   ALARM
===================================================== */
function playAlarm() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.value = 880;

    gain.gain.value = 0.1;

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 1);
}

/* ======================================================
   POTRZEBY
====================================================== */
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
    document.getElementById(`n-${state.needIdx}`)?.classList.add('active');
}

/* ======================================================
   WIDOKI
====================================================== */
function setView(v) {
    document.querySelectorAll('.view').forEach(e => e.classList.remove('active'));
    const targetView = document.getElementById(`view-${v}`);
    if(targetView) targetView.classList.add('active');
    
    state.view = v;
    state.dir = 'center';
    state.dwell = 0;
    
    // Resetuj wszystkie paski przy zmianie widoku
    document.querySelectorAll('.progress').forEach(b => b.style.width = '0%');
    
    if (v === 'needs') highlightNeed();
}

/* ======================================================
   AKCJE (POPRAWIONA LOGIKA STRON)
====================================================== */
function execute(dir) {
    /* MENU */
    if (state.view === 'menu') {
        if (dir === 'right') setView('needs'); // Ruch w prawo -> Potrzeby
        if (dir === 'left') setView('alpha');  // Ruch w lewo -> Alfabet
        if (dir === 'up2') {
            document.getElementById('final-output').innerText = "!!! ALARM !!!";
            playAlarm();
        }
    }

    /* ALFABET */
    else if (state.view === 'alpha') {
        if (dir === 'right') state.sentence += letters[state.alphaIdx]; // Prawa dodaje
        if (dir === 'left') state.sentence = state.sentence.slice(0, -1); // Lewa usuwa
        if (dir === 'up1') state.alphaIdx = (state.alphaIdx + 1) % letters.length;
        if (dir === 'up2') setView('menu');

        document.getElementById('cur-let').innerText = letters[state.alphaIdx];
        document.getElementById('sentence').innerText = state.sentence || "---";
    }

    /* POTRZEBY */
    else if (state.view === 'needs') {
        if (dir === 'right') { // Prawa wybiera potrzebę
            document.getElementById('final-output').innerText =
                "POTRZEBA: " + needs[state.needIdx].t;
            setView('menu');
        }
        if (dir === 'up1') {
            state.needIdx = (state.needIdx + 1) % needs.length;
            highlightNeed();
        }
        if (dir === 'up2') setView('menu');
    }
}

/* ======================================================
   FACE MESH
====================================================== */
const video = document.getElementById('video');
const canvas = document.getElementById('cameraCanvas');
const ctx = canvas.getContext('2d');

const faceMesh = new FaceMesh({
    locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`
});

faceMesh.setOptions({ maxNumFaces: 1 });

faceMesh.onResults(res => {
    if (!res.image || !res.multiFaceLandmarks?.length) return;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Rysowanie lustrzanego odbicia wideo
    ctx.scale(-1, 1);
    ctx.translate(-canvas.width, 0);
    ctx.drawImage(res.image, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    const nose = res.multiFaceLandmarks[0][1];

    /* LOGIKA STEROWANIA (Zsynchronizowana z widokiem użytkownika) */
    const nx = nose.x; // Bez odwracania nx, bo rysujemy lustrzanie
    const ny = nose.y;

    let zone = 'center';

    // Progi dopasowane do lustrzanego odbicia (Ruch w prawo użytkownika = mniejsze X na sensorze)
    if (nx > ZONE.RIGHT) zone = 'left';
    else if (nx < ZONE.LEFT) zone = 'right';
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
    // Nos rysujemy na nx,ny (Mediapipe używa 0-1)
    drawNose(nx, ny);
    updateBars(zone);
});

/* ======================================================
   PASKI POSTĘPU (POPRAWIONE WYŚWIETLANIE)
====================================================== */
function updateBars(dir) {
    // Ukryj wszystkie paski postępu
    document.querySelectorAll('.progress').forEach(b => b.style.width = '0%');

    if (dir === 'center') return;

    // Szukaj paska w aktualnym widoku
    const currentViewEl = document.getElementById(`view-${state.view}`);
    if (currentViewEl) {
        const bar = currentViewEl.querySelector(`.progress-bar-${dir} .progress`);
        if (bar) {
            bar.style.width = (state.dwell / DWELL_REQ * 100) + '%';
        }
    }
    
    // Specjalna obsługa paska Alarmu (zawsze dostępny w menu jako UP2)
    if (state.view === 'menu' && dir === 'up2') {
        const alarmBar = document.querySelector('.progress-bar-up2 .progress');
        if (alarmBar) alarmBar.style.width = (state.dwell / DWELL_REQ * 100) + '%';
    }
}

/* ======================================================
   RYSOWANIE STREF (ESTETYCZNE - KOLOROWE)
====================================================== */
function drawZones() {
    ctx.lineWidth = 3;

    // Strefa GÓRNA 2 (ALARM/MENU - Czerwona)
    ctx.fillStyle = 'rgba(255, 0, 0, 0.15)';
    ctx.fillRect(0, 0, canvas.width, canvas.height * ZONE.UP2);
    
    // Strefa LEWA (Zielona)
    ctx.fillStyle = 'rgba(0, 255, 0, 0.15)';
    ctx.fillRect(canvas.width * ZONE.RIGHT, canvas.height * ZONE.UP1, canvas.width * (1-ZONE.RIGHT), canvas.height);

    // Strefa PRAWA (Brązowa/Pomarańczowa)
    ctx.fillStyle = 'rgba(139, 69, 19, 0.15)';
    ctx.fillRect(0, canvas.height * ZONE.UP1, canvas.width * ZONE.LEFT, canvas.height);

    // Linie siatki
    ctx.strokeStyle = 'white';
    ctx.setLineDash([5, 5]);
    
    [ZONE.LEFT, ZONE.RIGHT].forEach(x => {
        ctx.beginPath();
        ctx.moveTo(canvas.width * x, 0);
        ctx.lineTo(canvas.width * x, canvas.height);
        ctx.stroke();
    });

    [ZONE.UP1, ZONE.UP2].forEach(y => {
        ctx.beginPath();
        ctx.moveTo(0, canvas.height * y);
        ctx.lineTo(canvas.width, canvas.height * y);
        ctx.stroke();
    });
    ctx.setLineDash([]);
}

function drawNose(x, y) {
    // Odwracamy X tylko do rysowania kropki, by trafiała w nos na lustrzanym odbiciu
    const drawX = (1 - x) * canvas.width;
    const drawY = y * canvas.height;
    
    ctx.fillStyle = 'red';
    ctx.shadowBlur = 10;
    ctx.shadowColor = "red";
    ctx.beginPath();
    ctx.arc(drawX, drawY, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
}

/* ======================================================
   KAMERA
====================================================== */
const camera = new Camera(video, {
    onFrame: async () => await faceMesh.send({ image: video }),
    width: 640,
    height: 480
});
camera.start();
