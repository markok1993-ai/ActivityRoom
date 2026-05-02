const socket = io();

const text = {
  en: {
    title: "Activity Rooms",
    subtitle: "Fast mobile board game for friends on different devices.",
    yourName: "Your name",
    roomCode: "Room code",
    joinRoom: "Join room",
    createRoom: "Create room",
    room: "Room",
    turn: "Turn",
    correct: "Correct",
    skip: "Skip",
    allPlay: "All-play red term",
    winner: "Who guessed it?",
    startGame: "Start game",
    newGame: "New game",
    players: "Players",
    teams: "Pairs",
    latest: "Latest",
    lobby: "Waiting in lobby",
    waitingPlayers: "Need 4, 6, or 8 players",
    waitingTurn: "Waiting for game to start",
    pickDifficulty: "Pick a 3, 4, or 5 point card",
    privateWord: "Only the current player can see the word",
    finished: "Game finished",
    copied: "Copied",
    roomNotFound: "Room not found.",
    roomFull: "Room is full.",
    gameStarted: "This game already started.",
    badClient: "Could not identify this device. Refresh and try again.",
    describe: "Describe",
    draw: "Draw",
    mime: "Mime",
    start: "Start",
    end: "End",
    host: "Host",
    offline: "Offline"
  },
  sr: {
    title: "Activity sobe",
    subtitle: "Brza mobilna društvena igra za prijatelje na različitim uređajima.",
    yourName: "Tvoje ime",
    roomCode: "Kod sobe",
    joinRoom: "Uđi u sobu",
    createRoom: "Napravi sobu",
    room: "Soba",
    turn: "Potez",
    correct: "Tačno",
    skip: "Preskoči",
    allPlay: "Crveni pojam za sve",
    winner: "Ko je pogodio?",
    startGame: "Pokreni igru",
    newGame: "Nova igra",
    players: "Igrači",
    teams: "Parovi",
    latest: "Poslednje",
    lobby: "Čekanje u sobi",
    waitingPlayers: "Potrebno je 4, 6 ili 8 igrača",
    waitingTurn: "Čeka se početak igre",
    pickDifficulty: "Izaberi kartu od 3, 4 ili 5 poena",
    privateWord: "Samo igrač na potezu vidi pojam",
    finished: "Igra je završena",
    copied: "Kopirano",
    roomNotFound: "Soba nije pronađena.",
    roomFull: "Soba je puna.",
    gameStarted: "Ova igra je već počela.",
    badClient: "Uređaj nije prepoznat. Osveži stranicu i pokušaj opet.",
    describe: "Objasni",
    draw: "Crtaj",
    mime: "Pokazuj",
    start: "Start",
    end: "Cilj",
    host: "Domaćin",
    offline: "Van mreže"
  }
};

const colors = ["#e44f4f", "#2f80ed", "#16a085", "#f2a900", "#8e44ad", "#f26b38", "#0097a7", "#6a8f2a"];
const CLIENT_ID_KEY = "activity-client-id";
const SESSION_KEY = "activity-session";
let language = localStorage.getItem("activity-language") || "en";
let clientId = getClientId();
let state = null;
let tick = null;
let pendingCardFlip = false;
let flipTimer = null;
let audioContext = null;
let audioReady = false;

const $ = (id) => document.getElementById(id);

const els = {
  setup: $("setup"),
  game: $("game"),
  form: $("entryForm"),
  name: $("nameInput"),
  code: $("codeInput"),
  create: $("createBtn"),
  error: $("error"),
  english: $("englishBtn"),
  serbian: $("serbianBtn"),
  gameEnglish: $("gameEnglishBtn"),
  gameSerbian: $("gameSerbianBtn"),
  copyCode: $("copyCode"),
  board: $("board"),
  turnName: $("turnName"),
  timer: $("timer"),
  cardFace: $("cardFace"),
  cardBackNumber: $("cardBackNumber"),
  cardIcon: $("cardIcon"),
  category: $("category"),
  word: $("word"),
  difficultyChoices: $("difficultyChoices"),
  specialControls: $("specialControls"),
  correct: $("correctBtn"),
  skip: $("skipBtn"),
  start: $("startBtn"),
  restart: $("restartBtn"),
  capacity: $("capacity"),
  playerList: $("playerList"),
  log: $("log")
};

function t(key) {
  return text[language][key] || key;
}

