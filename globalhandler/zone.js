"use strict";

const { respawnplayer } = require('./../playerhandler/respawn')
const { handleElimination } = require('./../playerhandler/eliminated.js')
const { addKillToKillfeed } = require('./killfeed.js')


const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 60;


function isWithinZone(room, playerX, playerY) {
  return playerX - PLAYER_WIDTH >= room.zoneStartX && playerX + PLAYER_WIDTH <= room.zoneEndX &&
    playerY - PLAYER_HEIGHT >= room.zoneStartY && playerY + PLAYER_HEIGHT <= room.zoneEndY;
}

// Function to shrink the game zone
function shrinkZone(room) {


  if (room.zoneEndX > 2 && room.zoneEndY > 2) {

    dealDamage(room);

    const shrinkspeed = room.zonespeed / 1000

    room.zoneStartX += shrinkspeed * room.mapWidth;
    room.zoneStartY += shrinkspeed * room.mapHeight;
    room.zoneEndX -= shrinkspeed * room.mapWidth;
    room.zoneEndY -= shrinkspeed * room.mapHeight;

    room.zoneStartX = Math.round(room.zoneStartX);
    room.zoneStartY = Math.round(room.zoneStartY);
    room.zoneEndX = Math.round(room.zoneEndX);
    room.zoneEndY = Math.round(room.zoneEndY);

       const zonedata = [
      room.zoneStartX,
      room.zoneStartY,
      room.zoneEndX,
      room.zoneEndY,
    ].join('$');

    room.zone = zonedata;

  } else {
    dealDamage(room);
  }
}

function dealDamage(room) {
  room.players.forEach((player) => {

    if (player.state === 1 && !isWithinZone(room, player.x, player.y)) {

      if (room.winner === -1) {
        player.health -= 5;
        
        player.last_hit_time = new Date().getTime();
        if (1 > player.health) {

          if (1 > player.respawns) {



            handleElimination(room, player);
         //   addKillToKillfeed(room, "z1", player.nmb, 0, 0, 3);
          } else {


            respawnplayer(room, player);
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

  room.shrinkInterval = room.intervalIds.push(setInterval(() => shrinkZone(room), 250));
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