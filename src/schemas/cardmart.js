const { Schema, model } = require('mongoose');
const { randomUUID } = require('crypto');

const cardmartSchema = new Schema({
    cardmartId: { type: String, default: randomUUID },
    sellerId: { type: String, required: true },
    messageId: { type: String, required: true, unique: true },
    timeStamp: { type: Date, require: true },
    cardInfo: { type: {
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
            },
            "2v2": {
                "elo": Number || null || undefined,
                "wins": Number || null || undefined,
                "loses": Number || null || undefined
            }
        }
    }, required: true },
    status: { type: String, default: "available" }, // "retrieved", "available", "sold"
    buyerId: { type: String, default: undefined },
    price: { type: Number, required: true }
});

module.exports = model("Cardmart", cardmartSchema, "cardmarts");