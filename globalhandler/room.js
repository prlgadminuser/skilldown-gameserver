"use strict";

const { LZString, axios, Limiter } = require('./..//index.js');
const { matchmaking_timeout, server_tick_rate, WORLD_WIDTH, WORLD_HEIGHT, game_start_time, batchedMessages, rooms, mapsconfig, gunsconfig, gamemodeconfig, matchmakingsp, player_idle_timeout, room_max_open_time } = require('./config.js');
const { handleBulletFired } = require('./bullets.js');
const { handleMovement } = require('./player.js');
const { startRegeneratingHealth, startDecreasingHealth } = require('./match-modifiers');
const { gadgetconfig } = require('./gadgets.js')

const { UseZone } = require('./zone');

const {
  verifyPlayer,
} = require("./dbrequests");
const { MongoCryptKMSRequestNetworkTimeoutError } = require('mongodb');

function createRateLimiter() {
  const rate = 50; // Allow one request every 50 milliseconds
  return new Limiter({
    tokensPerInterval: rate,
    interval: 1000, // milliseconds
  });
}


      let roomId;
      let room;

      function clearAndRemoveInactiveTimers(timerArray, clearFn) {
        return timerArray.filter(timer => {
          if (timer._destroyed || timer._idleTimeout === -1) { 
            // Timer is already destroyed or no longer active
            clearFn(timer); // Clear the timeout or interval
            return false; // Remove from the array
          }
          return true; // Keep active timers
        });
      }
      

      function clearAndRemoveCompletedTimeouts(timeoutArray, clearFn) {
        return timeoutArray.filter(timeout => {
          if (timeout._destroyed || timeout._idleTimeout === -1 || timeout._called) {
            // _called indicates that the timeout has already been executed (Node.js)
            clearFn(timeout)
            return false; // Remove from the array as it's completed or inactive
          }
          return true; // Keep active timeouts
        });
      }
      
     
function closeRoom(roomId) {
  const room = rooms.get(roomId);


  if (room) {
    if (room.timeoutIds) room.timeoutIds.forEach(timeoutId => clearTimeout(timeoutId));
	  if (room.intervalIds) room.intervalIds.forEach(intervalId => clearInterval(intervalId));
    clearInterval(room.xcleaninterval)
    clearTimeout(room.matchmaketimeout);
    clearTimeout(room.fixtimeout);
    clearTimeout(room.fixtimeout2);
    clearTimeout(room.fixtimeout3);
    clearTimeout(room.fixtimeout4);
    clearTimeout(room.runtimeout);


	  
    clearInterval(room.xcleaninterval)
    clearInterval(room.intervalId);
    clearInterval(room.shrinkInterval);
    clearInterval(room.zonefulldamage);
    clearInterval(room.zoneinterval);
    clearInterval(room.pinger);
    clearInterval(room.snapInterval);
    clearInterval(room.cleanupinterval);
    clearInterval(room.decreasehealth);
    clearInterval(room.regeneratehealth);
    clearInterval(room.countdownInterval);


    // Clean up resources associated with players in the room
    room.players.forEach(player => {

      if (player.timeoutIds) player.timeoutIds.forEach(timeoutId => clearTimeout(timeoutId));
if (player.intervalIds) player.intervalIds.forEach(intervalId => clearInterval(intervalId));
      clearTimeout(player.timeout);
      clearTimeout(player.movetimeout);
      clearTimeout(player.gadget);
      clearTimeout(player.gadget_timeout);
      clearInterval(player.moveInterval);

      player.ws.close();

    });


    rooms.delete(roomId);


    console.log(`Room ${roomId} closed.`);
  } else {
    console.log(`Room ${roomId} not found.`);
  }
}


function playerLeave(roomId, playerId) {
    const room = rooms.get(roomId);
    if (room) {
        const player = room.players.get(playerId);
        if (player) {
            clearTimeout(player.timeout);
            clearInterval(player.moveInterval);

            // Remove the player from the room
            room.players.delete(playerId);

            // If no players left in the room, close the room
            if (room.players.size === 0) {
                closeRoom(roomId);
            }
        }
    }
}


