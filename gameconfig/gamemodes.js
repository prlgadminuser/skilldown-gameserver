
// td in matchtype means team match knockout


const gamemodeconfig = {
    1: {
      can_hit_dummies: false,
      can_hit_players: true,
      maxplayers: 5,
      respawns_allowed: 0,
      playerhealth: 77,
      playerspeed: 2.2,         //(0.26 * server_tick_rate) / 17,
      zonespeed: 1.2,
      usezone: true,
      health_restore: true,
      placereward: [10, 8, 6, -1, -5],
      seasoncoinsreward: [25, 17, 12, 10, 7],
      show_timer: false,
      custom_map: 4,
      teamsize: 1,
    },
    2: {
      can_hit_dummies: false,
      can_hit_players: true,
      maxplayers: 2,
      respawns_allowed: 0,
      playerhealth: 150,
      playerspeed: 2.2,
      zonespeed: 1.2,
      usezone: true,
      health_restore: true,
      placereward: [16, -8],
      seasoncoinsreward: [25, 12],
      show_timer: false,
      custom_map: 2,
      teamsize: 1,
      healspawner: true,
    },
    3: {
      can_hit_dummies: true,
      can_hit_players: false,
      maxplayers: 1,
      respawns_allowed: 1,
      playerhealth: 50,
      playerspeed: 2.2,
      usezone: false,
      zonespeed: 0.8,
      health_restore: false,
      placereward: [0],
      seasoncoinsreward: [0],
      show_timer: true,
      custom_map: 3,
      teamsize: 1,
      //health_autodamage: true,
    },
    4: {
      can_hit_dummies: false,
      can_hit_players: true,
      maxplayers: 8,
      respawns_allowed: Infinity,
      playerhealth: 100,
      playerspeed: 2.2,
      usezone: false,
      zonespeed: 0.8,
      health_restore: false,
      placereward: [7, -2],
      seasoncoinsreward: [17, 10],
      show_timer: true,
      //healspawner: true,
      custom_map: 5,
      teamsize: 2,
      matchtype: "td",
    },
  };


  module.exports = {
    gamemodeconfig 
}