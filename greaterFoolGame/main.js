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
// BUTTON ATTACH
//----------------------------------------------------------
function attachTradingButtons() {
    document.getElementById("buy-btn").addEventListener("click", buyShare);
    document.getElementById("sell-btn").addEventListener("click", sellShare);
    document.getElementById("long-btn").addEventListener("click", () => openLeverage("long"));
    document.getElementById("short-btn").addEventListener("click", () => openLeverage("short"));
    document.getElementById("close-pos-btn").addEventListener("click", closePosition);

    // Share popup
    document.getElementById("popup-share").addEventListener("click", () => {
        document.getElementById("share-popup").style.display = "none";
        triggerScreenshotShare();
    });

    document.getElementById("popup-close").addEventListener("click", () => {
        document.getElementById("share-popup").style.display = "none";
    });

    // Manual share button
    document.getElementById("share-btn").addEventListener("click", triggerScreenshotShare);
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

        // Start game
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
// PRICE UPDATE + FLASHING COLORS
//----------------------------------------------------------
function updatePrice() {
    let change = botAction() * luckMultiplier;
    price += change;

    if (price < 0.01) price = 0.01;
    price = parseFloat(price.toFixed(2));

    // Flash color
    if (change > 0) priceUI.style.color = "#00ff88";
    if (change < 0) priceUI.style.color = "#ff4444";
    setTimeout(() => priceUI.style.color = "white", 200);

    priceUI.textContent = `$${price.toFixed(2)}`;
    addLog(`Price move: ${change.toFixed(2)} → $${price.toFixed(2)}`);

    // Chart data update
    priceHistory.push(price);
    if (priceHistory.length > 200) priceHistory.shift();

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
// LOCK BUTTONS DURING LEVERAGE
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
// WEALTH COMPUTATION
//----------------------------------------------------------
function updateWealth() {
    wealthUI.textContent = `$${(cash + shares * price).toFixed(2)}`;
}


//----------------------------------------------------------
// TIMER + RUG EVENT
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

    addLog("🚨 DEV RUGGED — price → 0!");

    price = 0;
    priceHistory.push(0);

    drawChart();

    priceUI.textContent = "$0.00";
    updateWealth();

    // Show popup
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
// CHART DRAW
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
        let x = (i / (priceHistory.length - 1)) * chart.width;
        let y = chart.height - ((priceHistory[i] - min) / (max - min) * chart.height);

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
    const gameContainer = document.querySelector(".container");
    const finalWealth = wealthUI.textContent;

    html2canvas(gameContainer).then(canvas => {

        //--------------------------------------------------
        // FRAME + WATERMARK
        //--------------------------------------------------
        const framedCanvas = document.createElement("canvas");
        framedCanvas.width = canvas.width + 40;
        framedCanvas.height = canvas.height + 100;

        const fctx = framedCanvas.getContext("2d");

        fctx.fillStyle = "#111";
        fctx.fillRect(0, 0, framedCanvas.width, framedCanvas.height);

        fctx.strokeStyle = "#00ffcc";
        fctx.lineWidth = 4;
        fctx.strokeRect(18, 18, canvas.width + 4, canvas.height + 4);

        fctx.drawImage(canvas, 20, 20);

        // Final wealth overlay
        fctx.font = "28px Arial";
        fctx.fillStyle = "#00ffcc";
        fctx.textAlign = "center";
        fctx.fillText(`Final Wealth: ${finalWealth}`, framedCanvas.width / 2, framedCanvas.height - 55);

        // Watermark
        fctx.font = "18px Arial";
        fctx.fillStyle = "rgba(255,255,255,0.7)";
        fctx.textAlign = "right";
        fctx.fillText("Gaia Project · Solo Dev Build", framedCanvas.width - 25, framedCanvas.height - 20);

        //--------------------------------------------------
        // TWEET MESSAGE (<280 chars)
        //--------------------------------------------------
        const tweetText = encodeURIComponent(
            "Just played this chaotic little market game made by a solo dev building the Gaia Project.\n\n" +
            "Try it here: https://gaiaproject.world/greaterFoolGame/\n\n" +
            "If it’s fun, post your score. If it isn’t, just close it 😂"
        );

        //--------------------------------------------------
        // SHARE HANDLING
        //--------------------------------------------------
        framedCanvas.toBlob(blob => {
            const file = new File([blob], "gaia-score.png", { type: "image/png" });

            // MOBILE SHARE (native)
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                navigator.share({
                    text: decodeURIComponent(tweetText),
                    files: [file]
                }).catch(() => {});
                return;
            }

            // DESKTOP — download image + open tweet
            const link = document.createElement("a");
            link.href = framedCanvas.toDataURL("image/png");
            link.download = "gaia-score.png";
            link.click();

            const twitterURL = `https://twitter.com/intent/tweet?text=${tweetText}`;
            window.open(twitterURL, "_blank");
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