async function joinRoom(ws, token, gamemode, playerVerified) {
  try {

      const { playerId, hat, top, player_color, hat_color, top_color, selected_gadget, skillpoints, nickname } = playerVerified;

     const gadgetselected = selected_gadget || 1;
     const finalskillpoints = skillpoints || 0;
     const finalnickname = nickname.replace(/[:$]/g, '');

     const roomjoiningvalue = matchmakingsp(finalskillpoints);
      // Check if there's an existing room with available slots
      const availableRoom = Array.from(rooms.values()).find(
        (currentRoom) =>
          currentRoom.players.size < gamemodeconfig[gamemode].maxplayers &&
          currentRoom.state === "waiting" &&
          currentRoom.gamemode === gamemode && currentRoom.sp_level === roomjoiningvalue
      );

      if (availableRoom) {
        roomId = availableRoom.roomId || `room_${Math.random().toString(36).substring(2, 15)}`;
        room = availableRoom;
      } else {
        roomId = `room_${Math.random().toString(36).substring(2, 15)}`;
        room = createRoom(roomId, gamemode, gamemodeconfig[gamemode], roomjoiningvalue);
      }


      const playerRateLimiter = createRateLimiter();

      // Determine spawn position index
      const playerCount = room.players.size;
      const spawnPositions = room.spawns
      const spawnIndex = playerCount % spawnPositions.length;

      const newPlayer = {
        ws,
        lastmsg: 0,
        intervalIds: [],
        timeoutIds: [],
        x: spawnPositions[spawnIndex].x,
        y: spawnPositions[spawnIndex].y,
        direction: null,
        prevX: 0,
        prevY: 0,
        lastProcessedPosition: { x: spawnPositions[spawnIndex].x, y: spawnPositions[spawnIndex].y },
        startspawn: { x: spawnPositions[spawnIndex].x, y: spawnPositions[spawnIndex].y },
        nmb: playerCount,
        playerId: playerId,
        nickname: finalnickname,
        rateLimiter: playerRateLimiter,
        hat: hat,
        top: top,
        player_color: player_color,
        hat_color: hat_color,
        top_color: top_color,
        //timeout: setTimeout(() => { player.ws.close(4200, "disconnected_inactivity"); }, player_idle_timeout),
        health: gamemodeconfig[gamemode].playerhealth,
        state: 1,
        starthealth: gamemodeconfig[gamemode].playerhealth,
        speed: gamemodeconfig[gamemode].playerspeed,
        startspeed: gamemodeconfig[gamemode].playerspeed,
        can_bullets_bounce: false,
        damage: 0,
        kills: 0,
        lastShootTime: 0,
        moving: false,
        moveInterval: null,
        visible: true,
        eliminated: false,
        place: null,
        shooting: false,
        shoot_direction: 90,
        gun: 1,
        bullets: new Map(),
        spectatingPlayer: playerId,
        emote: 0,
        respawns: room.respawns,
        gadgetid: gadgetselected,
        canusegadget: true,
        gadgetcooldown: gadgetconfig[gadgetselected].cooldown,
        gadgetuselimit: gadgetconfig[gadgetselected].use_limit,
        gadgetchangevars: gadgetconfig[gadgetselected].changevariables,

        usegadget() {
        
        const player = room.players.get(playerId);
        
        if (player && room.state === 'playing' && player.visible) {
            // Apply the gadget effect
            gadgetconfig[gadgetselected].gadget(player, room);
        } else {
            console.error('Player not found');
        
      }
      },
      };
  
      if (newPlayer.gadgetchangevars) {
      for (const [variable, change] of Object.entries(newPlayer.gadgetchangevars)) {
            // Decrease by percentage
            newPlayer[variable] += Math.round(newPlayer[variable] * change);

            }
          }
        
        

      if (room) {


       newPlayer.timeout = setTimeout(() => { newPlayer.ws.close(4200, "disconnected_inactivity"); }, player_idle_timeout),

      room.players.set(playerId, newPlayer);

 if (ws.readyState === ws.CLOSED) {
    playerLeave(roomId, playerId);
    return;
}

    }

      if (room.state === "waiting" && room.players.size > room.maxplayers - 1) {
        room.state = "await";
        clearTimeout(room.matchmaketimeout);
        room.timeoutIds.push(setTimeout(() => {
          
      

        room.state = "countdown";

        room.timeoutIds.push(setTimeout(() => {
          room.state = "playing";

	// room.players.forEach((player) => {

          //  player.movetimeout = setTimeout(() => { ws.close(4200, "disconnected_inactivity"); }, player_idle_timeout);

         //   });

         if (room.zoneallowed === true) {
            UseZone(room);
            }

         if (room.regenallowed === true) {
            startRegeneratingHealth(room, 1);
            }

         if (room.healthdecrease === true) {
            startDecreasingHealth(room, 1)
            }
           
          }, game_start_time));
         // generateRandomCoins(room);
        }, 1000));
      }
   
     if (ws.readyState === ws.CLOSED) {
        playerLeave(roomId, playerId);
        return;
    }



      return { roomId, playerId, room };
    
  } catch (error) {
    console.error("Error joining room:", error);
    ws.close(4000, "Error joining room");
    throw error;
  }
}

