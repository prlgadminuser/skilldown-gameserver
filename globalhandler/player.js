"use strict";

const { isCollisionWithWalls } = require('./collisions');
const { increasePlayerPlace, increasePlayerWins } = require('./dbrequests')
const { endGame } = require('./game')
const { player_idle_timeout } = require('./config')
const { respawnplayer } = require('./../playerhandler/respawn')
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

  if (isCollisionWithWalls(room.grid, newX, newY)) {

    if (!isCollisionWithWalls(room.grid, newX, player.y)) {
      newY = player.y;
    }
    else if (!isCollisionWithWalls(room.grid, player.x, newY)) {
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

function handlePlayerCollision(room, shootingPlayer, nearestObject, damage) {

  //const GUN_BULLET_DAMAGE = Math.round(damage / shootdamagereduce);

  const GUN_BULLET_DAMAGE = damage

  nearestObject.health -= GUN_BULLET_DAMAGE;
  shootingPlayer.damage += GUN_BULLET_DAMAGE;
  nearestObject.last_hit_time = new Date().getTime();

  const hit = [
    nearestObject.x,
    nearestObject.y,
    Math.random().toString(36).substring(2, 7),
    //new Date().getTime(),
    GUN_BULLET_DAMAGE,
  ].join('$');

  shootingPlayer.hitdata = hit;

  if (1 > nearestObject.health && 1 > nearestObject.respawns) {

    const elimtype = 2
    handleElimination(room, nearestObject)
    nearestObject.eliminator = shootingPlayer.nickname
    nearestObject.spectatingTarget = shootingPlayer.playerId;
    shootingPlayer.elimlast = nearestObject.nickname + "$" + elimtype;

    room.timeoutIds.push(setTimeout(() => {
      shootingPlayer.elimlast = null;
    }, 100));

  } else {


    if (nearestObject.health < 1 && nearestObject.respawns > 0) {

      const elimtype = 1
      shootingPlayer.elimlast = nearestObject.nickname + "$" + elimtype;

      room.timeoutIds.push(setTimeout(() => {
        shootingPlayer.elimlast = null;
      }, 100));

      nearestObject.visible = false;
      respawnplayer(room, nearestObject)
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
