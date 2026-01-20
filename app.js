const letters = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ", " ", "<-"];
const needs = [
    {t: "Picie", i: "💧"}, {t: "Jedzenie", i: "🍎"}, {t: "Leki", i: "💊"}, {t: "Ból", i: "😫"},
    {t: "Zimno", i: "❄️"}, {t: "Ciepło", i: "🔥"}, {t: "Pomoc", i: "🆘"}, {t: "Toaleta", i: "🚻"},
    {t: "TV", i: "📺"}, {t: "Książka", i: "📖"}, {t: "Światło", i: "💡"}, {t: "Sen", i: "😴"}
];

let state = { 
    view: 'menu', 
    dir: 'center', 
    dwell: 0, 
    sentence: "", 
    alphaIdx: 0, 
    needIdx: 0 
};

const DWELL_REQ = 30; // Czas ładowania (ok. 1.5 - 2 sekundy)

// Funkcja Alarmu
function playAlarm() {
    const actx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    
    osc.type = 'siren'; // Możesz zmienić na 'square' dla ostrzejszego dźwięku
    osc.frequency.setValueAtTime(440, actx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, actx.currentTime + 0.5);
    
    gain.gain.setValueAtTime(0.2, actx.currentTime);
    osc.connect(gain);
    gain.connect(actx.destination);
    
    osc.start();
    osc.stop(actx.currentTime + 1);
    console.log("ALARM URUCHOMIONY");
}

// Inicjalizacja Potrzeb
function initNeeds() {
    const nGrid = document.getElementById('needs-grid');
    nGrid.innerHTML = ''; // Czyścimy przed dodaniem
    needs.forEach((n, i) => {
        const d = document.createElement('div');
        d.className = 'need-item';
        d.id = `n-${i}`;
        d.innerHTML = `<div style="font-size:3rem; margin-bottom:10px;">${n.i}</div>${n.t}`;
        nGrid.appendChild(d);
    });
}
initNeeds();

// GŁÓWNA LOGIKA WYBORU
function execute(dir) {
    if (state.view === 'menu') {
        // MECHANIKA MENU
        if (dir === 'left') {
            console.log("Wybieram Alfabet");
            setView('alpha');
        }
        if (dir === 'right') {
            console.log("Wybieram Potrzeby");
            setView('needs');
        }
        if (dir === 'up') {
            playAlarm();
        }
    } else if (state.view === 'alpha') {
        // MECHANIKA ALFABETU
        if (dir === 'up') setView('menu');
        if (dir === 'left') state.sentence += letters[state.alphaIdx];
        if (dir === 'right') state.sentence = state.sentence.slice(0, -1);
        if (dir === 'down') {
            document.getElementById('final-output').innerText = state.sentence;
            state.sentence = "";
            setView('menu');
        }
    } else if (state.view === 'needs') {
        // MECHANIKA POTRZEB
        if (dir === 'up') setView('menu');
        if (dir === 'left') {
            document.getElementById('final-output').innerText = needs[state.needIdx].t;
            setView('menu');
        }
    }
}

function setView(v) {
    document.querySelectorAll('.view').forEach(e => e.classList.remove('active'));
    document.getElementById(`view-${v}`).classList.add('active');
    state.view = v;
    state.dwell = 0;
    state.dir = 'center';
}

// Konfiguracja MediaPipe Face Mesh
const faceMesh = new FaceMesh({locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`});
faceMesh.setOptions({maxNumFaces:1, refineLandmarks:true, minDetectionConfidence:0.5});

faceMesh.onResults(res => {
    const canvas = document.getElementById('cameraCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height);
    
    if(!res.multiFaceLandmarks || res.multiFaceLandmarks.length === 0) return;

    ctx.drawImage(res.image, 0, 0, canvas.width, canvas.height);
    const landmarks = res.multiFaceLandmarks[0];
    const nose = landmarks[1];
    const forehead = landmarks[10];
    const chin = landmarks[152];

    let move = 'center';

    // Detekcja ruchu głowy (LEWO / PRAWO / GÓRA / DÓŁ)
    if (nose.x > 0.62) move = 'left'; // Przechył w lewo
    else if (nose.x < 0.38) move = 'right'; // Przechył w prawo
    else if (nose.y < forehead.y - 0.02) move = 'up'; // Przechył w górę (ALARM w menu)
    else if (nose.y > chin.y - 0.05) move = 'down'; // Przechył w dół

    // Logika Dwell Time (Ładowanie paska)
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
    
    // Resetuj wszystkie paski
    document.querySelectorAll('.progress').forEach(b => b.style.width = '0%');
    
    // Aktualizuj pasek tylko dla aktualnego kierunku w Menu
    if (state.view === 'menu') {
        if (move === 'left') document.getElementById('bar-left').style.width = p + '%';
        if (move === 'right') document.getElementById('bar-right').style.width = p + '%';
        if (move === 'up') document.getElementById('bar-up').style.width = p + '%';
    }
    
    // Podgląd zdania w alfabecie
    if (state.view === 'alpha') {
        document.getElementById('sentence').innerText = state.sentence || "---";
    }
}

// Skanowanie automatyczne dla alfabetu i potrzeb
setInterval(() => {
    if (state.view === 'alpha') {
        state.alphaIdx = (state.alphaIdx + 1) % letters.length;
        document.getElementById('cur-let').innerText = letters[state.alphaIdx];
    } else if (state.view === 'needs') {
        state.needIdx = (state.needIdx + 1) % needs.length;
        document.querySelectorAll('.need-item').forEach(e => e.classList.remove('active'));
        const activeItem = document.getElementById(`n-${state.needIdx}`);
        if(activeItem) activeItem.classList.add('active');
    }
}, 3000); // Zmiana co 3 sekundy

const cam = new Camera(document.getElementById('video'), {
    onFrame: async () => { await faceMesh.send({image: document.getElementById('video')}) },
    width: 640, height: 480
});
cam.start();