function cleanupRoom(roomId) {
  const room = rooms.get(roomId);
  if (!room) {
    return;
  }

  // Clear the cleanup interval if it exists
  if (room.cleanupinterval) {
    clearInterval(room.cleanupinterval);
  }

const playersWithOpenConnections = room.players.filter(player => player.ws && player.ws.readyState === WebSocket.OPEN);

	console.log(playersWithOpenConnections);
  // Close the room if it has no players
  if (room.players.size < 1 || playersWithOpenConnections.length < 1 || !room.players || room.players.size === 0) {
    closeRoom(roomId);
  }
}

function addToBatch(roomId, messages) {
  if (!batchedMessages.has(roomId)) {
    batchedMessages.set(roomId, []);
  }
  batchedMessages.get(roomId).push(...messages);
}

function getDistance(x1, y1, x2, y2) {
return Math.sqrt(
    Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2),
  );

}
/*
function sendBatchedMessages(roomId) {
  const room = rooms.get(roomId);



  const playerData = Array.from(room.players.values()).reduce((acc, player) => {

    if (player.visible !== false) {
      
      
      const formattedBullets = player.bullets.reduce((acc, bullet) => {
        acc[bullet.timestamp] = {
          x: bullet.x,
          y: bullet.y,
          d: bullet.direction,
        };
        return acc;
      }, {});

      acc[player.playerId] = {
        x: player.x,
        y: player.y,
        d: player.direction,
        h: player.health,
        s: player.shooting,
        g: player.gun,
        ping: player.ping,
        hd: player.hitdata,
        b: formattedBullets,
      };


      // Include additional properties only when room state is not "playing"
      if (room.state !== "playing") {
        acc[player.playerId].hat = player.hat;
        acc[player.playerId].top = player.top;
        acc[player.playerId].player_color = player.player_color;
        acc[player.playerId].hat_color = player.hat_color;
        acc[player.playerId].top_color = player.top_color;
      }
    }

    return acc;
  }, {});

  const newMessage = {
    ...playerData ? { playerData } : {},
    //coins: room.coins,
    state: room.state,
    z: room.zone,
    pl: room.maxplayers,
    pg: room.sendping,
    rp: room.players.size,
    //coins: room.coins,
    ...(room.eliminatedPlayers && room.eliminatedPlayers.length > 0) ? { eliminatedPlayers: room.eliminatedPlayers } : {},
  };

  const jsonString = JSON.stringify(newMessage);
  const compressedString = LZString.compressToUint8Array(jsonString);

  if (room.lastSentMessage !== jsonString) {
    room.players.forEach((player) => {
      player.ws.send(compressedString, { binary: true });
    });

    room.lastSentMessage = jsonString;
  }

  batchedMessages.set(roomId, []); // Clear the batch after sending
} 

*/

function arraysAreEqual(arr1, arr2) {
  if (arr1.length !== arr2.length) return false;
  for (let i = 0; i < arr1.length; i++) {
    if (
      arr1[i].x !== arr2[i].x ||
      arr1[i].y !== arr2[i].y ||
      arr1[i].h !== arr2[i].h
    ) {
      return false;
    }
  }
  return true;
}

function getPlayersInRange(players, centerX, centerY, radius, excludePlayerId) {
  const playersInRange = [];

  // Loop through the players and check their distance to the (centerX, centerY)
  players.forEach(player => {
    // Exclude the current player (based on player.nmb)
    if (player.nmb !== excludePlayerId) {
      const distance = Math.sqrt(
        Math.pow(player.x - centerX, 2) + Math.pow(player.y - centerY, 2)
      );

      // If the player is within the radius, add them to the result list
      if (distance <= radius) {
        playersInRange.push(player.nmb); // Include the player's ID
      }
    }
  });

  return playersInRange;
}

