"use strict";

function respawnplayer(room, player) {



  player.visible = false
  player.state = 2
  player.respawns--

  player.moving = false

  player.health = player.starthealth

  player.timeoutIds.push(setTimeout(() =>{
    player.x = player.startspawn.x
    player.y = player.startspawn.y
    }, 3000));

  player.timeoutIds.push(setTimeout(() =>{
    player.visible = true
    player.state = 1
    }, 5000));


    
 }


 module.exports = {
  respawnplayer,
};
