"use strict";

const { LZString, axios, Limiter } = require('./..//index.js');
const { matchmaking_timeout, server_tick_rate, game_start_time, batchedMessages, rooms, mapsconfig, gunsconfig, gamemodeconfig, matchmakingsp, player_idle_timeout, room_max_open_time } = require('./config.js');
const { handleBulletFired } = require('./bullets.js');
const { handleMovement } = require('./player.js');
const { startRegeneratingHealth, startDecreasingHealth } = require('./match-modifiers');
const { gadgetconfig } = require('./gadgets.js')
const { StartremoveOldKillfeedEntries } = require('./killfeed.js')
const { UseZone } = require('./zone')
const { initializeHealingCircles } = require('./../gameObjectEvents/healingcircle')
const { initializeAnimations } = require('./../gameObjectEvents/deathrespawn')
const { playerchunkrenderer } = require('./../playerhandler/playerchunks')
const { SpatialGrid, gridcellsize } = require('./config.js');


const roomStateLock = new Map();
const roomIndex = new Map();
const { Mutex } = require('async-mutex');

const roomLock = new Mutex();
async function acquireRoomLock() {
  await roomLock.acquire();
}

function releaseRoomLock() {
  roomLock.release();
}

function getAvailableRoom(gamemode, spLevel) {
  const key = `${gamemode}_${spLevel}`;
  const roomList = roomIndex.get(key) || [];
  return roomList.find(room => room.players.size < gamemodeconfig[gamemode].maxplayers && room.state === 'waiting');
}

function addRoomToIndex(room) {
  const key = `${room.gamemode}_${room.sp_level}`;
  if (!roomIndex.has(key)) roomIndex.set(key, []);
  roomIndex.get(key).push(room);
}

function removeRoomFromIndex(room) {
  const key = `${room.gamemode}_${room.sp_level}`;

  // Check if the index contains the key
  if (!roomIndex.has(key)) return;

  // Get the list of rooms for this key
  const roomList = roomIndex.get(key);

  // Filter out the room to be removed
  const updatedRoomList = roomList.filter(existingRoom => existingRoom.roomId !== room.roomId);

  if (updatedRoomList.length > 0) {
    // Update the index with the filtered list
    roomIndex.set(key, updatedRoomList);
  } else {
    // If the list is empty, remove the key from the index
    roomIndex.delete(key);
  }
}


function createRateLimiter() {
  const rate = 40; // Allow one request every 50 milliseconds
  return new Limiter({
    tokensPerInterval: rate,
    interval: 1000, // milliseconds
  });
}

async function setupRoomPlayers(room) {

let playerNumberID = 0; // Start with player number 0

// Iterate over each player in the room's players collection
room.players.forEach((player) => {
  // Set the player's unique number (nmb)
  player.nmb = playerNumberID;

  const spawnPositions = room.spawns;
  const spawnIndex = playerNumberID % spawnPositions.length; // Distribute players across spawn positions

  player.x = spawnPositions[spawnIndex].x,
    player.y = spawnPositions[spawnIndex].y,

    // Assign the spawn position to the player
  player.startspawn = {
    x: spawnPositions[spawnIndex].x,
    y: spawnPositions[spawnIndex].y
  };

  // Increment the player number for the next player
  playerNumberID++;
});
}

async function CreateTeams(room) {
  if (!room.players || room.players.size === 0) return;

  // Define team IDs
  const teamIDs = ["Red", "Blue", "Green", "Yellow", "Orange", "Purple", "Pink", "Cyan"];
  const numTeams = Math.ceil(room.players.size / room.teamsize);
  const teams = Array.from({ length: numTeams }, () => []);

  let teamIndex = 0;

  // Step 1: Assign players to teams
  room.players.forEach((player) => {
    if (teams[teamIndex].length >= room.teamsize) {
      teamIndex = (teamIndex + 1) % numTeams;
    }
    teams[teamIndex].push({ playerId: player.playerId, nmb: player.nmb });
    player.team = {
      id: teamIDs[teamIndex] || `Team-${teamIndex + 1}`,
      players: teams[teamIndex], // Reference to team
    };
  });

  // Step 2: Finalize `room.teams`
  room.teams = teams.map((team, index) => ({
    id: teamIDs[index] || `Team-${index + 1}`,
    players: team,
    score: 0,
  }));

  // Step 3: Assign complete `teamdata` to each player
  room.players.forEach((player) => {
    const team = player.team; // Get the player's team
    const playerIds = Object.fromEntries(
      team.players.map((p) => [p.nmb, p.nmb]) // Extract all player IDs in the team
    );

    player.teamdata = {
      id: playerIds, // Complete team member IDs
      tid: team.id,  // Team ID
    };
  });
}