function sendBatchedMessages(roomId) {
  const room = rooms.get(roomId);

  const playercountroom = Array.from(room.players.values()).filter(player => !player.eliminated).length;
  const roomdata = [
    room.state,
    room.zone,
    room.maxplayers,
    playercountroom,
    room.map,
    room.countdown,
    room.winner,
  ].join(':');


  const playerData = {};

  Array.from(room.players.values()).forEach(player => {
    if (player.visible !== false) {
      const formattedBullets = {};
player.bullets.forEach(bullet => {
  formattedBullets[bullet.timestamp] = {
    x: bullet.x,
    y: bullet.y,
    d: Math.round(bullet.direction),
  };
});
  

      // Create current player data object
      const currentPlayerData = [
        player.hat,
        player.top,
        player.player_color,
        player.hat_color,
        player.top_color,
        player.starthealth,
        player.nickname,
        player.x,
        player.y,
        player.direction2,
        player.health,
        player.shooting,
        player.gun,
        player.emote,   // Compact bullets or undefined
        "$b" + JSON.stringify(formattedBullets),
      ].join(':');

      playerData[player.nmb] = currentPlayerData;
    }
  });

  // Create the new message based on room state
  const newMessage = {
    pd: playerData, // Always send full player data
    rd: roomdata,
    dm: room.dummies,
  };

  const jsonString = JSON.stringify(newMessage);

  // Only compress if the message has changed
  if (room.lastSentMessage !== jsonString) {
    const compressedString = LZString.compressToUint8Array(jsonString);

    room.players.forEach(player => {
      // Create player-specific message with minimal selfPlayerData
      const selfPlayerData = [
        player.nmb,
        player.state,
        player.health,
        player.shooting,
        player.gun,
        player.kills,
        player.damage,
        player.place,
        player.eliminator,
        player.canusegadget,
        player.gadgetuselimit,
        player.x,
        player.y,
        player.hitdata,
        player.elimlast,
        player.emote
      ].join(':');


      if (room.state === "playing") {

      const playersInRange = getPlayersInRange(Array.from(room.players.values()), player.x, player.y, 350);

      // Filter playerData to include only players in range for the current player
      const filteredPlayerData = Object.keys(playerData)
        .filter(playerId => playersInRange.includes(Number(playerId))) // Only include players in range
        .reduce((result, playerId) => {
          result[playerId] = playerData[playerId]; // Add filtered player data
          return result;
        }, {});

      newMessage.pd = filteredPlayerData
    }



      const playerSpecificMessage = {
        ...newMessage,
        sd: selfPlayerData // Include compact selfPlayerData
      };

      const playerMessageString = JSON.stringify(playerSpecificMessage);
      const compressedPlayerMessage = LZString.compressToUint8Array(playerMessageString);

      // Send the message only if the player has a WebSocket connection
      if (player.ws && playerSpecificMessage.length !== player.lastmsg.length) {
        player.lastmsg = playerSpecificMessage.length
        player.ws.send(compressedPlayerMessage, { binary: true });
      }
    });
  }
    // Update the last sent data
    room.lastSentMessage = jsonString

  

  // Clear the batch after sending
  batchedMessages.set(roomId, []);
}


    // Update last sent message and player data
   

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}


// Utility function to calculate distance between two points
function getDistance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}


function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}


