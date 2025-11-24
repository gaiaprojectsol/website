export function applyPhysics(p){
p.vy+=0.6;
p.y+=p.vy;
if(p.y>=p.groundY){p.y=p.groundY;p.vy=0;p.isJumping=false;}
}