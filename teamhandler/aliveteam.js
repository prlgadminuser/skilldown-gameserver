function TeamPlayersActive(room, player) {

    // Ensure the player's team is defined
    if (!player.team || player.team.length === 0) {
      return 0; // Return 0 if the player's team is not valid
    }
  
    let count = 0;
  
    // Count players in the team who are in state 1
    player.team.forEach(player => {
      const teamPlayer = room.players.get(player); // Access the player by their ID
      if (teamPlayer && teamPlayer.state === 1) {
        count++;
      }
    });
    
    return count;
  
   
  }
  

module.exports = {
    TeamPlayersActive
}