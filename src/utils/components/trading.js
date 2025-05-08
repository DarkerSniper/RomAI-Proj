const { EmbedBuilder, inlineCode, bold, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType, italic, underline } = require("discord.js");
const osuUser = require("../../schemas/osuUser");
const { numberWithCommas, dateConversion } = require("../osu/formatNum");
const { cardRarity } = require("../osu/skillsCalculation");

module.exports = {
    async cardTrading(interaction, client, discordUser, invitedUser, itemsUser1, itemsUser2) {
        /*
            itemsUser = {
                packs: [packId],
                cards: [cardId]
            }
        */
        try {
            if (discordUser.id == invitedUser.id) return await interaction.editReply({
                content: `You can't use this command with yourself.`,
                ephemeral: true
            });

            if (invitedUser.bot) return await interaction.editReply({
                content: `You cannot use this command with applications.`,
                ephemeral: true
            });
            
            let userProfile = await osuUser.findOne({ discordId: discordUser.id });
            let invitedUserProfile = await osuUser.findOne({ discordId: invitedUser.id });

            if (!userProfile) return await interaction.editReply({
                content: `Please link your osu! account using ${inlineCode("/authosu")}`,
                ephemeral: true
            });
            
            if (!invitedUserProfile) return await interaction.editReply({
                content: `The user you have chosen does not have a linked account. (${inlineCode("/authosu")})`,
                ephemeral: true
            });

            if (itemsUser1.cards.length == 0 && itemsUser1.packs.length == 0 
                && itemsUser2.cards.length == 0 && itemsUser2.packs.length == 0
            ) return await interaction.editReply({
                content: `You did not specify any items to trade.`
            });

            var userCardsSorted = userProfile.inventory.cards.length == 0 ? [] : userProfile.inventory.cards.sort(function(a,b) {
                return a.stats.globalRank - b.stats.globalRank;
            });

            var invitedUserCardsSorted = invitedUserProfile.inventory.cards.length == 0 ? [] : invitedUserProfile.inventory.cards.sort(function(a,b) {
                return a.stats.globalRank - b.stats.globalRank;
            });

            let userCardsCom = ``;
            let userPacksCom = ``;

            let invitedCardsCom = ``;
            let invitedPacksCom = ``;

            if (itemsUser1.cards.length != 0) {
                if (userCardsSorted.find(c => !c.stats.globalRank)) {
                    let cardsPlaceHolder = userCardsSorted;
    
                    for (let i=0; i<cardsPlaceHolder.length; i++) {
                        if (cardsPlaceHolder[i].stats.globalRank) continue;
    
                        let cardPlaceHolder = cardsPlaceHolder[i];
    
                        let index = userCardsSorted.findIndex(i => i.id == cardPlaceHolder.id);
    
                        if (index != -1) {
                            let [removedObject] = userCardsSorted.splice(index, 1);
    
                            userCardsSorted.push(removedObject);
                        }
                    }
                }

                for (let i=0; i<itemsUser1.cards.length; i++) {
                    let cardItem = itemsUser1.cards[i];
                    if (cardItem < 0 || cardItem > userCardsSorted.length - 1) return await interaction.editReply({
                        content: `One of the cardIds do not exist in your inventory.`
                    });

                    let card = userCardsSorted[cardItem ];
                    let rarity = (await cardRarity(card.stats.globalRank)).rarity;

                    userCardsCom += `${i + 1}. ${bold(card.player)} #${numberWithCommas(card.stats.globalRank)}(${italic(`#${numberWithCommas(card.stats.countryRank)}`)} :flag_${card.country.toLowerCase()}: ) ${inlineCode(rarity)} [${card.date}]\nAim: ${inlineCode(`${card.skills.aim}`)} Speed: ${inlineCode(`${card.skills.speed}`)} Accuracy: ${inlineCode(`${card.skills.acc}`)} Potential: ${inlineCode(`${card.skills.potential}`)}\n\n`;
                }
            }

            if (itemsUser1.packs.length != 0) {
                for (let i=0; i<itemsUser1.packs.length; i++) {
                    let packItem = itemsUser1.packs[i];
                    if (packItem < 0 || packItem > userProfile.inventory.packs.length - 1) return await interaction.editReply({
                        content: `One of the packIds do not exist in your inventory.`
                    });

                    let pack = userProfile.inventory.packs[packItem ];
                    userPacksCom += `${i + 1}. ${pack.country} ${bold(`${pack.packType}`)}\n`;
                }
            }

            if (itemsUser2.cards.length != 0) {
                if (invitedUserCardsSorted.find(c => !c.stats.globalRank)) {
                    let cardsPlaceHolder = invitedUserCardsSorted;
    
                    for (let i=0; i<cardsPlaceHolder.length; i++) {
                        if (cardsPlaceHolder[i].stats.globalRank) continue;
    
                        let cardPlaceHolder = cardsPlaceHolder[i];
    
                        let index = invitedUserCardsSorted.findIndex(i => i.id == cardPlaceHolder.id);
    
                        if (index != -1) {
                            let [removedObject] = invitedUserCardsSorted.splice(index, 1);
    
                            invitedUserCardsSorted.push(removedObject);
                        }
                    }
                }

                for (let i=0; i<itemsUser2.cards.length; i++) {
                    let cardItem = itemsUser2.cards[i];
                    if (cardItem < 0 || cardItem > invitedUserCardsSorted.length - 1) return await interaction.editReply({
                        content: `One of the cardIds do not exist in ${invitedUserProfile.osuUserName}'s inventory.`
                    });

                    let card = invitedUserCardsSorted[cardItem ];
                    let rarity = (await cardRarity(card.stats.globalRank)).rarity;

                    invitedCardsCom += `${i + 1}. ${bold(card.player)} #${numberWithCommas(card.stats.globalRank)}(${italic(`#${numberWithCommas(card.stats.countryRank)}`)} :flag_${card.country.toLowerCase()}: ) ${inlineCode(rarity)} [${card.date}]\nAim: ${inlineCode(`${card.skills.aim}`)} Speed: ${inlineCode(`${card.skills.speed}`)} Accuracy: ${inlineCode(`${card.skills.acc}`)} Potential: ${inlineCode(`${card.skills.potential}`)}\n\n`;
                }
            }

            if (itemsUser2.packs.length != 0) {
                for (let i=0; i<itemsUser2.packs.length; i++) {
                    let packItem = itemsUser2.packs[i];
                    if (packItem < 0 || packItem > invitedUserProfile.inventory.packs.length - 1) return await interaction.editReply({
                        content: `One of the packIds do not exist in ${invitedUserProfile.osuUserName}'s inventory.`
                    });

                    let pack = invitedUserProfile.inventory.packs[packItem ];
                    invitedPacksCom += `${i + 1}. ${pack.country} ${bold(`${pack.packType}`)}\n`;
                }
            }

            let acceptId = `accept-trade-${discordUser.id}-${invitedUser.id}`;
            let declineId = `decline-trade-${discordUser.id}-${invitedUser.id}`;

            const acceptButton = new ButtonBuilder()
                .setLabel('✅ Accept')
                .setStyle(ButtonStyle.Success)
                .setCustomId(acceptId)

            const declineButton = new ButtonBuilder()
                .setLabel('❌ Decline')
                .setStyle(ButtonStyle.Danger)
                .setCustomId(declineId)

            const buttonRow = new ActionRowBuilder().addComponents(acceptButton, declineButton);

            const tradeInviteEmbed = new EmbedBuilder()
                .setTitle(`${discordUser.username} Has offered ${invitedUser.username} a trade!`)
                .setDescription(`The invite will expire ${dateConversion(Date.now() + 120000)}`)
                .addFields({
                    name: `${discordUser.username}'s Offer:`,
                    value: `${underline('Packs:')}\n${userPacksCom}\n${underline('Cards:')}\n${userCardsCom}`,
                    inline: true
                })
                .addFields({
                    name: `${invitedUser.username}'s Offer:`,
                    value: `${underline('Packs:')}\n${invitedPacksCom}\n${underline('Cards:')}\n${invitedCardsCom}`,
                    inline: true
                });

            const response = await interaction.editReply({
                content: `<@${invitedUser.id}> <- Waiting for a response`,
                embeds: [tradeInviteEmbed],
                components: [buttonRow]
            });

            let pressed = false;

            const filter = (i) => i.user.id == invitedUser.id && !pressed;

            const collector = response.createMessageComponentCollector({
                componentType: ComponentType.Button,
                filter,
                time: 120000,
            });

            collector.on('collect', async (inter) => {
                if (inter.customId == acceptId) {
                    pressed = true;
                    acceptButton.setDisabled(true);
                    declineButton.setDisabled(true);
                    
                    var userInventory = userProfile.inventory;
                    var invitedInventory = invitedUserProfile.inventory;

                    if (itemsUser1.cards.length != 0) {
                        for (let i=0; i<itemsUser1.cards.length; i++) {
                            let cardItem = itemsUser1.cards[i];
                            if (cardItem < 0 || cardItem > userCardsSorted.length - 1) return await interaction.editReply({
                                content: `One of the cardIds do not exist in your inventory.`,
                                embeds: [],
                                components: []
                            });
                            
                            let card = userCardsSorted[cardItem];
                            let found = false;

                            userInventory.cards.forEach(c => {
                                if (c.player == card.player) found = true;
                            });

                            if (!found) return await interaction.editReply({
                                content: `One of the cards do not exist in your inventory anymore.`,
                                embeds: [],
                                components: []
                            });

                            let index = userInventory.cards.indexOf(card);

                            if (index > -1) {
                                invitedInventory.cards.push(card);
                                userInventory.cards.splice(index, 1);
                            }
                        }
                    }
        
                    if (itemsUser1.packs.length != 0) {
                        for (let i=0; i<itemsUser1.packs.length; i++) {
                            let packItem = itemsUser1.packs[i];
                            if (packItem < 0 || packItem > userProfile.inventory.packs.length - 1) return await interaction.editReply({
                                content: `One of the packIds do not exist in your inventory.`,
                                embeds: [],
                                components: []
                            });

                            let pack = userProfile.inventory.packs[packItem];
                            let found = false;

                            (await osuUser.findOne({ discordId: discordUser.id })).inventory.packs.forEach(p => {
                                if (p.id == pack.id) found = true;
                            });

                            if (!found) return await interaction.editReply({
                                content: `One of the packs do not exist in your inventory anymore.`,
                                embeds: [],
                                components: []
                            });
        
                            let index = userInventory.packs.indexOf(pack);

                            if (index > -1) {
                                invitedInventory.packs.push(pack);
                                userInventory.packs.splice(index, 1);
                            }
                        }
                    }
        
                    if (itemsUser2.cards.length != 0) {
                        for (let i=0; i<itemsUser2.cards.length; i++) {
                            let cardItem = itemsUser2.cards[i];
                            if (cardItem < 0 || cardItem > invitedUserCardsSorted.length - 1) return await interaction.editReply({
                                content: `One of the cardIds do not exist in ${invitedUserProfile.osuUserName}'s inventory.`,
                                embeds: [],
                                components: []
                            });
        
                            let card = invitedUserCardsSorted[cardItem];
                            let found = false;

                            (await osuUser.findOne({ discordId: invitedUser.id })).inventory.cards.forEach(c => {
                                if (c.player == card.player) found = true;
                            });

                            if (!found) return await interaction.editReply({
                                content: `One of the cards do not exist in ${invitedUser.username}'s inventory anymore.`,
                                embeds: [],
                                components: []
                            });

                            let index = invitedInventory.cards.indexOf(card);

                            if (index > -1) {
                                userInventory.cards.push(card);
                                invitedInventory.cards.splice(index, 1);
                            }
                        }
                    }
        
                    if (itemsUser2.packs.length != 0) {
                        for (let i=0; i<itemsUser2.packs.length; i++) {
                            let packItem = itemsUser2.packs[i];
                            if (packItem < 0 || packItem > invitedUserProfile.inventory.packs.length - 1) return await interaction.editReply({
                                content: `One of the packIds do not exist in ${invitedUserProfile.osuUserName}'s inventory.`,
                                embeds: [],
                                components: []
                            });
        
                            let pack = invitedUserProfile.inventory.packs[packItem];
                            let found = false;

                            (await osuUser.findOne({ discordId: invitedUser.id })).inventory.packs.forEach(p => {
                                if (p.id == pack.id) found = true;
                            });

                            if (!found) return await interaction.editReply({
                                content: `One of the packs do not exist in ${invitedUser.username}'s inventory anymore.`,
                                embeds: [],
                                components: []
                            });
        
                            let index = invitedInventory.packs.indexOf(pack);

                            if (index > -1) {
                                userInventory.packs.push(pack);
                                invitedInventory.packs.splice(index, 1);
                            }
                        }
                    }

                    await osuUser.updateOne({ discordId: discordUser.id }, {
                        $set: {
                            inventory: userInventory
                        }
                    });

                    await osuUser.updateOne({ discordId: invitedUser.id }, {
                        $set: {
                            inventory: invitedInventory
                        }
                    });

                    await interaction.editReply({
                        content: `<@${discordUser.id}> <@${invitedUser.id}> - Trade Completed.`,
                        embeds: [],
                        components: []
                    });
                }

                if (inter.customId == declineId) {
                    acceptButton.setDisabled(true);
                    declineButton.setDisabled(true);
                    await interaction.editReply({
                        content: `<@${invitedUser.id}> has declined the trade offer.`,
                        embeds: [],
                        components: []
                    });
                }
            });

            collector.on('end', async () => {
                acceptButton.setDisabled(true);
                declineButton.setDisabled(true);
                await interaction.editReply({
                    content: `<@${invitedUser.id}> has failed to accept the trade offer.`,
                    embeds: [],
                    components: []
                });
            });
        } catch (err) {
            console.log(err);
            await interaction.editReply({
                content: `Something went wrong...`
            });
        }
    },
};