// --- KONFIGURACJA I DANE ---
const letters = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ", " ", "<-"];
const needs = [
    {t: "Picie", i: "💧"}, {t: "Jedzenie", i: "🍎"}, {t: "Leki", i: "💊"}, {t: "Ból", i: "😫"},
    {t: "Zimno", i: "❄️"}, {t: "Pomoc", i: "🆘"}, {t: "TV", i: "📺"}, {t: "Toaleta", i: "🚻"},
    {t: "Książka", i: "📖"}, {t: "Sen", i: "😴"}
];

let state = { 
    view: 'menu', 
    dir: 'center', 
    dwell: 0, 
    sentence: "", 
    alphaIdx: 0, 
    needIdx: 0 
};

let alphaTimer = 0;
const ALPHA_CHANGE_TIME = 35; // ok 3.5 sekundy (przy interwale 100ms)
const DWELL_REQ = 20;         // czas przytrzymania głowy (ok 2 sekundy)

// --- AUDIO: ALARM ---
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

// --- INICJALIZACJA POTRZEB ---
function initNeeds() {
    const nGrid = document.getElementById('needs-grid');
    if(!nGrid) return;
    nGrid.innerHTML = ''; 
    needs.forEach((n, i) => {
        const d = document.createElement('div');
        d.className = 'need-item'; 
        d.id = `n-${i}`;
        d.innerHTML = `<div style="font-size:2.5rem">${n.i}</div>${n.t}`;
        nGrid.appendChild(d);
    });
}
initNeeds();

// --- LOGIKA WYBORU (AKCJE) ---
function execute(dir) {
    if (state.view === 'menu') {
        if (dir === 'left') setView('alpha');
        if (dir === 'right') setView('needs');
        if (dir === 'up') playAlarm();
    } 
    else if (state.view === 'alpha') {
        if (dir === 'up') setView('menu'); 
        if (dir === 'left') {
            const char = letters[state.alphaIdx];
            if (char === "<-") {
                state.sentence = state.sentence.slice(0, -1);
            } else {
                state.sentence += char;
            }
            alphaTimer = 0; // Reset po dodaniu
        }
        if (dir === 'right') {
            state.sentence = state.sentence.slice(0, -1);
            alphaTimer = 0; // Reset po usunięciu
        }
        if (dir === 'down') {
            document.getElementById('final-output').innerText = state.sentence || "Pusta wiadomość";
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

// --- ZMIANA WIDOKU ---
function setView(v) {
    document.querySelectorAll('.view').forEach(e => e.classList.remove('active'));
    const target = document.getElementById(`view-${v}`);
    if(target) target.classList.add('active');
    
    state.view = v; 
    state.dwell = 0; 
    state.dir = 'center';
    alphaTimer = 0;
    
    // Czyścimy paski przy zmianie widoku
    document.querySelectorAll('.progress').forEach(b => b.style.width = '0%');
}

// --- MEDIAPIPE: KONFIGURACJA ---
const faceMesh = new FaceMesh({locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`});
faceMesh.setOptions({maxNumFaces:1, refineLandmarks:true, minDetectionConfidence:0.5});

faceMesh.onResults(res => {
    const canvas = document.getElementById('cameraCanvas');
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(!res.multiFaceLandmarks || res.multiFaceLandmarks.length === 0) return;

    // Rysowanie podglądu kamery na małym płótnie
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(res.image, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();

    const landmarks = res.multiFaceLandmarks[0];
    const leftEye = landmarks[33]; 
    const rightEye = landmarks[263];
    const nose = landmarks[1]; 
    const forehead = landmarks[10];

    // Detekcja kierunku
    const eyeDiffY = leftEye.y - rightEye.y; 
    let move = 'center';
    
    if (eyeDiffY < -0.045) move = 'left'; 
    else if (eyeDiffY > 0.045) move = 'right'; 
    else if (nose.y < forehead.y + 0.08) move = 'up'; 
    else if (nose.y > forehead.y + 0.18) move = 'down';

    // Obsługa "dwell time" (przytrzymania)
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

// --- AKTUALIZACJA INTERFEJSU ---
function updateUI(move) {
    const p = (state.dwell / DWELL_REQ) * 100;
    
    // Resetuj paski postępu ruchu
    document.querySelectorAll('.progress:not(#next-letter-bar)').forEach(b => b.style.width = '0%');
    
    if (state.view === 'menu') {
        const bar = document.getElementById(`bar-${move}-menu`);
        if(bar) bar.style.width = p + '%';
    } 
    else if (state.view === 'alpha') {
        const actionBar = document.getElementById('action-bar');
        if (actionBar) {
            actionBar.style.width = '0%';
            actionBar.className = 'action-progress-bar';
            if (move === 'left') { actionBar.classList.add('bg-green'); actionBar.style.width = p + '%'; }
            if (move === 'right') { actionBar.classList.add('bg-red'); actionBar.style.width = p + '%'; }
        }

        if (move === 'up') document.getElementById('bar-up-alpha').style.width = p + '%';
        if (move === 'down') document.getElementById('bar-down-alpha').style.width = p + '%';

        document.getElementById('sentence').innerText = state.sentence || "---";
        
        const nextBar = document.getElementById('next-letter-bar');
        if (nextBar) {
            const timeP = ((ALPHA_CHANGE_TIME - alphaTimer) / ALPHA_CHANGE_TIME) * 100;
            nextBar.style.height = timeP + '%';
            nextBar.style.opacity = (move === 'center') ? "1" : "0.2";
        }
    }
    else if (state.view === 'needs') {
        if (move === 'left') {
            const b = document.getElementById('bar-left-needs');
            if(b) b.style.width = p + '%';
        }
        if (move === 'up') {
            const b = document.getElementById('bar-up-needs');
            if(b) b.style.width = p + '%';
        }
    }
}

// --- PĘTLA CZASOWA (ZMIANA LITER I POTRZEB) ---
setInterval(() => {
    if (state.view === 'alpha') {
        // Litera zmienia się tylko gdy patrzymy prosto
        if (state.dir === 'center') {
            alphaTimer++;
            if (alphaTimer >= ALPHA_CHANGE_TIME) {
                state.alphaIdx = (state.alphaIdx + 1) % letters.length;
                document.getElementById('cur-let').innerText = letters[state.alphaIdx];
                alphaTimer = 0;
            }
        }
    } else if (state.view === 'needs') {
        // Przewijanie ikon potrzeb
        state.needIdx = (state.needIdx + 1) % needs.length;
        document.querySelectorAll('.need-item').forEach(e => e.classList.remove('active'));
        const activeItem = document.getElementById(`n-${state.needIdx}`);
        if(activeItem) activeItem.classList.add('active');
    }
}, 100);

// --- START KAMERY ---
const videoElement = document.getElementById('video');
const camera = new Camera(videoElement, {
    onFrame: async () => {
        await faceMesh.send({image: videoElement});
    },
    width: 640,
    height: 480
});
camera.start();
