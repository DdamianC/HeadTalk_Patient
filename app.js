const letters = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ", " ", "<-"];
const needs = [
    {t: "Picie", i: "💧"}, {t: "Jedzenie", i: "🍎"}, {t: "Leki", i: "💊"}, {t: "Ból", i: "😫"},
    {t: "Zimno", i: "❄️"}, {t: "Pomoc", i: "🆘"}, {t: "TV", i: "📺"}, {t: "Toaleta", i: "🚻"},
    {t: "Książka", i: "📖"}, {t: "Sen", i: "😴"}
];

let state = { view: 'menu', dir: 'center', dwell: 0, sentence: "", alphaIdx: 0, needIdx: 0 };
let alphaTimer = 0;
const ALPHA_CHANGE_TIME = 40; 
const DWELL_REQ = 25; 

function playAlarm() {
    const actx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = 'square'; 
    osc.frequency.setValueAtTime(600, actx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, actx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.3, actx.currentTime);
    osc.connect(gain); 
    gain.connect(actx.destination);
    osc.start(); 
    osc.stop(actx.currentTime + 0.8);
}

function initNeeds() {
    const nGrid = document.getElementById('needs-grid');
    if(!nGrid) return;
    nGrid.innerHTML = ''; 
    needs.forEach((n, i) => {
        const d = document.createElement('div');
        d.className = 'need-item'; d.id = `n-${i}`;
        d.innerHTML = `<div style="font-size:2.5rem">${n.i}</div>${n.t}`;
        nGrid.appendChild(d);
    });
}
initNeeds();

function execute(dir) {
    if (state.view === 'menu') {
        if (dir === 'left') setView('alpha');
        if (dir === 'right') setView('needs');
        if (dir === 'up') playAlarm();
    } 
    else if (state.view === 'alpha') {
        if (dir === 'up') { setView('menu'); return; } 
        
        if (dir === 'left') {
            state.sentence += letters[state.alphaIdx];
            alphaTimer = 0;
        }
        if (dir === 'right') {
            state.sentence = state.sentence.slice(0, -1);
            alphaTimer = 0;
        }
        if (dir === 'down') {
            document.getElementById('final-output').innerText = state.sentence;
            state.sentence = "";
            setView('menu');
        }
    } 
    else if (state.view === 'needs') {
        if (dir === 'up') setView('menu');
        if (dir === 'left') {
            document.getElementById('final-output').innerText = "POTRZEBA: " + needs[state.needIdx].t;
            setView('menu');
        }
    }
}

function setView(v) {
    document.querySelectorAll('.view').forEach(e => e.classList.remove('active'));
    const target = document.getElementById(`view-${v}`);
    if(target) target.classList.add('active');
    state.view = v;
    state.dwell = 0;
    state.dir = 'center';
    alphaTimer = 0;
    document.querySelectorAll('.progress').forEach(b => b.style.width = '0%');
}

const faceMesh = new FaceMesh({locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`});
faceMesh.setOptions({maxNumFaces:1, refineLandmarks:true, minDetectionConfidence:0.5});

faceMesh.onResults(res => {
    const canvas = document.getElementById('cameraCanvas');
    const ctx = canvas.getContext('2d');
    
    // 1. RYSOWANIE LUSTRZANE (Wizualne)
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(-1, 1);
    ctx.translate(-canvas.width, 0);
    ctx.drawImage(res.image, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    if(!res.multiFaceLandmarks || res.multiFaceLandmarks.length === 0) return;

    const landmarks = res.multiFaceLandmarks[0];
    const leftEye = landmarks[33];  // Oko lewe (z perspektywy kamery)
    const rightEye = landmarks[263]; // Oko prawe (z perspektywy kamery)
    const nose = landmarks[1]; 
    const forehead = landmarks[10];

    // 2. LOGIKA RUCHU (Zsynchronizowana z lustrem)
    // Gdy przechylasz głowę w swoje LEWO, odległość Y oczu zmienia się.
    const eyeDiffY = leftEye.y - rightEye.y; 
    
    let move = 'center';

    // Czułość pionowa (Góra/Dół)
    if (nose.y < forehead.y + 0.085) move = 'up'; 
    else if (nose.y > forehead.y + 0.18) move = 'down';
    // Czułość pozioma (Lewo/Prawo)
    else if (eyeDiffY < -0.042) move = 'left'; 
    else if (eyeDiffY > 0.042) move = 'right';

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

function updateUI(move) {
    const p = (state.dwell / DWELL_REQ) * 100;
    
    // Resetuj paski akcji
    document.querySelectorAll('.progress:not(.auto-progress-bar)').forEach(b => b.style.width = '0%');
    
    if (state.view === 'menu') {
        let bar = document.getElementById(`bar-${move}-menu`);
        if(bar) bar.style.width = p + '%';
    } 
    else if (state.view === 'alpha') {
        // Paski w widoku alfabetu
        const barUp = document.getElementById('bar-up-alpha');
        const barDown = document.getElementById('bar-down-alpha');
        const barLeft = document.getElementById('bar-left-alpha');
        const barRight = document.getElementById('bar-right-alpha');

        if (move === 'up' && barUp) barUp.style.width = p + '%';
        if (move === 'down' && barDown) barDown.style.width = p + '%';
        if (move === 'left' && barLeft) barLeft.style.width = p + '%';
        if (move === 'right' && barRight) barRight.style.width = p + '%';

        // 3. POMARAŃCZOWY PASEK (Zmiana litery)
        const autoBar = document.getElementById('auto-letter-bar');
        if (autoBar) {
            const timePercent = (alphaTimer / ALPHA_CHANGE_TIME) * 100;
            autoBar.style.width = timePercent + '%';
        }
        
        document.getElementById('sentence').innerText = state.sentence || "---";
    } 
    else if (state.view === 'needs') {
        if (move === 'left') document.getElementById('bar-left-needs').style.width = p + '%';
        if (move === 'up') document.getElementById('bar-up-needs').style.width = p + '%';
    }
}

// Pętla odliczania alfabetu
setInterval(() => {
    if (state.view === 'alpha') {
        // Odliczanie działa tylko gdy głowa jest prosto
        if (state.dir === 'center') {
            alphaTimer++;
            if (alphaTimer >= ALPHA_CHANGE_TIME) {
                state.alphaIdx = (state.alphaIdx + 1) % letters.length;
                const curLetEl = document.getElementById('cur-let');
                if(curLetEl) curLetEl.innerText = letters[state.alphaIdx];
                alphaTimer = 0;
            }
        }
    } else if (state.view === 'needs') {
        state.needIdx = (state.needIdx + 1) % needs.length;
        document.querySelectorAll('.need-item').forEach(e => e.classList.remove('active'));
        const activeItem = document.getElementById(`n-${state.needIdx}`);
        if(activeItem) activeItem.classList.add('active');
    }
}, 100);

const cam = new Camera(document.getElementById('video'), {
    onFrame: async () => { await faceMesh.send({image: document.getElementById('video')}) },
    width: 640, height: 480
});
cam.start();
