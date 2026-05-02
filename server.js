const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

const PORT = process.env.PORT || 3000;
const MAX_PLAYERS = 8;
const MIN_PLAYERS = 4;
const BOARD_SPOTS = 48;
const BOARD_END = BOARD_SPOTS + 1;
const TURN_SECONDS = 60;
const EMPTY_ROOM_TTL_MS = 10 * 60 * 1000;
const HOST_RECONNECT_GRACE_MS = 30 * 1000;
const DIFFICULTIES = [3, 4, 5];
const ACTIVITIES = ["describe", "draw", "mime"];

app.use(express.static("public"));

const board = Array.from({ length: BOARD_END + 1 }, (_, index) => {
  if (index === 0) return { index, type: "start", category: "start" };
  if (index === BOARD_END) return { index, type: "end", category: "end" };
  return { index, type: "activity", category: ACTIVITIES[(index - 1) % ACTIVITIES.length] };
});

const deckTargets = {
  3: 1000,
  4: 1000,
  5: 1000
};

const wordBanks = {
  en: {
    easy: ["airport", "secret", "rainstorm", "museum", "birthday", "detective", "island", "robot", "pillow", "treasure", "newspaper", "astronaut", "bakery", "mirror", "ticket", "castle", "bicycle", "dragon", "umbrella", "camera", "pizza", "mountain", "ship", "clock", "guitar", "rocket", "bridge", "crown", "elephant", "key", "train", "garden", "school", "beach", "phone", "chair", "window", "doctor", "teacher", "farmer"],
    medium: ["volcano", "lighthouse", "snowstorm", "firefighter", "microscope", "helicopter", "waterfall", "detective story", "movie theater", "ice cream", "traffic light", "camping trip", "pirate ship", "hot air balloon", "magic trick", "winter jacket", "shopping cart", "video game", "solar system", "library card", "broken elevator", "family photo", "birthday cake", "police station", "coffee machine", "rainbow bridge", "tennis racket", "science project", "lost suitcase", "music festival"],
    hard: ["time capsule", "identity crisis", "climate change", "social network", "ancient prophecy", "parallel universe", "public transport strike", "wedding rehearsal", "secret ingredient", "mountain rescue", "airport security", "forgotten password", "political debate", "wildlife documentary", "emergency landing", "restaurant review", "family tradition", "medical discovery", "hidden camera", "international border", "artificial intelligence", "philosophy lecture", "courtroom evidence", "space tourism", "financial crisis", "urban legend", "missing evidence", "silent agreement", "memory palace", "lucky coincidence"],
    adjectives: ["red", "blue", "tiny", "giant", "old", "new", "lost", "hidden", "broken", "magic", "frozen", "golden", "noisy", "quiet", "sleepy", "angry", "happy", "strange", "famous", "secret", "wild", "bright", "empty", "heavy", "plastic", "wooden", "electric", "salty", "spicy", "round"],
    places: ["kitchen", "forest", "school", "airport", "museum", "stadium", "hospital", "hotel", "market", "beach", "castle", "library", "garage", "garden", "office", "restaurant", "train station", "island", "farm", "circus"],
    objects: ["box", "hat", "map", "book", "phone", "bottle", "shoe", "bag", "lamp", "fork", "ring", "coin", "button", "blanket", "helmet", "ladder", "mirror", "notebook", "pencil", "remote"],
    actions: ["brushing teeth", "playing tennis", "opening a gift", "walking on ice", "fishing", "making soup", "sleepwalking", "riding a horse", "taking a selfie", "climbing stairs", "vacuuming", "flying a kite", "digging", "putting on shoes", "sneezing", "boxing", "rowing", "juggling", "dancing badly", "looking for keys", "calling a taxi", "packing a suitcase", "painting a wall", "escaping quietly", "waiting in line", "fixing a bike", "carrying groceries", "building a tent", "washing a dog", "catching a bus"],
    hardActions: ["defusing a bomb", "conducting an orchestra", "arguing in court", "landing a plane", "performing surgery", "interviewing a celebrity", "directing traffic", "escaping quicksand", "negotiating peace", "teaching a robot", "discovering treasure", "walking on the moon", "hosting a cooking show", "announcing bad news", "solving a mystery", "training for the Olympics", "giving a weather report", "protecting a secret", "explaining gravity", "calming a baby"]
  },
  sr: {
    easy: ["aerodrom", "tajna", "pljusak", "muzej", "rođendan", "detektiv", "ostrvo", "robot", "jastuk", "blago", "novine", "astronaut", "pekara", "ogledalo", "karta", "zamak", "bicikl", "zmaj", "kišobran", "kamera", "pica", "planina", "brod", "sat", "gitara", "raketa", "most", "kruna", "slon", "ključ", "voz", "bašta", "škola", "plaža", "telefon", "stolica", "prozor", "doktor", "učitelj", "farmer"],
    medium: ["vulkan", "svetionik", "snežna oluja", "vatrogasac", "mikroskop", "helikopter", "vodopad", "detektivska priča", "bioskop", "sladoled", "semafor", "kampovanje", "piratski brod", "balon na vazduh", "mađioničarski trik", "zimska jakna", "kolica za kupovinu", "video igra", "sunčev sistem", "članska karta", "pokvaren lift", "porodična fotografija", "rođendanska torta", "policijska stanica", "aparat za kafu", "dugin most", "teniski reket", "naučni projekat", "izgubljeni kofer", "muzički festival"],
    hard: ["vremenska kapsula", "kriza identiteta", "klimatske promene", "društvena mreža", "drevno proročanstvo", "paralelni univerzum", "štrajk prevoza", "proba venčanja", "tajni sastojak", "spasavanje u planini", "aerodromska kontrola", "zaboravljena lozinka", "politička debata", "dokumentarac o životinjama", "prinudno sletanje", "recenzija restorana", "porodična tradicija", "medicinsko otkriće", "skrivena kamera", "međunarodna granica", "veštačka inteligencija", "predavanje filozofije", "sudski dokaz", "svemirski turizam", "finansijska kriza", "urbana legenda", "nestali dokaz", "prećutni dogovor", "palata sećanja", "srećna slučajnost"],
    adjectives: ["crveni", "plavi", "mali", "ogromni", "stari", "novi", "izgubljeni", "skriveni", "pokvareni", "čarobni", "zaleđeni", "zlatni", "bučni", "tihi", "pospani", "ljuti", "srećni", "čudni", "poznati", "tajni", "divlji", "sjajni", "prazni", "teški", "plastični", "drveni", "električni", "slani", "ljuti", "okrugli"],
    places: ["kuhinja", "šuma", "škola", "aerodrom", "muzej", "stadion", "bolnica", "hotel", "pijaca", "plaža", "zamak", "biblioteka", "garaža", "bašta", "kancelarija", "restoran", "železnička stanica", "ostrvo", "farma", "cirkus"],
    objects: ["kutija", "šešir", "mapa", "knjiga", "telefon", "flaša", "cipela", "torba", "lampa", "viljuška", "prsten", "novčić", "dugme", "ćebe", "kaciga", "merdevine", "ogledalo", "sveska", "olovka", "daljinski"],
    actions: ["pranje zuba", "igranje tenisa", "otvaranje poklona", "hodanje po ledu", "pecanje", "kuvanje supe", "mesečarenje", "jahanje konja", "pravljenje selfija", "penjanje uz stepenice", "usisavanje", "puštanje zmaja", "kopanje", "obuvanje cipela", "kijanje", "boksovanje", "veslanje", "žongliranje", "loše plesanje", "traženje ključeva", "zvanje taksija", "pakovanje kofera", "krečenje zida", "tiho bežanje", "čekanje u redu", "popravljanje bicikla", "nošenje namirnica", "postavljanje šatora", "kupanje psa", "hvatanje autobusa"],
    hardActions: ["demontiranje bombe", "dirigovanje orkestrom", "rasprava na sudu", "sletanje aviona", "izvođenje operacije", "intervjuisanje zvezde", "usmeravanje saobraćaja", "bekstvo iz živog peska", "pregovaranje o miru", "učenje robota", "otkrivanje blaga", "hodanje po Mesecu", "vođenje kulinarske emisije", "saopštavanje loših vesti", "rešavanje misterije", "trening za Olimpijadu", "davanje vremenske prognoze", "čuvanje tajne", "objašnjavanje gravitacije", "smirivanje bebe"]
  }
};

