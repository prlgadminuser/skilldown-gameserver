filteredplayers = Object.entries(playerData).reduce((result, [playerId, playerData]) => {
        if (playersInRange.has(Number(playerId))) {
          result[playerId] = playerData; // Add filtered player data
        }
        return result;
      }, {});