function getPlayersTeamNmbs(room, nmb) {
  for (const team of room.teams) {
    if (team.players.some(player => player.nmb === nmb)) {
      // Return only the `nmb` values of the players in this team
      return team.players.map(player => player.nmb);
    }
  }
  return []; // Return an empty array if the player's team is not found
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
    removeRoomFromIndex(room)


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
    const { playerId, hat, top, player_color, hat_color, top_color, gadget, skillpoints, nickname } = playerVerified;

    const gadgetselected = gadget || 1;
    const finalskillpoints = skillpoints || 0;
    const finalnickname = nickname.replace(/[:$]/g, '');

    const roomjoiningvalue = matchmakingsp(finalskillpoints);

    let roomId, room;
    let roomCreationLock = false;

    // Synchronize room assignment/creation
    await acquireRoomLock();

    try {
      // Check if there's an existing room with available slots
      const availableRoom = getAvailableRoom(gamemode, roomjoiningvalue)

      if (availableRoom) {
        roomId = availableRoom.roomId;
        room = availableRoom;
      } else {
        roomId = `room_${Math.random().toString(36).substring(2, 15)}`;
        room = createRoom(roomId, gamemode, gamemodeconfig[gamemode], roomjoiningvalue);
        addRoomToIndex(room)
        roomCreationLock = true; // Indicate that this function created the room
      }
    } finally {
      releaseRoomLock();
    }

    const playerRateLimiter = createRateLimiter();

    // Determine spawn position index
    //  const playerNumberID = room.currentplayerid;
    // room.currentplayerid += 1
    //  const spawnPositions = room.spawns;
    //  const spawnIndex = playerNumberID % spawnPositions.length;

    const newPlayer = {
      ws,
      lastmsg: 0,
      intervalIds: [],
      timeoutIds: [],
      direction: null,
      prevX: 0,
      prevY: 0,
      playerId: playerId,
      finalrewards_awarded: false,
      spectateid: 0,
      nickname: finalnickname,
      spectatingTarget: null,
      spectatingplayerid: null,
      rateLimiter: playerRateLimiter,
      hat: hat,
      top: top,
      player_color: player_color,
      hat_color: hat_color,
      top_color: top_color,
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
      loadout: { 1: "1", 2: "4", 3: "5" },
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
          gadgetconfig[gadgetselected].gadget(player, room);
        } else {
          console.error('Player not found or cannot use gadget');
        }
      },
    };

    newPlayer.gun = newPlayer.loadout[1];

    if (newPlayer.gadgetchangevars) {
      for (const [variable, change] of Object.entries(newPlayer.gadgetchangevars)) {
        newPlayer[variable] += Math.round(newPlayer[variable] * change);
      }
    }

    if (room) {
      newPlayer.timeout = setTimeout(() => {
        if (newPlayer.lastPing > Date.now()) {

          newPlayer.ws.close(4200, "disconnected_inactivity")
        }
      }, player_idle_timeout);

      room.players.set(playerId, newPlayer);

      if (ws.readyState === ws.CLOSED) {
        playerLeave(roomId, playerId);
        return;
      }
    }

    if (room.state === "waiting" && room.players.size >= room.maxplayers && !roomStateLock.get(roomId)) {
      roomStateLock.set(roomId, true);

    
      await setupRoomPlayers(room)

      await CreateTeams(room)

      clearTimeout(room.matchmaketimeout);

      try {

        room.state = "await";
        setTimeout(() => {
          if (!rooms.has(roomId)) {
            roomStateLock.delete(roomId);
            return;
          }

          if (room.matchtype === "td") {

            const t1 = room.teams[0];
            const t2 = room.teams[1];

            room.scoreboard = [
              t1.id,
              t1.score,
              t2.id,
              t2.score,
            ].join('$')

          }


          playerchunkrenderer(room)
          room.state = "countdown";
          //  console.log(`Room ${roomId} entering countdown phase`);

          setTimeout(() => {
            if (!rooms.has(roomId)) return;

            room.state = "playing";

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

            // console.log(`Room ${roomId} transitioned to playing state`);
            StartremoveOldKillfeedEntries(room);
            initializeAnimations(room);
            if (room.healspawner) initializeHealingCircles(room);
            if (room.zoneallowed) UseZone(room);
            if (room.regenallowed) startRegeneratingHealth(room, 1);
            if (room.healthdecrease) startDecreasingHealth(room, 1);

            roomStateLock.delete(roomId);
          }, game_start_time);

        }, 1000);
      } catch (err) {
        console.error(`Error during room state transition: ${err}`);
        roomStateLock.delete(roomId);
      }
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

// Utility functions for locking


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






const state_map = {
  "waiting": 1,
  "await": 2,
  "countdown": 3,
  "playing": 4
}



function sendBatchedMessages(roomId) {
  const room = rooms.get(roomId);

  const playercountroom = Array.from(room.players.values()).filter(player => !player.eliminated).length;





  if (room.dummies) {
    const transformData = (data) => {
      const transformed = {};
      for (const [key, value] of Object.entries(data)) {
        transformed[key] = `${value.x}:${value.y}:${value.h}:${value.sh}:${value.t}`;
      }
      return transformed;
    };



    room.dummiesfiltered = JSON.stringify(transformData(room.dummies), null, 2)

  }



  let roomdata = [
    state_map[room.state],
    room.zone,
    room.maxplayers,
    playercountroom,
    room.map,
    room.countdown,
    room.winner,
  ].join(':');
  
  // Check if the new roomdata is different from the last sent data
  if (room.rdlast !== roomdata) {
    room.rdlast = roomdata;  // Update the last sent room data
  
    // Continue with sending the data...
  } else {
    roomdata = undefined;  // No need to send the data if it hasn't changed
  }

  let playerData = {};

  Array.from(room.players.values()).forEach(player => {
    if (player.visible !== false) {
      const formattedBullets = {};
      player.bullets.forEach(bullet => {
        formattedBullets[bullet.timestamp] =
          `${bullet.x}:${bullet.y}:${Math.round(bullet.direction)}:${bullet.gunid}`;
      });

      const finalbullets = JSON.stringify(formattedBullets)

      if (room.state === "playing") {

        const currentPlayerData = [
          "",
          "",
          "",
          "",
          "",
          "",//player.starthealth,
          "",
          player.x,
          player.y,
          player.direction2,
          player.health,
          player.shooting ? 1 : 0,
          player.gun,
          player.emote,
          !(finalbullets.length === 2) ? "$b" + finalbullets : undefined,  // Compact bullets or undefined
        ].join(':');


        playerData[player.nmb] = currentPlayerData;

      } else {

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
          player.shooting ? 1 : 0,
          player.gun,
          player.emote,   // Compact bullets or undefined
        ].join(':');

        playerData[player.nmb] = currentPlayerData;

      }



    }
  });

  const newMessage = {
    pd: playerData, // Always send full player data
    rd: roomdata,
    dm: room.dummiesfiltered,
    kf: room.newkillfeed,
    // ob: eventsender,

  };

  const jsonString = JSON.stringify(newMessage);

  room.players.forEach(player => {



    // Create player-specific message with minimal selfPlayerData
    const playerloadout = [
      player.loadout[1],
      player.loadout[2],
      player.loadout[3],

    ].join('$')



    const selfPlayerData = [
      player.nmb,
      player.state,
      player.health,
      player.shooting ? 1 : 0,
      player.gun,
      player.kills,
      player.damage,
      [player.place, player.skillpoints_inc, player.seasoncoins_inc].join('$'),
      player.eliminator,
      player.canusegadget ? 1 : 0,
      player.gadgetuselimit,
      player.x,
      player.y,
      player.hitdata,
      player.elimlast,
      player.emote,
      player.spectateid,
      playerloadout,
    ].join(':');



    let filteredplayers = {};
    if (room.state === "playing") {


      const playersInRange = player.nearbyplayers 




      //  player.pd = {};
      // Filter playerData to include only players in range for the current player

      filteredplayers = Object.entries(playerData).reduce((result, [playerId, playerData]) => {
        if (playersInRange.has(Number(playerId))) {
          result[playerId] = playerData; // Add filtered player data
        }
        return result;
      }, {});

      player.pd = filteredplayers
    } else {

      if (room.state === "countdown") {
        player.pd = playerData
      } else {
        player.pd = {}


      }
    }



    // const eventSender = findNearestCircles(player, room);


    let playerSpecificMessage;

    if (room.state === "waiting") {
      playerSpecificMessage = {
        rd: newMessage.rd,

      };
    } else {



      let finalselfdata

    if (room.state === "playing") {

     if (player.selflastmsg !== selfPlayerData) {
     player.selflastmsg = selfPlayerData;
     finalselfdata = selfPlayerData  // Update the last sent room data
     } else {
       finalselfdata = undefined; // No need to send the data if it hasn't changed
      }

       } else {

        finalselfdata = selfPlayerData

     }

      playerSpecificMessage = [
        { key: 'pd', value: player.pd },
        { key: 'rd', value: newMessage.rd },
        { key: 'kf', value: newMessage.kf },
        { key: 'dm', value: newMessage.dm },
        { key: 'cl', value: player.nearbycircles },
        { key: 'an', value: player.nearbyanimations },
        { key: 'td', value: player.teamdata && room.state !== "playing" ? player.teamdata : undefined },
        { key: 'sb', value: room.scoreboard },
        { key: 'sd', value: finalselfdata }
      ].reduce((acc, { key, value }) => {
        // Check if value is not null, undefined, an empty array, or an empty object
        if (value !== null && value !== undefined &&
          (!Array.isArray(value) || value.length > 0) &&
          (!(value instanceof Object) || Object.keys(value).length > 0)) {
          acc[key] = value;
        }
        return acc;
      }, {});

    }

    const currentMessageHash = generateHash(playerSpecificMessage);

    const playermsg = JSON.stringify(playerSpecificMessage)

    // Throttle the message sending for performance
    if (player.ws && currentMessageHash !== player.lastMessageHash) {
      const compressedPlayerMessage = LZString.compressToUint8Array(playermsg)
      player.ws.send(compressedPlayerMessage, { binary: true });
      player.lastMessageHash = currentMessageHash; // Store the new hash
    }
  });

  room.lastSentMessage = jsonString


  // Clear the batch after sending
  batchedMessages.set(roomId, []);

  handlePlayerMoveIntervalAll(room)


}