function makeCards() {
  const result = {};
  Object.keys(wordBanks).forEach((language) => {
    result[language] = {};
    ACTIVITIES.forEach((category) => {
      result[language][category] = {};
      DIFFICULTIES.forEach((difficulty) => {
        result[language][category][difficulty] = buildDeck(language, category, difficulty, deckTargets[difficulty]);
      });
    });
  });
  return result;
}

function buildDeck(language, category, difficulty, targetCount) {
  const bank = wordBanks[language];
  const deck = [];
  const seen = new Set();
  const nouns = difficulty === 3 ? bank.easy : difficulty === 4 ? bank.medium : bank.hard;
  const helper = language === "sr"
    ? { in: "u", with: "sa", at: "na", and: "i" }
    : { in: "in", with: "with", at: "at", and: "and" };
  const people = new Set(language === "sr"
    ? ["detektiv", "astronaut", "doktor", "učitelj", "farmer", "vatrogasac"]
    : ["detective", "astronaut", "doctor", "teacher", "farmer", "firefighter"]);

  function add(term) {
    const normalized = term.trim().replace(/\s+/g, " ");
    const wordCount = normalized.split(" ").length;
    if (wordCount < 1 || wordCount > 4 || seen.has(normalized)) return;
    seen.add(normalized);
    deck.push(normalized);
  }

  nouns.forEach(add);

  const actionSource = difficulty === 5 ? bank.hardActions.concat(bank.actions) : bank.actions;
  const nounSource = difficulty === 5 ? bank.hard.concat(bank.medium) : nouns.concat(bank.easy);
  const personSource = nounSource.filter((term) => people.has(term));
  const concreteSource = nounSource.filter((term) => !people.has(term));

  function addObjectPairs() {
    bank.objects.forEach((left) => bank.objects.forEach((right) => {
      if (left !== right) add(`${left} ${helper.and} ${right}`);
    }));
  }

  function addPlaceObjectPairs() {
    bank.places.forEach((place) => bank.objects.forEach((object) => {
      add(language === "sr" ? `${place} ${helper.and} ${object}` : `${object} ${helper.at} ${place}`);
    }));
  }

  function addSensibleAdjectiveObjects() {
    if (language !== "en") return;
    bank.adjectives.forEach((adjective) => bank.objects.forEach((object) => add(`${adjective} ${object}`)));
  }

  if (category === "mime") {
    const shortMimeVerbs = language === "sr"
      ? ["korišćenje", "držanje", "traženje", "skrivanje", "bacanje", "pranje", "popravljanje", "nošenje"]
      : ["using", "holding", "finding", "hiding", "throwing", "washing", "fixing", "carrying", "opening", "closing", "lifting", "dropping"];

    actionSource.forEach(add);
    nounSource.forEach(add);
    actionSource.forEach((action) => bank.places.forEach((place) => add(`${action} ${helper.in} ${place}`)));
    actionSource.forEach((action) => personSource.forEach((person) => add(`${person} ${action}`)));
    actionSource.forEach((action) => bank.objects.forEach((object) => add(`${action} ${helper.with} ${object}`)));
    shortMimeVerbs.forEach((verb) => bank.objects.forEach((object) => add(`${verb} ${object}`)));
  } else if (category === "draw") {
    concreteSource.forEach(add);
    addSensibleAdjectiveObjects();
    concreteSource.forEach((noun) => bank.places.forEach((place) => add(`${noun} ${helper.in} ${place}`)));
    addObjectPairs();
    addPlaceObjectPairs();
  } else {
    nounSource.forEach(add);
    personSource.forEach((person) => bank.places.forEach((place) => add(`${person} ${helper.at} ${place}`)));
    concreteSource.forEach((noun) => bank.places.forEach((place) => add(`${noun} ${helper.in} ${place}`)));
    concreteSource.forEach((noun) => bank.objects.forEach((object) => add(`${noun} ${helper.with} ${object}`)));
    addObjectPairs();
    addPlaceObjectPairs();
  }

  return deck.slice(0, targetCount);
}

