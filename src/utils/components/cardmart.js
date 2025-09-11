const { 
    EmbedBuilder, bold, inlineCode, ButtonBuilder, 
    ActionRowBuilder, ButtonStyle, ComponentType 
} = require('discord.js');

const osuUser = require(`../../schemas/osuUser`);
const { cardRarity } = require(`../osu/skillsCalculation`);
const { addCurrecny, removeCurrency } = require(`../discord/currency`);
const { getRandomInt, dateConversion, numberWithCommas } = require(`../osu/formatNum`);
const { createCard } = require('../soii/createCard');
const tiers = require(`../osu/cardTiers.json`);
const cardmart = require('../../schemas/cardmart');

const listingQueue = new Set();

function sortCards(cards) {
    const ranked = cards.filter(c => c.stats.globalRank);
    const unranked = cards.filter(c => !c.stats.globalRank);
    return [...ranked.sort((a, b) => a.stats.globalRank - b.stats.globalRank), ...unranked];
}

function is15DaysOrMore(date1, date2) {
    const ONE_DAY_MS = 1000 * 60 * 60 * 24; // milliseconds in one day
    const diffInMs = Math.abs(new Date(date1) - new Date(date2));
    const diffInDays = diffInMs / ONE_DAY_MS;
  
    return diffInDays >= 15;
  }

