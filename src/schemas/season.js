const { Schema, model } = require('mongoose');

const seasonSchema = new Schema({
    _id: Schema.Types.ObjectId,
    seasonNumber: Number,
    startDate: String
});

module.exports = model("Season", seasonSchema, "seasons");