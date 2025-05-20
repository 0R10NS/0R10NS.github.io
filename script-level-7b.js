const arena = document.getElementById("arena");
const shootSound = document.getElementById("shootSound");
const hitSound = document.getElementById("hitSound");
const enemyShootSound = document.getElementById("enemyShootSound");
const monsterTransformSound = document.getElementById("monsterTransformSound");
const alertSound = document.getElementById("alertSound");

const bulletList = [], enemyBullets = [];
let player, selena, playerHP = 100, selenaHP = 100;
let gameOver = false;
let selenaMode = "normal";
let lastHealTime = 0;
let gameLoopId = null;

let lastIdleSwap = 0, idleFrame = 1;
let lastSelenaMove = 0, lastSelenaAttack = 0;
let selenaDirection = 1;
let lastPlayerCol = null;
let lastShootTime = 0;

const shootCooldown = 450;
const maxActiveBullets = 5;

function createCharacter(className, col, row) {
  const elem = document.createElement("div");
  elem.className = className;
  arena.appendChild(elem);

  const hitbox = document.createElement("div");
  hitbox.className = "hitbox";
  arena.appendChild(hitbox);

  return { elem, hitbox, col, row };
}

function updatePosition(char) {
  const x = char.col * 62;
  const y = char.row * 62;
  char.elem.style.transform = `translate(${x}px, ${y}px)`;
  char.hitbox.style.transform = `translate(${x + 20}px, ${y + 20}px)`;
}

function glitchEffect() {
  document.body.classList.add("invert", "glitching");
  setTimeout(() => document.body.classList.remove("invert", "glitching"), 800);
}

function showPopup(text, callback) {
  document.getElementById("popup-text").textContent = text;
  document.getElementById("popup").style.display = "flex";
  if (alertSound?.play) {
    alertSound.currentTime = 0;
    alertSound.play().catch(() => {});
  }
  window.popupCallback = callback || null;
}

function closePopup() {
  document.getElementById("popup").style.display = "none";
  if (window.popupCallback) {
    window.popupCallback();
    window.popupCallback = null;
  }
}

function animateSprite(elem, img1, img2, delay) {
  elem.style.backgroundImage = `url('assets/images/${img1}')`;
  setTimeout(() => {
    elem.style.backgroundImage = `url('assets/images/${img2}')`;
  }, delay);
}

function shootBullet(timestamp = performance.now()) {
  if (gameOver || timestamp - lastShootTime < shootCooldown || bulletList.length >= maxActiveBullets) return;

  lastShootTime = timestamp;
  animateSprite(player.elem, "player-sprite-5.png", "player-sprite-1.png", 300);

  const bullet = document.createElement("div");
  bullet.className = "bullet";
  bullet.dataset.top = `${player.row * 62}`;
  bullet.style.left = `${player.col * 62 + 27}px`;
  bullet.style.top = `${bullet.dataset.top}px`;
  arena.appendChild(bullet);
  bulletList.push(bullet);

  if (shootSound?.play) {
    shootSound.pause();
    shootSound.currentTime = 0;
    shootSound.play().catch(() => {});
  }
}

function spawnEnemyBullet() {
  if (enemyBullets.length >= 10) {
    const oldest = enemyBullets.shift();
    oldest.remove();
  }

  const bullet = document.createElement("div");
  bullet.className = "bullet enemyBullet";
  bullet.dataset.top = `${selena.row * 62 + 60}`;
  bullet.style.left = `${selena.col * 62 + 27}px`;
  bullet.style.top = `${bullet.dataset.top}px`;
  arena.appendChild(bullet);
  enemyBullets.push(bullet);

  if (enemyShootSound?.play) {
    enemyShootSound.currentTime = 0;
    enemyShootSound.play().catch(() => {});
  }
}

