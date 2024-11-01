"use strict";

const { isCollisionWithWalls } = require('./collisions');
const { increasePlayerPlace, increasePlayerWins } = require('./dbrequests')
const { endGame } = require('./game')
const { player_idle_timeout } = require('./config')  
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

  // Check for collision and slide along walls if necessary
  if (isCollisionWithWalls(room.walls, newX, newY)) {
    // Try moving only in X direction
    if (!isCollisionWithWalls(room.walls, newX, player.y)) {
      newY = player.y;
    }
    // Try moving only in Y direction
    else if (!isCollisionWithWalls(room.walls, player.x, newY)) {
      newX = player.x;
    }
    // If both X and Y movements cause collision, don't move
    else {
      newX = player.x;
      newY = player.y;
    }
  }

  // Round the new position
 // newX = Math.round(newX);
//  newY = Math.round(newY);

newX = parseFloat(newX.toFixed(2));
newY = parseFloat(newY.toFixed(2));

  // Ensure the player stays within the map boundaries
  newX = Math.max(-room.mapWidth, Math.min(room.mapWidth, newX));
  newY = Math.max(-room.mapHeight, Math.min(room.mapHeight, newY));

  // Update player position
  player.x = newX;
  player.y = newY;
  player.lastProcessedPosition = { x: newX, y: newY };

  // Uncomment if you want to use the timeout feature
  // clearTimeout(player.movetimeout);
  // player.movetimeout = setTimeout(() => { player.ws.close(4200, "disconnected_inactivity"); }, player_idle_timeout);
}


/*function handleMovement(player, room) {

  const deltaTime = 20
  const finalDirection = player.moving ? player.direction - 90 : player.direction;
  const radians = (finalDirection * Math.PI) / 180;
  const xDelta = player.speed * deltaTime * Math.cos(radians);
  const yDelta = player.speed * deltaTime * Math.sin(radians);

  const newX = Math.round(player.x + xDelta);
  const newY = Math.round(player.y + yDelta);

  if (!isCollisionWithWalls(room.walls, newX, newY)) {
    player.x = newX;
    player.y = newY;
    player.lastProcessedPosition = { x: newX, y: newY };
  } else {
    player.x = player.lastProcessedPosition.x;
    player.y = player.lastProcessedPosition.y;
  }

  player.x = Math.max(-room.mapWidth, Math.min(room.mapWidth, player.x));
  player.y = Math.max(-room.mapHeight, Math.min(room.mapHeight, player.y));

	//  clearTimeout(player.movetimeout);
 // player.movetimeout = setTimeout(() => { player.ws.close(4200, "disconnected_inactivity"); }, player_idle_timeout); 

}
 /* const collectedCoins = [];
  if (result.room.coins) {
  result.room.coins.forEach((coin, index) => {
    const distance = Math.sqrt(
      Math.pow(player.x - coin.x, 2) + Math.pow(player.y - coin.y, 2),
    );

    if (distance <= 60) {
      collectedCoins.push(index);
    }
  });
    }

  
  if (collectedCoins.length > 0) {
    collectedCoins.forEach((index) => {
    
      handleCoinCollected2(result, index);
    });
  }

  */


  // Clear any previous timeout and set a new one
 // clearTimeout(player.timeout);



  
  // const closestState = room.snap.reduce((prev, curr) => {
   // return (Math.abs(curr.timestamp - timestamp) < Math.abs(prev.timestamp - timestamp) ? curr : prev);
  //});


  



function handlePlayerCollision(room, shootingPlayer, nearestObject, damage) {

 //const GUN_BULLET_DAMAGE = Math.round(damage / shootdamagereduce);

const GUN_BULLET_DAMAGE = damage

  // Update player's health
  nearestObject.health -= GUN_BULLET_DAMAGE;
  shootingPlayer.damage += GUN_BULLET_DAMAGE;
  nearestObject.last_hit_time = new Date().getTime();

  // Update hitdata for shooting player
  const hitdata = {
    last_playerhit: {
      playerId: nearestObject.nickname,
      datetime: new Date().getTime(),
      damage: GUN_BULLET_DAMAGE,
    },
  };
  shootingPlayer.hitdata = JSON.stringify(hitdata);

  // Check if the player is eliminated
  if (1 > nearestObject.health && 1 > nearestObject.respawns) {
    // Player is eliminated
    nearestObject.visible = false;

    clearInterval(nearestObject.moveInterval);
    clearTimeout(nearestObject.timeout);

    // Update player's place
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

    increasePlayerPlace(nearestObject.playerId, nearestObject.place, room);

    nearestObject.visible = false;

    // Update stats for shooting player
    shootingPlayer.kills++;
    shootingPlayer.elimlast = nearestObject.playerId;

    room.timeoutIds.push(setTimeout(() => {
      shootingPlayer.elimlast = null;
    }, 100));

    // Check for game end conditions
    if (
      Array.from(room.players.values()).filter(
        (player) => player.visible !== false
      ).length === 1 && room.winner === 0
    ) {
      const remainingPlayer = Array.from(room.players.values()).find(
        (player) => player.visible !== false
      );

      room.winner = remainingPlayer.playerId;
    //  console.log(`Last player standing! ${room.winner} wins!`);

      increasePlayerWins(room.winner, 1);
      increasePlayerPlace(room.winner, 1, room);

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
      // Player is eliminated
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
  // Retrieve the dummy from the room using its key
  const dummy = room.dummies[dummyKey];

  // Check if the dummy exists
  if (!dummy) {
    console.error(`Dummy with key ${dummyKey} not found.`);
    return;
  }

  const GUN_BULLET_DAMAGE = damage

dummy.h -= GUN_BULLET_DAMAGE;

  // Update hitdata for the shooting player
  const hitdata = {
    bothit: {
      playerId: { x: dummy.x, y: dummy.y }, // Changed from playerId to position
      datetime: new Date().getTime(),
      damage: GUN_BULLET_DAMAGE,
    },
  };
  shootingPlayer.hitdata = JSON.stringify(hitdata);

  // Check if the dummy's health is below 1
  if (dummy.h < 1) {
    // Remove the dummy from the room
    //console.log(`Removing dummy with key ${dummyKey}.`);
    delete room.dummies[dummyKey];
    // Respawn the dummy after 2 seconds
    room.timeoutIds.push(setTimeout(() => {
      if (room)  {
      respawnDummy(room, dummyKey, dummy, shootingPlayer);
	 
    }
    }, 4000));
  }
}


function respawnDummy(room, dummyKey, dummy, player) {

  if (room)  {
  // Check if the room and dummyKey are valid
  const originalDummy = {
    //...dummy // Reset health to a full value
    ...dummy
  };
  //originalDummy.h = 100
  originalDummy.h = dummy.sh
  // Re-add the dummy to the room with its original key and position
	   if (room)  {
  room.dummies[dummyKey] = originalDummy;
  }
}
}


function respawnplayer(room, player) {


  player.visible = false
  player.respawns--
  player.moving = false;
	clearInterval(player.moveInterval)
	player.moveInterval = null;

  player.health = player.starthealth
  player.x = player.startspawn.x
  player.y = player.startspawn.y
  room.timeoutIds.push(setTimeout(() =>{
    player.visible = true

    }, 5000));

 }
 
 


module.exports = {
  handleMovement,
  handlePlayerCollision,
  respawnplayer,
  handleDummyCollision,
}
