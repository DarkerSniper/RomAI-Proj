const osuUser = require(`../../schemas/osuUser`);

const { cardRarity } = require(`../osu/skillsCalculation`);
const { addCurrecny } = require(`../discord/currency`);
const { xpAdd } = require(`../discord/xp`);
const tiers = require(`../osu/cardTiers.json`);

module.exports = {
    async inventoryAddCard(discordId, inventory, card) {
        let dupe = undefined;
        // Make a duplicate function for when a user gets a dupe
        // Compare both cards and ask the user which card to keep
        // Deleted card gets turned into XP:
        // Base: Legendary - +300XP, Glorious - +200XP, Remarkable - +150XP, Refined - +100XP, Base - +50XP
        // (For more added tiers: +50XP from Base tier till before the last tier; Last tier +100XP from the previous tier)
        await Promise.all(inventory.cards.map(async c => {
            if (c.player == card.player) {
                let rarity = (await cardRarity(c.stats.globalRank)).rarity;
                let xpWorth;

                switch (rarity) {
                    case tiers.tier1:
                        xpWorth = 3050;
                        break;
                    case tiers.tier2:
                        xpWorth = 1050;
                        break;
                    case tiers.tier3:
                        xpWorth = 450;
                        break;
                    case tiers.tier4:
                        xpWorth = 250;
                        break;
                    case tiers.tier5:
                        xpWorth = 130;
                        break;
                    case tiers.tier6:
                        xpWorth = 60;
                        break;
                }

                dupe = xpWorth;
                await addCurrecny(discordId, xpWorth);
            }
        }));

        if (dupe != undefined) return dupe;

        inventory.cards.push(card);

        await osuUser.updateOne({ discordId: discordId }, {
            $set: {
                inventory: inventory
            }
        });

        return undefined;
    },
};