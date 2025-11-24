export async function submitScoreToLambda(name,score,genean){
return fetch("https://xrrn4dg2d4.execute-api.ap-southeast-2.amazonaws.com/default/genean-score-validator",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({
playerName:name,score,
geneanName:genean.name,
traits:genean.traits,
timestamp:Date.now()
})
}).then(r=>r.json());
}