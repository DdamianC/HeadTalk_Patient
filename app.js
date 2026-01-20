const letters = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ "];
const needs = [
    {n: "Woda", i: "💧"}, {n: "Jedzenie", i: "🍽️"}, {n: "Leki", i: "💊"}, {n: "Ból", i: "😫"},
    {n: "Zimno", i: "❄️"}, {n: "Ciepło", i: "🔥"}, {n: "Toaleta", i: "🚽"}, {n: "Pomoc", i: "🆘"},
    {n: "Pozycja", i: "🛏️"}, {n: "Sen", i: "😴"}, {n: "Duszność", i: "🫁"}, {n: "Inne", i: "❓"}
];

let state = {
    view: "menu",
    sentence: "",
    letterIdx: 0,
    needIdx: 0,
    dwell: 0,
    currentDir: "center",
    lastActionTime: 0
};

const DWELL_THRESHOLD = 25; // ile klatek trzymać głowę

// Inicjalizacja Potrzeb
const needsGrid = document.getElementById('needs-grid');
needs.forEach((need, idx) => {
    const div = document.createElement('div');
    div.className = 'need-item';
    div.id = `need-${idx}`;
    div.innerHTML = `<span style="font-size:2rem">${need.i}</span><span>${need.n}</span>`;
    needsGrid.appendChild(div);
});

// Pętla automatyczna (skanowanie)
setInterval(() => {
    if (state.view === "alphabet") {
        state.letterIdx = (state.letterIdx + 1) % letters.length;
        document.getElementById('current-letter').innerText = letters[state.letterIdx];
    } else if (state.view === "needs") {
        document.querySelectorAll('.need-item').forEach(el => el.classList.remove('highlight'));
        state.needIdx = (state.needIdx + 1) % needs.length;
        document.getElementById(`need-${state.needIdx}`).classList.add('highlight');
    }
}, 3000); // Zmiana co 3 sekundy

function handleAction(dir) {
    const now = Date.now();
    if (now - state.lastActionTime < 1000) return; // Debounce

    if (state.view === "menu") {
        if (dir === "left") switchView("alphabet");
        if (dir === "right") switchView("needs");
        if (dir === "up") alert("⚠️ ALARM WYSŁANY!");
    } 
    else if (state.view === "alphabet") {
        if (dir === "left") {
            state.sentence += letters[state.letterIdx];
            updateSentence();
        }
        if (dir === "right") {
            state.sentence = state.sentence.slice(0, -1);
            updateSentence();
        }
        if (dir === "up") switchView("menu");
        if (dir === "down") { alert("Wysłano: " + state.sentence); switchView("menu"); }
    }
    else if (state.view === "needs") {
        if (dir === "left") {
            state.sentence = "Potrzebuję: " + needs[state.needIdx].n;
            alert(state.sentence);
        }
        if (dir === "up") switchView("menu");
        if (dir === "down") switchView("menu");
    }

    state.lastActionTime = now;
}

function switchView(v) {
    document.getElementById('menu-section').className = 'hidden';
    document.getElementById('alphabet-section').className = 'hidden';
    document.getElementById('needs-section').className = 'hidden';
    
    state.view = v;
    document.getElementById(`${v}-section`).className = 'active-view';
    if(v === 'menu') state.sentence = "";
}

function updateSentence() {
    document.getElementById('display-sentence').innerText = state.sentence || "Wpisz tekst...";
}

// MediaPipe Setup
const faceMesh = new FaceMesh({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`});
faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5 });

faceMesh.onResults(results => {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
        document.getElementById('status-dot').style.backgroundColor = 'red';
        return;
    }
    document.getElementById('status-dot').style.backgroundColor = '#2ecc71';
    
    const landmarks = results.multiFaceLandmarks[0];
    // Prosta detekcja wychylenia (nos względem uszu)
    const nose = landmarks[1];
    const leftEar = landmarks[234];
    const rightEar = landmarks[454];
    const topHead = landmarks[10];
    const chin = landmarks[152];

    let dir = "center";
    const horizontalRatio = (nose.x - leftEar.x) / (rightEar.x - leftEar.x);
    const verticalRatio = (nose.y - topHead.y) / (chin.y - topHead.y);

    if (horizontalRatio < 0.4) dir = "right"; // Lustrzane odbicie kamery
    else if (horizontalRatio > 0.6) dir = "left";
    else if (verticalRatio < 0.45) dir = "up";
    else if (verticalRatio > 0.65) dir = "down";

    if (dir !== "center" && dir === state.currentDir) {
        state.dwell++;
        updateFills(state.dwell / DWELL_THRESHOLD * 100);
    } else {
        state.dwell = 0;
        state.currentDir = dir;
        updateFills(0);
    }

    if (state.dwell >= DWELL_THRESHOLD) {
        handleAction(dir);
        state.dwell = 0;
    }
});

function updateFills(percent) {
    document.querySelectorAll('.fill').forEach(f => f.style.width = '0%');
    if (state.view === "menu") {
        if (state.currentDir === "left") document.querySelector('#tile-alphabet .fill').style.width = percent + '%';
        if (state.currentDir === "right") document.querySelector('#tile-needs .fill').style.width = percent + '%';
        if (state.currentDir === "up") document.querySelector('#tile-alarm .fill').style.width = percent + '%';
    }
}

const videoElement = document.getElementById('video');
const camera = new Camera(videoElement, {
    onFrame: async () => { await faceMesh.send({image: videoElement}); },
    width: 640, height: 480
});
camera.start();
