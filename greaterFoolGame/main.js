//----------------------------------------------------------
// SUPABASE SETUP (CRITICAL FIX)
//----------------------------------------------------------
const supabaseClient = window.supabase.createClient(
  "https://omqyafbpcqolkozzwrcl.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tcXlhZmJwY3FvbGtvenp3cmNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2MTc2OTYsImV4cCI6MjA4MTE5MzY5Nn0.ff-qEqdl11wJxH-EDKYJIhXJYo_eHHN80PHZIFjnzBo"
);

//----------------------------------------------------------
// GAME STATE
//----------------------------------------------------------
let WIS = 1, LUCK = 1, CRT = 1;
let price = 1.0;
let cash = 100;
let shares = 0;
let timeLeft = 120;
let rng = Math.random;
let botInterval, timerInterval;

//----------------------------------------------------------
// RNG
//----------------------------------------------------------
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

//----------------------------------------------------------
// AUTH + GENEAN LOAD
//----------------------------------------------------------
async function loadGenean() {
  const { data } = await supabaseClient.auth.getUser();
  if (!data.user) {
    window.location.href = "../../index.html";
    return;
  }

  const { data: genean } = await supabaseClient
    .from("geneans")
    .select("*")
    .limit(1)
    .single();

  if (!genean) {
    alert("No Genean found.");
    window.location.href = "../../dashboard.html";
    return;
  }

  WIS = genean.wis;
  LUCK = genean.lck;
  CRT = genean.crt;

  document.getElementById("geneanName").innerText = genean.name;
  document.getElementById("statWIS").innerText = WIS;
  document.getElementById("statLUCK").innerText = LUCK;
  document.getElementById("statCRT").innerText = CRT;

  document.getElementById("buyAmountBtn").innerText =
    1 + Math.floor(WIS / 10);
  document.getElementById("sellAmountBtn").innerText =
    1 + Math.floor(WIS / 10);

  if (CRT > 5) {
    document.getElementById("leverage-panel").style.display = "flex";
    document.getElementById("levVal1").innerText = 1 + Math.floor(CRT / 5);
    document.getElementById("levVal2").innerText = 1 + Math.floor(CRT / 5);
  }
}

//----------------------------------------------------------
// START BUTTON
//----------------------------------------------------------
document.getElementById("start-game-btn").addEventListener("click", async () => {
  const seedInput = document.getElementById("seed-input");
  let seed = parseInt(seedInput.value, 10);

  if (!Number.isFinite(seed)) {
    seed = Math.floor(Math.random() * 1e9);
  }

  rng = mulberry32(seed);

  document.getElementById("intro-screen").style.display = "none";
  document.querySelector(".container").style.display = "block";

  await loadGenean();
  startGame();
});

//----------------------------------------------------------
// CORE GAME LOOP (SIMPLIFIED)
//----------------------------------------------------------
function updatePrice() {
  const change = (rng() - 0.5) * (1 + LUCK / 10);
  price = Math.max(0.01, price + change);
  document.getElementById("price").innerText = `$${price.toFixed(2)}`;
  updateWealth();
}

function updateWealth() {
  document.getElementById("cash").innerText = `$${cash.toFixed(2)}`;
  document.getElementById("shares").innerText = shares;
  document.getElementById("wealth").innerText =
    `$${(cash + shares * price).toFixed(2)}`;
}

function startTimer() {
  timerInterval = setInterval(() => {
    timeLeft--;
    document.getElementById("timer").innerText = timeLeft;
    if (timeLeft <= 0) endGame();
  }, 1000);
}

function startGame() {
  botInterval = setInterval(updatePrice, 700);
  startTimer();
}

//----------------------------------------------------------
// END GAME
//----------------------------------------------------------
function endGame() {
  clearInterval(botInterval);
  clearInterval(timerInterval);
  alert("Market Rugged.");
}

//----------------------------------------------------------
// BUY / SELL
//----------------------------------------------------------
document.getElementById("buy-btn").onclick = () => {
  if (cash >= price) {
    cash -= price;
    shares++;
    updateWealth();
  }
};

document.getElementById("sell-btn").onclick = () => {
  if (shares > 0) {
    shares--;
    cash += price;
    updateWealth();
  }
};
