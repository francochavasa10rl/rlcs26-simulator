// =========================
// GLOBAL STATE
// =========================
let teams = [];
let swissMatches = [];
let stage = "setup";
let swissRound = 1;

let gslGroups = { A: null, B: null };
let gslBrackets = { A: null, B: null };

let hybridBracket = null;

// =========================
// START
// =========================
function startTournament() {
  const input = document.getElementById("teamsInput").value.trim().split("\n");

  teams = input.map((name, i) => ({
    name: name.trim(),
    seed: i + 1,
    wins: 0,
    losses: 0,
    buchholz: 0,
    opponents: []
  }));

  startSwiss();
}

// =========================
// SWISS
// =========================
function startSwiss() {
  stage = "swiss";
  swissRound = 1;
  generateSwissRound1();
  renderSwiss();
}

function generateSwissRound1() {
  swissMatches = [];
  let half = teams.length / 2;

  for (let i = 0; i < half; i++) {
    swissMatches.push({
      teamA: teams[i],
      teamB: teams[i + half],
      played: false
    });
  }
}

function nextSwissRound() {
  swissMatches = [];
  swissRound++;

  let groups = {};

  teams.forEach(t => {
    if (t.wins >= 3 || t.losses >= 3) return;
    let key = `${t.wins}-${t.losses}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  });

  Object.values(groups).forEach(group => {
    group.sort((a, b) => {
      if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
      return a.seed - b.seed;
    });

    let used = new Set();

    for (let i = 0; i < group.length; i++) {
      if (used.has(i)) continue;

      for (let j = i + 1; j < group.length; j++) {
        if (used.has(j)) continue;

        if (!group[i].opponents.includes(group[j].name)) {
          swissMatches.push({
            teamA: group[i],
            teamB: group[j],
            played: false
          });
          used.add(i);
          used.add(j);
          break;
        }
      }
    }
  });
}

// =========================
// RENDER SWISS
// =========================
function renderSwiss() {
  const app = document.getElementById("app");
  app.innerHTML = `<h2>Swiss Round ${swissRound}</h2>`;

  let container = document.createElement("div");
  container.className = "swiss-container";

  swissMatches.forEach((m, i) => {
    let div = document.createElement("div");
    div.className = "match";

    div.innerHTML = `
      <div class="team" onclick="playSwiss(${i}, 'A')">${m.teamA.name}</div>
      <div class="team" onclick="playSwiss(${i}, 'B')">${m.teamB.name}</div>
    `;

    container.appendChild(div);
  });

  app.appendChild(container);
}

// =========================
// PLAY SWISS MATCH
// =========================
function playSwiss(i, winner) {
  let m = swissMatches[i];
  if (m.played) return;

  let W = winner === "A" ? m.teamA : m.teamB;
  let L = winner === "A" ? m.teamB : m.teamA;

  W.wins++;
  L.losses++;

  W.opponents.push(L.name);
  L.opponents.push(W.name);

  m.played = true;

  updateBuchholz();

  if (teams.filter(t => t.wins >= 3).length >= 16) {
    startGSL();
  } else if (swissMatches.every(x => x.played)) {
    nextSwissRound();
  }

  renderSwiss();
}

// =========================
// BUCHHOLZ
// =========================
function updateBuchholz() {
  teams.forEach(t => {
    t.buchholz = t.opponents.reduce((sum, o) => {
      let opp = teams.find(x => x.name === o);
      return sum + (opp ? opp.wins : 0);
    }, 0);
  });
}

// =========================
// GSL
// =========================
function startGSL() {
  stage = "gsl";

  let qualified = teams
    .filter(t => t.wins >= 3)
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
      return a.seed - b.seed;
    });

  let A = qualified.slice(0, 8);
  let B = qualified.slice(8, 16);

  gslGroups.A = [A[0], B[1], A[2], B[3], A[4], B[5], A[6], B[7]];
  gslGroups.B = [B[0], A[1], B[2], A[3], B[4], A[5], B[6], A[7]];

  gslBrackets.A = createGSLBracket(gslGroups.A);
  gslBrackets.B = createGSLBracket(gslGroups.B);

  renderGSL();
}

function createGSLBracket(group) {
  return {
    upper: [
      [{ teamA: group[0], teamB: group[3] }, { teamA: group[1], teamB: group[2] }]
    ],
    lower: [],
    qualified: []
  };
}

// =========================
// RENDER GSL
// =========================
function renderGSL() {
  const app = document.getElementById("app");
  app.innerHTML = "<h2>GSL Stage</h2>";

  renderGSLGroup(app, "A");
  renderGSLGroup(app, "B");
}

function renderGSLGroup(app, groupKey) {
  let group = gslGroups[groupKey];

  let div = document.createElement("div");
  div.innerHTML = `<h3>Group ${groupKey}</h3>`;

  group.forEach(t => {
    let el = document.createElement("div");
    el.innerText = t.name;
    div.appendChild(el);
  });

  app.appendChild(div);
}

// =========================
// HYBRID
// =========================
function startHybrid() {
  stage = "hybrid";

  let A = gslGroups.A.slice(0, 4);
  let B = gslGroups.B.slice(0, 4);

  hybridBracket = [
    [
      { teamA: A[0], teamB: B[1] },
      { teamA: B[0], teamB: A[1] },
      { teamA: A[2], teamB: B[3] },
      { teamA: B[2], teamB: A[3] }
    ],
    [
      { teamA: null, teamB: null },
      { teamA: null, teamB: null }
    ],
    [
      { teamA: null, teamB: null }
    ]
  ];

  renderHybrid();
}

// =========================
// RENDER HYBRID
// =========================
function renderHybrid() {
  const app = document.getElementById("app");
  app.innerHTML = "<h2>Playoffs</h2>";

  renderBracket(app, hybridBracket);
}

// =========================
// GENERIC BRACKET RENDER
// =========================
function renderBracket(parent, rounds) {
  let bracket = document.createElement("div");
  bracket.className = "bracket";

  rounds.forEach((round, r) => {
    let col = document.createElement("div");
    col.className = "round";

    round.forEach((m, i) => {
      let div = document.createElement("div");
      div.className = "bracket-match";

      div.innerHTML = `
        <div class="bracket-team" onclick="playBracket(${r},${i},'A')">${m.teamA?.name || "-"}</div>
        <div class="bracket-team" onclick="playBracket(${r},${i},'B')">${m.teamB?.name || "-"}</div>
      `;

      col.appendChild(div);
    });

    bracket.appendChild(col);
  });

  parent.appendChild(bracket);
}

// =========================
// PLAY BRACKET
// =========================
function playBracket(r, m, w) {
  let match = hybridBracket[r][m];
  if (match.winner) return;

  match.winner = w;
  let winner = w === "A" ? match.teamA : match.teamB;

  if (hybridBracket[r + 1]) {
    let next = hybridBracket[r + 1][Math.floor(m / 2)];
    if (m % 2 === 0) next.teamA = winner;
    else next.teamB = winner;
  }

  renderHybrid();
}
