const letters = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ", " ", "<-"];
const needs = [
    {t: "Picie", i: "💧"}, {t: "Jedzenie", i: "🍎"}, {t: "Leki", i: "💊"}, {t: "Ból", i: "😫"},
    {t: "Zimno", i: "❄️"}, {t: "Pomoc", i: "🆘"}, {t: "TV", i: "📺"}, {t: "Toaleta", i: "🚻"},
    {t: "Książka", i: "📖"}, {t: "Sen", i: "😴"}
];

let state = { view: 'menu', dir: 'center', dwell: 0, sentence: "", alphaIdx: 0, needIdx: 0 };
let alphaTimer = 0;
const ALPHA_CHANGE_TIME = 40; // ok 4 sekundy na literę
const DWELL_REQ = 25; // czas przytrzymania dla akcji

function playAlarm() {
    const actx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = 'square'; 
    osc.frequency.setValueAtTime(600, actx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, actx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.3, actx.currentTime);
    osc.connect(gain); gain.connect(actx.destination);
    osc.start(); osc.stop(actx.currentTime + 0.8);
}

function execute(dir) {
    if (state.view === 'menu') {
        if (dir === 'left') setView('alpha');
        if (dir === 'right') setView('needs');
        if (dir === 'up') playAlarm();
    } 
    else if (state.view === 'alpha') {
        if (dir === 'up') { setView('menu'); return; } // TYLKO GÓRA WYCHODZI
        
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
    document.getElementById(`view-${v}`).classList.add('active');
    state.view = v; state.dwell = 0; state.dir = 'center'; alphaTimer = 0;
    document.querySelectorAll('.progress').forEach(b => b.style.width = '0%');
}

const faceMesh = new FaceMesh({locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`});
faceMesh.setOptions({maxNumFaces:1, refineLandmarks:true, minDetectionConfidence:0.5});

faceMesh.onResults(res => {
    const canvas = document.getElementById('cameraCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(!res.multiFaceLandmarks || res.
