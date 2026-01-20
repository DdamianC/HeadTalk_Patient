const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ ";
const needs = [
    {t: "Jedzenie", i: "🍎"}, {t: "Picie", i: "💧"}, {t: "Leki", i: "💊"}, {t: "Ból", i: "😫"},
    {t: "Zimno", i: "❄️"}, {t: "Ciepło", i: "🔥"}, {t: "Pomoc", i: "🆘"}, {t: "Toaleta", i: "🚽"}
];

let appState = {
    view: 'menu',
    txt: '',
    alphaIdx: 0,
    needIdx: 0,
    dwell: 0,
    currentMove: 'center'
};

// Renderowanie potrzeb
const grid = document.getElementById('needs-grid');
needs.forEach((n, i) => {
    const div = document.createElement('div');
    div.className = 'need-box';
    div.id = `need-${i}`;
    div.innerHTML = `<span style="font-size:3rem">${n.i}</span><br>${n.t}`;
    grid.appendChild(div);
});

// Skanowanie automatyczne
setInterval(() => {
    if(appState.view === 'alphabet') {
        appState.alphaIdx = (appState.alphaIdx + 1) % alphabet.length;
        document.getElementById('active-letter').innerText = alphabet[appState.alphaIdx];
    } else if(appState.view === 'needs') {
        document.querySelectorAll('.need-box').forEach(b => b.classList.remove('active'));
        appState.needIdx = (appState.needIdx + 1) % needs.length;
        document.getElementById(`need-${appState.needIdx}`).classList.add('active');
    }
}, 3000);

function changeView(v) {
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    document.getElementById(`view-${v}`).classList.add('active');
    document.getElementById('current-view-label').innerText = v.toUpperCase();
    appState.view = v;
}

// Obsługa gestów
function trigger(dir) {
    if(appState.view === 'menu') {
        if(dir === 'left') changeView('alphabet');
        if(dir === 'right') changeView('needs');
        if(dir === 'up') alert("ALARM!");
    } else {
        if(dir === 'up' || dir === 'down') changeView('menu');
        if(dir === 'left' && appState.view === 'alphabet') {
            appState.txt += alphabet[appState.alphaIdx];
            document.getElementById('sentence').innerText = appState.txt;
        }
    }
}

// MediaPipe
const faceMesh = new FaceMesh({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`});
faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5 });

faceMesh.onResults(res => {
    if (!res.multiFaceLandmarks || res.multiFaceLandmarks.length === 0) return;
    const pts = res.multiFaceLandmarks[0];
    const nose = pts[1];
    
    let move = 'center';
    if(nose.x < 0.4) move = 'right';
    else if(nose.x > 0.6) move = 'left';
    else if(nose.y < 0.4) move = 'up';
    else if(nose.y > 0.6) move = 'down';

    if(move !== 'center' && move === appState.currentMove) {
        appState.dwell++;
        const pct = (appState.dwell / 20) * 100;
        document.querySelectorAll('.loader').forEach(l => l.style.width = pct + '%');
    } else {
        appState.dwell = 0;
        appState.currentMove = move;
        document.querySelectorAll('.loader').forEach(l => l.style.width = '0%');
    }

    if(appState.dwell > 20) {
        trigger(move);
        appState.dwell = 0;
    }
});

const cam = new Camera(document.getElementById('video'), {
    onFrame: async () => { await faceMesh.send({image: document.getElementById('video')}); }
});
cam.start().catch(e => console.log("Błąd kamery: ", e));