function getClientId() {
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

function saveSession(code) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    code,
    name: els.name.value.trim(),
    language
  }));
}

function getSavedSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function unlockAudio() {
  if (audioReady) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  audioContext = audioContext || new AudioContext();
  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }
  audioReady = true;
}

function playTurnPing() {
  unlockAudio();
  if (!audioContext || audioContext.state === "suspended") return;

  const now = audioContext.currentTime;
  [660, 880, 1175].forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, now + index * 0.09);
    gain.gain.setValueAtTime(0, now + index * 0.09);
    gain.gain.linearRampToValueAtTime(0.16, now + index * 0.09 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.09 + 0.16);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(now + index * 0.09);
    oscillator.stop(now + index * 0.09 + 0.18);
  });
}

function maybePingTurn(nextState) {
  const oldTurn = state?.status === "playing" ? state.currentPlayerId : null;
  const nextTurn = nextState.status === "playing" ? nextState.currentPlayerId : null;
  if (nextTurn && nextTurn === clientId && nextTurn !== oldTurn) {
    playTurnPing();
  }
}

function applyLanguage(nextLanguage) {
  language = nextLanguage === "sr" ? "sr" : "en";
  localStorage.setItem("activity-language", language);
  document.documentElement.lang = language;
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  els.english.classList.toggle("active", language === "en");
  els.serbian.classList.toggle("active", language === "sr");
  els.gameEnglish.classList.toggle("active", language === "en");
  els.gameSerbian.classList.toggle("active", language === "sr");
  render();
}

function playerName(id) {
  return state?.players.find((player) => player.id === id)?.name || "-";
}

function teamName(id) {
  return state?.teams.find((team) => team.id === id)?.name || "-";
}

function teamMemberNames(team) {
  return team.playerIds.map(playerName).join(" + ");
}

function renderBoard() {
  if (!state) return;
  els.board.innerHTML = "";
  const path = state.board?.length ? state.board : Array.from({ length: state.winScore + 1 }, (_, index) => ({ index, category: "start" }));
  boardDisplayPath(path).forEach((spot) => {
    const cell = document.createElement("div");
    cell.className = `board-cell ${spot.category}`;
    cell.innerHTML = `<span class="spot-index">${spot.index === 0 ? t("start") : spot.index === state.boardEnd ? t("end") : spot.index}</span>${activityIcon(spot.category)}`;
    const stacked = state.teams.filter((team) => team.position === spot.index);
    stacked.forEach((team, index) => {
      const token = document.createElement("span");
      token.className = "token";
      token.style.background = colors[team.color % colors.length];
      token.style.transform = `translate(${index * 5}px, ${index * 5}px)`;
      token.title = `${team.name}: ${teamMemberNames(team)}`;
      cell.appendChild(token);
    });
    els.board.appendChild(cell);
  });
}

function boardDisplayPath(path) {
  const rows = [];
  for (let index = 0; index < path.length; index += 5) {
    const row = path.slice(index, index + 5);
    rows.push(rows.length % 2 === 0 ? row : row.reverse());
  }
  return rows.reverse().flat();
}

function activityIcon(category) {
  if (category === "describe") {
    return `
      <span class="spot-activity icon-describe" aria-label="${t("describe")}">
        <span class="icon-head"></span>
        <span class="icon-hair"></span>
        <span class="icon-bubble">!</span>
      </span>
    `;
  }
  if (category === "draw") {
    return `
      <span class="spot-activity icon-draw" aria-label="${t("draw")}">
        <span class="icon-paper"></span>
        <span class="icon-pencil"></span>
        <span class="icon-hand"></span>
      </span>
    `;
  }
  if (category === "mime") {
    return `
      <span class="spot-activity icon-mime" aria-label="${t("mime")}">
        <span class="icon-face"></span>
        <span class="icon-arm"></span>
        <span class="icon-finger"></span>
      </span>
    `;
  }
  return "";
}

