function respawnplayer(room, player) {


    player.visible = false
    player.state = 2

    player.respawns--

    player.moving = false

    clearInterval(player.moveInterval)
    player.moveInterval = null;
  
    player.health = player.starthealth

    room.timeoutIds.push(setTimeout(() =>{
      player.x = player.startspawn.x
      player.y = player.startspawn.y
      }, 3000));

    room.timeoutIds.push(setTimeout(() =>{
      player.visible = true
      player.state = 1
      }, 5000));


      
   }
 

   module.exports = {
    respawnplayer,
  };
  