function createRoom(roomId, gamemode, gmconfig, splevel) {
  

  let mapid
  if (gmconfig.custom_map) {
    mapid = gmconfig.custom_map
  } else {

    const keyToExclude = "3";

    // Get the keys of mapsconfig and filter out the excluded key
    const filteredKeys = Object.keys(mapsconfig).filter(key => key !== keyToExclude);
    
    // Ensure there are keys to choose from
  
        // Randomly select a key from the filtered list
        const randomIndex = getRandomInt(0, filteredKeys.length - 1);
        mapid = filteredKeys[randomIndex];
  //mapid = (getRandomInt(1, Object.keys(mapsconfig).length))

}



  const room = {
    timeoutIds: [],
    intervalIds: [],
    roomId: roomId,
    maxplayers: gmconfig.maxplayers,
    sp_level: splevel,
    snap: [],
    players: new Map(),
    state: "waiting", // Possible values: "waiting", "playing", "countdown"
    showtimer: gmconfig.show_timer,
    gamemode: gamemode,
    winner: 0,
    eliminatedPlayers: [],
    zoneStartX: -mapsconfig[mapid].width, // Example start X coordinate (100 units left of the center)
    zoneStartY: -mapsconfig[mapid].height, // Example start Y coordinate (100 units above the center)
    zoneEndX: mapsconfig[mapid].width,  // Example end X coordinate (100 units right of the center)
    zoneEndY: mapsconfig[mapid].height,
    mapHeight: mapsconfig[mapid].height,
    mapWidth: mapsconfig[mapid].width,
    walls: mapsconfig[mapid].walls, //mapsconfig[mapid].walls.map(({ x, y }) => ({ x, y })),
    grid: mapsconfig[mapid].grid,
    spawns: mapsconfig[mapid].spawns,
    map: mapid,
    place_counts: gmconfig.placereward,
    ss_counts: gmconfig.seasoncoinsreward,
    respawns: gmconfig.respawns_allowed,
    zonespeed: gmconfig.zonespeed,
    zoneallowed: gmconfig.usezone,
    regenallowed: gmconfig.health_restore,
    healthdecrease: gmconfig.health_autodamage,
  };

  room.xcleaninterval = setInterval(() => {
    if (room) {
      // Clear room's timeout and interval arrays
      if (room.timeoutIds) {
        room.timeoutIds = clearAndRemoveCompletedTimeouts(room.timeoutIds, clearTimeout);
      }
      if (room.intervalIds) {
        
        room.intervalIds = clearAndRemoveInactiveTimers(room.intervalIds, clearInterval);
      }
  
      // Clear player-specific timeouts and intervals
      room.players.forEach(player => {
        if (player.timeoutIds) {
          player.timeoutIds = clearAndRemoveCompletedTimeouts(player.timeoutIds, clearTimeout);
        }
        if (player.intervalIds) {
          player.intervalIds = clearAndRemoveInactiveTimers(player.intervalIds, clearInterval);
        }
      });
    }
  }, 1000); // Run every 1 second

  if (gmconfig.can_hit_dummies) {
  room.dummies = deepCopy(mapsconfig[mapid].dummies) //dummy crash fix
}

  const roomConfig = {
    canCollideWithDummies: gmconfig.can_hit_dummies, // Disable collision with dummies
    canCollideWithPlayers: gmconfig.can_hit_players,// Enable collision with players
  };

  room.config = roomConfig
  
  rooms.set(roomId, room);
console.log("room created:", roomId)

room.matchmaketimeout = setTimeout(() => {

  
  room.players.forEach((player) => {

    clearInterval(player.moveInterval)
    clearTimeout(player.timeout)
  
      if (room.eliminatedPlayers) {
        player.ws.close(4100, "matchmaking_timeout");
      }
    });
  closeRoom(roomId);
}, matchmaking_timeout);


  // Start sending batched messages at regular intervals
  room.intervalIds.push(setInterval(() => {
    
    sendBatchedMessages(roomId);
  }, server_tick_rate));

 // room.intervalId = intervalId;
 room.timeoutIds.push(setTimeout(() => {


  room.intervalIds.push(setInterval(() => {
  
  if (room) {
 cleanupRoom(room);
}
   }, 1000));
 }, 10000));


  const roomopentoolong = room.timeoutIds.push(setTimeout(() => {
    closeRoom(roomId);
    console.log(`Room ${roomId} closed due to timeout.`);
  }, room_max_open_time));
  room.runtimeout = roomopentoolong;

  // Countdown timer update every second
  if (room.showtimer === true) {
  const countdownDuration = room_max_open_time // 10 minutes in milliseconds
  const countdownStartTime = Date.now();
  
  room.intervalIds.push(setInterval(() => {
    const elapsedTime = Date.now() - countdownStartTime;
    const remainingTime = countdownDuration - elapsedTime;
  
    if (remainingTime <= 0) {
      clearInterval(room.countdownInterval);
      room.countdown = "0-00";
    } else {
      const minutes = Math.floor(remainingTime / 1000 / 60);
      const seconds = Math.floor((remainingTime / 1000) % 60);
      room.countdown = `${minutes}-${seconds.toString().padStart(2, '0')}`;
    }
  }, 1000));
}

  return room;
}

function generateRandomCoins(roomId) {
  const coins = [];
  for (let i = 0; i < 1; i++) {
    const coin = {
      x: Math.floor(Math.random() * (roomId.mapWidth * 2 + 1)) - roomId.mapWidth,
      y: Math.floor(Math.random() * (roomId.mapHeight * 2 + 1)) - roomId.mapHeight,
    };
    coins.push(coin);
  }
  roomId.coins = coins;


}