function renderPlayers() {
  if (!state) return;
  els.capacity.textContent = `${state.players.length}/${state.maxPlayers}`;
  els.playerList.innerHTML = "";

  if (state.teams.length) {
    state.teams.forEach((team) => {
      const row = document.createElement("div");
      row.className = "player team-row";
      row.innerHTML = `
        <span class="dot" style="background:${colors[team.color % colors.length]}"></span>
        <span class="player-name"></span>
        <span class="badges"></span>
        <strong>${team.position}</strong>
      `;
      row.querySelector(".player-name").textContent = `${team.name}: ${teamMemberNames(team)}`;
      const badges = row.querySelector(".badges");
      if (team.id === state.currentTeamId) badges.appendChild(makeBadge(t("turn")));
      if (team.id === state.currentTeamId) row.classList.add("active");
      els.playerList.appendChild(row);
    });
    return;
  }

  state.players.forEach((player, index) => {
    const row = document.createElement("div");
    row.className = "player";
    row.innerHTML = `
      <span class="dot" style="background:${colors[player.color % colors.length]}"></span>
      <span class="player-name"></span>
      <span class="badges"></span>
      <strong>${Math.floor(index / 2) + 1}</strong>
    `;
    row.querySelector(".player-name").textContent = player.name;
    const badges = row.querySelector(".badges");
    if (player.id === state.hostId) badges.appendChild(makeBadge(t("host")));
    badges.appendChild(makeBadge(`${t("teams")} ${Math.floor(index / 2) + 1}`));
    if (!player.connected) badges.appendChild(makeBadge(t("offline")));
    if (player.id === state.currentPlayerId) row.classList.add("active");
    els.playerList.appendChild(row);
  });
}

function makeBadge(label) {
  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = label;
  return badge;
}

function renderTurn() {
  if (!state) return;
  const me = clientId;
  const isHost = state.hostId === me;
  const isActor = state.currentPlayerId === me;
  const enoughPlayers = state.canStart;
  const canPickCard = state.status === "playing" && !state.currentCard && (isHost || isActor);
  const isSpecial = Boolean(state.currentCard?.special);
  const canResolve = state.status === "playing" && isSpecial && (isHost || isActor);

  els.turnName.textContent = state.status === "playing" ? `${teamName(state.currentTeamId)}: ${playerName(state.currentPlayerId)}` : t(state.status === "finished" ? "finished" : "lobby");
  els.category.textContent = state.currentCard ? `${t(state.currentCard.category)} · ${isSpecial ? t("allPlay") : state.currentCard.difficulty}` : (state.currentActivity ? t(state.currentActivity) : (enoughPlayers ? t("waitingTurn") : t("waitingPlayers")));
  els.word.textContent = state.currentCard ? (state.currentCard.word || t("privateWord")) : (state.status === "playing" ? t("pickDifficulty") : "-");
  els.cardIcon.innerHTML = state.currentCard ? activityIcon(state.currentCard.category) : (state.currentActivity ? activityIcon(state.currentActivity) : "");
  els.cardBackNumber.textContent = state.currentCard?.difficulty || "?";
  els.word.classList.toggle("special-word", isSpecial);
  renderCardFlip();

  els.difficultyChoices.hidden = state.status !== "playing" || Boolean(state.currentCard);
  els.difficultyChoices.querySelectorAll("button").forEach((button) => {
    button.disabled = !canPickCard;
  });
  renderSpecialControls(canResolve);
  els.correct.hidden = state.status !== "playing" || !state.currentCard || isSpecial;
  els.skip.hidden = state.status !== "playing" || (!isHost && !isActor);
  els.start.hidden = state.status !== "lobby" || !isHost;
  els.restart.hidden = state.status === "playing" || !isHost;
  els.start.disabled = !enoughPlayers;

  updateTimer();
}

function renderCardFlip() {
  const hasCard = Boolean(state.currentCard);
  els.cardFace.classList.toggle("has-card", hasCard);
  els.cardFace.classList.toggle("card-empty", !hasCard);
  els.cardFace.classList.toggle("special-card", Boolean(state.currentCard?.special));

  clearTimeout(flipTimer);
  if (pendingCardFlip && hasCard) {
    els.cardFace.classList.remove("flipped");
    els.cardFace.classList.add("dealing");
    flipTimer = setTimeout(() => {
      els.cardFace.classList.add("flipped");
      els.cardFace.classList.remove("dealing");
      pendingCardFlip = false;
    }, 520);
    return;
  }

  els.cardFace.classList.toggle("flipped", hasCard);
  els.cardFace.classList.remove("dealing");
}

