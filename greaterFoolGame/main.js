//----------------------------------------------------------
// CHARACTER STATS
//----------------------------------------------------------
const characters = {
    sage: {
        name: "Sage of Hollowpeak",
        WIS: 100,
        LUCK: 20,
        CRT: 10
    },
    lark: {
        name: "Fortune-Blessed Lark",
        WIS: 15,
        LUCK: 100,
        CRT: 15
    },
    maker: {
        name: "The Maker of Echoes",
        WIS: 20,
        LUCK: 20,
        CRT: 100
    }
};

let selectedChar = null;
let WIS = 0, LUCK = 0, CRT = 0;

//----------------------------------------------------------
// GAME VALUES
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

// DOM refs
const priceUI = document.getElementById("price");
const cashUI = document.getElementById("cash");
const sharesUI = document.getElementById("shares");
const wealthUI = document.getElementById("wealth");
const timerUI = document.getElementById("timer");
const logBox = document.getElementById("log");

// Chart
const chart = document.getElementById("priceChart");
const ctx = chart.getContext("2d");


//----------------------------------------------------------
// INTRO SCREEN BEHAVIOUR
//----------------------------------------------------------
document.getElementById("start-game-btn").addEventListener("click", () => {
    document.getElementById("intro-screen").style.display = "none";
    document.getElementById("character-select").style.display = "block";
});


//----------------------------------------------------------
// BUTTON LISTENERS (attached after character select)
//----------------------------------------------------------
function attachTradingButtons() {
    document.getElementById("buy-btn").addEventListener("click", buyShare);
    document.getElementById("sell-btn").addEventListener("click", sellShare);
    document.getElementById("long-btn").addEventListener("click", () => openLeverage("long"));
    document.getElementById("short-btn").addEventListener("click", () => openLeverage("short"));
    document.getElementById("close-pos-btn").addEventListener("click", closePosition);
}


