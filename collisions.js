"use strict";

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

  const threshold = 100;
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
      return (
        x - halfWidth < wallRight &&
        x + halfWidth > wallLeft &&
        y - halfHeight < wallBottom &&
        y + halfHeight > wallTop);
    }
  }
}



function adjustBulletDirection(bullet, wall, wallBlockSize) {
  const halfBlockSize = wallBlockSize / 2;
  
  // Calculate differences between bullet and wall center
  const deltaX = bullet.x - wall.x;
  const deltaY = bullet.y - wall.y;

  let normalAngle;

  // Determine the side of the wall the bullet is hitting
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    // The bullet is closer to the left or right of the wall
    if (deltaX < 0) {
      normalAngle = 180; // Left side
    } else {
      normalAngle = 0;   // Right side
    }
  } else {
    // The bullet is closer to the top or bottom of the wall
    if (deltaY < 0) {
      normalAngle = 90;  // Top side
    } else {
      normalAngle = 270; // Bottom side
    }
  }

  // Calculate reflection angle
  const incomingAngle = bullet.direction * (Math.PI / 180);
  const normalAngleRadians = normalAngle * (Math.PI / 180);
  const reflectionAngle = 2 * normalAngleRadians - incomingAngle;
  const reflectionAngleDegrees = (reflectionAngle * 180) / Math.PI;
  
  // Round and update bullet's direction
  bullet.direction = Math.round(reflectionAngleDegrees % 360);

  // Convert reflection angle back to radians for position correction
  const reflectionAngleRadians = reflectionAngleDegrees * (Math.PI / 180);

  // Move the bullet slightly out of the wall to prevent sticking
  const correctionDistance = 1; // Small correction value
  bullet.x += correctionDistance * Math.cos(reflectionAngleRadians);
  bullet.y += correctionDistance * Math.sin(reflectionAngleRadians);
}




module.exports = {
  isCollisionWithWalls,
  isCollisionWithBullet,
  wallblocksize,
  adjustBulletDirection,
};
