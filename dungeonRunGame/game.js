/* ----------------------------------------------------
   RETRO TERMINAL ENGINE
----------------------------------------------------- */
const output = document.getElementById("output");
const choicesDiv = document.getElementById("choices");

function printText(text, speed = 18) {
    return new Promise(resolve => {
        let i = 0;
        let interval = setInterval(() => {
            output.innerHTML += text[i];
            i++;
            output.scrollTop = output.scrollHeight;

            if (i >= text.length) {
                clearInterval(interval);
                output.innerHTML += "\n";
                resolve();
            }
        }, speed);
    });
}

function clearChoices() {
    choicesDiv.innerHTML = "";
}

function addChoice(text, callback) {
    const btn = document.createElement("button");
    btn.className = "choice-btn";
    btn.textContent = text;
    btn.onclick = callback;
    choicesDiv.appendChild(btn);
}

/* ----------------------------------------------------
   PLAYER SETUP
----------------------------------------------------- */

const geneans = {
    Cinderleaf: {
        name: "Cinderleaf",
        VIT: 10,
        STR: 10,
        AGI: 11,
        WIS: 9,
        INT: 10,
        CHA: 9,
        FRT: 10,
        PER: 11,
        LCK: 10,
        CRT: 10
    },
    LordFardrosan: {
        name: "Lord Fardrosan",
        VIT: 18,
        STR: 20,
        AGI: 18,
        WIS: 18,
        INT: 17,
        CHA: 16,
        FRT: 19,
        PER: 18,
        LCK: 17,
        CRT: 16
    }
};

let player = null;
let time = 0;

/* ----------------------------------------------------
   MODIFIER FORMULA
----------------------------------------------------- */
function getModifier(stat) {
    return Math.floor((stat - 10) / 2);
}

/* ----------------------------------------------------
   D20 ROLL (CLICKABLE)
----------------------------------------------------- */
function rollD20(modifier, callback) {
    clearChoices();

    const btn = document.createElement("button");
    btn.id = "dice-btn";
    btn.textContent = "[ ••• CLICK TO ROLL d20 ••• ]";

    btn.onclick = () => {
        const roll = Math.floor(Math.random() * 20) + 1;
        callback(roll);
        btn.remove();
    };

    choicesDiv.appendChild(btn);
}

/* ----------------------------------------------------
   10 TRAIT CHALLENGES
----------------------------------------------------- */

const challenges = [
    // VITALITY
    {
        name: "The Bleeding Thorns",
        stat: "VIT",
        min: 12,
        dc: 14,
        pass: genean => `${genean} pushes through the draining thorns.`,
        fail: genean => `${genean} is overwhelmed by the thorns' hunger.`
    },
    // STRENGTH
    {
        name: "Collapsed Titan Gate",
        stat: "STR",
        min: 13,
        dc: 15,
        pass: genean => `${genean} lifts the ancient stone with raw power.`,
        fail: genean => `${genean} cannot move the Titan Gate.`
    },
    // AGILITY
    {
        name: "The Echoing Ravine",
        stat: "AGI",
        min: 13,
        dc: 15,
        pass: genean => `${genean} leaps across the ravine in a single motion.`,
        fail: genean => `${genean} slips — the gap is too wide to cross.`
    },
    // WISDOM
    {
        name: "The Archon Seal",
        stat: "WIS",
        min: 12,
        dc: 14,
        pass: genean => `The seal glows — ${genean}'s wisdom resonates.`,
        fail: genean => `The Archon Seal rejects ${genean}.`
    },
    // INT
    {
        name: "Mind-Maze Conduit",
        stat: "INT",
        min: 12,
        dc: 14,
        pass: genean => `${genean} solves the shifting runes.`,
        fail: genean => `${genean} is lost in the mental labyrinth.`
    },
    // CHA
    {
        name: "Merchant of Echoes",
        stat: "CHA",
        min: 11,
        dc: 13,
        pass: genean => `The Merchant agrees to grant ${genean} passage.`,
        fail: genean => `The Merchant vanishes. The path closes.`
    },
    // FRT
    {
        name: "Hall of Whispers",
        stat: "FRT",
        min: 12,
        dc: 15,
        pass: genean => `${genean} endures the psychic assault.`,
        fail: genean => `${genean}'s mind cracks under the whispers.`
    },
    // PER
    {
        name: "Shadowfork Passage",
        stat: "PER",
        min: 12,
        dc: 14,
        pass: genean => `${genean} senses the real path.`,
        fail: genean => `${genean} triggers traps hidden in the dark.`
    },
    // LCK
    {
        name: "Door of Fate",
        stat: "LCK",
        min: 13,
        dc: 15,
        pass: genean => `Fortune smiles — the door opens for ${genean}.`,
        fail: genean => `Fate turns away from ${genean}.`
    },
    // CRT
    {
        name: "Broken Mechanism",
        stat: "CRT",
        min: 12,
        dc: 14,
        pass: genean => `${genean} repairs the ancient device effortlessly.`,
        fail: genean => `${genean} cannot solve the machine's design.`
    }
];