function moveBulletsAndCheckCollisions() {
  // Peluru bertabrakan (5% chance)
  for (let i = bulletList.length - 1; i >= 0; i--) {
    const b1 = bulletList[i];
    const b1Rect = b1.getBoundingClientRect();

    for (let j = enemyBullets.length - 1; j >= 0; j--) {
      const b2 = enemyBullets[j];
      const b2Rect = b2.getBoundingClientRect();

      const overlap = b1Rect.left < b2Rect.right && b1Rect.right > b2Rect.left &&
                      b1Rect.top < b2Rect.bottom && b1Rect.bottom > b2Rect.top;

      if (overlap && Math.random() < 0.05) {
        b1.remove();
        b2.remove();
        bulletList.splice(i, 1);
        enemyBullets.splice(j, 1);
        break;
      }
    }
  }

  for (let i = bulletList.length - 1; i >= 0; i--) {
    const b = bulletList[i];
    b.dataset.top = `${parseInt(b.dataset.top) - 5}`;
    b.style.top = `${b.dataset.top}px`;

    if (parseInt(b.dataset.top) <= 0) {
      b.remove();
      bulletList.splice(i, 1);
      continue;
    }

    const bRect = b.getBoundingClientRect();
    const sRect = selena.hitbox.getBoundingClientRect();

    if (bRect.left < sRect.right && bRect.right > sRect.left &&
        bRect.top < sRect.bottom && bRect.bottom > sRect.top) {
      selenaHP -= 2;
      b.remove();
      bulletList.splice(i, 1);
      updateHealthBars();
      hitSound?.play?.();
      updateSelenaTexture();
      flashSelena(
        selenaMode !== "normal" ? "selena-sprite-12.png" : "selena-sprite-6.png",
        selenaMode !== "normal" ? "selena-sprite-7.png" : "selena-sprite-1.png"
      );
      if (selenaHP <= 0) {
  localStorage.setItem("all_evidence_file", "true");
  endGame("Dia telah mati...", "level-4b1.html", selena);
}
    }
  }

  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const b = enemyBullets[i];
    b.dataset.top = `${parseInt(b.dataset.top) + 5}`;
    b.style.top = `${b.dataset.top}px`;

    if (parseInt(b.dataset.top) >= 400) {
      b.remove();
      enemyBullets.splice(i, 1);
      continue;
    }

    const bRect = b.getBoundingClientRect();
    const pRect = player.hitbox.getBoundingClientRect();

    if (bRect.left < pRect.right && bRect.right > pRect.left &&
        bRect.top < pRect.bottom && bRect.bottom > pRect.top) {
      playerHP -= 20;
      b.remove();
      enemyBullets.splice(i, 1);
      updateHealthBars();
      hitSound?.play?.();
      animateSprite(player.elem, "player-sprite-6.png", "player-sprite-1.png", 300);
      if (playerHP <= 0) {
        endGame("Kau telah mati...", "dead-ending.html", player);
      }
    }
  }
}

function updateHealthBars() {
  document.getElementById("playerHealth").style.width = `${playerHP}%`;
  document.getElementById("selenaHealth").style.width = `${selenaHP}%`;
}

function updateSelenaTexture() {
  if (selenaHP < 50 && selenaMode === "normal") {
    monsterTransformSound?.play?.();
    glitchEffect();
  }
}

function flashSelena(img1, img2, times = 4, interval = 100) {
  let count = 0;
  const flash = setInterval(() => {
    selena.elem.style.backgroundImage = `url('assets/images/${count % 2 === 0 ? img1 : img2}')`;
    if (++count >= times * 2) clearInterval(flash);
  }, interval);
}

function animateSelenaAttack() {
  const img1 = selenaMode !== "normal" ? "selena-sprite-8.png" : "selena-sprite-2.png";
  const img2 = selenaMode !== "normal" ? "selena-sprite-11.png" : "selena-sprite-5.png";
  animateSprite(selena.elem, img1, img2, 200);
  setTimeout(spawnEnemyBullet, 200);
}

function updateAI(timestamp) {
  if (timestamp - lastSelenaMove > 600) {
    if (selenaMode === "undead") {
      const distance = Math.abs(selena.col - player.col);
      const shouldEvade = distance <= 1 || Math.random() < 0.4;

      if (shouldEvade) {
        if (selena.col < player.col && selena.col > 0) {
          selena.col--;
          selenaDirection = -1;
        } else if (selena.col > player.col && selena.col < 4) {
          selena.col++;
          selenaDirection = 1;
        } else if (Math.random() < 0.5) {
          selena.col = Math.max(0, Math.min(4, selena.col + (Math.random() < 0.5 ? -1 : 1)));
        }

        if (distance === 0 && Math.random() < 0.6) {
          const newRow = Math.max(0, Math.min(5, selena.row + (Math.random() < 0.5 ? -1 : 1)));
          selena.row = newRow;
        }
      }

    } else {
      if (lastPlayerCol !== null && lastPlayerCol !== player.col) {
        const delta = player.col - lastPlayerCol;
        const step = Math.sign(delta);
        const predictedCol = selena.col + step;
        if (predictedCol >= 0 && predictedCol <= 4) selena.col = predictedCol;
      } else {
        if (selena.col < player.col) {
          selena.col++;
          selenaDirection = 1;
        } else if (selena.col > player.col) {
          selena.col--;
          selenaDirection = -1;
        }
      }
    }

    updatePosition(selena);

    const sprite = selenaMode !== "normal" ? ['9', '10'] : ['3', '4'];
    selena.elem.style.backgroundImage =
      `url('assets/images/selena-sprite-${selenaDirection > 0 ? sprite[0] : sprite[1]}.png')`;

    setTimeout(() => {
      if (selenaMode === "normal")
        selena.elem.style.backgroundImage = "url('assets/images/selena-sprite-1.png')";
    }, 300);

    lastSelenaMove = timestamp;
  }

  const attackDelay = selenaMode !== "normal" ? 1000 : 2000;
  if (timestamp - lastSelenaAttack > attackDelay) {
    if (selenaMode !== "undead" || lastPlayerCol !== player.col) {
      animateSelenaAttack();
      lastSelenaAttack = timestamp;
    }
  }

  lastPlayerCol = player.col;
}

