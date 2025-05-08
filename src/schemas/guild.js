const { Schema, model } = require('mongoose');

const guildSchema = new Schema({
    _id: Schema.Types.ObjectId,
    guildId: String,
    guildName: String,
    guildIcon: { type: String, required: false },
    setup: {
        matchesOutput: String, // channel id
        highEloMatchesOutput: String || null || undefined,
        matchmakingChannel: String,
        levelingChannel: String,
        tournamentChannel: {type: String, required: false},
        suggestionsChannel: {type: String, required: false},
        rankRoles: {type: [String], required: false}
    }
});

module.exports = model("Guild", guildSchema, "guilds");