// === KONSTANTA ===
const BASE_URL = "https://hnwcewqtiotmlpltoowi.supabase.co/rest/v1";
const KOMENTAR_URL = `${BASE_URL}/Komentar`;
const REAKSI_URL = `${BASE_URL}/ReaksiKomentar`;
const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhud2Nld3F0aW90bWxwbHRvb3dpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2Njc4MTcsImV4cCI6MjA2MjI0MzgxN30.aWJtBV0QlPx3AvLOLGfn_1UX2iODO8ijwxz2xD_kyJ4";
const DEV_PASSWORD = "rahasia";

// === VARIABEL GLOBAL ===
let isDev = false;
let realName = localStorage.getItem("playerName")?.trim();
let currentCommentId = null;
let currentUsername = null;
let filterMode = "semua";
let temaSaatIni = "default";
let suaraAktif = true;

// === MODAL ===
function showModal(message, withInput = false) {
  const sndModal = document.getElementById("snd-modal");
  if (sndModal) sndModal.play();
  return new Promise((resolve) => {
    const overlay = document.getElementById("modalOverlay");
    const msg = document.getElementById("modalMessage");
    const input = document.getElementById("modalInput");
    const okBtn = document.getElementById("modalOk");

    msg.textContent = message;
    input.style.display = withInput ? "block" : "none";
    input.value = "";

    overlay.style.display = "flex";
    if (withInput) input.focus();

    function handleClose() {
      overlay.style.display = "none";
      okBtn.removeEventListener("click", handleClick);
      resolve(withInput ? input.value.trim() : true);
    }

    function handleClick() {
      handleClose();
    }

    okBtn.addEventListener("click", handleClick);
  });
}

// === REFERENSI DOM ===
const form = document.getElementById("formKomentar");
const daftar = document.getElementById("daftarKomentar");
const judul = document.getElementById("judul");
const pesanInput = document.getElementById("pesan");
const submitButton = form.querySelector("button");

// === CEK BOLEH KOMENTAR ===
async function bolehKomentar(username, pesanBaru) {
  const now = new Date();
  const satuMenitLalu = new Date(now.getTime() - 60 * 1000);
  const res = await fetch(`${KOMENTAR_URL}?username=eq.${username}&timestamp=gt.${satuMenitLalu.toISOString()}&order=timestamp.desc`, {
    headers: { apikey: API_KEY }
  });
  const data = await res.json();

  if (data.length >= 15) {
    const terakhir = new Date(data[0].timestamp);
    const bedaJam = (now - terakhir) / (1000 * 60 * 60);
    const sisaMs = 8 * 60 * 60 * 1000 - (now - terakhir);
    const sisaMenit = Math.round(sisaMs / 60000);
    const jam = Math.floor(sisaMenit / 60);
    const menit = sisaMenit % 60;
    if (bedaJam < 8) {
      return {
        boleh: false,
        pesan: `Terlalu banyak komentar dalam 1 menit. Tunggu ${jam > 0 ? jam + " jam " : ""}${menit} menit.`
      };
    }
  }

  const duplikat = data.find(k =>
    k.pesan === pesanBaru &&
    new Date(k.timestamp).getMinutes() === now.getMinutes()
  );
  if (duplikat) {
    return {
      boleh: false,
      pesan: `Komentar kamu sama persis dan baru dikirim barusan. Coba tulis yang beda.`
    };
  }

  return { boleh: true };
}

