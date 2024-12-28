const { SpatialGrid } = require('./../globalhandler/config');


const chunkradius = 150


function findNearestEvents(player, room) {
  const grid = room.itemgrid; // Assume room.grid is your SpatialGrid

  // Define the search area around the player (radius search area)
  const searchRadius = 400 // Search area in pixels around the player
  const xMin = player.x - searchRadius;
  const xMax = player.x + searchRadius;
  const yMin = player.y - searchRadius;
  const yMax = player.y + searchRadius;

  // Get all objects (circles) in the area

  const formatted = {};

  const objectsInArea = grid.getObjectsInArea(xMin, xMax, yMin, yMax);

  // Filter and map the circles in the area
  const circles = objectsInArea
  .filter(obj => obj.id === "circle")
  .map(circle => [
    circle.type,
    circle.x,
    circle.y,
    circle.radius
  ].join(':'));

  const animations = {};
  objectsInArea
    .filter(obj => obj.id === "death" || obj.id === "respawn")
    .forEach(obj => {
      animations[`${obj.obj_id}`] = [
        obj.id,
        obj.x,
        obj.y
      ].join(":");
    });

// Assign the results to the player
player.nearbycircles = circles;
player.nearbyanimations = animations;
}




function getPlayersInRange(players, centerX, centerY, radius, excludePlayerId) {
  const playersInRange = new Set(); // Initialize an empty Set

  // Loop through the players and check their distance to (centerX, centerY)
  players.forEach(player => {
    // Exclude the current player (based on player.nmb)
    if (player.nmb !== excludePlayerId) {
      const dx = player.x - centerX;
      const dy = player.y - centerY;
      const distanceSquared = dx * dx + dy * dy; // Avoid expensive Math.sqrt

      // If the player is within the radius, add them to the Set
      if (distanceSquared <= radius * radius) {
        playersInRange.add(player.nmb); // Include the player's ID
      }
    }
  });

  return playersInRange; // Return the Set of player IDs
}

function getCircleDetailsForIds(circleIds, room) {
  const grid = room.itemgrid; // Assume this is the SpatialGrid or similar structure

  // Retrieve detailed information for each circle ID
  const detailedInfo = circleIds
      .map(id => grid.getObjectById(id)) // Assuming grid.getObjectById retrieves an object by its ID
      .filter(obj => obj && obj.id === "circle") // Ensure the object exists and is a circle
      .map(circle => [
          circle.type,
          circle.x,
          circle.y,
          circle.radius
      ].join(':')); // Format the details as a string

  return detailedInfo;
}



function UpdatePlayerChunks(room, player) {

  const searchRadius = chunkradius  // Search area in pixels around the player
  const xMin = player.x - searchRadius;
  const xMax = player.x + searchRadius;
  const yMin = player.y - searchRadius;
  const yMax = player.y + searchRadius;

    player.nearbywalls = room.grid.getWallsInArea(xMin, xMax, yMin, yMax);

     
   findNearestEvents(player, room)  

    player.nearbyplayers = getPlayersInRange(Array.from(room.players.values()).filter(p => p.visible), player.x, player.y, 400);


    }



function playerchunkrenderer(room) {
  // Initialize the list of healing circles

  

  room.intervalIds.push(setInterval(() => {


    room.players.forEach((player) => {

 
        UpdatePlayerChunks(room, player)
      
      });
  }, 250));
}

module.exports = {
    playerchunkrenderer
  };
  