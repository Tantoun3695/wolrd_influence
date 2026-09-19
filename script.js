const BIG_POWERS = [
  { name: "United States", aliases: ["United States", "United States of America"], x: 0.22, y: 0.42 },
  { name: "China", aliases: ["China"], x: 0.77, y: 0.42 },
  { name: "Russia", aliases: ["Russia", "Russian Federation"], x: 0.68, y: 0.23 },
  { name: "India", aliases: ["India"], x: 0.70, y: 0.55 },
  { name: "United Kingdom", aliases: ["United Kingdom"], x: 0.48, y: 0.28 },
  { name: "France", aliases: ["France"], x: 0.49, y: 0.37 },
  { name: "Germany", aliases: ["Germany"], x: 0.53, y: 0.32 },
  { name: "Japan", aliases: ["Japan"], x: 0.87, y: 0.39 },
  { name: "Brazil", aliases: ["Brazil"], x: 0.34, y: 0.68 }
];

const state = Object.fromEntries(BIG_POWERS.map(({ name }) => [name, {
  name,
  taxes: 10,
  happiness: 50 + Math.floor(Math.random() * 21),
  economy: 60 + Math.floor(Math.random() * 31),
  infra: 20 + Math.floor(Math.random() * 41),
  influence: 20 + Math.floor(Math.random() * 41)
}]));

let selectedCountry = null;
const svg = document.querySelector("#worldmap");
const log = document.querySelector("#log");

function $(id) {
  return document.getElementById(id);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function appendLog(message) {
  if (!log) return;
  const entry = document.createElement("div");
  entry.textContent = `[Turn] ${message}`;
  log.appendChild(entry);
  log.scrollTop = log.scrollHeight;
}

function updateLeaderboard() {
  const list = Object.values(state)
    .sort((a, b) => b.influence - a.influence)
    .slice(0, 9);
  $("leaders").innerHTML = list
    .map(country => `<li><strong>${country.name}</strong><span>${country.influence}</span></li>`)
    .join("");
}

function refreshPanel() {
  if (!selectedCountry) return;
  $("countryName").textContent = selectedCountry.name;
  $("happiness").textContent = selectedCountry.happiness;
  $("economy").textContent = selectedCountry.economy;
  $("infra").textContent = selectedCountry.infra;
  $("influence").textContent = selectedCountry.influence;
  $("taxSlider").value = selectedCountry.taxes;
  $("taxVal").textContent = `${selectedCountry.taxes}%`;
  updateLeaderboard();
}

function selectCountry(name) {
  selectedCountry = state[name];
  $("empty").classList.add("hidden");
  $("countryPanel").classList.remove("hidden");
  $("log").innerHTML = "";
  refreshPanel();
  appendLog(`Managing ${name}.`);
}

function createPowerMarker(power) {
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
  const x = power.x * 900;
  const y = power.y * 560;

  group.classList.add("power-marker");
  group.dataset.country = power.name;
  circle.setAttribute("cx", x);
  circle.setAttribute("cy", y);
  circle.setAttribute("r", 13);
  circle.setAttribute("fill", "#ff7b00");
  circle.setAttribute("stroke", "#ffe0b2");
  circle.setAttribute("stroke-width", "2");
  label.setAttribute("x", x);
  label.setAttribute("y", y + 31);
  label.setAttribute("text-anchor", "middle");
  label.setAttribute("fill", "#f4f7fb");
  label.setAttribute("font-size", "12");
  label.textContent = power.name;
  group.append(circle, label);
  group.addEventListener("click", () => selectCountry(power.name));
  svg.appendChild(group);
}

function drawFallbackMap() {
  svg.innerHTML = "";
  const ocean = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  ocean.setAttribute("width", "900");
  ocean.setAttribute("height", "560");
  ocean.setAttribute("fill", "#09263a");
  svg.appendChild(ocean);

  const title = document.createElementNS("http://www.w3.org/2000/svg", "text");
  title.setAttribute("x", "450");
  title.setAttribute("y", "42");
  title.setAttribute("text-anchor", "middle");
  title.setAttribute("fill", "#9aa7c0");
  title.setAttribute("font-size", "16");
  title.textContent = "GLOBAL INFLUENCE MAP";
  svg.appendChild(title);

  BIG_POWERS.forEach(createPowerMarker);
}

function bindControls() {
  $("taxSlider").addEventListener("input", event => {
    if (!selectedCountry) return;
    selectedCountry.taxes = Number(event.target.value);
    $("taxVal").textContent = `${selectedCountry.taxes}%`;
  });

  $("back").addEventListener("click", () => {
    selectedCountry = null;
    $("countryPanel").classList.add("hidden");
    $("empty").classList.remove("hidden");
  });

  $("buildInfra").addEventListener("click", () => {
    if (!selectedCountry) return;
    const cost = Math.max(5, Math.round(50 - selectedCountry.economy / 2));
    if (selectedCountry.economy < cost) {
      appendLog("Not enough economy to build infrastructure.");
      return;
    }
    selectedCountry.economy -= cost;
    selectedCountry.infra += 5;
    selectedCountry.influence += 4;
    appendLog(`Built infrastructure (-${cost} economy).`);
    refreshPanel();
  });

  $("investInfluence").addEventListener("click", () => {
    if (!selectedCountry) return;
    if (selectedCountry.economy < 20) {
      appendLog("You cannot afford an influence investment.");
      return;
    }
    selectedCountry.economy -= 20;
    selectedCountry.influence += 10;
    appendLog("Influence investment succeeded (+10 influence).");
    refreshPanel();
  });

  $("viralAd").addEventListener("click", () => {
    if (!selectedCountry) return;
    if (selectedCountry.economy < 8) {
      appendLog("You cannot afford a viral campaign.");
      return;
    }
    selectedCountry.economy -= 8;
    const gain = Math.random() < 0.7 ? 6 : 1;
    selectedCountry.influence += gain;
    selectedCountry.happiness = clamp(selectedCountry.happiness + (gain > 3 ? 2 : -2), 0, 100);
    appendLog(`Viral campaign gained ${gain} influence.`);
    refreshPanel();
  });

  $("taxScare").addEventListener("click", () => {
    if (!selectedCountry) return;
    if (Math.random() < 0.5) {
      selectedCountry.influence += 8;
      selectedCountry.happiness = clamp(selectedCountry.happiness - 10, 0, 100);
      appendLog("Tax Scare went viral (+8 influence, -10 happiness).");
    } else {
      selectedCountry.happiness = clamp(selectedCountry.happiness - 5, 0, 100);
      appendLog("Tax Scare caused backlash (-5 happiness).");
    }
    refreshPanel();
  });

  $("endTurn").addEventListener("click", () => {
    Object.values(state).forEach(country => {
      const taxEffect = country.taxes - 10;
      country.economy = Math.max(0, country.economy + Math.round(taxEffect * 0.5) + Math.round(country.infra * 0.1));
      country.happiness = clamp(country.happiness - Math.round(taxEffect * 0.4) + (Math.random() < 0.35 ? 1 : 0), 0, 100);
      country.influence += Math.round(country.infra / 10 + country.economy / 100);
      if (Math.random() < 0.08) {
        const change = Math.random() < 0.5 ? -8 : 8;
        country.influence = Math.max(0, country.influence + change);
      }
    });
    updateLeaderboard();
    appendLog("Turn resolved. Taxes, happiness, and infrastructure updated.");
    if (selectedCountry) refreshPanel();
  });
}

bindControls();
drawFallbackMap();
updateLeaderboard();
