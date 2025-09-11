const { 
    EmbedBuilder, bold, inlineCode, ButtonBuilder, 
    ActionRowBuilder, ButtonStyle, ComponentType 
} = require('discord.js');

const osuUser = require(`../../schemas/osuUser`);
const { cardRarity } = require(`../osu/skillsCalculation`);
const { addCurrecny } = require(`../discord/currency`);
const { getRandomInt, dateConversion } = require(`../osu/formatNum`);
const { createCard } = require('../soii/createCard');
const tiers = require(`../osu/cardTiers.json`);

const sellQueue = new Set();

function sortCards(cards) {
    const ranked = cards.filter(c => c.stats.globalRank);
    const unranked = cards.filter(c => !c.stats.globalRank);
    return [...ranked.sort((a, b) => a.stats.globalRank - b.stats.globalRank), ...unranked];
}

module.exports = {
    async sellCard(interaction, discordId, cardId) {
        try {
            const userProfile = await osuUser.findOne({ discordId });

            if (!userProfile || !userProfile.inventory) {
                return await interaction.editReply({
                    content: `Please link your osu! account using ${inlineCode("/authosu")}`,
                    ephemeral: true
                });
            }

            const sortedCards = sortCards(userProfile.inventory.cards || []);
            const cardIndex = cardId - 1;

            if (cardIndex < 0 || cardIndex >= sortedCards.length) {
                return await interaction.editReply({
                    content: `Please enter a valid cardID.`
                });
            }

            if (sellQueue.has(discordId)) {
                return await interaction.editReply({
                    content: `Only one quicksell at a time is allowed!`
                });
            }
            sellQueue.add(discordId);

            const card = sortedCards[cardIndex];
            const isGlowing = card['card-type'].card.includes('glowing');
            const rarity = await cardRarity(card.stats.globalRank);
            const worth = (() => {
                let num = 0;

                if (rarity.rarity.includes(tiers.tier1)) {
                    num = 3000;
                } else if (rarity.rarity.includes(tiers.tier2)) {
                    num = 1000;
                } else if (rarity.rarity.includes(tiers.tier3)) {
                    num = 400;
                } else if (rarity.rarity.includes(tiers.tier4)) {
                    num = 200;
                } else if (rarity.rarity.includes(tiers.tier5)) {
                    num = 80;
                } else {
                    num = 10;
                }

                return isGlowing ? num * 2 : num;
            })();

            const attachment = await createCard(card, card['card-type']);
            attachment.name = attachment.name.replace(/[\s\[\]_,]/g, '');

            const sellId = getRandomInt(1000, 9999);
            const acceptId = `accept-sell-${discordId}-${sellId}`;
            const declineId = `decline-sell-${discordId}-${sellId}`;

            const acceptButton = new ButtonBuilder()
                .setLabel('🗑️ Accept and Discard')
                .setStyle(ButtonStyle.Success)
                .setCustomId(acceptId);

            const declineButton = new ButtonBuilder()
                .setLabel('❌ Cancel')
                .setStyle(ButtonStyle.Danger)
                .setCustomId(declineId);

            const buttonRow = new ActionRowBuilder().addComponents(acceptButton, declineButton);

            const sellEmbed = new EmbedBuilder()
                .setTitle(`Quick Sell`)
                .setDescription(`You're about to sell a ${inlineCode(`${rarity.rarity}`)} card for the price of: ${bold(`${worth}`)}\nAre you sure?\nThe interaction will expire ${dateConversion(Date.now() + 60000)}`)
                .setImage(`attachment://${attachment.name}`);

            const response = await interaction.editReply({
                content: `<@${discordId}> <- Waiting for a response`,
                embeds: [sellEmbed],
                components: [buttonRow],
                files: [attachment]
            });

            const collector = response.createMessageComponentCollector({
                componentType: ComponentType.Button,
                filter: (i) => i.user.id === discordId,
                time: 60000,
            });

            let pressed = false;

            collector.on('collect', async (inter) => {
                acceptButton.setDisabled(true);
                declineButton.setDisabled(true);
                await inter.update({ components: [buttonRow] });

                const freshProfile = await osuUser.findOne({ discordId });
                const freshCards = sortCards(freshProfile.inventory.cards || []);
                const freshIndex = freshCards.findIndex(c => `${c.id}` === `${card.id}`);

                if (freshIndex === -1) {
                    sellQueue.delete(discordId);
                    return await interaction.editReply({
                        content: `This card has been moved or doesn't exist in your inventory anymore.`,
                        embeds: [],
                        components: [],
                        files: []
                    });
                }

                if (inter.customId === acceptId) {
                    pressed = true;

                    freshCards.splice(freshIndex, 1);

                    await osuUser.updateOne(
                        { discordId },
                        { $set: { "inventory.cards": freshCards } }
                    );
                    await addCurrecny(discordId, worth);

                    sellQueue.delete(discordId);

                    return await interaction.editReply({
                        content: `Quick Sell successful!\n+${bold(`${worth}`)} romBucks`,
                        embeds: [],
                        components: [],
                        files: []
                    });
                }

                if (inter.customId === declineId) {
                    pressed = true;
                    
                    sellQueue.delete(discordId);
                    return await interaction.editReply({
                        content: `Quick Sell canceled.`,
                        embeds: [],
                        components: [],
                        files: []
                    });
                }
            });

            collector.on('end', async (_, reason) => {
                if (pressed) return;

                if (reason === 'time') {
                    acceptButton.setDisabled(true);
                    declineButton.setDisabled(true);

                    sellQueue.delete(discordId);

                    await interaction.editReply({
                        content: `Quick Sell expired.`,
                        embeds: [],
                        components: [],
                        files: []
                    });
                }
            });
        } catch (err) {
            console.error(err);
            sellQueue.delete(discordId);
            await interaction.editReply({
                content: `An error occurred while trying to quicksell. Please try again later.`,
                embeds: [],
                components: [],
                files: []
            });
        }
    }
};
