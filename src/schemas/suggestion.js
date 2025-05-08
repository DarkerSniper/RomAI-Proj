const { Schema, model } = require('mongoose');
const { randomUUID } = require('crypto');

const suggestionSchema = new Schema({
    suggestionId: { type: String, default: randomUUID },
    authorId: { type: String, required: true },
    guildId: { type: String, required: true },
    messageId: { type: String, required: true, unique: true },
    poolName: { type: String, required: true },
    elo: { type: Number, required: true },
    maps: {
        noMod: { type: [Number], required: true },
        hidden: { type: [Number], required: true },
        hardRock: { type: [Number], required: true },
        doubleTime: { type: [Number], required: true },
        freeMod: { type: [Number], required: false, default: [] },
        tieBreaker: Number
    },
    spreadsheet: { type: String, required: true },
    status: { type: String, default: "pending" }, // "pending", "approved", "rejected"
    upvotes: { type: [String], default: [] },
    downvotes: { type: [String], default: [] }
});

module.exports = model("Suggestion", suggestionSchema, "suggestions");