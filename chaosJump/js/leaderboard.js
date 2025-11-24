export async function loadLeaderboard(){
return fetch("https://xrrn4dg2d4.execute-api.ap-southeast-2.amazonaws.com/default/genean-score-validator")
.then(r=>r.json()).catch(()=>[]);
}

export function showLeaderboard(){
document.getElementById("leaderboardOverlay").style.display="block";
loadLeaderboard().then(d=>{
let body=document.getElementById("leaderboardBody");
body.innerHTML="";
d.slice(0,10).forEach((e,i)=>{
let r=document.createElement("tr");
r.innerHTML=`<td>${i+1}</td><td>${e.playerName}</td><td>${e.geneanName}</td><td>${e.score}</td>`;
body.appendChild(r);
});
});
}
document.getElementById("closeLeaderboard").onclick=()=>document.getElementById("leaderboardOverlay").style.display="none";