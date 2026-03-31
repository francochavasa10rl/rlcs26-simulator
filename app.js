// =======================
// GLOBAL STATE
// =======================
let teams = [];
let swissMatches = [];
let currentStage = "setup";
let bracketData = [];

// =======================
// INIT
// =======================
window.onload = () => {
  const saved = localStorage.getItem("teams");
  if (saved) {
    teams = JSON.parse(saved);
  }
};

// =======================
// START
// =======================
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

// =======================
// SWISS
// =======================
function startSwiss() {
  currentStage = "swiss";
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

// =======================
// RENDER SWISS (PRO)
// =======================
function renderSwiss() {
  const app = document.getElementById("app");
  app.innerHTML = "<h2>Swiss Stage</h2>";

  let groups = {};

  swissMatches.forEach((match, i) => {
    if (match.played) return;

    let record = `${match.teamA.wins}-${match.teamA.losses}`;
    if (!groups[record]) groups[record] = [];

    groups[record].push({ match, index: i });
  });

  let container = document.createElement("div");
  container.className = "swiss-container";

  Object.keys(groups).sort().reverse().forEach(record => {
    let div = document.createElement("div");
    div.className = "record-group";

    div.innerHTML = `<div class="record-title">${record}</div>`;

    groups[record].forEach(({ match, index }) => {
      let matchDiv = document.createElement("div");
      matchDiv.className = "match";

      matchDiv.innerHTML = `
        <div class="team" onclick="playMatch(${index}, 'A')">
          ${match.teamA.name}
          <span class="seed">#${match.teamA.seed}</span>
        </div>
        <div class="team" onclick="playMatch(${index}, 'B')">
          ${match.teamB.name}
          <span class="seed">#${match.teamB.seed}</span>
        </div>
      `;

      div.appendChild(matchDiv);
    });

    container.appendChild(div);
  });

  app.appendChild(container);
}

// =======================
// PLAY MATCH
// =======================
function playMatch(index, winner) {
  let match = swissMatches[index];
  if (match.played) return;

  let winnerTeam = winner === "A" ? match.teamA : match.teamB;
  let loser = winner === "A" ? match.teamB : match.teamA;

  winnerTeam.wins++;
  loser.losses++;

  winnerTeam.opponents.push(loser.name);
  loser.opponents.push(winnerTeam.name);

  match.played = true;

  updateBuchholz();

  if (checkSwissEnd()) {
    startBracket(); // siguiente fase
  } else if (allMatchesPlayed()) {
    nextSwissRound();
  }

  save();
  renderSwiss();
}

// =======================
// BUCHHOLZ
// =======================
function updateBuchholz() {
  teams.forEach(team => {
    team.buchholz = team.opponents.reduce((sum, oppName) => {
      let opp = teams.find(t => t.name === oppName);
      return sum + (opp ? opp.wins : 0);
    }, 0);
  });
}

// =======================
// NEXT ROUND
// =======================
function nextSwissRound() {
  swissMatches = [];

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

    for (let i = 0; i < group.length; i += 2) {
      swissMatches.push({
        teamA: group[i],
        teamB: group[i + 1],
        played: false
      });
    }
  });
}

// =======================
// CHECKS
// =======================
function allMatchesPlayed() {
  return swissMatches.every(m => m.played);
}

function checkSwissEnd() {
  return teams.filter(t => t.wins >= 3).length >= 8;
}

// =======================
// BRACKET (BASE)
// =======================
function startBracket() {
  currentStage = "playoffs";

  let qualified = teams
    .filter(t => t.wins >= 3)
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
      return a.seed - b.seed;
    })
    .slice(0, 8);

  bracketData = [
    [
      { teamA: qualified[0], teamB: qualified[7] },
      { teamA: qualified[1], teamB: qualified[6] },
      { teamA: qualified[2], teamB: qualified[5] },
      { teamA: qualified[3], teamB: qualified[4] }
    ],
    [
      { teamA: null, teamB: null },
      { teamA: null, teamB: null }
    ],
    [
      { teamA: null, teamB: null }
    ]
  ];

  renderBracket(bracketData);
}

// =======================
// RENDER BRACKET
// =======================
function renderBracket(rounds) {
  const app = document.getElementById("app");
  app.innerHTML = "<h2>Playoffs</h2>";

  let bracket = document.createElement("div");
  bracket.className = "bracket";

  rounds.forEach((round, rIndex) => {
    let roundDiv = document.createElement("div");
    roundDiv.className = "round";

    round.forEach((match, mIndex) => {
      let matchDiv = document.createElement("div");
      matchDiv.className = "bracket-match";

      matchDiv.innerHTML = `
        <div class="bracket-team ${match.winner === 'A' ? 'winner' : ''}" 
          onclick="playBracketMatch(${rIndex}, ${mIndex}, 'A')">
          ${match.teamA?.name || "-"}
        </div>
        <div class="bracket-team ${match.winner === 'B' ? 'winner' : ''}" 
          onclick="playBracketMatch(${rIndex}, ${mIndex}, 'B')">
          ${match.teamB?.name || "-"}
        </div>
      `;

      roundDiv.appendChild(matchDiv);
    });

    bracket.appendChild(roundDiv);
  });

  app.appendChild(bracket);
}

// =======================
// PLAY BRACKET MATCH
// =======================
function playBracketMatch(r, m, winner) {
  let match = bracketData[r][m];
  if (match.winner) return;

  match.winner = winner;

  let winnerTeam = winner === "A" ? match.teamA : match.teamB;

  if (bracketData[r + 1]) {
    let nextMatch = bracketData[r + 1][Math.floor(m / 2)];

    if (m % 2 === 0) {
      nextMatch.teamA = winnerTeam;
    } else {
      nextMatch.teamB = winnerTeam;
    }
  }

  renderBracket(bracketData);
}

// =======================
// SIMULATE
// =======================
function simulateSeeds() {
  swissMatches.forEach((match, i) => {
    if (!match.played) {
      let winner = match.teamA.seed < match.teamB.seed ? "A" : "B";
      playMatch(i, winner);
    }
  });
}

// =======================
// STORAGE
// =======================
function save() {
  localStorage.setItem("teams", JSON.stringify(teams));
}

function resetTournament() {
  localStorage.clear();
  location.reload();
}
