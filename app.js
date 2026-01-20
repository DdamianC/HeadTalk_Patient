const letters = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ "];
const needsItems = [
    {n: "Jedzenie", i: "🍎"}, {n: "Picie", i: "💧"}, {n: "Leki", i: "💊"}, {n: "Ból", i: "😫"},
    {n: "Zimno", i: "❄️"}, {n: "Ciepło", i: "🔥"}, {n: "Pomoc", i: "🆘"}, {n: "Pozycja", i: "🛏️"},
    {n: "Toaleta", i: "🚽"}, {n: "Sen", i: "😴"}, {n: "Duszność", i: "🫁"}, {n: "Koniec", i: "🔚"}
];

let state = {
    view: 'menu',
    sentence: '',
    letterIdx: 0,
    needIdx: 0,
    dwell: 0,
    currentDir: 'center'
};

const DWELL_MAX = 25; // Szybkość reakcji

// Render potrzeb
const needsGrid = document.getElementById('needs-grid');
needsItems.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'need-tile';
    div.id = `need-${idx}`;
    div.innerHTML = `<span style="font-size:2rem">${item.i}</span><br>${item.n}`;
    needsGrid.appendChild(div);
});

// Pętla skanowania (co 4 sekundy)
setInterval(() => {
    if (state.view === 'alphabet') {
        state.letterIdx = (state.letterIdx + 1) % letters.length;
        document.getElementById('current-letter').innerText = letters[state.letterIdx];
    } else if (state.view === 'needs') {
        document.querySelectorAll('.need-tile').forEach(t => t.classList.remove('active'));
        state.needIdx = (state.needIdx + 1) % needsItems.length;
        document.getElementById(`need-${state.needIdx}`).classList.add('active');
    }
}, 4000);

function handleMove(dir) {
    if (state.view === 'menu') {
        if (dir === 'left') switchView('alphabet');
        if (dir === 'right') switchView('needs');
        if (dir === 'up') alert("WEZWANO POMOC!");
    } else if (state.view === 'alphabet') {
        if (dir === 'left') { state.sentence += letters[state.letterIdx]; updateSentence(); }
        if (dir === 'right') { state.sentence = state.sentence.slice(0, -1); updateSentence(); }
        if (dir === 'down') { alert("Wysłano wiadomość!"); switchView('menu'); }
        if (dir === 'up') switchView('menu');
    } else if (state.view === 'needs') {
        if (dir === 'left') { alert("Wybrano: " + needsItems[state.needIdx].n); }
        if (dir === 'right') { /* odznaczenie */ }
        if (dir === 'down') switchView('menu');
        if (dir === 'up') switchView('menu');
    }
}

function switchView(v) {
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    document.getElementById(`${v}-view`).classList.add('active');
    state.view = v;
}

function updateSentence() {
    document.getElementById('display-sentence').innerText = state.sentence || "Tu się tworzy zdanie";
}

// FaceMesh Logic (Skrócona)
const faceMesh = new FaceMesh({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`});
faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5 });

faceMesh.onResults(results => {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) return;
    
    const lm = results.multiFaceLandmarks[0];
    const nose = lm[1];
    const leftEar = lm[234];
    const rightEar = lm[454];

    let dir = 'center';
    const horizontalRatio = (nose.x - leftEar.x) / (rightEar.x - leftEar.x);
    
    if (horizontalRatio < 0.3) dir = 'right';
    else if (horizontalRatio > 0.7) dir = 'left';
    else if (nose.y < lm[10].y + 0.05) dir = 'up';
    else if (nose.y > lm[152].y - 0.1) dir = 'down';

    if (dir !== 'center' && dir === state.currentDir) {
        state.dwell++;
        updateFills(state.dwell / DWELL_MAX * 100);
    } else {
        state.dwell = 0;
        state.currentDir = dir;
        updateFills(0);
    }

    if (state.dwell >= DWELL_MAX) {
        handleMove(dir);
        state.dwell = 0;
    }
});

function updateFills(pct) {
    document.querySelectorAll('.fill-indicator').forEach(f => f.style.width = '0%');
    if (state.view === 'menu') {
        const id = state.currentDir === 'left' ? 'tile-alphabet' : (state.currentDir === 'right' ? 'tile-needs' : 'tile-alarm');
        const el = document.getElementById(id);
        if(el) el.querySelector('.fill-indicator').style.width = pct + '%';
    }
}

const cam = new Camera(document.getElementById('video'), {
    onFrame: async () => { await faceMesh.send({image: document.getElementById('video')}); },
    width: 640, height: 480
});
cam.start();
