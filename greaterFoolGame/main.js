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
    sage:  { name: "Sage of Hollowpeak",       WIS: 100, LUCK: 20,  CRT: 10  },
    lark:  { name: "Fortune-Blessed Lark",     WIS: 15,  LUCK: 100, CRT: 15  },
    maker: { name: "The Maker of Echoes",      WIS: 1000,  LUCK: 1000,  CRT: 1000 }
};

//----------------------------------------------------------
// GAME STATE
//----------------------------------------------------------
let WIS = 0, LUCK = 0, CRT = 0;

let price = 1.00;
let cash = 100.00;   // REAL cash (doesn't include unrealised PnL)
let shares = 0;
let timeLeft = 180;

let maxBuy = 1;
let luckMultiplier = 1;
let maxLeverage = 1;

let inLeverage = false;
let levSide = null;        // "long" or "short"
let levEntry = 0;          // entry price
let levFactor = 1;         // leverage multiple
let levCollateral = 0;     // cash locked as collateral at entry
let levUnrealised = 0;     // current unrealised PnL

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
let biggestUp = 0;    // largest positive move (bot or whale)
let biggestDown = 0;  // largest negative move (bot or whale)

//----------------------------------------------------------
// DOM REFERENCES
//----------------------------------------------------------
const priceUI  = document.getElementById("price");
const cashUI   = document.getElementById("cash");
const sharesUI = document.getElementById("shares");
const wealthUI = document.getElementById("wealth");
const timerUI  = document.getElementById("timer");

const buyAmountBtn  = document.getElementById("buyAmountBtn");
const sellAmountBtn = document.getElementById("sellAmountBtn");

const logBox = document.getElementById("log");

const canvas = document.getElementById("priceChart");
const ctx    = canvas.getContext("2d");

//----------------------------------------------------------
// INTRO → CHARACTER SELECT
//----------------------------------------------------------
document.getElementById("start-game-btn").addEventListener("click", () => {
    document.getElementById("intro-screen").style.display = "none";
    document.getElementById("character-select").style.display = "block";
});

//----------------------------------------------------------
// CLICK SOUND WRAPPER
//----------------------------------------------------------
function addClick(id, fn) {
    document.getElementById(id).addEventListener("click", () => {
        SND_CLICK.currentTime = 0;
        SND_CLICK.play();
        fn();
    });
}

