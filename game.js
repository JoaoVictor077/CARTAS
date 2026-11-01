const $ = id => document.getElementById(id);
const COLORS = ["vermelho", "azul", "verde", "amarelo"];
const CSS_COLOR = {vermelho:"red", azul:"blue", verde:"green", amarelo:"yellow", coringa:"wild"};
const SYMBOL = {bloqueio:"⊘", inverter:"⇄", "+2":"+2", coringa:"★", "+4":"+4"};
let game;

function buildDeck(){
  const deck=[];
  for(const color of COLORS){
    deck.push({color,value:"0"});
    for(const value of ["1","2","3","4","5","6","7","8","9","bloqueio","inverter","+2"]){
      deck.push({color,value},{color,value});
    }
  }
  for(let i=0;i<4;i++) deck.push({color:"coringa",value:"coringa"},{color:"coringa",value:"+4"});
  return deck;
}
const shuffle = a => { for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
const cardLabel = c => SYMBOL[c.value] || c.value;
const cardName = c => ({bloqueio:"Bloqueio",inverter:"Inverter","+2":"+2",coringa:"Coringa","+4":"Coringa +4"})[c.value] || c.value;
function newGame(){
  const deck=shuffle(buildDeck());
  const player=deck.splice(0,7), computer=deck.splice(0,7);
  let first;
  do { first=deck.pop(); if(["bloqueio","inverter","+2","coringa","+4"].includes(first.value)) deck.unshift(first); } while(["bloqueio","inverter","+2","coringa","+4"].includes(first.value));
  game={deck,hands:[player,computer],discard:[first],currentColor:first.color,turn:0,message:"Sua vez! Combine a cor ou o símbolo da carta.",over:false,winner:null,mustDraw:false,unoCalled:[false,false]};
  render();
}
function canPlay(card){const top=game.discard.at(-1);return card.color==="coringa"||card.color===game.currentColor||card.value===top.value;}
function reshuffle(){
  if(game.deck.length || game.discard.length<=1)return;
  const top=game.discard.pop();game.deck=shuffle(game.discard);game.discard=[top];
}
function takeCards(player,n){for(let i=0;i<n;i++){reshuffle();if(game.deck.length)game.hands[player].push(game.deck.pop());}}
function chooseComputerColor(hand){const counts=Object.fromEntries(COLORS.map(c=>[c,hand.filter(x=>x.color===c).length]));return COLORS.reduce((a,b)=>counts[a]>=counts[b]?a:b);}
function applyEffect(card,player){
  const other=1-player;
  if(["bloqueio","inverter"].includes(card.value))game.turn=player;
  if(card.value==="+2"){takeCards(other,2);game.turn=player;}
  if(card.value==="+4"){takeCards(other,4);game.turn=player;}
}
function playInternal(player,index,chosenColor){
  const hand=game.hands[player], card=hand.splice(index,1)[0];
  game.discard.push(card);
  game.currentColor=card.color==="coringa"?(chosenColor||chooseComputerColor(hand)):card.color;
  if(hand.length===0){game.over=true;game.winner=player;game.message=player===0?"Você venceu! 🎉":"O computador venceu esta partida.";return;}
  game.turn=1-player;applyEffect(card,player);
  game.message=`${player===0?"Você":"O computador"} jogou ${cardName(card)}.`;
  if(hand.length===1){game.unoCalled[player]=true;game.message+=" UNO!";}
}
function computerTurn(){
  while(!game.over && game.turn===1){
    const hand=game.hands[1], legal=hand.map((c,i)=>({c,i})).filter(x=>canPlay(x.c));
    if(!legal.length){
      takeCards(1,1);const drawn=hand.at(-1);
      if(canPlay(drawn)){playInternal(1,hand.length-1,drawn.color==="coringa"?chooseComputerColor(hand):null);continue;}
      game.turn=0;game.message="O computador comprou uma carta. Sua vez!";return;
    }
    legal.sort((a,b)=>{
      const score=x=>(["bloqueio","inverter","+2","+4"].includes(x.c.value)?10:0)+hand.filter(c=>c.color===x.c.color).length;
      return score(b)-score(a);
    });
    const chosen=legal[0];playInternal(1,chosen.i,chosen.c.color==="coringa"?chooseComputerColor(hand):null);
  }
}
function playerPlay(index,color){
  if(game.over||game.turn!==0)return;
  const card=game.hands[0][index];
  if(!card||!canPlay(card)){game.message="Essa carta não combina com a cor ou o símbolo atual.";render();return;}
  if(card.color==="coringa"&&!color){game.message="Escolha uma cor para o coringa.";render();$("colorPicker").hidden=false;return;}
  playInternal(0,index,color);
  if(!game.over&&game.turn===1)computerTurn();
  render();
}
function drawCard(){
  if(game.over||game.turn!==0||game.mustDraw)return;
  takeCards(0,1);game.mustDraw=true;game.message="Você comprou uma carta. Pode jogá-la se combinar ou passar a vez.";render();
}
function passTurn(){
  if(!game.mustDraw)return;
  game.mustDraw=false;game.turn=1;game.message="Você passou a vez.";computerTurn();render();
}
function render(){
  const top=game.discard.at(-1);
  $("computerCount").textContent=`${game.hands[1].length} cartas`;
  $("deckCount").textContent=`${game.deck.length} cartas`;
  $("computerBacks").innerHTML=Array.from({length:Math.min(7,game.hands[1].length)},()=>"<i></i>").join("");
  $("topCard").className=`card ${CSS_COLOR[top.color]}`;
  $("topCard").innerHTML=`<span class="corner">${cardLabel(top)}</span><span class="face">${cardLabel(top)}</span><span class="corner bottom">${cardLabel(top)}</span>`;
  $("currentColor").textContent=`Cor atual: ${game.currentColor}`;
  $("message").textContent=game.message;
  $("hand").innerHTML="";
  game.hands[0].forEach((card,i)=>{
    const valid=canPlay(card), btn=document.createElement("button");
    btn.className=`card ${CSS_COLOR[card.color]} ${valid?"":"disabled"}`;
    btn.disabled=!valid||game.turn!==0||game.over;
    btn.innerHTML=`<span class="corner">${cardLabel(card)}</span><span class="face">${cardLabel(card)}</span><span class="corner bottom">${cardLabel(card)}</span>`;
    btn.setAttribute("aria-label",`${cardName(card)} ${card.color}`);
    btn.addEventListener("click",()=>playerPlay(i));
    $("hand").appendChild(btn);
  });
  $("drawButton").disabled=game.over||game.turn!==0||game.mustDraw;
  $("passButton").hidden=!game.mustDraw;
  $("unoButton").hidden=!(game.hands[0].length===1&&!game.unoCalled[0]&&!game.over);
  $("colorPicker").hidden=true;
}
$("drawButton").addEventListener("click",drawCard);
$("passButton").addEventListener("click",passTurn);
$("newGame").addEventListener("click",newGame);
$("unoButton").addEventListener("click",()=>{game.unoCalled[0]=true;game.message="UNO! Você avisou que está com uma carta.";render();});
$("colorPicker").querySelectorAll("button").forEach(btn=>btn.addEventListener("click",()=>{const idx=game.pendingWildIndex;if(idx!==undefined){delete game.pendingWildIndex;playerPlay(idx,btn.dataset.color);}}));
// A coringa é selecionada antes de jogar a carta, mantendo a escolha simples no navegador.
const originalPlayerPlay=playerPlay;
playerPlay=function(index,color){
  const card=game.hands[0][index];
  if(card&&card.color==="coringa"&&!color){
    game.pendingWildIndex=index;
    $("message").textContent="Escolha a cor para continuar.";
    $("colorPicker").hidden=false;
    return;
  }
  originalPlayerPlay(index,color);
};
newGame();
