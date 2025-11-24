// Load background
let bg = new Image();
bg.src = "assets/background.png";

let bgX = 0;

export function drawBackground(ctx, speed) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    bgX -= speed * 0.3;
    if (bgX <= -W) bgX = 0;

    ctx.drawImage(bg, bgX, 0, W, H);
    ctx.drawImage(bg, bgX + W, 0, W, H);
}

// Draw a single obstacle
export function drawObstacle(ctx, obstacle) {
    ctx.drawImage(
        obstacle.img,
        obstacle.x,
        obstacle.y,
        obstacle.img.width,
        obstacle.height
    );
}
