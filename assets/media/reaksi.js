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