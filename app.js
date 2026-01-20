const letters = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ "];
const needsData = [
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

const DWELL_REQ = 20; // Próg zatwierdzenia

// Generowanie kafelków potrzeb
const grid = document.getElementById('needs-grid');
needsData.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'need-item';
    div.id = `need-${idx}`;
    div.innerHTML = `<span style="font-size:2rem">${item.i}</span><br>${item.n}`;
    grid.appendChild(div);
});

// Automatyczne skanowanie (zmiana kafelka co 4 sekundy)
setInterval(() => {
    if (state.view === 'alphabet') {
        state.letterIdx = (state.letterIdx + 1) % letters.length;
        document.getElementById('current-letter').innerText = letters[state.letterIdx];
    } else if (state.view === 'needs') {
        document.querySelectorAll('.need-item').forEach(el => el.classList.remove('highlight'));
        state.needIdx = (state.needIdx + 1) % needsData.length;
        document.getElementById(`need-${state.needIdx}`).classList.add('highlight');
    }
}, 4000);

function handleAction(dir) {
    if (state.view === 'menu') {
        if (dir === 'left') switchView('alphabet');
        if (dir === 'right') switchView('needs');
        if (dir === 'up') alert("WEZWANO POMOC!");
    } 
    else if (state.view === 'alphabet') {
        if (dir === 'left') { state.sentence += letters[state.letterIdx]; updateSentence(); }
        if (dir === 'right') { state.sentence = state.sentence.slice(0, -1); updateSentence(); }
        if (dir === 'down') { /* Dodaj do głównego - np. logowanie */ switchView('menu'); }
        if (dir === 'up') switchView('menu');
    }
    else if (state.view === 'needs') {
        if (dir === 'left') { alert("Wybrano: " + needsData[state.needIdx].n); }
        if (dir === 'right') { /* odznaczenie */ }
        if (dir === 'down' || dir === 'up') switchView('menu');
    }
}

function switchView(v) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`${v}-view`).classList.add('active');
    document.getElementById('view-name').innerText = v.toUpperCase();
    state.view = v;
}

function updateSentence() {
    document.getElementById('display-sentence').innerText = state.sentence || "Tu się tworzy zdanie";
}

// Konfiguracja MediaPipe Face Mesh
const faceMesh = new FaceMesh({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`});
faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5 });

faceMesh.onResults(results => {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) return;
    
    const landmarks = results.multiFaceLandmarks[0];
    const nose = landmarks[1];
    const leftEar = landmarks[234];
    const rightEar = landmarks[454];

    let dir = 'center';
    const hRatio = (nose.x - leftEar.x) / (rightEar.x - leftEar.x);
    
    // Progi sterowania
    if (hRatio < 0.3) dir = 'right';
    else if (hRatio > 0.7) dir = 'left';
    else if (nose.y < landmarks[10].y + 0.05) dir = 'up';
    else if (nose.y > landmarks[152].y - 0.1) dir = 'down';

    if (dir !== 'center' && dir === state.currentDir) {
        state.dwell++;
        updateProgress(state.dwell / DWELL_REQ * 100);
    } else {
        state.dwell = 0;
        state.currentDir = dir;
        updateProgress(0);
    }

    if (state.dwell >= DWELL_REQ) {
        handleAction(dir);
        state.dwell = 0;
    }
});

function updateProgress(pct) {
    document.querySelectorAll('.progress-fill').forEach(f => f.style.width = '0%');
    if (state.view === 'menu') {
        let id = '';
        if (state.currentDir === 'left') id = 'tile-alphabet';
        else if (state.currentDir === 'right') id = 'tile-needs';
        else if (state.currentDir === 'up') id = 'tile-alarm';
        
        if (id) document.querySelector(`#${id} .progress-fill`).style.width = pct + '%';
    }
}

const camera = new Camera(document.getElementById('video'), {
    onFrame: async () => { await faceMesh.send({image: document.getElementById('video')}); },
    width: 640, height: 480
});
camera.start();
