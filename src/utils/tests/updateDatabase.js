const osuUser = require(`../../schemas/osuUser`);
const { cardRarity } = require("../osu/skillsCalculation");

module.exports = {
    async septemberUpdate() {
        var allUsers = await osuUser.find();

        let count = 0;

        allUsers.forEach(async user => {
            let inventory = user.inventory;
            let cards = inventory.cards;

            for (let i=0; i<cards.length; i++) {
                let card = cards[i];

                let type = await cardRarity(card.stats.globalRank);

                inventory.cards[i]["card-type"] = type.type;
            }

            await osuUser.updateOne({ discordId: user.discordId }, {
                $set: {
                    "inventory": inventory
                }
            });

            count++;
            console.log(`Progress: ${count}/${allUsers.length}`);
        });

        return {
            content: `All users updated.`
        };
    }
};