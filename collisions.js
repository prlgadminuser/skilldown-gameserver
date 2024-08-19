"use strict";

const { Collection } = require("mongodb");

const wallblocksize = 50
function isCollisionWithWalls(walls, x, y) {
  
  const threshold = 10;
  let collisionDetected = false;
  const nearbyWalls = walls.filter((wall) => {
  
    const closestX = Math.max(
      wall.x - wallblocksize,
      Math.min(x, wall.x + wallblocksize),
    );
    const closestY = Math.max(
      wall.y - wallblocksize,
      Math.min(y, wall.y + wallblocksize),
    );
    const distanceX = x - closestX;
    const distanceY = y - closestY;
    const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

    return distance < threshold;
  });

  
  for (const wall of nearbyWalls) {
    
    const wallLeft = wall.x - wallblocksize / 2;
    const wallRight = wall.x + wallblocksize / 2;
    const wallTop = wall.y - wallblocksize / 2;
    const wallBottom = wall.y + wallblocksize / 2;

    if (
      x + 20 > wallLeft &&
      x - 20 < wallRight &&
      y + 45 > wallTop &&
      y - 45 < wallBottom
    ) {
      collisionDetected = true; 
      break; 
     
    }
  }

   return collisionDetected;
}

function isCollisionWithBullet(walls, x, y, height, width) {

  const threshold = 1;
  let collisionDetected = false;
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  const nearbyWalls = walls.filter((wall) => {
  
    const closestX = Math.max(
      wall.x - wallblocksize + 1,
      Math.min(x, wall.x + wallblocksize),
    );
    const closestY = Math.max(
      wall.y - wallblocksize + 1,
      Math.min(y, wall.y + wallblocksize),
    );
    const distanceX = x - closestX;
    const distanceY = y - closestY;
    const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

    return distance < threshold;
  });

  
  for (const wall of nearbyWalls) {
    const wallLeft = wall.x - wallblocksize / 2;
    const wallRight = wall.x + wallblocksize / 2;
    const wallTop = wall.y - wallblocksize / 2;
    const wallBottom = wall.y + wallblocksize / 2;

   
    if (
      x - halfWidth < wallRight &&
      x + halfWidth > wallLeft &&
      y - halfHeight < wallBottom &&
      y + halfHeight > wallTop
    ) {
      collisionDetected = true;
      return collisionDetected;

    }
  }
}
function adjustBulletDirection(bullet, wall, wallblocksize) {
  const halfBlockSize = wallblocksize / 2;

  // Determine the wall normal angle based on the bullet's position
  let normalAngle = 0;
  if (bullet.x < wall.x - halfBlockSize) {
    normalAngle = 180; // Wall is to the left of the bullet
  } else if (bullet.x > wall.x + halfBlockSize) {
    normalAngle = 0;   // Wall is to the right of the bullet
  } else if (bullet.y < wall.y - halfBlockSize) {
    normalAngle = 90;  // Wall is below the bullet
  } else if (bullet.y > wall.y + halfBlockSize) {
    normalAngle = 270; // Wall is above the bullet
} else {
  // Bullet is within the wall block area or on its edge; no reflection needed
  return;
}


  // Convert angles to radians
  const incomingAngleRad = bullet.direction * (Math.PI / 180);
  const normalAngleRad = normalAngle * (Math.PI / 180);

  // Calculate the reflection angle in radians
  const reflectionAngleRad = 2 * normalAngleRad - incomingAngleRad;

  // Convert the reflection angle back to degrees
  let reflectionAngleDeg = (reflectionAngleRad * 180) / Math.PI;

  // Normalize the reflection angle to be within -180 to 180 degrees
  reflectionAngleDeg = ((reflectionAngleDeg + 180) % 360 + 360) % 360 - 180;

  // Update bullet direction
  bullet.direction = reflectionAngleDeg;
  console.log(reflectionAngleDeg)
}



module.exports = {
  isCollisionWithWalls,
  isCollisionWithBullet,
  wallblocksize,
  adjustBulletDirection,
};