const cards = makeCards();

const rooms = new Map();

function makeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return rooms.has(code) ? makeCode() : code;
}

function makeRoom(hostId, language) {
  const code = makeCode();
  const room = {
    code,
    hostId,
    language: language === "sr" ? "sr" : "en",
    status: "lobby",
    players: [],
    teams: [],
    currentTeamTurn: 0,
    turnCounts: {},
    currentActivity: null,
    currentCard: null,
    timer: null,
    cleanupTimer: null,
    hostTransferTimer: null,
    endsAt: null,
    log: []
  };
  rooms.set(code, room);
  return room;
}

function publicPlayer(player) {
  return {
    id: player.id,
    name: player.name,
    teamId: player.teamId,
    color: player.color,
    connected: player.connected
  };
}

function publicTeam(team) {
  return {
    id: team.id,
    name: team.name,
    score: team.position,
    position: team.position,
    activity: team.activity,
    color: team.color,
    playerIds: team.playerIds
  };
}

function sanitizeName(name) {
  return String(name || "").trim().slice(0, 24) || "Player";
}

function sanitizeClientId(clientId) {
  const value = String(clientId || "").trim();
  return /^[a-zA-Z0-9_-]{12,64}$/.test(value) ? value : null;
}

function getPlayer(room, clientId) {
  return room.players.find((player) => player.id === clientId);
}

