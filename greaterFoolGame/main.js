//----------------------------------------------------------
// AUDIO FILES (all .mp3)
//----------------------------------------------------------
const SND_CLICK = new Audio("click.mp3");
const SND_WHALE = new Audio("splash.mp3");
const SND_WHALE_EXIT = new Audio("splashLow.mp3");
const SND_SIREN = new Audio("siren.mp3");

//----------------------------------------------------------
// CHARACTER DEFINITIONS
//----------------------------------------------------------
const characters = {
    sage: { name: "Sage of Hollowpeak", WIS: 100, LUCK: 20, CRT: 10 },
    lark: { name: "Fortune-Blessed Lark", WIS: 15, LUCK: 100, CRT: 15 },
    maker: { name: "The Maker of Echoes", WIS: 100, LUCK: 999, CRT: 100 }
};

// Selected character stats
let WIS = 0, LUCK = 0, CRT = 0;

//----------------------------------------------------------
// GAME STATE
//----------------------------------------------------------
let price = 1.00;
let cash = 100.00;
let shares = 0;
let timeLeft = 180;

let maxBuy = 1;
let luckMultiplier = 1;
let maxLeverage = 1;

let inLeverage = false;
let levSide = null;
let levEntry = 0;
let levFactor = 1;

let botInterval;
let timerInterval;

let priceHistory = [];
let whaleCount = 0;

//----------------------------------------------------------
// END GAME STATS
//----------------------------------------------------------
let highestPrice = 1;
let lowestPrice = 1;
let totalWhaleEnters = 0;
let totalWhaleExits = 0;
let totalMegaWhales = 0;
let biggestUp = 0;
let biggestDown = 0;

//----------------------------------------------------------
// DOM REFERENCES
//----------------------------------------------------------
const priceUI = document.getElementById("price");
const cashUI = document.getElementById("cash");
const sharesUI = document.getElementById("shares");
const wealthUI = document.getElementById("wealth");
const timerUI = document.getElementById("timer");

const buyAmountBtn = document.getElementById("buyAmountBtn");
const sellAmountBtn = document.getElementById("sellAmountBtn");

const logBox = document.getElementById("log");

const chart = document.getElementById("priceChart");
const ctx = chart.getContext("2d");

//----------------------------------------------------------
// INTRO → CHARACTER SELECT
//----------------------------------------------------------
document.getElementById("start-game-btn").addEventListener("click", () => {
    document.getElementById("intro-screen").style.display = "none";
    document.getElementById("character-select").style.display = "block";
});

//----------------------------------------------------------
// BUTTON CLICK WRAPPER (adds sound)
//----------------------------------------------------------
function addClick(id, fn) {
    document.getElementById(id).addEventListener("click", () => {
        SND_CLICK.currentTime = 0;
        SND_CLICK.play();
        fn();
    });
}

function attachTradingButtons() {
    addClick("buy-btn", buyShare);
    addClick("sell-btn", sellShare);
    addClick("long-btn", () => openLeverage("long"));
    addClick("short-btn", () => openLeverage("short"));
    addClick("close-pos-btn", closePosition);
    addClick("share-btn", followOnX);

    document.getElementById("popup-share").addEventListener("click", followOnX);
    document.getElementById("popup-close").addEventListener("click", () => {
        document.getElementById("share-popup").style.display = "none";
    });
}

//----------------------------------------------------------
// CHARACTER SELECT
//----------------------------------------------------------
document.querySelectorAll(".char-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const c = characters[btn.dataset.char];

        WIS = c.WIS;
        LUCK = c.LUCK;
        CRT = c.CRT;

        document.getElementById("charName").textContent = c.name;
        document.getElementById("statWIS").textContent = WIS;
        document.getElementById("statLUCK").textContent = LUCK;
        document.getElementById("statCRT").textContent = CRT;

        // Stat scaling
        maxBuy = 1 + Math.floor((WIS / 100) * 9);
        luckMultiplier = 1 + (LUCK / 100);
        maxLeverage = 1 + Math.floor((CRT / 100) * 24);

        buyAmountBtn.textContent = maxBuy;
        sellAmountBtn.textContent = maxBuy;

        document.getElementById("levVal1").textContent = maxLeverage;
        document.getElementById("levVal2").textContent = maxLeverage;

        if (CRT > 0) {
            document.getElementById("leverage-panel").style.display = "flex";
        }

        document.getElementById("character-select").style.display = "none";
        document.querySelector(".container").style.display = "block";

        attachTradingButtons();
        startGame();
    });
});

