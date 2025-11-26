//----------------------------------------------------------
// AUDIO FILES (ALL .mp3)
//----------------------------------------------------------
const SND_CLICK = new Audio("click.mp3");
const SND_WHALE = new Audio("splash.mp3");
const SND_WHALE_EXIT = new Audio("splashLow.mp3");
const SND_SIREN = new Audio("siren.mp3");


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
// GAME STATE
//----------------------------------------------------------
let price = 1.00;
let cash = 100.00;
let shares = 0;

let timeLeft = 120;

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
// DOM REFERENCES
//----------------------------------------------------------
const priceUI = document.getElementById("price");
const cashUI = document.getElementById("cash");
const sharesUI = document.getElementById("shares");
const wealthUI = document.getElementById("wealth");
const timerUI = document.getElementById("timer");

const buyAmountUI = document.getElementById("buyAmount");
const sellAmountUI = document.getElementById("sellAmount");

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
// BUTTON WRAPPER WITH CLICK SOUND
//----------------------------------------------------------
function attachTradingButtons() {

    function addClick(id, handler) {
        document.getElementById(id).addEventListener("click", () => {
            SND_CLICK.currentTime = 0;
            SND_CLICK.play();
            handler();
        });
    }

    addClick("buy-btn", buyShare);
    addClick("sell-btn", sellShare);
    addClick("long-btn", () => openLeverage("long"));
    addClick("short-btn", () => openLeverage("short"));
    addClick("close-pos-btn", closePosition);
    addClick("share-btn", triggerScreenshotShare);

    document.getElementById("popup-share").addEventListener("click", () => {
        SND_CLICK.currentTime = 0;
        SND_CLICK.play();
        document.getElementById("share-popup").style.display = "none";
        triggerScreenshotShare();
    });

    document.getElementById("popup-close").addEventListener("click", () => {
        SND_CLICK.currentTime = 0;
        SND_CLICK.play();
        document.getElementById("share-popup").style.display = "none";
    });
}


//----------------------------------------------------------
// CHARACTER SELECT LOGIC
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

        // Stat scaling
        maxBuy = 1 + Math.floor((WIS / 100) * 9);
        luckMultiplier = 1 + (LUCK / 100);
        maxLeverage = 1 + Math.floor((CRT / 100) * 24);

        buyAmountUI.textContent = maxBuy;
        sellAmountUI.textContent = maxBuy;

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
// WHALE EVENTS + MEGA WHALE (LUCK-SCALED)
//----------------------------------------------------------
function whaleEvents() {

    const whaleBoost = 1 + (LUCK / 100);  // 1.0 → 2.0 scaling

    // 🐋 Whale entry
    if (Math.random() < 0.01 * whaleBoost) {
        const boost = Math.floor(Math.random() * 91) + 10;
        price += boost;
        whaleCount++;

        SND_WHALE.currentTime = 0;
        SND_WHALE.play();

        addLog(`🐋 Whale ENTERED! +$${boost} | Total whales: ${whaleCount}`);
    }

    // 🐋 Whale exit
    if (whaleCount > 0 && Math.random() < 0.01 * whaleBoost) {
        const drop = Math.floor(Math.random() * 91) + 10;
        price -= drop;
        if (price < 0.01) price = 0.01;

        whaleCount--;

        SND_WHALE_EXIT.currentTime = 0;
        SND_WHALE_EXIT.play();

        addLog(`🐋 Whale EXITED! -$${drop} | Total whales: ${whaleCount}`);
    }

    // 💥 MEGA WHALE (0.1% × luck scaling)
    if (Math.random() < 0.001 * whaleBoost) {
        const mega = Math.floor(Math.random() * 1501) + 500;
        price += mega;

        whaleCount += 3;

        SND_WHALE.currentTime = 0;
        SND_WHALE.play();

        addLog(`🐋💥 MEGA WHALE ARRIVES! +$${mega} | Whale Power: ${whaleCount}`);
    }
}


//----------------------------------------------------------
// PRICE UPDATE
//----------------------------------------------------------
function updatePrice() {

    let change = botAction() * luckMultiplier;

    // Whale mechanics (after bot change, before clamping)
    whaleEvents();

    price += change;

    if (price < 0.01) price = 0.01;
    price = +price.toFixed(2);

    if (change > 0) priceUI.style.color = "#00ff88";
    if (change < 0) priceUI.style.color = "#ff4444";
    setTimeout(() => priceUI.style.color = "white", 200);

    priceUI.textContent = `$${price}`;

    priceHistory.push(price);
    if (priceHistory.length > 200) priceHistory.shift();

    addLog(`Price move ${change.toFixed(2)} → $${price}`);

    updateWealth();
    drawChart();
    checkLiquidation();
}


//----------------------------------------------------------
// BUY / SELL
//----------------------------------------------------------
function buyShare() {
    if (inLeverage) return addLog("⚠ Cannot buy while leveraged.");

    if (cash >= price * maxBuy) {
        shares += maxBuy;
        cash -= price * maxBuy;
        buyAmountUI.textContent = maxBuy;
        addLog(`Bought ${maxBuy} shares @ $${price}`);
        updateUI();
    }
}

function sellShare() {
    if (inLeverage) return addLog("⚠ Cannot sell while leveraged.");

    if (shares > 0) {
        let amt = Math.min(maxBuy, shares);
        shares -= amt;
        cash += price * amt;
        sellAmountUI.textContent = amt;
        addLog(`Sold ${amt} shares @ $${price}`);
        updateUI();
    }
}


