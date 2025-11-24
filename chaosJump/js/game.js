import { applyPhysics } from './physicsCore.js';
import { generatePatternObstacle } from './obstacles.js';
import { submitScoreToLambda } from './scoreService.js';
import { drawBackground, drawObstacle } from "./renderer.js";

let player, score, obstacles, traits, sprite, injuredSprite, gameRunning, gref;

export async function startGame(g) {
    gref = g;
    score = 0;
    obstacles = [];
    gameRunning = false;
    traits = g.traits;

    sprite = new Image();
    sprite.src = "assets/" + g.sprite;

    injuredSprite = new Image();
    injuredSprite.src = "assets/genean-injured.png";

    player = {
        x: 100,
        y: window.GAME_HEIGHT - 80,
        vy: 0,
        isJumping: false,
        groundY: window.GAME_HEIGHT - 80,
        speed: 2 + traits.AGI * 0.2,
        jumpPower: 10 + traits.STR * 0.3,
        dead: false
    };

    await countdown();
    gameRunning = true;
}

export function updateGame(ctx) {
    if (!gameRunning) return;

    applyPhysics(player);

    if (obstacles.length === 0 ||
        obstacles[obstacles.length - 1].x < ctx.canvas.width - 500) {
        obstacles.push(generatePatternObstacle(traits));
    }

    obstacles.forEach(o => o.x -= player.speed);

    for (let o of obstacles) {
        if (player.x < o.x + o.width &&
            player.x + 48 > o.x &&
            player.y + 48 > o.y &&
            !player.dead) {

            player.dead = true;
            gameRunning = false;

            sprite = injuredSprite;

            submitScoreToLambda(gref.playerName, score, gref)
                .then(res => {
                    showGameOverScreen(
                        score,
                        gref.name,
                        res?.message || "Uploaded Successfully"
                    );
                })
                .catch(() => {
                    showGameOverScreen(score, gref.name,"Failed to Upload");
                });

            return;
        }
    }

    score++;
    document.getElementById("scoreDisplay").innerText = "Score: " + score;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    drawBackground(ctx, player.speed);

    ctx.drawImage(sprite, player.x, player.y, 48, 48);

    obstacles.forEach(o => drawObstacle(ctx, o));
}

export function playerJump() {
    if (!gameRunning || player.dead) return;
    if (player.isJumping) return;

    player.vy = -player.jumpPower;
    player.isJumping = true;
}

function countdown() {
    return new Promise(res => {
        let d = document.createElement("div");
        d.style.position = "fixed";
        d.style.top = "50%";
        d.style.left = "50%";
        d.style.transform = "translate(-50%, -50%)";
        d.style.fontSize = "80px";
        d.style.color = "white";
        d.style.zIndex = 999;

        document.body.appendChild(d);

        let c = 3;
        d.innerText = c;

        let i = setInterval(() => {
            c--;
            if (c === 0) d.innerText = "GO!";
            else if (c < 0) {
                clearInterval(i);
                d.remove();
                res();
            } else d.innerText = c;
            c--;
        }, 1000);
    });
}

function showGameOverScreen(score, geneanName, uploadStatus) {
    const overlay = document.getElementById("gameOverOverlay");
    overlay.style.display = "block";

    document.getElementById("goScore").innerText = "Score: " + score;
    document.getElementById("goGenean").innerText = "Genean: " + geneanName;
    document.getElementById("goUpload").innerText = "Upload Status: " + uploadStatus;
}
