"use strict";

const { respawnplayer } = require('./../playerhandler/respawn')
const { handleElimination } = require('./../playerhandler/eliminated.js')
const { addKillToKillfeed } = require('./killfeed.js')
const { TeamPlayersActive } = require('./../teamhandler/aliveteam')


const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 60;


function isWithinZone(room, playerX, playerY) {
  return playerX - PLAYER_WIDTH >= room.zoneStartX && playerX + PLAYER_WIDTH <= room.zoneEndX &&
    playerY - PLAYER_HEIGHT >= room.zoneStartY && playerY + PLAYER_HEIGHT <= room.zoneEndY;
}

// Function to shrink the game zone
function shrinkZone(room) {


  if (room.zoneEndX > 2 && room.zoneEndY > 2) {

    const shrinkspeed = room.zonespeed / 10000

    room.zoneStartX += shrinkspeed * room.mapHeight;
    room.zoneStartY += shrinkspeed * room.mapWidth;
    room.zoneEndX -= shrinkspeed * room.mapHeight;
    room.zoneEndY -= shrinkspeed * room.mapWidth;


       const zonedata = [
        Math.round(room.zoneStartX),
        Math.round(room.zoneStartY),
          Math.round(room.zoneEndX),
            Math.round(room.zoneEndY),
    ].join('$');

    room.zone = zonedata;
  }
}

function dealDamage(room) {
  room.players.forEach((player) => {

    if (player.state === 1 && !isWithinZone(room, player.x, player.y)) {

      if (room.winner === -1) {
        player.health -= 5;
        
        player.last_hit_time = new Date().getTime();
        if (1 > player.health) {

          const teamactiveplayers = TeamPlayersActive(room, player)

          if (1 > player.respawns && 2 > teamactiveplayers) {



            handleElimination(room, player.team.players);
            addKillToKillfeed(room, 3, null, player.nmb, null)
         //   addKillToKillfeed(room, "z1", player.nmb, 0, 0, 3);
          } else {


            respawnplayer(room, player);
            addKillToKillfeed(room, 4, null, player.nmb, null)
         //   addKillToKillfeed(room, "z2", player.nmb, 0, 0, 4);
          }
        }
      }
    }
  });
}



function pingPlayers(room) {
  // First setTimeout


  room.timeoutIds.push(setTimeout(() => {
    room.players.forEach((player) => {
      if (player.visible !== false) {
        player.lastping = new Date().getTime();
      }
    });
    room.sendping = 1;
  }, 200));

  // Second setTimeout
  room.timeoutIds.push(setTimeout(() => {
    room.sendping = undefined;
  }, 500));

  //pingPlayers(room);
}



function UseZone(room) {

  room.zoneStartX -= room.mapWidth / 2
  room.zoneStartY -= room.mapHeight / 2
  room.zoneEndX += room.mapWidth / 2
  room.zoneEndY += room.mapHeight / 2

  room.shrinkInterval = room.intervalIds.push(setInterval(() => shrinkZone(room), 33));

  room.damageInterval = room.intervalIds.push(setInterval(() =>  dealDamage(room), 1000));
  /* pingPlayers(room);
 
   room.snapInterval = setInterval(() => {
     saveRoomState(room);
   }, server_tick_rate - 2); 
 room.pinger = setInterval(() => {
     // Ensure sendping is undefined before calling pingPlayers again
     if (room.sendping === undefined) {
         pingPlayers(room);
     }
 }, 1000);

 */


};


module.exports = {
  UseZone,
};