//----------------------------------------------------------
// ATTACH BUTTONS
//----------------------------------------------------------
function attachTradingButtons() {
    addClick("buy-btn",  buyShare);
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

        document.getElementById("charName").textContent   = c.name;
        document.getElementById("statWIS").textContent    = WIS;
        document.getElementById("statLUCK").textContent   = LUCK;
        document.getElementById("statCRT").textContent    = CRT;

        maxBuy        = 1 + Math.floor((WIS / 100) * 9);    // up to 10
        luckMultiplier = 1 + (LUCK / 100);                  // 1–2
        maxLeverage   = 1 + Math.floor((CRT / 100) * 24);   // up to 25

        buyAmountBtn.textContent  = maxBuy;
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
// BOT RANDOM MOVES
//----------------------------------------------------------
function botAction() {
    const r = Math.random();
    if (r < 0.33) return Math.random() * 0.5;
    if (r < 0.66) return -(Math.random() * 0.5);
    return 0;
}

//----------------------------------------------------------
// WHALE & MEGA WHALE EVENTS (LUCK-SCALED) + MOVE TRACKING
//----------------------------------------------------------
function whaleEvents() {
    const whaleBoost = 1 + (LUCK / 100); // 1.0–2.0

    // Whale enter
    if (Math.random() < 0.01 * whaleBoost) {
        const boost = Math.floor(Math.random() * 91) + 10;  // +10–100
        price += boost;
        whaleCount++;
        totalWhaleEnters++;

        if (boost > biggestUp) biggestUp = boost;

        SND_WHALE.currentTime = 0;
        SND_WHALE.play();
        addLog(`🐋 Whale ENTERED! +$${boost}`);
    }

    // Whale exit
    if (whaleCount > 0 && Math.random() < 0.01 * whaleBoost) {
        const drop = Math.floor(Math.random() * 91) + 10;   // -10–100
        price -= drop;
        if (price < 0.01) price = 0.01;

        whaleCount--;
        totalWhaleExits++;

        if (-drop < biggestDown) biggestDown = -drop;

        SND_WHALE_EXIT.currentTime = 0;
        SND_WHALE_EXIT.play();
        addLog(`🐋 Whale EXITED! -$${drop}`);
    }

    // Mega whale
    if (Math.random() < 0.001 * whaleBoost) {
        const mega = Math.floor(Math.random() * 1501) + 500; // +500–2000
        price += mega;
        whaleCount += 3;
        totalMegaWhales++;

        if (mega > biggestUp) biggestUp = mega;

        SND_WHALE.currentTime = 0;
        SND_WHALE.play();
        addLog(`💥 MEGA WHALE ARRIVED! +$${mega}`);
    }
}

//----------------------------------------------------------
// PRICE UPDATE + REAL-TIME LEVERAGE PnL
//----------------------------------------------------------
function updatePrice() {
    let change = botAction() * luckMultiplier;

    whaleEvents();

    price += change;
    if (price < 0.01) price = 0.01;
    price = +price.toFixed(2);

    // Track biggest bot move as well
    if (change > biggestUp)   biggestUp = change;
    if (change < biggestDown) biggestDown = change;

    if (price > highestPrice) highestPrice = price;
    if (price < lowestPrice)  lowestPrice = price;

    // Flash color
    if (change > 0)      priceUI.style.color = "#00ff88";
    else if (change < 0) priceUI.style.color = "#ff4444";
    setTimeout(() => priceUI.style.color = "white", 200);

    priceUI.textContent = `$${price}`;

    priceHistory.push(price);
    if (priceHistory.length > 200) priceHistory.shift();

    // Real-time unrealised PnL for leverage
    if (inLeverage) {
        let returnPct = (price - levEntry) / levEntry;
        if (levSide === "short") {
            returnPct = (levEntry - price) / levEntry;
        }
        // PnL = % move × leverage × collateral
        levUnrealised = returnPct * levFactor * levCollateral;
    }

    updateWealth();
    drawChart();
    checkLiquidation();
}

//----------------------------------------------------------
// BUY / SELL (spot)
//----------------------------------------------------------
function buyShare() {
    if (inLeverage) return addLog("Cannot buy while leveraged.");
    if (cash >= price * maxBuy) {
        shares += maxBuy;
        cash   -= price * maxBuy;
        addLog(`Bought ${maxBuy} shares @ $${price}`);
        updateUI();
    }
}

function sellShare() {
    if (inLeverage) return addLog("Cannot sell while leveraged.");
    if (shares > 0) {
        const amt = Math.min(maxBuy, shares);
        shares -= amt;
        cash   += price * amt;
        sellAmountBtn.textContent = amt;
        addLog(`Sold ${amt} shares @ $${price}`);
        updateUI();
    }
}

//----------------------------------------------------------
// LEVERAGE CONTROLS
//----------------------------------------------------------
function lockButtons() {
    ["buy-btn", "sell-btn", "long-btn", "short-btn"].forEach(id => {
        const b = document.getElementById(id);
        b.disabled = true;
        b.style.opacity = "0.3";
    });

    const closeBtn = document.getElementById("close-pos-btn");
    closeBtn.disabled = false;
    closeBtn.style.opacity = "1";
}

function unlockButtons() {
    ["buy-btn", "sell-btn", "long-btn", "short-btn"].forEach(id => {
        const b = document.getElementById(id);
        b.disabled = false;
        b.style.opacity = "1";
    });

    const closeBtn = document.getElementById("close-pos-btn");
    closeBtn.disabled = true;
    closeBtn.style.opacity = "0.3";
}

// Open leverage: lock in entry, factor, and collateral (current cash)
function openLeverage(side) {
    if (inLeverage) return;

    inLeverage   = true;
    levSide      = side;
    levEntry     = price;
    levFactor    = maxLeverage;
    levCollateral = cash;
    levUnrealised = 0;

    addLog(`Opened ${side.toUpperCase()} x${levFactor} @ $${levEntry} | Collateral: $${levCollateral.toFixed(2)}`);
    lockButtons();
}

// Close leverage: realise PnL and free controls
function closePosition() {
    if (!inLeverage) return;

    // Recompute unrealised PnL at the moment of close
    let returnPct = (price - levEntry) / levEntry;
    if (levSide === "short") {
        returnPct = (levEntry - price) / levEntry;
    }
    let pnl = returnPct * levFactor * levCollateral;

    cash += pnl;
    levUnrealised = 0;

    addLog(`Closed ${levSide.toUpperCase()} — Realised PnL: $${pnl.toFixed(2)}`);

    inLeverage = false;
    levSide    = null;
    unlockButtons();
    updateWealth();
}

//----------------------------------------------------------
// LIQUIDATION
//----------------------------------------------------------
function checkLiquidation() {
    if (!inLeverage) return;

    // Return % relative to entry
    let returnPct = (price - levEntry) / levEntry;
    if (levSide === "short") {
        returnPct = (levEntry - price) / levEntry;
    }

    // Liquidation when loss reaches 100% / leverage
    const liqThreshold = -1 / levFactor;       // e.g. -4% for 25x
    const liqShort     =  1 / levFactor;

    // LONG LIQUIDATION
    if (levSide === "long" && returnPct <= liqThreshold) {
        addLog("💀 LONG LIQUIDATED");
        cash = 0;
        shares = 0;
        levUnrealised = 0;
        inLeverage = false;
        unlockButtons();
        rugEvent();
        return;
    }

    // SHORT LIQUIDATION
    if (levSide === "short" && returnPct >= liqShort) {
        addLog("💀 SHORT LIQUIDATED");
        cash = 0;
        shares = 0;
        levUnrealised = 0;
        inLeverage = false;
        unlockButtons();
        rugEvent();
        return;
    }

    // Safety: if total wealth somehow hits zero or below, end game
    const displayCash = cash + (inLeverage ? levUnrealised : 0);
    const w = displayCash + shares * price;
    if (w <= 0) {
        addLog("💀 TOTAL LOSS — Game Over");
        rugEvent();
        return;
    }
}

//----------------------------------------------------------
// WEALTH + INSTANT LOSS CHECK
//----------------------------------------------------------
function updateWealth() {
    let displayCash = cash;
    if (inLeverage) {
        displayCash += levUnrealised;
    }

    cashUI.textContent = `$${displayCash.toFixed(2)}`;

    const w = displayCash + shares * price;
    wealthUI.textContent = `$${w.toFixed(2)}`;

    if (w <= 0) {
        rugEvent();
    }
}

//----------------------------------------------------------
// TIMER & RUG EVENT
//----------------------------------------------------------
function startTimer() {
    timerInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft < 0) timeLeft = 0;
        timerUI.textContent = timeLeft;
        if (timeLeft <= 0) rugEvent();
    }, 1000);
}

