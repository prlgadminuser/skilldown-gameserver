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

        if (
            Array.from(room.players.values()).filter(
                (player) => player.eliminated === false,
            ).length === 1 &&
            room.winner === 0
        ) {
            // Only one player remains, the eliminated player gets 2nd place
            player.place = 2;
        } else {
            // More than one player remains, assign place based on remaining players
            player.place = room.players.size - room.eliminatedPlayers.length;
        }

        const existingPlace = room.eliminatedPlayers.find(
            (player) => player.place === player.place,
        );


        if (existingPlace) {
            if (player.place === room.maxplayers) {
                player.place--;
            } else {
                player.place++;
            }
        }

        room.eliminatedPlayers.push({
            username: player.playerId,
            place: player.place,
        });

        increasePlayerPlace(player.playerId, player.place, room);

        player.visible = false;


        if (
            Array.from(room.players.values()).filter(
                (player) => player.visible !== false
            ).length === 0
        ) {
            room.timeoutIds.push(setTimeout(() => {
                endGame(room);
            }, game_win_rest_time));
        }


        if (
            Array.from(room.players.values()).filter(
                (player) => player.visible !== false,
            ).length === 1 &&
            room.winner === 0
        ) {
            const remainingPlayer = Array.from(room.players.values()).find(
                (player) => player.eliminated === false,
            );


            room.winner = [
                remainingPlayer.nickname,
                remainingPlayer.nmb,
              ].join('$');
        
            //   console.log(Last player standing! ${room.winner} wins!);

            increasePlayerWins(remainingPlayer.playerId, 1);
            increasePlayerPlace(remainingPlayer.playerId, 1, room);

            room.eliminatedPlayers.push({
                username: room.winner,
                place: 1,
            });

            room.timeoutIds.push(setTimeout(() => {
                endGame(room);
            }, game_win_rest_time));
        }
    }
} 


module.exports = {
    handleElimination,
  };
  