const letters = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ "];
const needsItems = [
    {id: 1, label: "Picie", icon: "💧"}, {id: 2, label: "Jedzenie", icon: "🍽️"},
    {id: 3, label: "Leki", icon: "💊"}, {id: 4, label: "Ból", icon: "😫"},
    {id: 5, label: "Zimno", icon: "❄️"}, {id: 6, label: "Ciepło", icon: "🔥"},
    {id: 7, label: "Toaleta", icon: "🚽"}, {id: 8, label: "Pomoc", icon: "🆘"},
    {id: 9, label: "Pozycja", icon: "🛏️"}, {id: 10, label: "Sen", icon: "😴"},
    {id: 11, label: "Duszność", icon: "🫁"}, {id: 12, label: "Koniec", icon: "🔚"}
];

let appState = {
    currentView: 'menu',
    sentence: '',
    letterIndex: 0,
    needIndex: 0,
    dwellTime: 0,
    currentDir: 'center'
};

const DWELL_MAX = 30; // progi czasowe (klatki)

// Inicjalizacja potrzeb
const needsGrid = document.getElementById('needs-grid');
needsItems.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'need-card';
    div.id = `need-${idx}`;
    div.innerHTML = `<span style="font-size: 2.5rem">${item.icon}</span><br>${item.label}`;
    needsGrid.appendChild(div);
});

// Automatyczne skanowanie (co 4 sekundy dla potrzeb, co 2 dla liter)
setInterval(() => {
    if (appState.currentView === 'alphabet') {
        appState.letterIndex = (appState.letterIndex + 1) % letters.length;
        document.getElementById('current-letter').innerText = letters[appState.letterIndex];
    } else if (appState.currentView === 'needs') {
        document.querySelectorAll('.need-card').forEach(c => c.classList.remove('active'));
        appState.needIndex = (appState.needIndex + 1) % needsItems.length;
        document.getElementById(`need-${appState.needIndex}`).classList.add('active');
    }
}, 3000);

function handleDirection(dir) {
    if (appState.currentView === 'menu') {
        if (dir === 'left') changeView('alphabet');
        if (dir === 'right') changeView('needs');
        if (dir === 'up') alert("ALARM WYSŁANY!");
    } 
    else if (appState.currentView === 'alphabet') {
        if (dir === 'left') { appState.sentence += letters[appState.letterIndex]; updateSentence(); }
        if (dir === 'right') { appState.sentence = appState.sentence.slice(0, -1); updateSentence(); }
        if (dir === 'up') changeView('menu');
        if (dir === 'down') { alert("Wysłano: " + appState.sentence); changeView('menu'); }
    }
    else if (appState.currentView === 'needs') {
        if (dir === 'left') { alert("Potrzeba: " + needsItems[appState.needIndex].label); }
        if (dir === 'up') changeView('menu');
        if (dir === 'down') changeView('menu');
    }
}

function changeView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`${viewId}-view`).classList.add('active');
    appState.currentView = viewId;
    if(viewId === 'menu') appState.sentence = '';
}

function updateSentence() {
    document.getElementById('display-sentence').innerText = appState.sentence || "Zacznij pisać...";
}

// Face Mesh Setup
const faceMesh = new FaceMesh({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`});
faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5 });

faceMesh.onResults(results => {
    const dot = document.getElementById('status-dot');
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
        dot.classList.remove('active');
        return;
    }
    dot.classList.add('active');

    const lm = results.multiFaceLandmarks[0];
    const nose = lm[1];
    const leftEar = lm[234];
    const rightEar = lm[454];

    // Detekcja wychylenia
    let dir = 'center';
    const sensitivity = 0.05;
    const horizontalMove = (nose.x - leftEar.x) / (rightEar.x - leftEar.x);

    if (horizontalMove < 0.35) dir = 'right';
    else if (horizontalMove > 0.65) dir = 'left';
    else if (nose.y < lm[10].y + 0.02) dir = 'up'; // Uproszczone góra/dół
    else if (nose.y > lm[152].y - 0.15) dir = 'down';

    if (dir !== 'center' && dir === appState.currentDir) {
        appState.dwellTime++;
        updateProgressBars(appState.dwellTime / DWELL_MAX * 100);
    } else {
        appState.dwellTime = 0;
        appState.currentDir = dir;
        updateProgressBars(0);
    }

    if (appState.dwellTime >= DWELL_MAX) {
        handleDirection(dir);
        appState.dwellTime = 0;
    }
});

function updateProgressBars(val) {
    document.querySelectorAll('.progress-bar').forEach(b => b.style.width = '0%');
    if (appState.currentView === 'menu') {
        if (appState.currentDir === 'left') document.querySelector('#tile-alphabet .progress-bar').style.width = val + '%';
        if (appState.currentDir === 'right') document.querySelector('#tile-needs .progress-bar').style.width = val + '%';
        if (appState.currentDir === 'up') document.querySelector('#tile-alarm .progress-bar').style.width = val + '%';
    }
}

const camera = new Camera(document.getElementById('video'), {
    onFrame: async () => { await faceMesh.send({image: document.getElementById('video')}); },
    width: 640, height: 480
});
camera.start();