function activePlayers(room) {
  return room.players.filter((player) => player.connected);
}

function canStart(room) {
  const count = activePlayers(room).length;
  return count >= MIN_PLAYERS && count % 2 === 0;
}

function makeTeams(room) {
  const connectedPlayers = activePlayers(room);
  room.teams = [];
  room.turnCounts = {};

  for (let index = 0; index < connectedPlayers.length; index += 2) {
    const pair = connectedPlayers.slice(index, index + 2);
    const team = {
      id: `team-${index / 2 + 1}`,
      name: `Team ${index / 2 + 1}`,
      position: 0,
      activity: randomActivity(),
      color: index / 2,
      playerIds: pair.map((player) => player.id)
    };
    room.teams.push(team);
    room.turnCounts[team.id] = 0;
    pair.forEach((player) => {
      player.teamId = team.id;
    });
  }
}

function randomActivity() {
  return ACTIVITIES[Math.floor(Math.random() * ACTIVITIES.length)];
}

function pickCard(language, category, difficulty) {
  const deck = cards[language][category][difficulty];
  const term = normalizeTerm(deck[Math.floor(Math.random() * deck.length)]);
  return { category, difficulty, word: term.word, special: term.special };
}

function normalizeTerm(term) {
  if (typeof term === "string") {
    return { word: term, special: false };
  }

  return {
    word: term.word || term.term || "",
    special: Boolean(term.special)
  };
}

function getTeamPlayers(room, team) {
  return team.playerIds
    .map((id) => room.players.find((player) => player.id === id))
    .filter(Boolean);
}

function activeTeamPlayers(room, team) {
  return getTeamPlayers(room, team).filter((player) => player.connected);
}

function activeTeams(room) {
  return room.teams.filter((team) => activeTeamPlayers(room, team).length > 0);
}

function currentTeam(room) {
  return room.teams[room.currentTeamTurn] || null;
}

function currentActor(room) {
  const team = currentTeam(room);
  if (!team) return null;

  const members = getTeamPlayers(room, team);
  if (!members.length) return null;

  const turnCount = room.turnCounts[team.id] || 0;
  const preferred = members[turnCount % members.length];
  if (preferred?.connected) return preferred;

  return members.find((player) => player.connected) || null;
}

