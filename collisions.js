"use strict";

const wallblocksize = 50


function isCollisionWithWalls(walls, x, y) {
  const halfBlockSize = wallblocksize / 2;
  
  for (const wall of walls) {
      const wallLeft = wall.x - halfBlockSize;
      const wallRight = wall.x + halfBlockSize;
      const wallTop = wall.y - halfBlockSize;
      const wallBottom = wall.y + halfBlockSize;

      if (
      x + 20 > wallLeft &&
      x - 20 < wallRight &&
      y + 45 > wallTop &&
      y - 45 < wallBottom
      ) {
          return true;  // Collision detected
      }
  }

  return false;  // No collision detected
}

function isCollisionWithBullet(walls, x, y, height, width) {
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  // Iterate through each wall
  for (const wall of walls) {
    // Determine the boundaries of the wall
    const wallLeft = wall.x - wallblocksize / 2;
    const wallRight = wall.x + wallblocksize / 2;
    const wallTop = wall.y - wallblocksize / 2;
    const wallBottom = wall.y + wallblocksize / 2;

    // Check if the bullet's bounding box intersects with the wall's bounding box
    if (
      x - halfWidth < wallRight &&
      x + halfWidth > wallLeft &&
      y - halfHeight < wallBottom &&
      y + halfHeight > wallTop
    ) {
      return true; // Collision detected
    }
  }

  return false; // No collision detected
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
