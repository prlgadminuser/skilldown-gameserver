

function getKillfeed(room) {
  return room.killfeed.map(entry => entry.entry); // Only return the kill entry text
}
  // Function to add a kill to the killfeed in the room
  function addKillToKillfeed(room, killer, target, type, gunid, messagetype) {
    const timestamp = Date.now(); // Get current timestamp (in milliseconds)
    
    // Create the killfeed entry with a timestamp
    const killEntry = {
      entry: `${killer}$${target}$${type}$${gunid}$${messagetype}`,
      timestamp: timestamp
    };
    
    // Add the entry to the beginning of the killfeed (latest at the front)
    room.killfeed.unshift(killEntry);
  
    // Ensure that the killfeed only holds the last 5 entries
    if (room.killfeed.length > 5) {
      room.killfeed.pop();  // Remove the oldest entry if there are more than 5
    }
    room.newkillfeed = JSON.stringify(getKillfeed(room))
  
  }
  
  // Function to get the current killfeed from the room

  
  // Function to remove entries older than 5 seconds
  function removeOldKillfeedEntries(room) {
    const currentTime = Date.now();
    
    // Filter out entries that are older than 5 seconds
    room.killfeed = room.killfeed.filter(entry => currentTime - entry.timestamp <= 5000);
  }
  
  // Example usage

  function StartremoveOldKillfeedEntries(room) {
    room.newkillfeed = []
    room.intervalIds.push(setInterval(() => {
        removeOldKillfeedEntries(room)
      }, 1000));
  }
  


  
module.exports = {
addKillToKillfeed,
getKillfeed,
StartremoveOldKillfeedEntries,
}