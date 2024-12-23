

function getKillfeed(room) {
  return room.killfeed.map(entry => entry.entry); // Only return the kill entry text
}
  // Function to add a kill to the killfeed in the room
  function addKillToKillfeed(room, killer, target, type, gunid, messagetype) {
    const timestamp = Date.now(); // Get current timestamp (in milliseconds)
    
    // Create the killfeed entry with a timestamp
    const killEntry = {
      entry: {
        1: killer,
        2: target,
        3: type,
        4: gunid,
        5: messagetype
      },
      timestamp: timestamp
    };
    
    // Add the entry to the beginning of the killfeed (latest at the front)
    room.killfeed.unshift(killEntry.entry);
  
    // Ensure that the killfeed only holds the last 5 entries
    if (room.killfeed.length > 5) {
      room.killfeed.pop();  // Remove the oldest entry if there are more than 5
    }
  room.newkillfeed =  "$" + JSON.stringify(room.killfeed) + "$" 
  }
  
  // Function to get the current killfeed from the room

  
  // Function to remove entries older than 5 seconds
  function removeOldKillfeedEntries(room) {
    const currentTime = Date.now();
    
    // Filter out entries that are older than 5 seconds
    room.killfeed = room.killfeed.filter(entry => currentTime - entry.timestamp <= 5000);
    room.newkillfeed = "$" + JSON.stringify(room.killfeed) + "$" 
  }
  
  // Example usage

  function StartremoveOldKillfeedEntries(room) {
    room.newkillfeed = []

    addKillToKillfeed(room, 0, 0, 2, 4, 2);
    addKillToKillfeed(room, 0, 0, 2, 4, 4);
    room.intervalIds.push(setInterval(() => {
        removeOldKillfeedEntries(room)
      }, 1000));
  }
  


  
module.exports = {
addKillToKillfeed,
getKillfeed,
StartremoveOldKillfeedEntries,
}