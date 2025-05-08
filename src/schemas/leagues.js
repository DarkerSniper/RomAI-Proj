const { Schema, model } = require('mongoose');

const leagueSchema = new Schema({
    _id: Schema.Types.ObjectId,
    name: String,
    mode: Number,
    guildId: String,
    eloRange: {
      min: { type: Number, required: false, default: undefined },
      max: { type: Number, required: false, default: undefined }
    },
    stages: {
        groups: Date,
        playoffs: Date
    },
    teams: { type: [{
        name: String,
        players: [String],
        mapDiff: Number,
        record: {
            wins: Number,
            losses: Number
        }
    }], required: false, default: [] }, 
    podium: {
        first: { type: Object, required: false, default: undefined },
        second: { type: Object, required: false, default: undefined },
        thirdFourth: { type: [Object], required: false, default: undefined }
    },
    schedule: {
        groups: {type: Array /* [[Team Object]] */, required: false, default: []},
        playoffs: {type: Array /* [[Team Object]] */, required: false, default: []}
    },
    matches: { type: [{
        "pool": {
            "maps": {
              "noMod": [Number],
              "hidden": [Number],
              "hardRock": [Number],
              "doubleTime": [Number],
              "tieBreaker": Number
            },
            "_id": Schema.Types.ObjectId,
            "name": String,
            "elo": Number,
          },
          "players": [String],
          "score": [Number],
          "eloInfo": {
            "elo1": {
              "gain": Number,
              "lose": Number
            },
            "elo2": {
              "gain": Number,
              "lose": Number
            }
          },
          "date": Schema.Types.Mixed,
          "bans": [String],
          "picks": [{
              "map": Number,
              "mod": String,
              "scores": [Number]
            }]
    }], required: false, default: [] },
    interactions: {
        channel: { type: Schema.Types.Mixed, required: false, default: undefined },
        registration: { type: Schema.Types.Mixed, required: false, default: undefined },
        groups: { type: Schema.Types.Mixed, required: false, default: undefined },
        playoffs: { type: Schema.Types.Mixed, required: false, default: undefined }
    }
});

module.exports = model("league", leagueSchema, "leagues");