const letters = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ", "␣"];
let currentIndex = 0;
let sentence = "";
let cycleInterval = null;
let alphabetLock = false;

function startAlphabet(){
  const grid = document.getElementById("alphabetGrid");
  grid.innerHTML = "";

  letters.forEach(l=>{
    const div = document.createElement("div");
    div.className = "letter";
    div.innerText = l;
    grid.appendChild(div);
  });

  cycleInterval = setInterval(nextLetter, 20000);
  highlightLetter();
}

function nextLetter(){
  currentIndex = (currentIndex + 1) % letters.length;
  highlightLetter();
}

function highlightLetter(){
  document.querySelectorAll(".letter").forEach((l,i)=>{
    l.classList.toggle("active", i === currentIndex);
  });
}

function confirmLetter(){
  if(alphabetLock) return;
  alphabetLock = true;

  const bar = document.getElementById("alphabetProgress");
  let w = 0;
  const i = setInterval(()=>{
    w+=5;
    bar.style.width = w+"%";
    if(w>=100){
      clearInterval(i);
      bar.style.width="0%";
      const char = letters[currentIndex]==="␣" ? " " : letters[currentIndex];
      sentence += char;
      document.getElementById("sentenceOutput").innerText = sentence;
      alphabetLock = false;
    }
  },100);
}
