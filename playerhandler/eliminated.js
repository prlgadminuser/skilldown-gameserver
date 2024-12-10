const { increasePlayerPlace, increasePlayerWins } = require('./../globalhandler/dbrequests')
const { endGame } = require('./../globalhandler/game')
const { game_win_rest_time } = require('./../globalhandler/config')


const { startSpectatingLogic } = require('./spectating')


// playerstates: 1:alive 2:respawning 3:eliminated

function handleElimination(room, player) {


    if (player.eliminated === false && room.state === "playing" && room.winner === 0) {
        player.eliminated = true;
        player.visible = false;
        player.state = 3

   
    room.timeoutIds.push(setTimeout(() => {
        startSpectatingLogic(player, room)
    }, 3000));      
    


    clearInterval(player.moveInterval);
    clearTimeout(player.timeout);

    // Calculate player's place based on remaining players at the exact time of elimination
    const remainingActivePlayers = Array.from(room.players.values()).filter(p => !p.eliminated).length;

    player.place = room.players.size - room.eliminatedPlayers.length;

    if (remainingActivePlayers === 1 && room.winner === 0) {
        // Last elimination leaves one player standing
        player.place = 2;
    }

    // Ensure no duplicate places
    while (room.eliminatedPlayers.some(p => p.place === player.place)) {
        player.place++;
    }

    room.eliminatedPlayers.push({
        username: player.playerId,
        place: player.place,
    });

    increasePlayerPlace(player.playerId, player.place, room);

    // Check if game should end
    if (
        Array.from(room.players.values()).filter(p => p.visible).length === 0
    ) {
        room.timeoutIds.push(
            setTimeout(() => {
                endGame(room);
            }, game_win_rest_time)
        );
    }

    // Check if only one player remains
    const remainingPlayers = Array.from(room.players.values()).filter(
        p => !p.eliminated
    );
    if (remainingPlayers.length === 1 && room.winner === 0) {
        const remainingPlayer = remainingPlayers[0];
        room.winner = [remainingPlayer.nickname, remainingPlayer.nmb].join("$");

        increasePlayerWins(remainingPlayer.playerId, 1);
        increasePlayerPlace(remainingPlayer.playerId, 1, room);

        room.eliminatedPlayers.push({
            username: remainingPlayer.playerId,
            place: 1,
        });

        room.timeoutIds.push(
            setTimeout(() => {
                endGame(room);
            }, game_win_rest_time)
        );
    }
}
}


module.exports = {
    handleElimination,
  };
  