function handleCoinCollected2(result, index) {
  const room = rooms.get(result.roomId);
  const playerId = result.playerId;

  room.coins.splice(index, 1);

  const expectedOrigin = "tw-editor://.";
  axios
    .post(
      `https://liquemgames-api.netlify.app/increasecoins-lqemfindegiejgkdmdmvu/${playerId}`,
      null,
      {
        headers: {
          Origin: expectedOrigin,
        },
      },
    )
    .then(() => {
      console.log(`Coins increased for player ${playerId}`);
    })
    .catch((error) => {
      console.error("Error increasing coins:", error);
    });

 
  // Generate new random coins
  generateRandomCoins(room);
}

const validDirections = [-90, 0, 180, -180, 90, 45, 135, -135, -45];

const isValidDirection = (direction) => {
  const numericDirection = parseFloat(direction);
  return !isNaN(numericDirection) && validDirections.includes(numericDirection);
};


function handleRequest(result, message) {
  const player = result.room.players.get(result.playerId);
  const data = JSON.parse(message);

  if (message.length > 100) {
      player.ws.close(4000, "ahhh whyyyyy");
      return;
  }

  if (!player) return;

  switch (data.type) {
      case "pong":
          handlePong(player);
          break;
  }

  if (result.room.state !== "playing" || player.visible === false || player.eliminated) return;

  switch (data.type) {
      case "shoot":
          handleShoot(data, player, result.room);
          break;
      case "switch_gun":
          handleSwitchGun(data, player);
          break;
      case "emote":
          handleEmote(data, player);
          break;
      case "gadget":
          handleGadget(player);
          break;
      case "movement":
          handleMovementData(data, player, result.room);
          break;
  }
 //handleMovingState(data.moving, player);

  if (data.moving === "false") {
      clearInterval(player.moveInterval);
      player.moveInterval = null;
      player.moving = false;
  }
 
}

function handleMovingState(movingValue, player) {
  if (movingValue === false || movingValue === "false") {
      clearInterval(player.moveInterval);
      player.moveInterval = null;
      player.moving = false;
  }
}


function handlePong(player) {
  clearTimeout(player.timeout);
  player.timeout = setTimeout(() => {
      player.ws.close(4200, "disconnected_inactivity");
  }, player_idle_timeout);
}

function handleShoot(data, player, room) {
  if (data.shoot_direction > -181 && data.shoot_direction < 181) {
      player.shoot_direction = parseFloat(data.shoot_direction);
      handleBulletFired(room, player, player.gun);
  }
}

function handleSwitchGun(data, player) {
  const selectedGunNumber = parseFloat(data.gun);
  const allguns = Object.keys(gunsconfig).length;
  if (
      selectedGunNumber !== player.gun &&
      !player.shooting &&
      selectedGunNumber >= 1 &&
      selectedGunNumber <= allguns
  ) {
      player.gun = selectedGunNumber;
  } else if (player.shooting) {
      console.log("Cannot switch guns while shooting.");
  } else {
      console.log("Gun number must be between 1 and 3.");
  }
}

function handleEmote(data, player) {
  if (data.id >= 1 && data.id <= 4 && player.emote === 0) {
      player.emote = data.id;
      player.timeoutIds.push(setTimeout(() => {
          player.emote = 0;
      }, 3000));
  }
}

function handleGadget(player) {
  if (player.canusegadget && player.gadgetuselimit > 0) {
      player.canusegadget = false;
      player.gadgetuselimit--;
      player.usegadget();
      player.timeoutIds.push(setTimeout(() => {
          player.canusegadget = true;
      }, player.gadgetcooldown));
  }
}

function handleMovementData(data, player, room) {
  if (typeof data.direction === "string" && isValidDirection(data.direction)) {
      const validDirection = parseFloat(data.direction);
      if (!isNaN(validDirection)) {
          updatePlayerDirection(player, validDirection);
          updatePlayerMovement(player, data.moving);
          handlePlayerMoveInterval(player, room);
      } else {
          console.warn("Invalid direction value:", data.direction);
      }
  }
}

function updatePlayerDirection(player, direction) {
  player.direction = direction;
  player.direction2 = direction > 90 ? 90 : direction < -90 ? -90 : direction;
}

