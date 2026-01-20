
// ================= KONFIGURACJA DANYCH =================
const letters = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ", " "];
const needsList = [
    {t: "Jedzenie", i: "🍎"}, {t: "Picie", i: "💧"}, {t: "Leki", i: "💊"}, {t: "Ból", i: "😫"},
    {t: "Zimno", i: "❄️"}, {t: "Ciepło", i: "🔥"}, {t: "Pomoc", i: "🆘"}, {t: "Sen", i: "😴"}
];

let state = {
    view: 'menu',
    neutralX: null,
    dir: 'center',
    dwell: 0,
    sentence: "",
    alphaIdx: 0,
    needIdx: 0
};

const DWELL_MAX = 20; // Czas przytrzymania głowy (ok. 2 sekundy)

// Inicjalizacja potrzeb
const needsGrid = document.getElementById("needsGrid");
needsList.forEach((n, i) => {
    const div = document.createElement("div");
    div.className = "need-item";
    div.id = `need-${i}`;
    div.innerHTML = `<span style="font-size:3rem">${n.i}</span><br>${n.t}`;
    needsGrid.appendChild(div);
});

// ================= AUTOMAT SKANUJĄCY =================
setInterval(() => {
    if (state.view === "alphabet") {
        state.alphaIdx = (state.alphaIdx + 1) % letters.length;
        document.getElementById("alphabetGrid").innerText = letters[state.alphaIdx];
    } else if (state.view === "needs") {
        document.querySelectorAll(".need-item").forEach(el => el.classList.remove("active"));
        state.needIdx = (state.needIdx + 1) % needsList.length;
        document.getElementById(`need-${state.needIdx}`).classList.add("active");
    }
}, 4000);

// ================= LOGIKA WIDOKÓW =================
function switchView(v) {
    document.querySelectorAll(".view").forEach(el => el.classList.remove("active"));
    document.getElementById(`${v}-view`).classList.add("active");
    document.getElementById("view-label").innerText = v.toUpperCase();
    state.view = v;
    state.dwell = 0;
}

function handleConfirm(dir) {
    if (state.view === "menu") {
        if (dir === "left") switchView("alphabet");
        if (dir === "right") switchView("needs");
        if (dir === "up") alert("ALARM WYSŁANY!");
    } else if (state.view === "alphabet") {
        if (dir === "left") {
            state.sentence += letters[state.alphaIdx];
            document.getElementById("sentenceOutput").innerText = state.sentence;
        }
        if (dir === "right") {
            state.sentence = state.sentence.slice(0, -1);
            document.getElementById("sentenceOutput").innerText = state.sentence || "Zacznij pisać...";
        }
        if (dir === "up" || dir === "down") switchView("menu");
    } else if (state.view === "needs") {
        if (dir === "left") alert("Wybrano: " + needsList[state.needIdx].t);
        if (dir === "up" || dir === "down") switchView("menu");
    }
}

// ================= FACE MESH & KAMERA =================
const video = document.getElementById("video");
const canvas = document.getElementById("cameraCanvas");
const ctx = canvas.getContext("2d");

const faceMesh = new FaceMesh({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}` });
faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5 });

faceMesh.onResults(results => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
        document.getElementById("dot").classList.remove("active");
        return;
    }
    document.getElementById("dot").classList.add("active");

    // Rysowanie uproszczone (tylko punkty)
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    const lm = results.multiFaceLandmarks[0];

    // Detekcja kierunku
    const nose = lm[1];
    const leftEye = lm[234];
    const rightEye = lm[454];
    const currentX = nose.x - (leftEye.x + rightEye.x) / 2;

    if (state.neutralX === null) state.neutralX = currentX;
    const diffX = currentX - state.neutralX;

    let move = "center";
    if (diffX < -0.05) move = "right";
    else if (diffX > 0.05) move = "left";
    else if (nose.y < lm[10].y + 0.05) move = "up";
    else if (nose.y > lm[152].y - 0.1) move = "down";

    if (move !== "center" && move === state.dir) {
        state.dwell++;
        updateProgress(state.dwell / DWELL_MAX * 100);
    } else {
        state.dwell = 0;
        state.dir = move;
        updateProgress(0);
    }

    if (state.dwell >= DWELL_MAX) {
        handleConfirm(move);
        state.dwell = 0;
    }
});

function updateProgress(pct) {
    document.querySelectorAll(".progress-bar").forEach(b => b.style.width = "0%");
    if (state.view === "menu") {
        if (state.dir === "left") document.getElementById("bar-alphabet").style.width = pct + "%";
        if (state.dir === "right") document.getElementById("bar-needs").style.width = pct + "%";
        if (state.dir === "up") document.getElementById("bar-alarm").style.width = pct + "%";
    }
}

const camera = new Camera(video, {
    onFrame: async () => { await faceMesh.send({ image: video }) },
    width: 640, height: 480
});
camera.start();
