const osuUser = require(`../../schemas/osuUser`);

module.exports = {
    async addCurrecny(discordId, amount) {
        var userProfile = await osuUser.findOne({ discordId: discordId });
        var userCurrency = userProfile.currency ?? 0;

        let newCur = userCurrency + amount;

        await osuUser.updateOne({ discordId: discordId }, {
            $set: {
                currency: newCur
            }
        });
    },

    async removeCurrency(discordId, amount) {
        var userProfile = await osuUser.findOne({ discordId: discordId });
        var userCurrency = userProfile.currency;

        let newCur = userCurrency - amount;

        await osuUser.updateOne({ discordId: discordId }, {
            $set: {
                currency: newCur
            }
        });
    }
};