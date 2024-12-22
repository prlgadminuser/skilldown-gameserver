"use strict";

const { isCollisionWithWalls, isCollisionWithCachedWalls } = require('./collisions');
const { increasePlayerPlace, increasePlayerWins } = require('./dbrequests')
const { player_idle_timeout } = require('./config')
const { respawnplayer } = require('./../playerhandler/respawn')
const { addKillToKillfeed } = require('./killfeed.js')
//const { handleCoinCollected2 } = require('./room')


const {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  playerspeed,
  game_win_rest_time,
  mapsconfig,
} = require('./config');
const { handleElimination } = require('../playerhandler/eliminated');

function getDistance(x1, y1, x2, y2) {
  return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
}



function handleMovement(player, room) {
  const deltaTime = 20;
  
  const finalDirection = player.moving ? player.direction - 90 : player.direction;

  const radians = (finalDirection * Math.PI) / 180;
  const xDelta = player.speed * deltaTime * Math.cos(radians);
  const yDelta = player.speed * deltaTime * Math.sin(radians);

  let newX = player.x + xDelta;
  let newY = player.y + yDelta;

  if (isCollisionWithCachedWalls(player.nearbywalls, newX, newY)) {

    if (!isCollisionWithCachedWalls(player.nearbywalls, newX, player.y)) {
      newY = player.y;
    }
    else if (!isCollisionWithCachedWalls(player.nearbywalls, player.x, newY)) {
      newX = player.x;
    }
    else {
      newX = player.x;
      newY = player.y;
    }
  }

  newX = Math.round(newX);
  newY = Math.round(newY);
  newX = Math.max(-room.mapWidth, Math.min(room.mapWidth, newX));
  newY = Math.max(-room.mapHeight, Math.min(room.mapHeight, newY));


  player.x = newX;
  player.y = newY;
  player.lastProcessedPosition = { x: newX, y: newY };
}

function TeamPlayersActive(room, player) {
  // Ensure the player's team is defined
  if (!player.team || player.team.length === 0) {
      return 0; // Return 0 if the player's team is not valid
  }

  // Count players in the team who are in state 1
  const count = player.team.reduce((count, player) => {
      const teamPlayer = room.players.get(player); // Access the player by their ID
      return teamPlayer && teamPlayer.state === 1 ? count + 1 : count;
  }, 0);

  return count;
}


function handlePlayerCollision(room, shootingPlayer, targetPlayer, damage, gunid) {

  //const GUN_BULLET_DAMAGE = Math.round(damage / shootdamagereduce);

  const GUN_BULLET_DAMAGE = damage

  targetPlayer.health -= GUN_BULLET_DAMAGE;
  shootingPlayer.damage += GUN_BULLET_DAMAGE;
  targetPlayer.last_hit_time = new Date().getTime();

  const hit = [
    targetPlayer.x,
    targetPlayer.y,
    Math.random().toString(36).substring(2, 7),
    //new Date().getTime(),
    GUN_BULLET_DAMAGE,
  ].join('$');

  shootingPlayer.hitdata = hit;

  //const teamactiveplayers = TeamPlayersActive(room, player)

  if (1 > targetPlayer.health && 1 > targetPlayer.respawns) {

    const elimtype = 2;
    handleElimination(room, targetPlayer);
    targetPlayer.eliminator = shootingPlayer.nmb;
    targetPlayer.spectatingTarget = shootingPlayer.playerId;
    shootingPlayer.elimlast = targetPlayer.nmb + "$" + elimtype;
    addKillToKillfeed(room, shootingPlayer.nmb, targetPlayer.nmb, 2, gunid, 2);

    room.timeoutIds.push(setTimeout(() => {
      shootingPlayer.elimlast = null;
    }, 100));

} else {

    if (targetPlayer.health < 1 && targetPlayer.respawns > 0) {

      const elimtype = 1;
      shootingPlayer.elimlast = targetPlayer.nmb + "$" + elimtype;
      addKillToKillfeed(room, shootingPlayer.nmb, targetPlayer.nmb, 1, gunid, 1);

      room.timeoutIds.push(setTimeout(() => {
        shootingPlayer.elimlast = null;
      }, 100));

      targetPlayer.visible = false;
      respawnplayer(room, targetPlayer);
    }
}

}

function handleDummyCollision(room, shootingPlayer, dummyKey, damage) {

  const dummy = room.dummies[dummyKey];

  if (!dummy) {
    console.error(`Dummy with key ${dummyKey} not found.`);
    return;
  }


  const GUN_BULLET_DAMAGE = Math.min(damage, dummy.h);

  dummy.h -= GUN_BULLET_DAMAGE;

  const hit = [
    dummy.x,
    dummy.y,
    Math.random().toString(36).substring(2, 7),
    //new Date().getTime(),
    GUN_BULLET_DAMAGE,
  ].join('$');


  shootingPlayer.hitdata = hit;

  if (dummy.h < 1) {
    delete room.dummies[dummyKey];

    room.timeoutIds.push(setTimeout(() => {
      if (room) {
        respawnDummy(room, dummyKey, dummy, shootingPlayer);

      }
    }, 4000));
  }
}


function respawnDummy(room, dummyKey, dummy, player) {

  if (room) {

    const originalDummy = {
      ...dummy
    };

    originalDummy.h = dummy.sh

    if (room) {
      room.dummies[dummyKey] = originalDummy;
    }
  }
}





module.exports = {
  handleMovement,
  handlePlayerCollision,
  handleDummyCollision,
}
