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


function adjustBulletDirection(bullet, wall) {
  // Wall boundaries
  const wallLeft = wall.x - wall.width / 2;
  const wallRight = wall.x + wall.width / 2;
  const wallTop = wall.y - wall.height / 2;
  const wallBottom = wall.y + wall.height / 2;

  // Bullet center position
  const bulletCenterX = bullet.x;
  const bulletCenterY = bullet.y;

  // Determine the closest wall side
  let normalAngle;

  const distanceLeft = Math.abs(bulletCenterX - wallLeft);
  const distanceRight = Math.abs(bulletCenterX - wallRight);
  const distanceTop = Math.abs(bulletCenterY - wallTop);
  const distanceBottom = Math.abs(bulletCenterY - wallBottom);

  const minDistance = Math.min(distanceLeft, distanceRight, distanceTop, distanceBottom);

  if (minDistance === distanceLeft) {
    normalAngle = 180; // Left side
  } else if (minDistance === distanceRight) {
    normalAngle = 0; // Right side
  } else if (minDistance === distanceTop) {
    normalAngle = 90; // Top side
  } else if (minDistance === distanceBottom) {
    normalAngle = 270; // Bottom side
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

  // Correct the bullet's position slightly away from the wall to prevent it from getting stuck
  const correctionDistance = 1; // Small correction value to push the bullet out of the wall
  bullet.x += correctionDistance * Math.cos(reflectionAngleRadians);
  bullet.y += correctionDistance * Math.sin(reflectionAngleRadians);
}





module.exports = {
  isCollisionWithWalls,
  isCollisionWithBullet,
  wallblocksize,
  adjustBulletDirection,
};
