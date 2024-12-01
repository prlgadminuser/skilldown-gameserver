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

  if (isCollisionWithWalls(room.walls, newX, newY)) {

    if (!isCollisionWithWalls(room.walls, newX, player.y)) {
      newY = player.y;
    }
    else if (!isCollisionWithWalls(room.walls, player.x, newY)) {
      newX = player.x;
    }
    else {
      newX = player.x;
      newY = player.y;
    }
  }

  newX = parseFloat(newX.toFixed(2));
  newY = parseFloat(newY.toFixed(2));
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

  const hit = {
    hit: {
      p: nearestObject.x + "," + nearestObject.y,
      //p: nearestObject.nickname,
      dt: new Date().getTime(),
      d: GUN_BULLET_DAMAGE,
    },
  };
  shootingPlayer.hitdata = JSON.stringify(hit);

  if (1 > nearestObject.health && 1 > nearestObject.respawns) {
    nearestObject.visible = false;
    nearestObject.state = 3

    clearInterval(nearestObject.moveInterval);
    clearTimeout(nearestObject.timeout);

    if (
      Array.from(room.players.values()).filter(
        (player) => player.visible !== false
      ).length === 1 && room.winner === 0
    ) {
      nearestObject.place = 2;
    } else {
      nearestObject.place = room.players.size - room.eliminatedPlayers.length;
    }

    const existingPlace = room.eliminatedPlayers.find(
      (player) => player.place === nearestObject.place
    );

    if (existingPlace) {
      if (nearestObject.place === room.maxplayers) {
        nearestObject.place--;
      } else {
        nearestObject.place++;
      }
    }

    room.eliminatedPlayers.push({
      username: nearestObject.playerId,
      place: nearestObject.place,
      eliminator: shootingPlayer.playerId,
    });

    nearestObject.eliminator = shootingPlayer.playerId

    increasePlayerPlace(nearestObject.playerId, nearestObject.place, room);

    nearestObject.visible = false;

    shootingPlayer.kills++;
    shootingPlayer.elimlast = nearestObject.playerId;

    room.timeoutIds.push(setTimeout(() => {
      shootingPlayer.elimlast = null;
    }, 100));

    if (
      Array.from(room.players.values()).filter(
        (player) => player.visible !== false
      ).length === 1 && room.winner === 0
    ) {
      const remainingPlayer = Array.from(room.players.values()).find(
        (player) => player.visible !== false
      );

      room.winner = {
        wn: remainingPlayer.nickname,
        wid: remainingPlayer.nmb,

      };

      increasePlayerWins(remainingPlayer.playerId, 1);
      increasePlayerPlace(remainingPlayer.playerId, 1, room);

      room.eliminatedPlayers.push({
        username: room.winner,
        place: 1,
      });

      room.timeoutIds.push(setTimeout(() => {
        endGame(room);
      }, game_win_rest_time));
    }
  } else {


    if (nearestObject.health < 1 && nearestObject.respawns > 0) {

      shootingPlayer.elimlast = nearestObject.playerId;

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

  const hit = {
    bhit: {
      p: dummy.x + "," + dummy.y,
      dt: new Date().getTime(),
      d: GUN_BULLET_DAMAGE,
    },
  };
  shootingPlayer.hitdata = JSON.stringify(hit);

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
