let yesnoLock = false;
let answer = null;

function startYesNo(){
  answer = null;
  document.getElementById("yesTile").classList.remove("active");
  document.getElementById("noTile").classList.remove("active");
}

function chooseYes(){
  if(yesnoLock) return;
  yesnoLock = true;
  answer = "TAK";
  fillYesNo();
}

function chooseNo(){
  if(yesnoLock) return;
  yesnoLock = true;
  answer = "NIE";
  fillYesNo();
}

function fillYesNo(){
  const bar = document.getElementById("yesnoProgress");
  let w = 0;
  const i = setInterval(()=>{
    w+=5;
    bar.style.width = w+"%";
    if(w>=100){
      clearInterval(i);
      bar.style.width="0%";
      console.log("Odpowiedź:", answer);
      backToMenu();
      yesnoLock = false;
    }
  },100);
}