function stateFor(room, viewerId) {
  const team = currentTeam(room);
  const actor = currentActor(room);
  const isActor = actor && actor.id === viewerId;
  return {
    code: room.code,
    hostId: room.hostId,
    language: room.language,
    status: room.status,
    players: room.players.map(publicPlayer),
    teams: room.teams.map(publicTeam),
    board,
    maxPlayers: MAX_PLAYERS,
    minPlayers: MIN_PLAYERS,
    winScore: BOARD_END,
    boardEnd: BOARD_END,
    difficulties: DIFFICULTIES,
    canStart: canStart(room),
    currentTeamId: team ? team.id : null,
    currentPlayerId: actor ? actor.id : null,
    currentActivity: room.currentActivity,
    currentCard: room.currentCard
      ? {
          category: room.currentCard.category,
          difficulty: room.currentCard.difficulty,
          special: room.currentCard.special,
          word: isActor ? room.currentCard.word : null
        }
      : null,
    endsAt: room.endsAt,
    log: room.log.slice(-5)
  };
}

function emitRoom(room) {
  room.players.forEach((player) => {
    if (player.socketId) io.to(player.socketId).emit("state", stateFor(room, player.id));
  });
}

function pushLog(room, text) {
  room.log.push({ id: Date.now() + Math.random(), text });
  if (room.log.length > 20) room.log.shift();
}

function clearTurnTimer(room) {
  if (room.timer) {
    clearTimeout(room.timer);
    room.timer = null;
  }
}

function finishTurn(room, success) {
  clearTurnTimer(room);
  if (room.status !== "playing") return;

  const team = currentTeam(room);
  const actor = currentActor(room);
  if (team && success && !room.currentCard?.special) {
    const moveBy = room.currentCard?.difficulty || 0;
    moveTeam(room, team, moveBy);
    pushLog(room, `${team.name} +${moveBy} (${actor?.name || "player"})`);
    if (finishIfWon(room, team)) {
      emitRoom(room);
      return;
    }
  }

  advanceTurn(room, team);
}

function finishSpecialTurn(room, winnerTeamId) {
  clearTurnTimer(room);
  if (room.status !== "playing" || !room.currentCard?.special) return;

  const team = currentTeam(room);
  const actor = currentActor(room);
  const winnerTeam = room.teams.find((candidate) => candidate.id === winnerTeamId);
  if (!team || !winnerTeam) return;

  if (winnerTeam.id === team.id) {
    moveTeam(room, team, 6);
    pushLog(room, `${team.name} +6 all-play (${actor?.name || "player"})`);
    if (finishIfWon(room, team)) {
      emitRoom(room);
      return;
    }
  } else {
    moveTeam(room, winnerTeam, 6);
    pushLog(room, `${winnerTeam.name} +6 all-play`);
    moveTeam(room, team, 3);
    pushLog(room, `${team.name} +3 all-play (${actor?.name || "player"})`);

    if (finishIfWon(room, winnerTeam) || finishIfWon(room, team)) {
      emitRoom(room);
      return;
    }
  }

  advanceTurn(room, team);
}

function advanceTurn(room, team) {
  if (team) room.turnCounts[team.id] = (room.turnCounts[team.id] || 0) + 1;
  room.currentTeamTurn = nextActiveTeamIndex(room, room.currentTeamTurn + 1);
  startTurn(room);
}

function moveTeam(room, team, steps) {
  team.position = Math.min(BOARD_END, team.position + steps);
  bumpOccupiedTeam(room, team);
  team.activity = team.position === 0 ? randomActivity() : board[team.position].category;
}

function finishIfWon(room, team) {
  if (team.position < BOARD_END) return false;

  room.status = "finished";
  room.currentCard = null;
  room.currentActivity = null;
  room.endsAt = null;
  pushLog(room, `${team.name} wins`);
  return true;
}