function rugEvent() {
    // Prevent double-rugging
    clearInterval(timerInterval);
    clearInterval(botInterval);

    SND_SIREN.currentTime = 0;
    SND_SIREN.play();

    timeLeft = 0;
    timerUI.textContent = "0";

    price = 0;
    priceUI.textContent = "$0.00";

    // Push final 0 price into chart history
    priceHistory.push(0);

    // Ensure we don't exceed chart length limit
    if (priceHistory.length > 200) {
        priceHistory.shift();
    }

// Draw final collapse candle
drawChart();


    // Use current wealth display as final
    let displayCash = cash + (inLeverage ? levUnrealised : 0);
    let finalWealth = displayCash + shares * price;

    let percent = ((finalWealth - 100) / 100) * 100;

    document.getElementById("popup-wealth").textContent =
        `$${finalWealth.toFixed(2)}`;
    document.getElementById("popup-return").textContent =
        (percent >= 0 ? "+" : "") + percent.toFixed(2) + "%";

    document.getElementById("popup-high").textContent =
        "$" + highestPrice.toFixed(2);
    document.getElementById("popup-low").textContent =
        "$" + lowestPrice.toFixed(2);

    document.getElementById("popup-whales-in").textContent  = totalWhaleEnters;
    document.getElementById("popup-whales-out").textContent = totalWhaleExits;
    document.getElementById("popup-megawhales").textContent = totalMegaWhales;

    document.getElementById("popup-bigup").textContent   = biggestUp.toFixed(2);
    document.getElementById("popup-bigdown").textContent = biggestDown.toFixed(2);

    document.getElementById("share-popup").style.display = "flex";
}

//----------------------------------------------------------
// UI HELPERS
//----------------------------------------------------------
function updateUI() {
    priceUI.textContent  = `$${price.toFixed(2)}`;
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
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (priceHistory.length < 2) return;

    const min = Math.min(...priceHistory);
    const max = Math.max(...priceHistory);
    const range = max - min || 1;

    ctx.beginPath();
    ctx.strokeStyle = "#00ffcc";
    ctx.lineWidth = 2;

    for (let i = 0; i < priceHistory.length; i++) {
        const x = (i / (priceHistory.length - 1)) * canvas.width;
        const y = canvas.height - (((priceHistory[i] - min) / range) * canvas.height);

        if (i === 0) ctx.moveTo(x, y);
        else         ctx.lineTo(x, y);
    }

    ctx.stroke();

    document.getElementById("chart-y-axis").innerHTML = `
        $${max.toFixed(2)}<br>
        $${((max + min) / 2).toFixed(2)}<br>
        $${min.toFixed(2)}
    `;
    document.getElementById("chart-x-axis").innerText = "Time →";
}

//----------------------------------------------------------
// FOLLOW ON X
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
