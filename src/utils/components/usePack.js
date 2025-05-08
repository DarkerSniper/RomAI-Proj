const {  inlineCode  } = require('discord.js');
const osuUser = require(`../../schemas/osuUser`);

const { packOpener } = require(`../discord/packs`);
const { playerCard } = require(`../components/card`);
const { addPackReservation, removePackReservation } = require('../osu/activeData');

module.exports = {
    async usePack(interaction, client, discordId, packId) {
        let userProfile = await osuUser.findOne({ discordId: discordId });

        if (!userProfile) {
            return await interaction.editReply({
                content: `Please link your osu! account using ${inlineCode("/authosu")}`
            });
        }

        let userInventory = userProfile.inventory;

        if (userInventory.cards.length >= 40) return await interaction.editReply({
            content: `Your inventory is full!`
        });

        let findPack = userInventory.packs[packId];

        if (!findPack) {
            return await interaction.editReply({
                content: `No pack detected in the selected slot.`
            });
        }

        try {
            const osuworldResponse = await fetch("https://osuworld.octo.moe/", {method: 'HEAD', mode: 'no-cors'});

            if (osuworldResponse.ok || osuworldResponse.type === 'opaque') {
                console.log('we good');
            } else return await interaction.editReply({
                content: `osu!world is down right now.`
            });
        } catch(err) {
            console.log(err);

            return await interaction.editReply({
                content: `Packs are not available right now :( Try again later.`
            });
        }

        let isReserved = await addPackReservation(parseInt(interaction.user.id));

        if (!isReserved) return await interaction.editReply({
            content: `Please wait for the previous pack before opening another one!`
        });

        userInventory.packs.splice(packId, 1);

        await osuUser.updateOne({ discordId: discordId }, {
            $set: {
                inventory: userInventory
            }
        });

        await interaction.editReply({
            content: `Opening pack...`
        });

        let pack = await packOpener(findPack.country, findPack.packType);

        console.log(pack);

        if (!pack.card) {
            await removePackReservation(parseInt(interaction.user.id));

            return interaction.editReply({
                content: `Unfortunatly ${pack.country} has no players in that rarity :(`
            });
    }

        await playerCard(interaction, client, pack.card.username, undefined, pack);
    },
};