function bumpOccupiedTeam(room, movingTeam) {
  if (movingTeam.position <= 0 || movingTeam.position >= BOARD_END) return;

  const occupiedTeam = room.teams.find((team) => {
    return team.id !== movingTeam.id && team.position === movingTeam.position;
  });
  if (!occupiedTeam) return;

  occupiedTeam.position = Math.max(0, occupiedTeam.position - 1);
  occupiedTeam.activity = occupiedTeam.position === 0 ? randomActivity() : board[occupiedTeam.position].category;
  pushLog(room, `${occupiedTeam.name} moves back 1`);
}

function nextActiveTeamIndex(room, startIndex) {
  if (!room.teams.length) return 0;
  for (let offset = 0; offset < room.teams.length; offset += 1) {
    const index = (startIndex + offset) % room.teams.length;
    if (activeTeamPlayers(room, room.teams[index]).length) return index;
  }
  return 0;
}

function startTurn(room) {
  if (room.status === "lobby" && !canStart(room)) {
    room.status = "lobby";
    room.currentCard = null;
    room.endsAt = null;
    pushLog(room, "Waiting for at least 2 pairs");
    emitRoom(room);
    return;
  }

  if (room.status === "playing" && activeTeams(room).length < 2) {
    room.status = "lobby";
    room.currentCard = null;
    room.endsAt = null;
    pushLog(room, "Waiting for at least 2 active pairs");
    emitRoom(room);
    return;
  }

  room.status = "playing";
  room.currentTeamTurn = nextActiveTeamIndex(room, room.currentTeamTurn);
  const team = currentTeam(room);
  room.currentActivity = team?.activity || randomActivity();
  room.currentCard = null;
  room.endsAt = null;
  clearTurnTimer(room);
  emitRoom(room);
}

function leaveRoom(socket) {
  const code = socket.data.roomCode;
  if (!code || !rooms.has(code)) return;

  const room = rooms.get(code);
  const clientId = socket.data.clientId;
  const player = getPlayer(room, clientId);
  if (player && player.socketId === socket.id) {
    player.connected = false;
    player.socketId = null;
  }

  if (room.hostId === clientId) scheduleHostTransfer(room);

  if (!activePlayers(room).length) {
    clearTimeout(room.cleanupTimer);
    clearTimeout(room.hostTransferTimer);
    room.cleanupTimer = setTimeout(() => {
      if (!activePlayers(room).length) {
        clearTurnTimer(room);
        rooms.delete(code);
      }
    }, EMPTY_ROOM_TTL_MS);
    return;
  }

  emitRoom(room);
}

function scheduleHostTransfer(room) {
  clearTimeout(room.hostTransferTimer);
  room.hostTransferTimer = setTimeout(() => {
    const host = getPlayer(room, room.hostId);
    if (host?.connected) return;

    const nextHost = room.players.find((candidate) => candidate.connected);
    if (nextHost) {
      room.hostId = nextHost.id;
      emitRoom(room);
    }
  }, HOST_RECONNECT_GRACE_MS);
}

