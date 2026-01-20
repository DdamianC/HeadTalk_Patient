const items = [
    {n: "Jedzenie", i: "🍎"}, {n: "Picie", i: "💧"}, {n: "Leki", i: "💊"}, {n: "Ból", i: "😫"},
    {n: "Zimno", i: "❄️"}, {n: "Ciepło", i: "🔥"}, {n: "Pomoc", i: "🆘"}, {n: "Toaleta", i: "🚽"}
];
const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ ";

let state = {
    v: 'menu',
    msg: '',
    cIdx: 0,
    nIdx: 0,
    dw: 0,
    dir: 'center'
};

// Generuj potrzeby
const cont = document.getElementById('needs-container');
items.forEach((x, i) => {
    const d = document.createElement('div');
    d.className = 'need-card';
    d.id = `n-${i}`;
    d.innerHTML = `<span style="font-size:3rem">${x.i}</span><br>${x.n}`;
    cont.appendChild(d);
});

// Automat skanujący
setInterval(() => {
    if(state.v === 'alphabet') {
        state.cIdx = (state.cIdx + 1) % chars.length;
        document.getElementById('active-letter').innerText = chars[state.cIdx];
    } else if(state.v === 'needs') {
        document.querySelectorAll('.need-card').forEach(c => c.classList.remove('active'));
        state.nIdx = (state.nIdx + 1) % items.length;
        document.getElementById(`n-${state.nIdx}`).classList.add('active');
    }
}, 3000);

function setView(newV) {
    document.querySelectorAll('.view').forEach(e => e.classList.remove('active'));
    document.getElementById(`view-${newV}`).classList.add('active');
    document.getElementById('current-view-name').innerText = newV.toUpperCase();
    state.v = newV;
}

function doMove(d) {
    if(state.v === 'menu') {
        if(d === 'left') setView('alphabet');
        if(d === 'right') setView('needs');
        if(d === 'up') alert("ALARM!");
    } else {
        if(d === 'up' || d === 'down') setView('menu');
        if(d === 'left' && state.v === 'alphabet') {
            state.msg += chars[state.cIdx];
            document.getElementById('sentence-out').innerText = state.msg;
        }
    }
}

// MediaPipe Setup
const faceMesh = new FaceMesh({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`});
faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5 });

faceMesh.onResults(res => {
    if (!res.multiFaceLandmarks || res.multiFaceLandmarks.length === 0) return;
    const p = res.multiFaceLandmarks[0][1];
    
    let m = 'center';
    if(p.x < 0.35) m = 'right';
    else if(p.x > 0.65) m = 'left';
    else if(p.y < 0.35) m = 'up';
    else if(p.y > 0.65) m = 'down';

    if(m !== 'center' && m === state.dir) {
        state.dw++;
        const pVal = (state.dw / 20) * 100;
        document.querySelectorAll('.progress').forEach(l => l.style.width = pVal + '%');
    } else {
        state.dw = 0;
        state.dir = m;
        document.querySelectorAll('.progress').forEach(l => l.style.width = '0%');
    }

    if(state.dw > 20) {
        doMove(m);
        state.dw = 0;
    }
});

const camera = new Camera(document.getElementById('video'), {
    onFrame: async () => { await faceMesh.send({image: document.getElementById('video')}); }
});
camera.start();