//----------------------------------------------------------
// BOT VOLATILITY
//----------------------------------------------------------
function botAction() {
    const r = Math.random();
    if (r < 0.33) return +(Math.random() * 0.5);
    if (r < 0.66) return -(Math.random() * 0.5);
    return 0;
}

//----------------------------------------------------------
// WHALE EVENTS + LUCK SCALING + MEGA WHALE
//----------------------------------------------------------
function whaleEvents() {
    const whaleBoost = 1 + (LUCK / 100);

    // Whale enter
    if (Math.random() < 0.01 * whaleBoost) {
        const boost = Math.floor(Math.random() * 91) + 10;
        price += boost;
        whaleCount++;
        totalWhaleEnters++;

        SND_WHALE.currentTime = 0;
        SND_WHALE.play();

        addLog(`🐋 Whale ENTERED! +$${boost}`);
    }

    // Whale exit
    if (whaleCount > 0 && Math.random() < 0.01 * whaleBoost) {
        const drop = Math.floor(Math.random() * 91) + 10;
        price -= drop;
        if (price < 0.01) price = 0.01;

        whaleCount--;
        totalWhaleExits++;

        SND_WHALE_EXIT.currentTime = 0;
        SND_WHALE_EXIT.play();

        addLog(`🐋 Whale EXITED! -$${drop}`);
    }

    // Mega whale
    if (Math.random() < 0.001 * whaleBoost) {
        const mega = Math.floor(Math.random() * 1501) + 500;
        price += mega;
        whaleCount += 3;
        totalMegaWhales++;

        SND_WHALE.currentTime = 0;
        SND_WHALE.play();

        addLog(`💥 MEGA WHALE ARRIVED! +$${mega}`);
    }
}

//----------------------------------------------------------
// PRICE UPDATES
//----------------------------------------------------------
function updatePrice() {
    let change = botAction() * luckMultiplier;

    whaleEvents();

    price += change;
    if (price < 0.01) price = 0.01;
    price = +price.toFixed(2);

    // Track biggest moves
    if (change > biggestUp) biggestUp = change;
    if (change < biggestDown) biggestDown = change;

    // Track highs & lows
    if (price > highestPrice) highestPrice = price;
    if (price < lowestPrice) lowestPrice = price;

    // Color flash
    priceUI.style.color = (change > 0) ? "#00ff88" : (change < 0 ? "#ff4444" : "white");
    setTimeout(() => priceUI.style.color = "white", 200);

    priceUI.textContent = `$${price}`;

    priceHistory.push(price);
    if (priceHistory.length > 200) priceHistory.shift();

    updateWealth();
    drawChart();
    checkLiquidation();
}

//----------------------------------------------------------
// BUY & SELL
//----------------------------------------------------------
function buyShare() {
    if (inLeverage) return addLog("Cannot buy while leveraged.");
    if (cash >= price * maxBuy) {
        shares += maxBuy;
        cash -= price * maxBuy;
        addLog(`Bought ${maxBuy} shares @ $${price}`);
        updateUI();
    }
}

function sellShare() {
    if (inLeverage) return addLog("Cannot sell while leveraged.");
    if (shares > 0) {
        let amt = Math.min(maxBuy, shares);
        shares -= amt;
        cash += price * amt;
        sellAmountBtn.textContent = amt;
        addLog(`Sold ${amt} shares @ $${price}`);
        updateUI();
    }
}

//----------------------------------------------------------
// LEVERAGE CONTROLS
//----------------------------------------------------------
function lockButtons() {
    ["buy-btn","sell-btn","long-btn","short-btn"].forEach(id=>{
        let b = document.getElementById(id);
        b.disabled = true;
        b.style.opacity = "0.3";
    });

    let closeBtn = document.getElementById("close-pos-btn");
    closeBtn.disabled = false;
    closeBtn.style.opacity = "1";
}

function unlockButtons() {
    ["buy-btn","sell-btn","long-btn","short-btn"].forEach(id=>{
        let b = document.getElementById(id);
        b.disabled = false;
        b.style.opacity = "1";
    });

    let closeBtn = document.getElementById("close-pos-btn");
    closeBtn.disabled = true;
    closeBtn.style.opacity = "0.3";
}

function openLeverage(side) {
    if (inLeverage) return;

    inLeverage = true;
    levSide = side;
    levEntry = price;
    levFactor = maxLeverage;

    addLog(`Opened ${side.toUpperCase()} x${levFactor} @ $${levEntry}`);

    lockButtons();
}