module.exports = {
    async cardmartBuy(interaction, discordId, cardmartId) {
        try {
            const userProfile = await osuUser.findOne({ discordId });

            if (!userProfile) {
                return await interaction.reply({
                    content: `Please link your osu! account using ${inlineCode("/authosu")}`,
                    ephemeral: true
                });
            }

            const cardmartItem = await cardmart.findOne({ cardmartId });

            if (!cardmartItem) {
                return await interaction.reply({
                    content: `Please enter a valid cardmartID.`
                });
            }

            if (discordId == cardmartItem.sellerId) return await interaction.reply({
                content: `You cannot buy what you listed.`
            });

            if (is15DaysOrMore(cardmartItem.timeStamp, new Date())) {
                await cardmart.updateOne(
                    { cardmartId },
                    { $set: { "buyerId": discordId, "status": "sold" } }
                );
                
                return await interaction.reply({
                    content: `This item has expired.`
                });
            }

            if (cardmartItem.status !== "available") return await interaction.reply({
                content: `This item is no longer up for sale.`
            });

            const card = cardmartItem.cardInfo;
            const worth = cardmartItem.price;

            if (userProfile.currency < worth) return await interaction.reply({
                content: `The item you're trying to buy costs: ${bold(`${worth}`)} romBucks\nYou currently have ${userProfile.currency} romBucks`
            });

            const rarity = await cardRarity(card.stats.globalRank);

            const attachment = await createCard(card, card['card-type']);
            attachment.name = attachment.name.replace(/[\s\[\]_,]/g, '');

            const buyId = getRandomInt(1000, 9999);
            const acceptId = `accept-buy-${discordId}-${buyId}`;
            const declineId = `decline-buy-${discordId}-${buyId}`;

            const acceptButton = new ButtonBuilder()
                .setLabel('🛒 Accept and Buy')
                .setStyle(ButtonStyle.Success)
                .setCustomId(acceptId);

            const declineButton = new ButtonBuilder()
                .setLabel('❌ Cancel')
                .setStyle(ButtonStyle.Danger)
                .setCustomId(declineId);

            const buttonRow = new ActionRowBuilder().addComponents(acceptButton, declineButton);

            const buyEmbed = new EmbedBuilder()
                .setTitle(`Sell on cardmart`)
                .setDescription(`You're about to buy a ${inlineCode(`${rarity.rarity}`)} card for the price of: ${bold(`${worth}`)}\nAre you sure?\nThe interaction will expire ${dateConversion(Date.now() + 60000)}`)
                .setImage(`attachment://${attachment.name}`);

            const response = await interaction.reply({
                content: `<@${discordId}> <- Waiting for a response`,
                embeds: [buyEmbed],
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

                if (inter.customId === acceptId) {
                    pressed = true;

                    // buying logic
                    const refreshUser = await osuUser.findOne({ discordId });

                    let userCards = refreshUser.inventory.cards;

                    userCards.push(cardmartItem.cardInfo);

                    
                    await osuUser.updateOne(
                        { discordId },
                        { $set: { "inventory.cards": userCards } }
                    );
                    
                    await removeCurrency(discordId, worth);
                    await addCurrecny(cardmartItem.sellerId, worth)

                    await cardmart.updateOne(
                        { cardmartId },
                        { $set: { "buyerId": discordId, "status": "sold" } }
                    );

                    return await response.edit({
                        content: `You have bought ${bold(`${card.player}`)} for ${worth} on cardmart!`,
                        embeds: [],
                        components: [],
                        files: []
                    });
                }

                if (inter.customId === declineId) {
                    pressed = true;
                    
                    return await response.edit({
                        content: `Buying canceled.`,
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

                    await await response.edit({
                        content: `Buying expired.`,
                        embeds: [],
                        components: [],
                        files: []
                    });
                }
            });
        } catch (err) {
            console.error(err);
            await interaction.reply({
                content: `An error occurred while trying to buy in cardmart. Please try again later.`,
                embeds: [],
                components: [],
                files: []
            });
        }
    },
    async cardmartShow(interaction, client, discordId, showAvailable = true, showSold = false, player) {
        // shows all cards listed in the marketplace from newest to oldest
        // whenever people show the market, remove any cards that have passed 15 days untouched

        try {
            let allCards = await cardmart.find();

            if (!allCards) return interaction.reply({
                content: `There are no items in the cardmart.`
            });

            let statusFilter = [];

            if (showAvailable) statusFilter.push('available');
            if (showSold) statusFilter.push('sold');

            allCards = allCards.filter(c => statusFilter.includes(c.status));
            if (player) allCards = allCards.filter(c => c.cardInfo.player.toLowerCase() === player.toLowerCase());

            if (allCards.length === 0) return interaction.reply({
                content: `There are no items in the cardmart.`
            });

            const cardsPerPage = 10;
            let currentPage = 0;
        
            const totalPages = Math.ceil(allCards.length / cardsPerPage);
            let attachments = [];
        
            const getPageEmbeds = async (page) => {
                const start = page * cardsPerPage;
                const cards = allCards.slice(start, start + cardsPerPage);
                attachments = [];
            
                return await Promise.all(cards.map(async card => {
                    const discordUser = await client.users.fetch(card.sellerId);
                    const rarity = await cardRarity(card.cardInfo.stats.globalRank);
                    const attachment = await createCard(card.cardInfo, card.cardInfo['card-type']);
                    attachment.name = attachment.name.replace(/[\s\[\]_,]/g, '');

                    attachments.push(attachment);

                    return new EmbedBuilder()
                        .setTitle(`${card.cardInfo.player} Player Card`) 
                        .setDescription(
                            `${bold(`Cardmart ID: `)} ${card.cardmartId}\n${bold(`Listed: `)} ${dateConversion(card.timeStamp)}\n${bold(`Status: `)} ${card.status.toUpperCase()}\n${bold(`Seller: `)} <@${card.sellerId}> (${discordUser.tag})\n${bold(`Rarity: `)} ${rarity.rarity}\n${bold(`Price: `)} ${card.price} romBucks`
                        )
                        .setImage(`attachment://${attachment.name}`)
                        .setColor(rarity.type.midtoneColor)
                        .setFooter({ text: `Page: ${page + 1}/${totalPages}` })
                }));
            };
        
            const getActionRows = (page) => {
                const start = page * cardsPerPage;
                const cards = allCards.slice(start, start + cardsPerPage);
            
                const row1 = new ActionRowBuilder();
                const row2 = new ActionRowBuilder();
            
                cards.forEach((card, i) => {
                    const button = new ButtonBuilder()
                    .setCustomId(`buy_card_${card.cardmartId}`)
                    .setLabel(`🛒 Buy ${card.cardInfo.player} (${card.price})`)
                    .setStyle(ButtonStyle.Primary);
            
                    if (i < 5) row1.addComponents(button);
                    else row2.addComponents(button);
                });
            
                const navRow = new ActionRowBuilder()
                    .addComponents(
                    new ButtonBuilder()
                        .setCustomId("prev_page")
                        .setLabel("⬅️ Previous")
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === 0),
                    new ButtonBuilder()
                        .setCustomId("next_page")
                        .setLabel("➡️ Next")
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled((page + 1) * cardsPerPage >= allCards.length)
                    );
            
                const rows = [row1];
                if (row2.components.length > 0) rows.push(row2);
                rows.push(navRow);
                return rows;
            };
        
            const message = await interaction.reply({
                embeds: await getPageEmbeds(currentPage),
                components: getActionRows(currentPage),
                files: attachments,
                fetchReply: true,
            });
        
            const collector = message.createMessageComponentCollector({ time: 120_000 });
        
            collector.on("collect", async i => {
                if (i.user.id !== interaction.user.id)
                    return i.reply({ content: "This isn't your cardmart session!", ephemeral: true });
            
                if (i.customId === "next_page") {
                    currentPage++;

                    await i.update({
                        embeds: await getPageEmbeds(currentPage),
                        components: getActionRows(currentPage),
                        files: attachments,
                    });
                } else if (i.customId === "prev_page") {
                    currentPage--;

                    await i.update({
                        embeds: await getPageEmbeds(currentPage),
                        components: getActionRows(currentPage),
                        files: attachments,
                    });
                } else if (i.customId.startsWith("buy_card_")) {
                    const cardId = i.customId.replace("buy_card_", "");
                    // card purchase
                    const cardmartItem = await cardmart.findOne({ cardmartId: cardId });

                    if (cardmartItem.status !== "available") return interaction.followUp({
                        ephemeral: true,
                        content: `This item is no longer available`
                    });

                    const refreshUser = await osuUser.findOne({ discordId });
                    const worth = cardmartItem.price;

                    if (discordId == cardmartItem.sellerId) return interaction.followUp({
                        ephemeral: true,
                        content: `You cannot buy what you listed.`
                    });

                    if (worth > refreshUser.currency) return interaction.followUp({
                        ephemeral: true,
                        content: `The item you're trying to buy costs: ${bold(`${worth}`)} romBucks\nYou currently have ${userProfile.currency} romBucks`
                    });

                    let userCards = refreshUser.inventory.cards;

                    userCards.push(cardmartItem.cardInfo);
                    
                    await osuUser.updateOne(
                        { discordId },
                        { $set: { "inventory.cards": userCards } }
                    );
                    
                    await removeCurrency(discordId, worth);
                    await addCurrecny(cardmartItem.sellerId, worth)

                    await cardmart.updateOne(
                        { cardmartId: cardId },
                        { $set: { "buyerId": discordId, "status": "sold" } }
                    );

                    await message.edit({
                        content: `You have bought a ${bold(`${cardmartItem.cardInfo.player}`)} card for ${numberWithCommas(worth)} on cardmart!`,
                        embeds: [],
                        components: [],
                        files: []
                    });
                }
            });
        } catch (error) {
            console.log(error);
            return interaction.reply({
                content: `There has been an error.`
            });
        }
          
    },
    async cardmartSell(interaction, discordId, cardId, price) {
        // maybe use quicksell function and just tweak it so it works with cardmart
        try {
            const userProfile = await osuUser.findOne({ discordId });

            if (!userProfile || !userProfile.inventory) {
                return await interaction.reply({
                    content: `Please link your osu! account using ${inlineCode("/authosu")}`,
                    ephemeral: true
                });
            }

            const sortedCards = sortCards(userProfile.inventory.cards || []);
            const cardIndex = cardId - 1;

            if (cardIndex < 0 || cardIndex >= sortedCards.length) {
                return await interaction.reply({
                    content: `Please enter a valid cardID.`
                });
            }

            if (listingQueue.has(discordId)) {
                return await interaction.reply({
                    content: `Only one cardmart listing at a time is allowed!`
                });
            }
            listingQueue.add(discordId);

            const card = sortedCards[cardIndex];
            const rarity = await cardRarity(card.stats.globalRank);
            const worth = price;

            const attachment = await createCard(card, card['card-type']);
            attachment.name = attachment.name.replace(/[\s\[\]_,]/g, '');

            const sellId = getRandomInt(1000, 9999);
            const acceptId = `accept-list-${discordId}-${sellId}`;
            const declineId = `decline-list-${discordId}-${sellId}`;

            const acceptButton = new ButtonBuilder()
                .setLabel('🏷️ Accept and List')
                .setStyle(ButtonStyle.Success)
                .setCustomId(acceptId);

            const declineButton = new ButtonBuilder()
                .setLabel('❌ Cancel')
                .setStyle(ButtonStyle.Danger)
                .setCustomId(declineId);

            const buttonRow = new ActionRowBuilder().addComponents(acceptButton, declineButton);

            const sellEmbed = new EmbedBuilder()
                .setTitle(`Sell on cardmart`)
                .setDescription(`You're about to list a ${inlineCode(`${rarity.rarity}`)} card for the price of: ${bold(`${worth}`)}\nAre you sure?\nThe interaction will expire ${dateConversion(Date.now() + 60000)}`)
                .setImage(`attachment://${attachment.name}`);

            const response = await interaction.reply({
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
                    listingQueue.delete(discordId);
                    return await response.edit({
                        content: `This card has been moved or doesn't exist in your inventory anymore.`,
                        embeds: [],
                        components: [],
                        files: []
                    });
                }

                if (inter.customId === acceptId) {
                    pressed = true;

                    const newListing = new cardmart({
                        sellerId: interaction.user.id,
                        messageId: interaction.id,
                        cardInfo: card,
                        status: 'available', // "retrieved", "available", "sold"
                        price: worth,
                        timeStamp: new Date()
                    });
        
                    await newListing.save();

                    freshCards.splice(freshIndex, 1);

                    await osuUser.updateOne(
                        { discordId },
                        { $set: { "inventory.cards": freshCards } }
                    );

                    listingQueue.delete(discordId);

                    return await response.edit({
                        content: `You have listed ${bold(`${card.player}`)} for ${worth} on cardmart!`,
                        embeds: [],
                        components: [],
                        files: []
                    });
                }

                if (inter.customId === declineId) {
                    pressed = true;
                    
                    listingQueue.delete(discordId);
                    return await response.edit({
                        content: `Cardmart Sell canceled.`,
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

                    listingQueue.delete(discordId);

                    await response.edit({
                        content: `Cardmart Sell expired.`,
                        embeds: [],
                        components: [],
                        files: []
                    });
                }
            });
        } catch (err) {
            console.error(err);
            listingQueue.delete(discordId);
            await interaction.reply({
                content: `An error occurred while trying to list in cardmart. Please try again later.`,
                embeds: [],
                components: [],
                files: []
            });
        }
    },
    async cardmartRetrieve(interaction, discordId, cardmartId) {
        try {
            const userProfile = await osuUser.findOne({ discordId });

            if (!userProfile) {
                return await interaction.reply({
                    content: `Please link your osu! account using ${inlineCode("/authosu")}`,
                    ephemeral: true
                });
            }

            const cardmartItem = await cardmart.findOne({ cardmartId });

            if (!cardmartItem) {
                return await interaction.reply({
                    content: `Please enter a valid cardmartID.`
                });
            }

            if (discordId != cardmartItem.sellerId) return await interaction.reply({
                content: `The cardmart item must be yours in order to retrieve it.`
            });

            let userCards = userProfile.inventory.cards;

            userCards.push(cardmartItem.cardInfo);
            
            await osuUser.updateOne(
                { discordId },
                { $set: { "inventory.cards": userCards } }
            );

            await cardmart.deleteOne({ cardmartId });

            return await interaction.reply({
                content: `${bold(`${cardmartItem.cardInfo.player}`)} has been retrieved to your inventory.`
            });
        } catch (error) {
            console.log(error);
            await interaction.reply({
                content: `An error occurred while trying to list in cardmart. Please try again later.`,
                embeds: [],
                components: [],
                files: []
            });
        }
    }
};