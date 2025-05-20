const startPopup = document.getElementById('startPopup');
const startBtn = document.getElementById('startBtn');
const mainContent = document.getElementById('mainContent');
const playerName = localStorage.getItem("playerName") || "agen tidak dikenal";
document.getElementById("popupText").innerText = `Agen "${playerName}" telah mati.`;

startBtn.addEventListener("click", () => {
  startPopup.style.display = "none";
  mainContent.style.display = "block";
  startAnimation();
});

function startAnimation() {
  const totalFrames = 30;
  const frameRate = 3;
  const frameDuration = 1000 / frameRate;
  const imgElement = document.getElementById('frame');
  const bgLoopType = document.getElementById("bgLoopType");

  let currentFrame = 1;
  bgLoopType.play();

  const interval = setInterval(() => {
    currentFrame++;
    if (currentFrame > totalFrames) {
      clearInterval(interval);
      bgLoopType.pause();
      bgLoopType.currentTime = 0;

      // Simpan achievement Dead_ending ke localStorage
      const achievements = JSON.parse(localStorage.getItem("achievements")) || {};
      achievements["Dead_ending"] = true;
      localStorage.setItem("achievements", JSON.stringify(achievements));

      document.getElementById('frame-container').style.display = 'none';
      document.getElementById('continuePopup').style.display = 'block'; // tampilkan pop-up lanjut
      return;
    }
    const frameName = `frame-${String(currentFrame).padStart(3, '0')}.png`;
    imgElement.src = `assets/images/${frameName}`;
  }, frameDuration);
}

document.getElementById("continueBtn").addEventListener("click", () => {
  document.getElementById('continuePopup').style.display = 'none';
  document.getElementById('narrative').style.display = 'block';
  showNarrative();
});

function typeLine(id, text, delay = 40, callback = null) {
  const element = document.getElementById(id);
  let index = 0;
  const typeSound = document.getElementById("typeSound");

  const interval = setInterval(() => {
    if (index < text.length) {
      element.innerHTML += text[index];

      try {
        typeSound.currentTime = 0;
        typeSound.play();
      } catch (e) {
        // aman jika audio belum diizinkan browser
      }

      index++;
    } else {
      clearInterval(interval);
      if (callback) callback();
    }
  }, delay);
}

function showNarrative() {
  const name = playerName;
  document.getElementById("typeTitle").innerHTML = "";
  const lines = [
    `Mengakses log akhir dari unit lapangan...`,
    `Agen ${name} ditemukan tewas, dibunuh oleh kloning eksperimental ciptaan Dr. Alven Ried—makhluk yang dibangun dari fragmen ingatan Selena.`,
    `Makhluk itu bukan hanya replika. Ia adalah senjata: menyamar, memburu, menghapus semua jejak.`,
    `Kematian sang agen adalah paku terakhir bagi tabut Proyek Orion.`,
    `Semua bukti—disita. Semua rekaman—dihapus. Yang tersisa hanyalah kehampaan.`,
    `Orion tetap tak tersentuh. Tak ada siaran. Tak ada saksi. Tak ada kebenaran.`,
    `Dan nama ${name}... akan hilang, ditelan memori yang telah dimanipulasi dan dilenyapkan.`
  ];

  typeLine("typeTitle", "DEAD ENDING", 70, () => {
    let i = 0;
    function nextLine() {
      if (i < lines.length) {
        typeLine(`line${i + 1}`, lines[i], 40, () => {
          i++;
          setTimeout(nextLine, 300);
        });
      }
    }
    nextLine();
  });
}