function animateIdle(timestamp) {
  if (timestamp - lastIdleSwap > 600) {
    idleFrame = idleFrame === 1 ? 2 : 1;
    player.elem.style.backgroundImage = `url('assets/images/player-sprite-${idleFrame}.png')`;
    if (selenaMode === "normal")
      selena.elem.style.backgroundImage = `url('assets/images/selena-sprite-${idleFrame}.png')`;
    lastIdleSwap = timestamp;
  }
}

function updateSelenaMode(timestamp) {
  let newMode = selenaMode;

  if (selenaHP >= 51) newMode = "normal";
  else if (selenaHP >= 6) newMode = "monster";
  else newMode = "undead";

  if (newMode !== selenaMode) {
    glitchEffect();
    if (newMode === "monster") monsterTransformSound?.play?.();
    selenaMode = newMode;
    lastSelenaAttack = timestamp;
  }

  if (selenaMode === "undead" && timestamp - lastHealTime >= 5000) {
    selenaHP = Math.min(100, selenaHP + 2);
    lastHealTime = timestamp;
    updateHealthBars();
  }
}

function gameLoop(timestamp) {
  if (gameOver) return;
  moveBulletsAndCheckCollisions();
  updateAI(timestamp);
  animateIdle(timestamp);
  updateSelenaMode(timestamp);
  gameLoopId = requestAnimationFrame(gameLoop);
}

function endGame(message, redirect, character) {
  if (gameOver) return;
  gameOver = true;
  cancelAnimationFrame(gameLoopId);

  const x = character.col * 62;
  const y = character.row * 62;
  character.elem.style.backgroundImage = `url('assets/images/${character === player ? 'player-sprite-6.png' : 'selena-sprite-12.png'}')`;
  character.elem.style.transform = `translate(${x}px, ${y}px) rotate(90deg)`;

  if (character === player) {
    animateSelenaVictory(() => {
      setTimeout(() => {
        window.location.href = redirect;
      }, 1000);
    });
  } else {
    showPopup(message, () => window.location.href = redirect);
  }
}

function startGame() {
  showPopup("Spam Klik bisa menyebabkan lag, berhati-hati lah", () => {
    document.getElementById("intro").style.display = "none";
    document.getElementById("arena").style.display = "grid";
    document.getElementById("controls").style.display = "flex";
    document.getElementById("hud").style.display = "block";

    player = createCharacter("player", 2, 5);
    selena = createCharacter("selena", 2, 0);

    updatePosition(player);
    updatePosition(selena);
    updateHealthBars();

    const bgm = document.getElementById("bgm");
    if (bgm?.play) bgm.play().catch(() => {});
    gameLoopId = requestAnimationFrame(gameLoop);
  });
}

function moveLeft() {
  if (player.col > 0) {
    player.col--;
    updatePosition(player);
    player.elem.style.backgroundImage = "url('assets/images/player-sprite-4.png')";
  }
}

function moveRight() {
  if (player.col < 4) {
    player.col++;
    updatePosition(player);
    player.elem.style.backgroundImage = "url('assets/images/player-sprite-3.png')";
  }
}

function animateSelenaVictory(callback) {
  function moveStep() {
    if (selena.row < player.row) selena.row++;
    else if (selena.row > player.row) selena.row--;
    else if (selena.col < player.col) selena.col++;
    else if (selena.col > player.col) selena.col--;
    else {
      if (callback) setTimeout(callback, 0);
      return;
    }

    updatePosition(selena);
    selena.elem.style.backgroundImage = `url('assets/images/selena-sprite-${idleFrame}.png')`;
    idleFrame = idleFrame === 1 ? 2 : 1;

    requestAnimationFrame(() => {
      setTimeout(moveStep, 300);
    });
  }

  moveStep();
}