let currentChallenge = 0;

/* ----------------------------------------------------
   PROCESS A CHALLENGE
----------------------------------------------------- */
async function runChallenge() {
    clearChoices();
    const c = challenges[currentChallenge];
    const genean = player.name;
    const value = player[c.stat];
    const mod = getModifier(value);

    await printText(`\n== ${c.name} ==`);
    await printText(`Testing ${c.stat} (${value})`);

    // Strong enough
    if (value >= c.min) {
        await printText(c.pass(genean));
        time++;
        nextChallenge();
        return;
    }

    // Medium → Roll d20
    if (value >= c.min - 3) {
        await printText(`A d20 roll is required...`);
        rollD20(mod, async roll => {
            let total = roll + mod;
            await printText(`Roll: ${roll} + Modifier (${mod}) = ${total}`);

            if (total >= c.dc) {
                await printText(c.pass(genean));
                time += 2;
                nextChallenge();
            } else {
                await printText(c.fail(genean));
                await printText(`Your journey ends here.`);
            }
        });
        return;
    }

    // Too weak
    await printText(c.fail(genean));
    await printText(`Your Genean cannot proceed.`);
}

/* ----------------------------------------------------
   NEXT CHALLENGE OR BOSS
----------------------------------------------------- */
function nextChallenge() {
    currentChallenge++;
    if (currentChallenge >= challenges.length) bossIntro();
    else addChoice("Continue", runChallenge);
}

/* ----------------------------------------------------
   BOSS BATTLE
----------------------------------------------------- */
async function bossIntro() {
    clearChoices();
    await printText(`\n== FINAL CHAMBER ==`);
    await printText(`The Chainborn Beast rises from the abyss...`);

    addChoice("Confront the Beast", bossFight);
}

async function bossFight() {
    clearChoices();
    const genean = player.name;

    await printText(`${genean} prepares for the final strike...`);

    const DC = 17;
    let mod = getModifier(player.STR);

    rollD20(mod, async roll => {
        // Crit rules
        if (roll === 20) {
            await printText(`CRITICAL SUCCESS! ${genean} annihilates the Beast!`);
            return endGame(true);
        }
        if (roll === 1) {
            await printText(`CRITICAL FAILURE! The Beast crushes ${genean}.`);
            return endGame(false);
        }

        let total = roll + mod;
        await printText(`Roll: ${roll} + STR Modifier (${mod}) = ${total}`);

        if (total >= DC) {
            await printText(`${genean} slays the Chainborn Beast!`);
            endGame(true);
        } else {
            await printText(`${genean} is defeated in the final clash.`);
            endGame(false);
        }
    });
}

/* ----------------------------------------------------
   END GAME
----------------------------------------------------- */
async function endGame(win) {
    clearChoices();

    if (win) {
        await printText(`\n>> VICTORY <<`);
        await printText(`Time Taken: ${time} units`);
    } else {
        await printText(`\n>> DEFEAT <<`);
    }

    addChoice("Play Again", () => location.reload());
}

/* ----------------------------------------------------
   INTRO SCREEN
----------------------------------------------------- */
async function introScreen() {
    await printText("GAIA PROJECT — GENEAN DUNGEON RUN\n");
    await printText("----------------------------------\n");
    await printText("A text-based dungeon run where every room tests a different Genean trait.\n");
    await printText("Vitality, Strength, Agility, Wisdom, Intellect, Charisma, Fortitude, Perception, Luck, Creativity.\n");
    await printText("Your Genean must pass 10 trait challenges, then face the Chainborn Beast.\n");
    await printText("Some paths require raw power. Others demand a d20 roll — and fate's mercy.\n");
    await printText("\nChoose your Genean:\n");

    addChoice("Cinderleaf (Basic Genean)", () => {
        player = geneans.Cinderleaf;
        clearChoices();
        runChallenge();
    });

    addChoice("Lord Fardrosan (Overpowered Genean)", () => {
        player = geneans.LordFardrosan;
        clearChoices();
        runChallenge();
    });
}

introScreen();
