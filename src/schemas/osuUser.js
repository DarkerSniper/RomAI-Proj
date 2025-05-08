const { Schema, model } = require('mongoose');


const osuUserSchema = new Schema({
    _id: Schema.Types.ObjectId,
    osuUserId: {type: Number, required: true, unique: true},
    osuUserName: { type: String },
    discordId: {type: String, required: true, unique: true},
    ilRegion: { type: String, required: false },
    rank: {
        "1v1": {
            current: { type: String, required: false, default: undefined },
            peak: { type: String, required: false, default: undefined }
        },
        "2v2": {
            current: { type: String, required: false, default: undefined },
            peak: { type: String, required: false, default: undefined }
        }
    },
    elo: {
        "1v1": { type: Number, required: true, default: 0 },
        "2v2": { type: Number, required: true, default: 0 },
        "3v3": { type: Number, required: true, default: 0 }
    },
    matchRecord: {
        "1v1": {
            wins: { type: Number, required: true, default: 0 },
            losses: { type: Number, required: true, default: 0 }
        },
        "2v2": {
            wins: { type: Number, required: true, default: 0 },
            losses: { type: Number, required: true, default: 0 }
        },
        "3v3": {
            wins: { type: Number, required: true, default: 0 },
            losses: { type: Number, required: true, default: 0 }
        }
    },
    recentMatches: { type: [{
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
    }], required: false, default: [] }, // Match Components
    inventory: {
        packs: {type: [{
            packType: String,
            country: String
        }], require: false, default: []},
        cards: { type: [{
            "card-type": Object,
            "player": String,
            "id": Number,
            "country": String,
            "region": String || null || undefined,
            "regionFlag": String,
            "date": String,
            "stats": {
                "pp": Number,
                "globalRank": Number,
                "acc": Number,
                "level": Number,
                "countryRank": Number,
                "regionRank": Number || null || undefined,
                "playtime": Number,
                "playcount": Number,
                "medals": Number,
            },
            "skills": {
                "potential": Number,
                "acc": Number,
                "speed": Number,
                "aim": Number
            },
            "topPlay": {
                "song": String,
                "diff": String,
                "mapId": Number,
                "enabled_mods": [String],
                "sr": String,
                "score": Number,
                "pp": Number,
                "acc": Number,
                "combo": Number,
                "rank": String
            },
            "elo": {
                "1v1": {
                    "elo": Number || null || undefined,
                    "wins": Number || null || undefined,
                    "loses": Number || null || undefined
                }
            }
        }], required: false, default: [] }
    },
    level: { type: {
        prestige: Number,
        current: Number,
        xp: Number
    }, required: false, default: {
        prestige: 0,
        current: 0,
        xp: 0
    }
    },
    currency: { type: Number, required: false, default: 450 },
    accomplishments: { type : [String] , required : false, default: []},
    winnings: { type: [{
        name: String,
        mode: Number,
    }], required: false, default: [] },
    dailies: { type: {
        refresh: Date || undefined,
        rerollAvailable: Boolean,
        allCompleted: Boolean,
        challenges: [{
            challenge: String,
            isCompleted: Boolean,
            kind: String,
            tasks: [{
                name: String,
                completed: Boolean,
            }],
            xpWorth: Number,
        }]
    }, required: false, default: {
        refresh: undefined,
        rerollAvailable: true,
        allCompleted: false,
        challenges: []
    } },
    scoreRewards: { type: [{
        beatmapId: Number,
        score: Number,
        date: String,
        topLocal: Number
    }], required: false, default: []}
});

module.exports = model("osuUser", osuUserSchema, "osuUsers");