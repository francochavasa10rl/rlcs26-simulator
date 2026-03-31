let teams = [];
let swissMatches = [];
let currentStage = "setup";

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

  localStorage.setItem("teams", JSON.stringify(teams));

  startSwiss();
}

function startSwiss() {
  currentStage = "swiss";

  generateSwissRound1();
  renderSwiss();
}

function generateSwissRound1() {
  swissMatches = [];

  for (let i = 0; i < teams.length / 2; i++) {
    let teamA = teams[i];
    let teamB = teams[i + teams.length / 2];

    swissMatches.push({ teamA, teamB, played: false });
  }
}

function renderSwiss() {
  const app = document.getElementById("app");
  app.innerHTML = "<h2>Swiss Stage</h2>";

  swissMatches.forEach((match, index) => {
    if (match.played) return;

    const div = document.createElement("div");
    div.className = "match";

    div.innerHTML = `
      <div>${match.teamA.name} vs ${match.teamB.name}</div>
      <button onclick="playMatch(${index}, 'A')">${match.teamA.name}</button>
      <button onclick="playMatch(${index}, 'B')">${match.teamB.name}</button>
    `;

    app.appendChild(div);
  });
}

function playMatch(index, winner) {
  let match = swissMatches[index];
  if (match.played) return;

  let loser = winner === "A" ? match.teamB : match.teamA;
  let winnerTeam = winner === "A" ? match.teamA : match.teamB;

  winnerTeam.wins++;
  loser.losses++;

  winnerTeam.opponents.push(loser.name);
  loser.opponents.push(winnerTeam.name);

  match.played = true;

  updateBuchholz();

  if (checkSwissEnd()) {
    startGSL();
  } else if (allMatchesPlayed()) {
    nextSwissRound();
  }

  save();
  renderSwiss();
}

function updateBuchholz() {
  teams.forEach(team => {
    team.buchholz = team.opponents.reduce((sum, oppName) => {
      let opp = teams.find(t => t.name === oppName);
      return sum + (opp ? opp.wins : 0);
    }, 0);
  });
}

function allMatchesPlayed() {
  return swissMatches.every(m => m.played);
}

function checkSwissEnd() {
  return teams.filter(t => t.wins >= 3 || t.losses >= 3).length === teams.length;
}

function nextSwissRound() {
  swissMatches = [];

  let groups = {};

  teams.forEach(t => {
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

function startGSL() {
  currentStage = "gsl";

  let qualified = teams.filter(t => t.wins >= 3);

  qualified.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
    return a.seed - b.seed;
  });

  renderGSL(qualified);
}

function renderGSL(teams) {
  const app = document.getElementById("app");
  app.innerHTML = "<h2>GSL Stage (simplificado)</h2>";

  teams.forEach(t => {
    let div = document.createElement("div");
    div.innerText = t.name;
    app.appendChild(div);
  });
}

function simulateSeeds() {
  swissMatches.forEach((match, i) => {
    if (!match.played) {
      let winner = match.teamA.seed < match.teamB.seed ? "A" : "B";
      playMatch(i, winner);
    }
  });
}

function resetTournament() {
  localStorage.clear();
  location.reload();
}

function save() {
  localStorage.setItem("teams", JSON.stringify(teams));
}