//----------------------------------------------------------
// LEVERAGE BUTTON LOCKING
//----------------------------------------------------------
function lockButtonsForLeverage() {
    ["buy-btn", "sell-btn", "long-btn", "short-btn"].forEach(id => {
        const el = document.getElementById(id);
        el.disabled = true;
        el.style.opacity = "0.3";
    });

    const closeBtn = document.getElementById("close-pos-btn");
    closeBtn.disabled = false;
    closeBtn.style.opacity = "1";
}

function unlockButtonsAfterLeverage() {
    ["buy-btn", "sell-btn", "long-btn", "short-btn"].forEach(id => {
        const el = document.getElementById(id);
        el.disabled = false;
        el.style.opacity = "1";
    });

    const closeBtn = document.getElementById("close-pos-btn");
    closeBtn.disabled = true;
    closeBtn.style.opacity = "0.3";
}


//----------------------------------------------------------
// LEVERAGE TRADING
//----------------------------------------------------------
function openLeverage(side) {
    if (inLeverage) return addLog("⚠ Already leveraged.");

    levSide = side;
    inLeverage = true;
    levEntry = price;
    levFactor = maxLeverage;

    addLog(`Opened ${side.toUpperCase()} x${levFactor} @ $${levEntry}`);

    lockButtonsForLeverage();
}

function closePosition() {
    if (!inLeverage) return;

    let pnl = 0;

    if (levSide === "long") pnl = (price - levEntry) * levFactor * 5;
    if (levSide === "short") pnl = (levEntry - price) * levFactor * 5;

    cash += pnl;
    addLog(`Closed ${levSide.toUpperCase()} → PnL $${pnl.toFixed(2)}`);

    inLeverage = false;
    levSide = null;

    unlockButtonsAfterLeverage();
    updateWealth();
}

function checkLiquidation() {
    if (!inLeverage) return;

    if (levSide === "long" && price <= levEntry / levFactor) {
        addLog("💀 Liquidated LONG");
        cash = 0;
        shares = 0;
        inLeverage = false;
        unlockButtonsAfterLeverage();
    }

    if (levSide === "short" && price >= levEntry * levFactor) {
        addLog("💀 Liquidated SHORT");
        cash = 0;
        shares = 0;
        inLeverage = false;
        unlockButtonsAfterLeverage();
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
// TIMER + RUG SIREN
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

    addLog("🚨 DEV RUGGED — price → 0!");

    price = 0;
    priceHistory.push(0);

    drawChart();

    priceUI.textContent = "$0.00";
    updateWealth();

    document.getElementById("popup-wealth").textContent = wealthUI.textContent;
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
    ctx.clearRect(0, 0, chart.width, chart.height);

    if (priceHistory.length < 2) return;

    const min = Math.min(...priceHistory);
    const max = Math.max(...priceHistory);
    const range = max - min || 1;

    ctx.beginPath();
    ctx.strokeStyle = "#00ffcc";
    ctx.lineWidth = 2;

    for (let i = 0; i < priceHistory.length; i++) {
        let x = (i / (priceHistory.length - 1)) * chart.width;
        let y = chart.height - (((priceHistory[i] - min) / range) * chart.height);

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }

    ctx.stroke();

    document.getElementById("chart-y-axis").innerHTML = `
        $${max.toFixed(2)}<br>
        $${((max + min) / 2).toFixed(2)}<br>
        $${min.toFixed(2)}
    `;

    document.getElementById("chart-x-axis").innerHTML = "Time →";
}


//----------------------------------------------------------
// SCREENSHOT + SHARE TO X
//----------------------------------------------------------
function triggerScreenshotShare() {
    const container = document.querySelector(".container");
    const finalWealth = wealthUI.textContent;

    html2canvas(container).then(canvas => {

        const framed = document.createElement("canvas");
        framed.width = canvas.width + 40;
        framed.height = canvas.height + 100;

        const fctx = framed.getContext("2d");
        fctx.fillStyle = "#111";
        fctx.fillRect(0, 0, framed.width, framed.height);

        fctx.strokeStyle = "#00ffcc";
        fctx.lineWidth = 4;
        fctx.strokeRect(18, 18, canvas.width + 4, canvas.height + 4);

        fctx.drawImage(canvas, 20, 20);

        fctx.font = "28px Arial";
        fctx.fillStyle = "#00ffcc";
        fctx.textAlign = "center";
        fctx.fillText(`Final Wealth: ${finalWealth}`, framed.width / 2, framed.height - 55);

        fctx.font = "18px Arial";
        fctx.fillStyle = "rgba(255,255,255,0.7)";
        fctx.textAlign = "right";
        fctx.fillText("Gaia Project · Solo Dev Build", framed.width - 25, framed.height - 20);

        const tweetText = encodeURIComponent(
            "Just played this chaotic little market game made by a solo dev building the Gaia Project.\n\n" +
            "Try it here: https://gaiaproject.world/greaterFoolGame/\n\n" +
            "If it’s fun, post your score. If it isn’t, just close it 😂"
        );

        framed.toBlob(blob => {
            const file = new File([blob], "gaia-score.png", { type: "image/png" });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                navigator.share({
                    text: decodeURIComponent(tweetText),
                    files: [file]
                }).catch(() => {});
                return;
            }

            const link = document.createElement("a");
            link.href = framed.toDataURL("image/png");
            link.download = "gaia-score.png";
            link.click();

            const url = `https://twitter.com/intent/tweet?text=${tweetText}`;
            window.open(url, "_blank");
        });
    });
}


//----------------------------------------------------------
// START GAME
//----------------------------------------------------------
function startGame() {
    updateUI();
    botInterval = setInterval(updatePrice, 700);
    startTimer();
}
