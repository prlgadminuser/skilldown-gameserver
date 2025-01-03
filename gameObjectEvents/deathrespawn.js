"use strict";

/**
 * Manages death and respawn animations and their behavior.
 * Animations spawn at player locations and expire after 3 seconds.
 */
const { SpatialGrid } = require('./../globalhandler/config');

function spawnAnimation(room, player, animationType) {
  if (!player) return; // Ensure the player exists

  // Generate a unique identifier for the animation object
  const animationId = Math.random().toString(36).substring(2, 7);

  // Define a new animation object
  const newAnimation = {
    obj_id: animationId,
    id: animationType, // Type of animation: "death" or "respawn"
    type: animationType === "death" ? "2" : "3", // Assign unique type values for animations
    x: player.x, // Player's current x-coordinate
    y: player.y, // Player's current y-coordinate
    duration: 1000, // Duration in milliseconds (3 seconds)
    elapsedTime: 0, // Time elapsed since the animation started
  };

  // Add the animation to the grid and room objects
  room.itemgrid.addObject(newAnimation);
  room.objects.push(newAnimation);

  // Optionally log animation spawn
  // console.log(`${animationType} animation spawned for player at (${newAnimation.x}, ${newAnimation.y})`);
}

function updateAnimations(deltaTime, room) {
  for (let i = room.objects.length - 1; i >= 0; i--) {
    const animation = room.objects[i];

    // Skip objects that are not animations
    if (animation.id !== "death" && animation.id !== "respawn") continue;

    // Update elapsed time
    animation.elapsedTime += deltaTime;

    // Remove the animation if it has expired
    if (animation.elapsedTime >= animation.duration) {
      room.itemgrid.removeObject(animation);
      room.objects.splice(i, 1);
      // console.log(`${animation.id} animation removed after 3 seconds.`);
    }
  }
}

function initializeAnimations(room) {
  // Initialize the list of animations (if not already initialized)
  room.objects = room.objects || [];

  // Update animations at a regular interval (e.g., 250ms)
  room.intervalIds.push(setInterval(() => {
    updateAnimations(250, room);
  }, 250));
}

module.exports = {
  spawnAnimation,
  initializeAnimations,
};