function renderSpecialControls(canResolve) {
  const isSpecial = Boolean(state?.currentCard?.special);
  els.specialControls.classList.toggle("hidden", !isSpecial);
  els.specialControls.innerHTML = "";
  if (!isSpecial) return;

  const label = document.createElement("p");
  label.textContent = t("winner");
  els.specialControls.appendChild(label);

  state.teams.forEach((team) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.teamId = team.id;
    button.disabled = !canResolve;
    button.textContent = `${team.name}: ${teamMemberNames(team)}`;
    if (team.id === state.currentTeamId) button.classList.add("primary");
    els.specialControls.appendChild(button);
  });
}

function renderLog() {
  if (!state) return;
  els.log.innerHTML = "";
  state.log.forEach((item) => {
    const line = document.createElement("p");
    line.textContent = item.text;
    els.log.appendChild(line);
  });
}

function render() {
  if (!state) return;
  els.setup.classList.add("hidden");
  els.game.classList.remove("hidden");
  els.copyCode.textContent = state.code;
  renderBoard();
  renderPlayers();
  renderTurn();
  renderLog();
}

function updateTimer() {
  if (!state?.endsAt || state.status !== "playing") {
    els.timer.textContent = "--";
    return;
  }
  const remaining = Math.max(0, Math.ceil((state.endsAt - Date.now()) / 1000));
  els.timer.textContent = remaining;
  els.timer.classList.toggle("hot", remaining <= 10);
}

function showError(key) {
  els.error.textContent = key ? t(key) : "";
}

function joinRoom(options = {}) {
  showError("");
  const code = els.code.value.trim().toUpperCase();
  socket.emit("joinRoom", { name: els.name.value, code, clientId }, (reply) => {
    if (!reply.ok) {
      if (options.auto && reply.error === "roomNotFound") clearSession();
      showError(reply.error);
      return;
    }
    saveSession(reply.code || code);
  });
}

function createRoom() {
  showError("");
  socket.emit("createRoom", { name: els.name.value, language, clientId }, (reply) => {
    if (!reply.ok) {
      showError(reply.error);
      return;
    }
    saveSession(reply.code);
  });
}

function reconnectSavedSession() {
  const saved = getSavedSession();
  if (!saved?.code || !saved?.name) return;

  els.name.value = saved.name;
  els.code.value = saved.code;
  if (saved.language) applyLanguage(saved.language);
  joinRoom({ auto: true });
}

els.form.addEventListener("submit", (event) => {
  event.preventDefault();
  unlockAudio();
  joinRoom();
});

document.addEventListener("pointerdown", unlockAudio, { once: true });

els.create.addEventListener("click", () => {
  unlockAudio();
  createRoom();
});
els.english.addEventListener("click", () => {
  unlockAudio();
  applyLanguage("en");
});
els.serbian.addEventListener("click", () => {
  unlockAudio();
  applyLanguage("sr");
});
els.gameEnglish.addEventListener("click", () => {
  unlockAudio();
  applyLanguage("en");
  socket.emit("setLanguage", "en");
});
els.gameSerbian.addEventListener("click", () => {
  unlockAudio();
  applyLanguage("sr");
  socket.emit("setLanguage", "sr");
});
els.correct.addEventListener("click", () => {
  unlockAudio();
  socket.emit("markCorrect");
});
els.difficultyChoices.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-difficulty]");
  if (!button) return;
  unlockAudio();
  socket.emit("selectDifficulty", Number(button.dataset.difficulty));
});
els.specialControls.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-team-id]");
  if (!button) return;
  unlockAudio();
  socket.emit("resolveSpecial", button.dataset.teamId);
});
els.skip.addEventListener("click", () => {
  unlockAudio();
  socket.emit("skipTurn");
});
els.start.addEventListener("click", () => {
  unlockAudio();
  socket.emit("startGame");
});
els.restart.addEventListener("click", () => {
  unlockAudio();
  socket.emit("restart");
});
els.copyCode.addEventListener("click", async () => {
  unlockAudio();
  await navigator.clipboard?.writeText(state.code);
  const original = els.copyCode.textContent;
  els.copyCode.textContent = t("copied");
  setTimeout(() => {
    els.copyCode.textContent = original;
  }, 900);
});

socket.on("state", (nextState) => {
  maybePingTurn(nextState);
  pendingCardFlip = !state?.currentCard && Boolean(nextState.currentCard);
  state = nextState;
  saveSession(state.code);
  applyLanguage(state.language);
  clearInterval(tick);
  tick = setInterval(updateTimer, 500);
});

socket.on("connect", reconnectSavedSession);
if (socket.connected) reconnectSavedSession();

applyLanguage(language);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