io.on("connection", (socket) => {
  socket.on("createRoom", ({ name, language, clientId }, reply) => {
    const stableId = sanitizeClientId(clientId);
    if (!stableId) {
      reply?.({ ok: false, error: "badClient" });
      return;
    }

    const room = makeRoom(stableId, language);
    const player = {
      id: stableId,
      socketId: socket.id,
      name: sanitizeName(name),
      teamId: null,
      color: room.players.length,
      connected: true
    };
    room.players.push(player);
    socket.data.clientId = stableId;
    socket.data.roomCode = room.code;
    socket.join(room.code);
    pushLog(room, `${player.name} created room ${room.code}`);
    reply?.({ ok: true, code: room.code });
    emitRoom(room);
  });

  socket.on("joinRoom", ({ name, code, clientId }, reply) => {
    const stableId = sanitizeClientId(clientId);
    if (!stableId) {
      reply?.({ ok: false, error: "badClient" });
      return;
    }

    const room = rooms.get(String(code || "").trim().toUpperCase());
    if (!room) {
      reply?.({ ok: false, error: "roomNotFound" });
      return;
    }

    clearTimeout(room.cleanupTimer);
    room.cleanupTimer = null;

    const existingPlayer = getPlayer(room, stableId);
    if (existingPlayer) {
      existingPlayer.name = sanitizeName(name) || existingPlayer.name;
      existingPlayer.socketId = socket.id;
      existingPlayer.connected = true;
      if (room.hostId === stableId) {
        clearTimeout(room.hostTransferTimer);
        room.hostTransferTimer = null;
      }
      socket.data.clientId = stableId;
      socket.data.roomCode = room.code;
      socket.join(room.code);
      reply?.({ ok: true, code: room.code, reconnected: true });
      emitRoom(room);
      return;
    }

    if (room.players.length >= MAX_PLAYERS) {
      reply?.({ ok: false, error: "roomFull" });
      return;
    }
    if (room.status !== "lobby") {
      reply?.({ ok: false, error: "gameStarted" });
      return;
    }

    const player = {
      id: stableId,
      socketId: socket.id,
      name: sanitizeName(name),
      teamId: null,
      color: room.players.length,
      connected: true
    };
    room.players.push(player);
    socket.data.clientId = stableId;
    socket.data.roomCode = room.code;
    socket.join(room.code);
    pushLog(room, `${player.name} joined`);
    reply?.({ ok: true, code: room.code });
    emitRoom(room);
  });

  socket.on("setLanguage", (language) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || room.hostId !== socket.data.clientId || room.status !== "lobby") return;
    room.language = language === "sr" ? "sr" : "en";
    emitRoom(room);
  });

  socket.on("startGame", () => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || room.hostId !== socket.data.clientId || !canStart(room)) return;
    room.players.forEach((player) => {
      player.teamId = null;
    });
    makeTeams(room);
    room.currentTeamTurn = 0;
    room.log = [];
    startTurn(room);
  });

  socket.on("markCorrect", () => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || room.status !== "playing" || !room.currentCard) return;
    if (room.currentCard.special) return;
    const currentPlayer = currentActor(room);
    if (room.hostId !== socket.data.clientId && currentPlayer?.id !== socket.data.clientId) return;
    finishTurn(room, true);
  });

  socket.on("resolveSpecial", (winnerTeamId) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || room.status !== "playing" || !room.currentCard?.special) return;

    const currentPlayer = currentActor(room);
    if (room.hostId !== socket.data.clientId && currentPlayer?.id !== socket.data.clientId) return;

    finishSpecialTurn(room, winnerTeamId);
  });

  socket.on("selectDifficulty", (difficulty) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || room.status !== "playing" || room.currentCard) return;

    const currentPlayer = currentActor(room);
    if (room.hostId !== socket.data.clientId && currentPlayer?.id !== socket.data.clientId) return;

    const value = Number(difficulty);
    if (!DIFFICULTIES.includes(value)) return;

    room.currentCard = pickCard(room.language, room.currentActivity, value);
    room.endsAt = Date.now() + TURN_SECONDS * 1000;
    clearTurnTimer(room);
    room.timer = setTimeout(() => finishTurn(room, false), TURN_SECONDS * 1000 + 250);
    emitRoom(room);
  });

  socket.on("skipTurn", () => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || room.status !== "playing") return;
    const currentPlayer = currentActor(room);
    if (room.hostId !== socket.data.clientId && currentPlayer?.id !== socket.data.clientId) return;
    finishTurn(room, false);
  });

  socket.on("restart", () => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || room.hostId !== socket.data.clientId) return;
    room.status = "lobby";
    room.currentCard = null;
    room.currentActivity = null;
    room.endsAt = null;
    room.teams = [];
    room.currentTeamTurn = 0;
    room.turnCounts = {};
    room.players.forEach((player) => {
      player.teamId = null;
    });
    clearTurnTimer(room);
    emitRoom(room);
  });

  socket.on("disconnect", () => leaveRoom(socket));
});

server.listen(PORT, () => {
  console.log(`Activity game running on http://localhost:${PORT}`);
});
