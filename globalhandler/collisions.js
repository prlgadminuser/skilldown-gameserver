"use strict";

const wallblocksize = 50


const halfBlockSize = wallblocksize / 2;

function isCollisionWithWalls(walls, x, y) {
  const xMin = x - 20;
  const xMax = x + 20;
  const yMin = y - 45;
  const yMax = y + 45;

  for (const wall of walls) {
    const wallLeft = wall.x - halfBlockSize;
    const wallRight = wall.x + halfBlockSize;
    const wallTop = wall.y - halfBlockSize;
    const wallBottom = wall.y + halfBlockSize;

    if (
      xMax > wallLeft &&
      xMin < wallRight &&
      yMax > wallTop &&
      yMin < wallBottom
    ) {
      return true; // Collision detected
    }
  }

  return false; // No collision detected
}

function isCollisionWithBullet(walls, x, y, height, width) {

  const halfWidth = width / 2;
  const halfHeight = height / 2;

  // Iterate through each wall
  for (const wall of walls) {
    // Determine the boundaries of the wall
    const wallLeft = wall.x - halfBlockSize;
    const wallRight = wall.x + halfBlockSize;
    const wallTop = wall.y - halfBlockSize;
    const wallBottom = wall.y + halfBlockSize;

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

function adjustBulletDirection(bullet, wall, wallBlockSize) {
  const halfBlockSize = wallBlockSize / 2;

  // Calculate the differences between the bullet's position and the wall's center
  const deltaX = bullet.x - wall.x;
  const deltaY = bullet.y - wall.y;

  let normalAngle;

  // Determine which side of the wall the bullet is hitting
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    // The bullet is closer to the left or right of the wall
    if (deltaX < -halfBlockSize) {
      normalAngle = 180; // Left side
    } else if (deltaX > halfBlockSize) {
      normalAngle = 0;   // Right side
    }
  } else {
    // The bullet is closer to the top or bottom of the wall
    if (deltaY < -halfBlockSize) {
      normalAngle = 90;  // Top side
    } else if (deltaY > halfBlockSize) {
      normalAngle = 270; // Bottom side
    }
  }

  // Convert angles to radians
  const incomingAngle = bullet.direction * (Math.PI / 180);
  const normalAngleRadians = normalAngle * (Math.PI / 180);

  // Calculate the reflection angle in radians
  const reflectionAngleRadians = 2 * normalAngleRadians - incomingAngle;

  // Convert the reflection angle back to degrees
  let reflectionAngleDegrees = (reflectionAngleRadians * 180) / Math.PI;

  // Normalize the reflection angle to the range -180 to 180
  if (reflectionAngleDegrees > 180) {
    reflectionAngleDegrees -= 360;
  } else if (reflectionAngleDegrees < -180) {
    reflectionAngleDegrees += 360;
  }

  // Update bullet direction to the normalized reflection angle
  bullet.direction = reflectionAngleDegrees;
}




module.exports = {
  isCollisionWithWalls,
  isCollisionWithBullet,
  wallblocksize,
  adjustBulletDirection,
};
