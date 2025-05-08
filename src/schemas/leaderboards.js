const { Schema, model } = require('mongoose');

const leaderboardSchema = new Schema({
    _id: Schema.Types.ObjectId,
    name: String,
    startDate: {type: Number, default: 0}, // Start Date in relative time
    endDate: {type: Number, default: 0}, // End Date in relative time
    mode: Number,
    players: Map, // key: Player, value: ELO
    records: Map, // key: Player, value: { wins, losses }
});

module.exports = model("leaderboard", leaderboardSchema, "leaderboards");