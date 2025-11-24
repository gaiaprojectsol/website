import { getGuestGeneans } from './traitLoader.js';
import { startGame, updateGame, playerJump } from './game.js';
import { showLeaderboard } from './leaderboard.js';

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Fixed Game Viewport
const GAME_WIDTH = 640;
const GAME_HEIGHT = 360;

canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;

window.GAME_WIDTH = GAME_WIDTH;
window.GAME_HEIGHT = GAME_HEIGHT;

// Pixel scaling
canvas.style.width = "100vw";
canvas.style.height = "100vh";
canvas.style.imageRendering = "pixelated";

let selected = null;

loadCharacters();
document.getElementById("leaderboardBtn").onclick = showLeaderboard;

function loadCharacters() {
    const list = document.getElementById("characterList");
    const guests = getGuestGeneans();

    guests.forEach(g => {
        // Wrapper
        let wrapper = document.createElement("div");
        wrapper.classList.add("characterWrapper");

        // Name tag
        let nameTag = document.createElement("div");
        nameTag.classList.add("characterName");
        nameTag.innerText = g.name;

        // Sprite
        let img = document.createElement("img");
        img.src = "assets/" + g.sprite;
        img.classList.add("characterOption");

        wrapper.appendChild(nameTag);
        wrapper.appendChild(img);

        // Selection logic
        wrapper.onclick = () => {
            document.querySelectorAll(".characterWrapper")
                .forEach(o => o.classList.remove("selected"));

            wrapper.classList.add("selected");
            selected = g;

            // Update stat preview
            document.getElementById("statSTR").innerText = g.traits.STR;
            document.getElementById("statAGI").innerText = g.traits.AGI;
            document.getElementById("statLCK").innerText = g.traits.LCK;

            document.getElementById("startGame").disabled = false;
        };

        list.appendChild(wrapper);
    });
}

document.getElementById("startGame").onclick = async () => {
    const name = document.getElementById("playerNameInput").value.trim();
    if (name.length < 3) {
        alert("Enter a valid name.");
        return;
    }

    selected.playerName = name;
    document.getElementById("characterSelectScreen").style.display = "none";

    // HUD stats
    document.getElementById("hudSTR").innerText = selected.traits.STR;
    document.getElementById("hudAGI").innerText = selected.traits.AGI;
    document.getElementById("hudLCK").innerText = selected.traits.LCK;

    await startGame(selected);
    loop();
};

function loop() {
    updateGame(ctx);
    requestAnimationFrame(loop);
}

// Inputs
document.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
        e.preventDefault();
        playerJump();
    }
});
document.addEventListener("mousedown", () => playerJump());
document.addEventListener("touchstart", () => playerJump());