// Efficient Hashing Function
function generateHash(message) {
  let hash = 0;
  const str = JSON.stringify(message);
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
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

  const itemgrid = new SpatialGrid(gridcellsize); // grid system for items

  const room = {
    currentplayerid: 0,
    killfeed: [],
    newkillfeed: [],
    itemgrid: itemgrid,
    timeoutIds: [],
    intervalIds: [],
    roomId: roomId,
    objects: [],
    maxplayers: gmconfig.maxplayers,
    teamsize: gmconfig.teamsize,
    sp_level: splevel,
    snap: [],
    players: new Map(),
    state: "waiting", // Possible values: "waiting", "playing", "countdown"
    showtimer: gmconfig.show_timer,
    gamemode: gamemode,
    winner: -1,
    eliminatedTeams: [],
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
    healspawner: gmconfig.healspawner,
    matchtype: gmconfig.matchtype

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
  // console.log("room created:", roomId)

  room.matchmaketimeout = setTimeout(() => {


    room.players.forEach((player) => {

      clearInterval(player.moveInterval)
      clearTimeout(player.timeout)

      if (room.eliminatedTeams) {
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
  

  console.log("Room", room.roomId, "created")
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

  if (message.length > 100) {
    player.ws.close(4000, "ahhh whyyyyy");
    return;
  }

  if (!player) return;

  switch (message) {
    case "1":
      handlePong(player);
      break;
  }



  if (result.room.state !== "playing" || player.visible === false || player.eliminated || !result.room.winner === -1) return;

  const data = message.split(':');

  const type = data[0]


  switch (type) {
    case "3":
      handleMovementData(data, player, result.room);
      break;
    case "4":
      handleShoot(data, player, result.room);
      break;
    case "5":
      handleSwitchGun(data, player);
      break;
    case "6":
      handleEmote(data, player);
      break;
    case "7":
      handleGadget(player);
      break;
  }
  //handleMovingState(data.moving, player);

  if (type === "2") {
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
  const now = Date.now();

  if (player.lastPing && now - player.lastPing < 1000) {
    return;
  }
  player.lastPing = now;

}



function handleShoot(data, player, room) {
  const shoot_direction = data[1]
  if (shoot_direction > -181 && shoot_direction < 181) {
    player.shoot_direction = parseFloat(shoot_direction);
    handleBulletFired(room, player, player.gun);
  }
}

function handleSwitchGun(data, player) {
  const GunID = parseFloat(data[1]);
  const allguns = Object.keys(gunsconfig);
  if (
    GunID !== player.gun && !player.shooting && GunID >= 1 && GunID <= 3 && GunID in allguns) {

    player.gun = player.loadout[GunID];

  } else {

  }

}

function handleEmote(data, player) {
  const emoteid = data[1]
  if (emoteid >= 1 && emoteid <= 4 && player.emote === 0) {
    player.emote = emoteid;
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
  const direction = data[1];

  if (isValidDirection(direction)) {
    const validDirection = direction;
    if (validDirection) {
      updatePlayerDirection(player, direction);
      player.moving = true;
      //handlePlayerMoveInterval(player, room);
    } else {
      console.warn("Invalid direction value:", direction);
    }
  }
}

  function updatePlayerDirection(player, direction) {

    player.direction = direction;
 
    if (player.direction == -180 || player.direction == 0) {
    } else 
      player.direction2 = direction > 90 ? 90 : direction < -90 ? -90 : direction; // Adjust otherwise
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
        if (player.moveInterval)
        clearInterval(player.moveInterval);
        player.moveInterval = null;
      }
    }, server_tick_rate);
    player.intervalIds.push(player.moveInterval)
  }
}


function handlePlayerMoveIntervalAll(room) {

  room.players.forEach((player) => {
      if (player.moving) {
        handleMovement(player, room);
      };
    });
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
  handlePong
};