function updatePlayerMovement(player, moving) {
  if (moving === true || moving === "true") {
      player.moving = true;
  } else if (moving === false || moving === "false") {
      player.moving = false;
  } else {
      //console.warn("Invalid 'moving' value:", moving);
  }
}



function handlePlayerMoveInterval(player, room) {
  if (!player.moveInterval) {
      clearInterval(player.moveInterval);
      player.moveInterval = setInterval(() => {
          if (player.moving) {
              handleMovement(player, room);
          } else {
              clearInterval(player.moveInterval);
              player.moveInterval = null;
          }
      }, server_tick_rate);
      player.intervalIds.push(player.moveInterval)
  }
}

/*function handleRequest(result, message) {
	const player = result.room.players.get(result.playerId);
	const data = JSON.parse(message);

	if (message.length > 100) {
	  player.ws.close(4000, "ahhh whyyyyy");
		}

	if (player) {

	if (data.type === "pong") {

				clearTimeout(player.timeout); 

				player.timeout = setTimeout(() => { player.ws.close(4200, "disconnected_inactivity"); }, player_idle_timeout); 
			      //    const timestamp = new Date().getTime();
				//if (player.lastping && (timestamp - player.lastping < 2000)) {
				//	player.ping = timestamp - player.lastping;
				//} else {
	
				//}
			}
                  }
	

	if (result.room.state === "playing" && player.visible !== false && !player.eliminated) {
		try {
			if (data.type === "shoot") {
				if (data.shoot_direction > -181 && data.shoot_direction < 181) {
					player.shoot_direction = parseFloat(data.shoot_direction);
					handleBulletFired(result.room, player, player.gun);
				} else {
				//	console.log(data.shoot_direction)
				}
			}
			

			if (data.type === "switch_gun") {
				const selectedGunNumber = parseFloat(data.gun);
				const allguns = Object.keys(gunsconfig).length;
				if (
					selectedGunNumber !== player.gun &&
					!player.shooting &&
					selectedGunNumber >= 1 &&
					selectedGunNumber <= allguns
				) {
					
					player.gun = selectedGunNumber;
				} else if (player.shooting) {
					
					console.log("Cannot switch guns while shooting.");
				} else {
					
					console.log("Gun number must be between 1 and 3.");
				}
			}
			if (data.moving === "false") {
				clearInterval(player.moveInterval);
				player.moveInterval = null;
				player.moving = false;
			}


      if (data.type === "emote" && data.id >= 1 && data.id <= 4 && player.emote === 0){
         
        player.emote = data.id

        setTimeout(() =>{
        player.emote = 0

        }, 3000);
        }

        if (data.type === "gadget" && player.canusegadget && player.gadgetuselimit > 0){
         
          player.canusegadget = false
          player.gadgetuselimit--
  
          player.usegadget();
          setTimeout(() =>{
            player.canusegadget = true
  
          }, player.gadgetcooldown);
          }


			if (
				data.type === "movement" &&
				typeof data.direction === "string" &&
				isValidDirection(data.direction)
			) {
				const validDirection = parseFloat(data.direction);
				if (!isNaN(validDirection)) {
					if (player) {
						
						player.direction = validDirection;
						if (validDirection > 90) {
							player.direction2 = 90;
						} else if (validDirection < -90) {
							player.direction2 = -90;
						} else {
							player.direction2 = validDirection;
						}
						
						if (data.moving === "true") {
						
							if (!player.moving === true) {
								player.moving = true;
							}
						} else if (data.moving === "false") {
							
							player.moving = false;
						} else {
							console.warn("Invalid 'moving' value:", data.moving);
						}
					
						if (!player.moveInterval) {
							clearInterval(player.moveInterval);
							player.moveInterval = setInterval(() => {
             
								if (player.moving) {
                  

									handleMovement(player, result.room);
								} else {
               
									clearInterval(player.moveInterval);
									player.moveInterval = null;
								}
							}, server_tick_rate);
						}
					}
				} else {
					console.warn("Invalid direction value:", data.direction);
				}
			}
		} catch (error) {
			console.error("Error parsing message:", error);
		}
	}
}
*/

module.exports = {
  joinRoom,
  addToBatch,
  sendBatchedMessages,
  createRoom,
  generateRandomCoins,
  handleRequest,
  closeRoom,
  handleCoinCollected2,
};