// === KIRIM KOMENTAR ===
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const pesan = pesanInput.value.trim();
  if (!pesan) return await showModal("Tulis dulu pesannya ya beb...");

  const nama = isDev ? "Lastropy" : realName;
  if (!isDev) {
    const cek = await bolehKomentar(nama, pesan);
    if (!cek.boleh) {
      await showModal(cek.pesan);
      return;
    }
  }

  submitButton.disabled = true;
  const payload = {
    username: nama,
    pesan,
    dari_dev: isDev,
    timestamp: new Date().toISOString()
  };

  try {
    const res = await fetch(KOMENTAR_URL, {
      method: "POST",
      headers: {
        apikey: API_KEY,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error();
    document.getElementById("snd-kirim")?.play();
    form.reset();
    loadKomentar();
  } catch {
    await showModal("Gagal kirim komentar.");
  } finally {
    submitButton.disabled = false;
  }
});

// === MUAT ULANG KOMENTAR ===
async function loadKomentar() {
const res = await fetch(`${KOMENTAR_URL}?select=id,username,pesan,dari_dev,timestamp,Players(avatar)&order=timestamp.asc`, {
  headers: { apikey: API_KEY }
});
  const data = await res.json();
  daftar.innerHTML = "";
  for (const k of data) {
    if (
      filterMode === "semua" ||
      (filterMode === "player" && !k.dari_dev) ||
      (filterMode === "dev" && k.dari_dev)
    ) {
      appendKomentar(k);
    }
  }
  daftar.scrollTop = daftar.scrollHeight;
}

function appendKomentar(k) {
  const item = document.createElement("li");
  item.className = `bubble ${k.dari_dev ? "dev" : "player"}`;

  const avatarFile = k.Players?.avatar || "default.png"; // fallback jika null
  const avatarImg = `<img src="assets/avatars/${avatarFile}" class="avatar-mini" alt="avatar">`;

  item.innerHTML = `
    <div class="avatar-container">
      ${avatarImg}
      <strong>${k.username}${k.dari_dev ? " (dev)" : ""}</strong>
    </div>
    ${k.pesan}
    <div class="reaksi-bar" id="reaksi-bar-${k.id}"></div>
    <span class="timestamp">${new Date(k.timestamp).toLocaleString("id-ID", {
      hour: "2-digit", minute: "2-digit", day: "numeric", month: "short"
    })}</span>
  `;

  if (isDev) {
    item.ondblclick = (e) => showPopupMenu(e.pageX, e.pageY, k.id, k.username, k.dari_dev);
  }

  daftar.appendChild(item);
  renderReaksi(k.id);
}

// === REAKSI KOMENTAR ===
async function renderReaksi(idKomentar) {
  const bar = document.getElementById(`reaksi-bar-${idKomentar}`);
  bar.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.className = "reaksi-wrapper";

  const button = document.createElement("img");
  button.src = "assets/reaksi-icon.png";
  button.className = "reaksi-btn";
  button.title = "Beri reaksi";

  const popup = document.createElement("div");
  popup.className = "reaksi-popup";

  const res = await fetch(`${REAKSI_URL}?id_komentar=eq.${idKomentar}`, {
    headers: { apikey: API_KEY }
  });
  const data = await res.json();

  const counts = Array(7).fill(0);
  let myReaksi = null;
  data.forEach(r => {
    counts[r.reaksi_ke - 1]++;
    if (r.username === realName) myReaksi = r.reaksi_ke;
  });

  for (let i = 1; i <= 7; i++) {
    const img = document.createElement("img");
    img.src = `assets/reaksi-${i}.png`;
    img.onclick = () => {
      kirimReaksi(idKomentar, i);
      popup.style.display = "none";
    };
    popup.appendChild(img);
  }

  if (myReaksi) {
    const iconSaya = document.createElement("img");
    iconSaya.src = `assets/reaksi-${myReaksi}.png`;
    iconSaya.className = "reaksi-saya";
    iconSaya.title = "Reaksi kamu";
    wrapper.appendChild(iconSaya);
  }

  wrapper.onmouseenter = () => popup.style.display = "flex";
  wrapper.onmouseleave = () => popup.style.display = "none";

  wrapper.appendChild(button);
  wrapper.appendChild(popup);
  bar.appendChild(wrapper);

  const summary = document.createElement("div");
  summary.className = "reaksi-summary";
  counts.forEach((count, i) => {
    if (count > 0) {
      const span = document.createElement("span");
      span.innerHTML = `<img src="assets/reaksi-${i + 1}.png" style="width:16px; vertical-align:middle;"> ${count}`;
      span.style.marginRight = "6px";
      summary.appendChild(span);
    }
  });
  bar.appendChild(summary);
}

async function kirimReaksi(idKomentar, reaksiKe) {
  try {
    const cek = await fetch(`${REAKSI_URL}?id_komentar=eq.${idKomentar}&username=eq.${realName}`, {
      headers: { apikey: API_KEY }
    });
    const data = await cek.json();

    const method = data.length === 0 ? "POST" : "PATCH";
    const url = method === "POST" ? REAKSI_URL : `${REAKSI_URL}?id_komentar=eq.${idKomentar}&username=eq.${realName}`;
    const body = JSON.stringify({ id_komentar: idKomentar, username: realName, reaksi_ke: reaksiKe });

    const res = await fetch(url, {
      method,
      headers: {
        apikey: API_KEY,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body
    });

    if (!res.ok) throw new Error(await res.text());
    await new Promise(resolve => setTimeout(resolve, 300));
    document.getElementById("snd-reaksi")?.play();
    renderReaksi(idKomentar);
  } catch (err) {
    await showModal("Gagal kirim/update reaksi:\n" + err.message);
  }
}

// === INISIALISASI NAMA PENGGUNA ===
(async () => {
  while (!realName) {
    realName = await showModal("Masukkan nama kamu dulu ya:", true);
  }
  localStorage.setItem("playerName", realName);
})();

function toggleFilter() {
  const urutan = ["semua", "player", "dev"];
  const idx = (urutan.indexOf(filterMode) + 1) % urutan.length;
  filterMode = urutan[idx];
  loadKomentar();
  showModal(`Filter komentar: ${filterMode}`);
}

function toggleTema() {
  const pilihan = ["default", "gelap", "hijau"];
  const idx = (pilihan.indexOf(temaSaatIni) + 1) % pilihan.length;
  temaSaatIni = pilihan[idx];
  document.querySelector("link[rel=stylesheet]").href = `styles-${temaSaatIni}.css`;
  showModal(`Tema diganti ke: ${temaSaatIni}`);
}

function toggleSuara() {
  suaraAktif = !suaraAktif;
  document.querySelectorAll("audio").forEach(a => a.muted = !suaraAktif);
  document.getElementById("labelSuara").textContent = suaraAktif ? "Aktif" : "Mati";
}

function tutupMenu() {
  const dropdown = document.getElementById("menuDropdown");
  dropdown.style.display = "none";
}

function tampilkanSurat() {
  showModal(`Halo para pemain Project Orion!\n\nTerima kasih sudah mencoba game ini...`);
}

function refreshKomentar() {
  const snd = document.getElementById("snd-reaksi");
  if (snd && suaraAktif) snd.play();
  loadKomentar();
}

document.getElementById("menuToggle").addEventListener("click", () => {
  const dropdown = document.getElementById("menuDropdown");
  dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
});

loadKomentar();

async function loginDev() {
  const input = await showModal("Kamu Tak Seharusnya Menekan Tombol Itu", true);
  if (input === DEV_PASSWORD) {
    isDev = true;
    judul.innerText = "Komentar Developer Project Orion";
    await showModal("Hay sayang, lagi mode developer nih?");
    loadKomentar();
  } else {
    await showModal("Tidak ada yang terjadi");
  }
}

function showPopupMenu(x, y, id, username, isFromDev) {
  currentCommentId = id;
  currentUsername = username;

  const popup = document.getElementById("popupMenu");
  let html = `<div class='popup-titlebar'>
                <span>Menu Developer</span>
                <button class='popup-close' onclick='document.getElementById(\"popupMenu\").style.display=\"none\"'>×</button>
              </div>
              <div class='popup-content'>`;
  if (!isFromDev) html += `<button onclick='balasKomentarDev()'>Balas ke @${username}</button>`;
  html += `<button onclick='hapusKomentarDev()'>Hapus Komentar</button></div>`;
  html += `<button onclick='genosidaKomentar()'>Genosida Komentar (1000 pertama)</button>`;
  popup.innerHTML = html;
  popup.style.left = `${Math.min(x, window.innerWidth - 240)}px`;
  popup.style.top = `${Math.min(y, window.innerHeight - 120)}px`;
  popup.style.display = "block";
}

function balasKomentarDev() {
  pesanInput.value = `@${currentUsername} `;
  pesanInput.focus();
  document.getElementById("popupMenu").style.display = "none";
}

async function hapusKomentarDev() {
  const yakin = await showModal("Yakin hapus komentar ini?");
  if (!yakin) return;
  await fetch(`${KOMENTAR_URL}?id=eq.${currentCommentId}`, {
    method: "DELETE",
    headers: {
      apikey: API_KEY,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    }
  });
  loadKomentar();
}

async function genosidaKomentar() {
  const konfirmasi1 = await showModal("Kamu yakin mau menghapus 1000 komentar pertama?");
  if (!konfirmasi1) return;

  const konfirmasi2 = await showModal("Langkah ini tidak bisa dibatalkan.\n\nTulis: YA SAYA YAKIN", true);
  if (konfirmasi2 !== "YA SAYA YAKIN") {
    await showModal("Operasi dibatalkan.");
    return;
  }

  try {
    const res = await fetch(`${KOMENTAR_URL}?select=id&order=timestamp.asc&limit=1000`, {
      headers: { apikey: API_KEY }
    });
    const data = await res.json();
    const ids = data.map(k => k.id);
    if (ids.length === 0) {
      await showModal("Tidak ada komentar yang bisa dihapus.");
      return;
    }

    const idList = ids.map(id => `\"${id}\"`).join(",");
    await fetch(`${REAKSI_URL}?id_komentar=in.(${idList})`, {
      method: "DELETE",
      headers: {
        apikey: API_KEY,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      }
    });
    await fetch(`${KOMENTAR_URL}?id=in.(${idList})`, {
      method: "DELETE",
      headers: {
        apikey: API_KEY,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      }
    });

    await showModal(`${ids.length} komentar pertama & reaksi terkait telah dihapus.`);
    loadKomentar();
  } catch (err) {
    await showModal("Gagal menghapus:\n" + err.message);
  }
}