//----------------------------------------------------------
// CHARACTER SELECT
//----------------------------------------------------------
document.querySelectorAll(".char-btn").forEach(btn => {
    btn.addEventListener("click", () => {

        selectedChar = characters[btn.dataset.char];

        WIS = selectedChar.WIS;
        LUCK = selectedChar.LUCK;
        CRT = selectedChar.CRT;

        document.getElementById("charName").textContent = selectedChar.name;
        document.getElementById("statWIS").textContent = WIS;
        document.getElementById("statLUCK").textContent = LUCK;
        document.getElementById("statCRT").textContent = CRT;

        maxBuy = 1 + Math.floor((WIS / 100) * 9);
        luckMultiplier = 1 + (LUCK / 100);
        maxLeverage = 1 + Math.floor((CRT / 100) * 24);

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
// BOT PRICE MOVEMENT
//----------------------------------------------------------
function botAction() {
    const roll = Math.random();
    if (roll < 0.33) return +(Math.random() * 0.5);
    if (roll < 0.66) return -(Math.random() * 0.5);
    return 0;
}


//----------------------------------------------------------
// UPDATE PRICE (flash green/red)
//----------------------------------------------------------
function updatePrice() {
    let change = botAction() * luckMultiplier;
    price += change;

    if (price < 0.01) price = 0.01;
    price = parseFloat(price.toFixed(2));

    if (change > 0) priceUI.style.color = "#00ff88";
    if (change < 0) priceUI.style.color = "#ff4444";

    setTimeout(() => priceUI.style.color = "white", 200);

    priceUI.textContent = price.toFixed(2);
    addLog(`Price move: ${change.toFixed(2)} → $${price.toFixed(2)}`);

    priceHistory.push(price);
    if (priceHistory.length > 200) priceHistory.shift();

    updateWealth();
    drawChart();
    checkLiquidation();
}


//----------------------------------------------------------
// NORMAL BUY/SELL
//----------------------------------------------------------
function buyShare() {
    if (inLeverage) return addLog("Cannot buy while leveraged!");

    if (cash >= price * maxBuy) {
        shares += maxBuy;
        cash -= price * maxBuy;
        addLog(`Bought ${maxBuy} shares at $${price}`);
        updateUI();
    }
}

function sellShare() {
    if (inLeverage) return addLog("Cannot sell while leveraged!");

    if (shares > 0) {
        let sellAmount = Math.min(maxBuy, shares);
        shares -= sellAmount;
        cash += price * sellAmount;
        addLog(`Sold ${sellAmount} shares at $${price}`);
        updateUI();
    }
}


//----------------------------------------------------------
// LEVERAGE BUTTON GREYING
//----------------------------------------------------------
function lockButtonsForLeverage() {
    const disable = id => {
        const el = document.getElementById(id);
        el.disabled = true;
        el.style.opacity = "0.4";
    };

    disable("buy-btn");
    disable("sell-btn");
    disable("long-btn");
    disable("short-btn");

    const closeBtn = document.getElementById("close-pos-btn");
    closeBtn.disabled = false;
    closeBtn.style.opacity = "1";
}

function unlockButtonsAfterLeverage() {
    const enable = id => {
        const el = document.getElementById(id);
        el.disabled = false;
        el.style.opacity = "1";
    };

    enable("buy-btn");
    enable("sell-btn");
    enable("long-btn");
    enable("short-btn");

    const closeBtn = document.getElementById("close-pos-btn");
    closeBtn.disabled = true;
    closeBtn.style.opacity = "0.5";
}


//----------------------------------------------------------
// LEVERAGE TRADING
//----------------------------------------------------------
function openLeverage(side) {
    if (inLeverage) return addLog("Already in leverage!");

    levSide = side;
    inLeverage = true;
    levEntry = price;
    levFactor = maxLeverage;

    addLog(`Opened ${side.toUpperCase()} x${levFactor} at $${levEntry}`);

    lockButtonsForLeverage();
}

function closePosition() {
    if (!inLeverage) return;

    let pnl = 0;

    if (levSide === "long") pnl = (price - levEntry) * levFactor * 5;
    if (levSide === "short") pnl = (levEntry - price) * levFactor * 5;

    cash += pnl;
    addLog(`Closed ${levSide.toUpperCase()} → PnL: $${pnl.toFixed(2)}`);

    inLeverage = false;
    levSide = null;
    unlockButtonsAfterLeverage();
    updateWealth();
}

function checkLiquidation() {
    if (!inLeverage) return;

    if (levSide === "long" && price <= levEntry / levFactor) {
        addLog("💀 Liquidated LONG!");
        cash = 0; shares = 0;
        inLeverage = false;
        unlockButtonsAfterLeverage();
    }

    if (levSide === "short" && price >= levEntry * levFactor) {
        addLog("💀 Liquidated SHORT!");
        cash = 0; shares = 0;
        inLeverage = false;
        unlockButtonsAfterLeverage();
    }

    updateUI();
}


//----------------------------------------------------------
// WEALTH CALC
//----------------------------------------------------------
function updateWealth() {
    wealthUI.textContent = (cash + shares * price).toFixed(2);
}


//----------------------------------------------------------
// TIMER + RUG COLLAPSE
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

    addLog("🚨 DEV RUGGED → collapsing to zero!");

    price = 0;
    priceHistory.push(0);
    drawChart();

    priceUI.textContent = "0.00";
    updateWealth();

    setTimeout(endGame, 500);
}

function endGame() {
    addLog(`🏁 Final Cash: $${cash.toFixed(2)}`);
    alert(`Game over! Final: $${cash.toFixed(2)}`);
}


//----------------------------------------------------------
// UI HELPERS
//----------------------------------------------------------
function updateUI() {
    priceUI.textContent = price.toFixed(2);
    cashUI.textContent = cash.toFixed(2);
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
// PRICE CHART
//----------------------------------------------------------
function drawChart() {
    ctx.clearRect(0, 0, chart.width, chart.height);

    if (priceHistory.length < 2) return;

    let min = Math.min(...priceHistory);
    let max = Math.max(...priceHistory);
    if (min === max) max += 1;

    ctx.beginPath();
    ctx.strokeStyle = "#00ffcc";
    ctx.lineWidth = 2;

    for (let i = 0; i < priceHistory.length; i++) {
        let x = (i / priceHistory.length) * chart.width;
        let y = chart.height - ((priceHistory[i] - min) / (max - min) * chart.height);

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }

    ctx.stroke();
}


//----------------------------------------------------------
// START GAME
//----------------------------------------------------------
function startGame() {
    updateUI();
    botInterval = setInterval(updatePrice, 700);
    startTimer();
}
