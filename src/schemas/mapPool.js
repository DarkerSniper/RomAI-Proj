const { Schema, model } = require('mongoose');

const mapPoolSchema = new Schema({
    _id: Schema.Types.ObjectId,
    name: String,
    elo: Number,
    maps: {
        noMod: { type: [Number], required: true },
        hidden: { type: [Number], required: true },
        hardRock: { type: [Number], required: true },
        doubleTime: { type: [Number], required: true },
        freeMod: { type: [Number], required: false, default: [] },
        tieBreaker: Number
    },
});

module.exports = model("mapPool", mapPoolSchema, "mapPools");