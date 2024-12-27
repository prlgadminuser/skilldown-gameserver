const { increasePlayerPlace, increasePlayerWins } = require('./../globalhandler/dbrequests')
const { endGame } = require('./../globalhandler/game')
const { game_win_rest_time } = require('./../globalhandler/config')


const { startSpectatingLogic } = require('./spectating')


// playerstates: 1:alive 2:respawning 3:eliminated

function handleElimination(room, team) {
    if (room.state !== "playing" || room.winner !== -1) {
        return; // Exit if the game is not in playing state or a winner is already declared
    }

    // Calculate team's place based on remaining teams at the time of elimination
    const remainingActiveTeams = room.teams.filter(t => t.some(playerId => !room.players.get(playerId).eliminated)).length;
    const teamPlace = room.teams.length - room.eliminatedTeams.length;

    // Ensure no duplicate places
    let adjustedPlace = teamPlace;
    while (room.eliminatedTeams.some(t => t.place === adjustedPlace)) {
        adjustedPlace++;
    }

    // Set place for all players in the team before changing their state
    team.forEach(playerId => {
        const player = room.players.get(playerId);
        if (player && !player.eliminated) {
            player.place = adjustedPlace;
            increasePlayerPlace(playerId, adjustedPlace, room);
        }
    });

    // Now mark all players in the team as eliminated and change their state
    team.forEach(playerId => {
        const player = room.players.get(playerId);
        if (player && !player.eliminated) {
            player.eliminated = true;
            player.visible = false;
            player.state = 3;

            clearInterval(player.moveInterval);
            clearTimeout(player.timeout);

            room.timeoutIds.push(setTimeout(() => {
                startSpectatingLogic(player, room);
            }, 3000));
        }
    });

    room.eliminatedTeams.push({
        teamId: team.join('-'), // Create a unique team identifier
        place: adjustedPlace,
    });

    // Check if game should end
    if (room.teams.every(t => t.every(playerId => {
        const player = room.players.get(playerId);
        return !player || !player.visible;
    }))) {
        room.timeoutIds.push(setTimeout(() => {
            endGame(room);
        }, game_win_rest_time));
    }
    // Check if only one team remains
    const remainingTeams = room.teams.filter(t => t.some(playerId => !room.players.get(playerId).eliminated));
    if (remainingTeams.length === 1) {
        const winningTeam = remainingTeams[0];
        
        // Check if winning team has only one player
        const activePlayers = winningTeam.filter(playerId => !room.players.get(playerId).eliminated);
        if (activePlayers.length === 1) {
            const remainingPlayer = room.players.get(activePlayers[0]);
            room.winner = [remainingPlayer.nmb].join('$');
        } else {
            room.winner = winningTeam.join('$');
        }

        winningTeam.forEach(playerId => {
            const player = room.players.get(playerId);
            player.place = 1; // Set place to 1 for winning team players
            increasePlayerWins(playerId, 1);
            increasePlayerPlace(playerId, 1, room);
        });

        room.eliminatedTeams.push({
            teamId: winningTeam.join('-'),
            place: 1,
        });

        room.timeoutIds.push(setTimeout(() => {
            endGame(room);
        }, game_win_rest_time));
    }
}

module.exports = {
    handleElimination,
  };
  