function closePosition() {
    if (!inLeverage) return;

    let pnl = (levSide === "long")
        ? (price - levEntry) * levFactor * 5
        : (levEntry - price) * levFactor * 5;

    cash += pnl;

    addLog(`Closed ${levSide.toUpperCase()} — PnL: $${pnl.toFixed(2)}`);

    inLeverage = false;
    unlockButtons();
    updateWealth();
}

function checkLiquidation() {
    if (!inLeverage) return;

    if (levSide === "long" && price <= levEntry / levFactor) {
        addLog("💀 LONG liquidated");
        cash = 0; shares = 0;
        inLeverage = false;
        unlockButtons();
    }

    if (levSide === "short" && price >= levEntry * levFactor) {
        addLog("💀 SHORT liquidated");
        cash = 0; shares = 0;
        inLeverage = false;
        unlockButtons();
    }

    updateUI();
}

//----------------------------------------------------------
// WEALTH
//----------------------------------------------------------
function updateWealth() {
    wealthUI.textContent = `$${(cash + shares * price).toFixed(2)}`;
}

//----------------------------------------------------------
// TIMER & RUG
//----------------------------------------------------------
function startTimer() {
    timerInterval = setInterval(() => {
        timeLeft--;
        timerUI.textContent = timeLeft;
        if (timeLeft <= 0) rugEvent();
    }, 1000);
}

function rugEvent() {
    clearInterval(timerInterval);
    clearInterval(botInterval);

    SND_SIREN.currentTime = 0;
    SND_SIREN.play();

    price = 0;
    priceUI.textContent = "$0.00";
    updateWealth();

    // Fill popup stats
    const finalWealth = cash + shares * price;
    let percent = ((finalWealth - 100) / 100) * 100;

    document.getElementById("popup-wealth").textContent = `$${finalWealth.toFixed(2)}`;
    document.getElementById("popup-return").textContent =
        (percent >= 0 ? "+" : "") + percent.toFixed(2) + "%";

    document.getElementById("popup-high").textContent = "$" + highestPrice.toFixed(2);
    document.getElementById("popup-low").textContent = "$" + lowestPrice.toFixed(2);

    document.getElementById("popup-whales-in").textContent = totalWhaleEnters;
    document.getElementById("popup-whales-out").textContent = totalWhaleExits;
    document.getElementById("popup-megawhales").textContent = totalMegaWhales;

    document.getElementById("popup-bigup").textContent = biggestUp.toFixed(2);
    document.getElementById("popup-bigdown").textContent = biggestDown.toFixed(2);

    document.getElementById("share-popup").style.display = "flex";
}

//----------------------------------------------------------
// UI HELPERS
//----------------------------------------------------------
function updateUI() {
    priceUI.textContent = `$${price.toFixed(2)}`;
    cashUI.textContent = `$${cash.toFixed(2)}`;
    sharesUI.textContent = shares;
    updateWealth();
}

function addLog(msg) {
    const p = document.createElement("p");
    p.textContent = msg;
    logBox.appendChild(p);
    logBox.scrollTop = logBox.scrollHeight;
}

//----------------------------------------------------------
// CHART
//----------------------------------------------------------
function drawChart() {
    ctx.clearRect(0,0,chart.width,chart.height);

    if (priceHistory.length < 2) return;

    const min = Math.min(...priceHistory);
    const max = Math.max(...priceHistory);
    const range = max - min || 1;

    ctx.beginPath();
    ctx.strokeStyle = "#00ffcc";
    ctx.lineWidth = 2;

    for (let i=0;i<priceHistory.length;i++){
        const x = (i / (priceHistory.length - 1)) * chart.width;
        const y = chart.height - (((priceHistory[i] - min) / range) * chart.height);

        if (i===0) ctx.moveTo(x,y);
        else ctx.lineTo(x,y);
    }

    ctx.stroke();

    document.getElementById("chart-y-axis").innerHTML = `
        $${max.toFixed(2)}<br>
        $${((max + min)/2).toFixed(2)}<br>
        $${min.toFixed(2)}
    `;
    document.getElementById("chart-x-axis").innerText = "Time →";
}

//----------------------------------------------------------
// FOLLOW ON X (Replaces screenshot sharing)
//----------------------------------------------------------
function followOnX() {
    window.open("https://x.com/GaiaProjectSol", "_blank");
    document.getElementById("share-popup").style.display = "none";
}

//----------------------------------------------------------
// START GAME
//----------------------------------------------------------
function startGame() {
    updateUI();
    botInterval = setInterval(updatePrice, 700);
    startTimer();
}
