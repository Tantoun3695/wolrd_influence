// Simple world-strategy prototype using D3 geo + GeoJSON
// Fetch geoJSON and render an interactive map; highlight big powers for gameplay.

const BIG_POWERS = [
  "United States",
  "China",
  "Russia",
  "India",
  "United Kingdom",
  "France",
  "Germany",
  "Japan",
  "Brazil"
];

const WIDTH = 900, HEIGHT = 560;
const svg = d3.select("#worldmap")
  .attr("width", WIDTH).attr("height", HEIGHT);

const projection = d3.geoMercator()
  .scale(150).translate([WIDTH/2, HEIGHT/1.6]);
const path = d3.geoPath().projection(projection);

let state = {}; // countryName -> stats

// Initialize playable countries with starting stats
BIG_POWERS.forEach(name => {
  state[name] = {
    name,
    taxes: 10,
    happiness: Math.round(50 + Math.random()*20),
    economy: Math.round(60 + Math.random()*30),
    infra: Math.round(20 + Math.random()*40),
    influence: Math.round(20 + Math.random()*40)
  };
});

function updateLeaderboard(){
  const list = Object.values(state).sort((a,b)=>b.influence-a.influence).slice(0,9);
  const ul = d3.select("#leaders").selectAll("li").data(list, d=>d.name);
  ul.join(
    enter => enter.append("li").html(d => `<strong>${d.name}</strong><span>${d.influence}</span>`),
    update => update.html(d => `<strong>${d.name}</strong><span>${d.influence}</span>`),
    exit => exit.remove()
  );
}

function showCountryPanel(name){
  const info = state[name];
  if(!info) return;
  d3.select("#empty").classed("hidden", true);
  const panel = d3.select("#countryPanel").classed("hidden", false);
  d3.select("#countryName").text(info.name);
  d3.select("#happiness").text(info.happiness);
  d3.select("#economy").text(info.economy);
  d3.select("#infra").text(info.infra);
  d3.select("#influence").text(info.influence);
  d3.select("#taxSlider").property("value", info.taxes);
  d3.select("#taxVal").text(info.taxes + "%");
  d3.select("#log").html(`<div>Managing ${info.name}</div>`);
  // Attach controls
  d3.select("#taxSlider").on("input", function(){
    info.taxes = +this.value;
    d3.select("#taxVal").text(info.taxes + "%");
  });

  d3.select("#buildInfra").on("click", ()=>{
    const cost = Math.max(5, Math.round(50 - info.economy/2));
    if(info.economy < cost){
      appendLog("Not enough economy to build infrastructure.");
      return;
    }
    info.economy -= cost;
    info.infra += 5;
    info.influence += 4;
    appendLog(`Built infra (-${cost} econ). Infra +5, Influence +4`);
    refreshPanel(info);
  });

  d3.select("#investInfluence").on("click", ()=>{
    const cost = 20;
    if(info.economy < cost){ appendLog("Can't afford influence investments."); return; }
    info.economy -= cost;
    info.influence += 10;
    appendLog("Invested in influence: +10 influence.");
    refreshPanel(info);
  });

  d3.select("#viralAd").on("click", ()=>{
    const cost = 8;
    if(info.economy < cost){ appendLog("Can't afford a campaign."); return; }
    info.economy -= cost;
    const gain = Math.random() < 0.7 ? 6 : 1;
    info.influence += gain;
    info.happiness += gain>3?2:-2;
    appendLog(`Viral campaign: +${gain} influence.`);
    refreshPanel(info);
  });

  d3.select("#taxScare").on("click", ()=>{
    // risky clickbait: may boost short-term clicks but lowers happiness
    const chance = Math.random();
    if(chance < 0.5){
      info.influence += 8;
      info.happiness -= 10;
      appendLog("Tax Scare went viral: Influence +8, Happiness -10.");
    } else {
      info.happiness -= 5;
      appendLog("Backlash: Happiness -5, little gain.");
    }
    refreshPanel(info);
  });
}

function refreshPanel(info){
  d3.select("#happiness").text(info.happiness);
  d3.select("#economy").text(info.economy);
  d3.select("#infra").text(info.infra);
  d3.select("#influence").text(info.influence);
  updateLeaderboard();
}

function appendLog(msg){
  const log = d3.select("#log");
  log.append("div").text(`[Turn] ${msg}`);
  log.node().scrollTop = log.node().scrollHeight;
}

// Back button
d3.select("#back").on("click", ()=>{
  d3.select("#countryPanel").classed("hidden", true);
  d3.select("#empty").classed("hidden", false);
});

// Turn resolution: taxes affect economy/happiness, infrastructure small passive gains, random events
d3.select("#endTurn").on("click", ()=>{
  Object.values(state).forEach(s => {
    // Taxes: higher taxes -> short term economy up, happiness down
    const taxEffect = s.taxes - 10;
    s.economy += Math.round(taxEffect * 0.5);
    s.happiness -= Math.round(taxEffect * 0.4);
    // Infrastructure yields economy over time
    s.economy += Math.round(s.infra * 0.1);
    // natural happiness recovery
    s.happiness += Math.random() < 0.35 ? 1 : 0;
    // clamp
    s.happiness = Math.max(0, Math.min(100, s.happiness));
    s.economy = Math.max(0, s.economy);
    // small passive influence from infra+economy
    s.influence += Math.round((s.infra/10) + (s.economy/100));
    // random event
    if(Math.random() < 0.08){
      const ev = Math.random() < 0.5 ? -8 : +8;
      s.influence = Math.max(0, s.influence + ev);
      appendLog(`${s.name} event: influence ${ev>0?"+":""}${ev}`);
    }
  });
  updateLeaderboard();
  appendLog("Turn resolved.");
  // Victory check
  const winner = Object.values(state).find(s => s.influence >= 300);
  if(winner){
    alert(`${winner.name} achieved global dominance!`);
  }
  // refresh visible panel
  const name = d3.select("#countryName").text();
  if(name) refreshPanel(state[name]);
});

// Load geojson and render world map
d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/data/world.geojson").then(geo => {
  svg.append("g").selectAll("path")
    .data(geo.features)
    .join("path")
    .attr("d", path)
    .attr("class", d => {
      const n = d.properties.name;
      return BIG_POWERS.includes(n) ? "country playable" : "country";
    })
    .attr("fill", d => {
      const n = d.properties.name;
      if(BIG_POWERS.includes(n)){
        // color by initial influence
        const s = state[n];
        const scale = Math.min(1, s.influence/120);
        return d3.interpolateWarm(scale);
      }
      return "#0b2130";
    })
    .on("click", function(event, d){
      const name = d.properties.name;
      if(!BIG_POWERS.includes(name)){ appendLog("This country is not a major power (not playable)."); return; }
      showCountryPanel(name);
    })
    .on("mouseover", function(event, d){ d3.select(this).attr("opacity",0.9); })
    .on("mouseout", function(){ d3.select(this).attr("opacity",1); });

  svg.append("g").selectAll("text")
    .data(geo.features.filter(f => BIG_POWERS.includes(f.properties.name)))
    .join("text")
    .attr("transform", d => {
      const c = path.centroid(d);
      return `translate(${c[0]},${c[1]})`;
    })
    .text(d => {
      const n = d.properties.name;
      return n.split(" ")[0]; // short label
    })
    .attr("font-size", 11)
    .attr("fill", "#041322")
    .attr("text-anchor","middle")
    .attr("dy",4)
    .style("pointer-events","none");

  updateLeaderboard();
});