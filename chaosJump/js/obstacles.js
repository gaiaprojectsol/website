// Load obstacle sprites
const obstacleSmall = new Image();
obstacleSmall.src = "assets/obstacle_small.png";

const obstacleMedium = new Image();
obstacleMedium.src = "assets/obstacle_medium.png";

const obstacleTall = new Image();
obstacleTall.src = "assets/obstacle_tall.png";

let obstacleIndex = 0;

export function generatePatternObstacle(traits) {
    // Heights must match your PNG sizes
    const types = [
        { height: 40, img: obstacleSmall },
        { height: 70, img: obstacleMedium },
        { height: 110, img: obstacleTall }
    ];

    // Select pattern (small → medium → tall)
    let choice = types[obstacleIndex];

    // LCK reduces tall height difficulty
    if (obstacleIndex === 2) {
        let reducedHeight = choice.height - traits.LCK * 2;
        if (reducedHeight < 40) reducedHeight = 40;
        choice = { ...choice, height: reducedHeight };
    }

    obstacleIndex = (obstacleIndex + 1) % 3;

    return {
        x: window.GAME_WIDTH,
        y: window.GAME_HEIGHT - choice.height - 20,
        width: choice.img.width,
        height: choice.height,
        img: choice.img
    };
}
