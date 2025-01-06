"use strict";

const { shopcollection, userCollection, battlePassCollection, jwt } = require('./..//index.js');

const tokenkey = "d8ce40604d359eeb9f2bff31beca4b4b"

const maintenanceId = "maintenance"; 

async function verifyPlayer(token) {
  if (!token) {
    throw new Error("Unauthorized");
  }

  try {

     const tokenExists = await userCollection.findOne({ token });

    if (!tokenExists) {
      throw new Error("Invalid token");
    }
    
    const decodedToken = jwt.verify(token, tokenkey);
    const username = decodedToken.username;

    if (!username) {
      throw new Error("Invalid token");
    }

    const userInformation = await userCollection.findOne(
      { username },
      {
        projection: {
          equipped_item: 1,
          equipped_item2: 1,
          equipped_color: 1,
          equipped_hat_color: 1,
          equipped_body_color: 1,
          sp: 1,
          equipped_gadget: 1,
          nickname: 1,
        },
      }
    );

    if (!userInformation) {
      throw new Error("User not found");
    }

    const {
      equipped_item,
      equipped_item2,
      equipped_color,
      equipped_hat_color,
      equipped_body_color,
      sp,
      equipped_gadget,
      nickname,
    } = userInformation;

    return {
      playerId: username,
      hat: equipped_item,
      top: equipped_item2,
      player_color: equipped_color,
      hat_color: equipped_hat_color,
      top_color: equipped_body_color,
      skillpoints: sp,
      selected_gadget: equipped_gadget,
      nickname: nickname,
    };

   
  } catch (error) {
    return false;
  }
}

async function increasePlayerDamage(playerId, damage) {
  const username = playerId;
  const damagecount = +damage; 
  
    if (isNaN(damagecount)) {
      return res.status(400).json({ error: "Invalid damage count provided" });
    }
  
    try {
   
      const incrementResult = await userCollection.updateOne(
        { username },
        {
          $inc: { damage: damagecount },
        }
      );
  
  
          await battlePassCollection.updateOne(
        { username },
        {
          $inc: {
            bonusitem_damage: damagecount,
          },
        },
        {
          upsert: true,
        },
      );

      if (incrementResult.matchedCount === 0) {
        const upsertResult = await userCollection.updateOne(
          { username },
          {
            $setOnInsert: {
              damage: damagecount,
            },
          },
          { upsert: true }
        );
  
        if (upsertResult.matchedCount === 0 && upsertResult.upsertedCount === 0) {
          return res.status(404).json({ error: "User not found" });
        }
      }
  
  } catch (error) {
    console.error("Error updating damage in the database:", error);
  }
}

async function increasePlayerKills(playerId, kills) {
  const username = playerId;
  const killcount = +kills; 

  if (isNaN(killcount)) {
    return { error: "Invalid kill count provided" }; // Assuming we return an object instead of using res
  }

  try {
    // Attempt to increment the player's kill count or insert a new player document if not found
    const incrementResult = await userCollection.updateOne(
      { username },
      {
        $inc: { kills: killcount },
      },
      { upsert: true }
    );

    if (incrementResult.modifiedCount > 0 || incrementResult.upsertedCount > 0) {
      // If player's kill count was updated or a new player document was inserted
      const eventKillUpdate = await shopcollection.updateOne(
        { _id: "eventKillsCounter" },
        { $inc: { eventKills: killcount } } // Increment the eventKills by the number of kills
      );

      if (eventKillUpdate.modifiedCount === 0) {
        return { error: "Failed to update event kill counter" };
      }

      return { success: true, message: "Player kills and event counter updated successfully" };
    } else {
      return { error: "User not found or kill count not updated" };
    }
  } catch (error) {
    console.error("Error updating kills in the database:", error);
    return { error: "Database error" };
  }
}

async function increasePlayerWins(playerId, wins2) {
  const username = playerId;
  const wins = +wins2; 

  if (isNaN(wins)) {
    return res.status(400).json({ error: "Invalid damage count provided" });
  }

  try {

    const incrementResult = await userCollection.updateOne(
      { username },
      {
        $inc: { wins: wins },
      }
    );

    if (incrementResult.matchedCount === 0) {
      const upsertResult = await userCollection.updateOne(
        { username },
        {
          $setOnInsert: {
            wins: wins,
          },
        },
        { upsert: true }
      );

      if (upsertResult.matchedCount === 0 && upsertResult.upsertedCount === 0) {
        return res.status(404).json({ error: "User not found" });
      }
    }
  } catch (error) {
    console.error("Error updating damage in the database:", error);
  }
}

async function increasePlayerPlace(playerId, place2, room) {
  const username = playerId;
  const place = +place2; 
  const player = room.players.get(playerId)

  if (isNaN(place) || place < 1 || place > 5 || player.finalrewards_awarded) {
    return;
  }
  
  player.finalrewards_awarded = true

  try {
    const skillpoints = room.place_counts[place - 1];
    const season_coins = room.ss_counts[place - 1];
    player.skillpoints_inc = skillpoints
    player.seasoncoins_inc = season_coins
    

    const updateResult = await userCollection.updateOne(
      { username },
      [
        {
          $set: {
            sp: {
              $add: [
                { $ifNull: ["$sp", 0] },
                skillpoints
              ]
            }
          }
        },
        {
          $set: {
            sp: {
              $max: [ "$sp", 0 ] 
            }
          }
        }
      ]
    );

    await battlePassCollection.updateOne(
      { username },
      {
        $inc: {
          season_coins: season_coins,
        },
      },
      {
        upsert: true,
      },
    );

   
    if (updateResult.matchedCount === 0 && updateResult.modifiedCount === 0) {
    
      const upsertResult = await userCollection.updateOne(
        { username },
        {
          $setOnInsert: {
            sp: { $max: [ skillpoints, 0 ] } 
          },
        },
        { upsert: true }
      );

      if (upsertResult.matchedCount === 0 && upsertResult.upsertedCount === 0) {
        return res.status(404).json({ error: "User not found" });
      }
    }
  } catch (error) {
    console.error("Error updating damage in the database:", error);
  }
}

async function checkForMaintenance() {
  let maintenanceMode = false;

  try {
    // Find the maintenanceStatus directly from the document
    const result = await shopcollection.findOne(
      { _id: maintenanceId },
      { projection: { status: 1 } } // Only retrieve the maintenanceStatus field
    );

    if (result.status === "await" || result.status === "true" ) {
maintenanceMode = true;
    } else {
      maintenanceMode = false;
    }
  } catch (error) {
    console.error("Error checking maintenance status:", error);
    maintenanceMode = true;
  }

  return maintenanceMode;
}



module.exports = {
  increasePlayerDamage,
  increasePlayerKills,
  increasePlayerPlace,
  increasePlayerWins,
  verifyPlayer,
  checkForMaintenance,
};
