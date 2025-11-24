export function getGuestGeneans(){
return[
{name:"Guest Swift",guest:true,traits:{STR:5,AGI:20,LCK:2},sprite:"swift.png"},
{name:"Guest Strong",guest:true,traits:{STR:20,AGI:5,LCK:2},sprite:"strong.png"},
{name:"Guest Lucky",guest:true,traits:{STR:5,AGI:5,LCK:20},sprite:"lucky.png"}
];
}
export async function loadGeneanTraits(g){return g.traits;}