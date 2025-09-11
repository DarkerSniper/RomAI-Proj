const osuUser = require(`../../schemas/osuUser`);

module.exports = {
    async inventoryAddPack(discordId, inventory, pack) {
        inventory.packs.push(pack);

        await osuUser.updateOne({ discordId: discordId }, {
            $set: {
                inventory: inventory
            }
        });
    },
};