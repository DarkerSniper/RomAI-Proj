const { EmbedBuilder, AttachmentBuilder, bold, italic, strikethrough, underscore, spoiler, quote, blockQuote, inlineCode , codeBlock, underline } = require('discord.js');

const osuUser = require(`../../schemas/osuUser`);

const { createCard } = require(`../soii/createCard`);
const { cardRarity } = require(`../osu/skillsCalculation`);
const { numberWithCommas } = require(`../osu/formatNum`);
const { inventoryAddCard } = require(`../discord/invAddCard`);
const { inventoryAddPack } = require(`../discord/invAddPack`);
const { loadingMessage } = require('../discord/loading');
const { pagination } = require('../discord/pagination');

module.exports = {
    async showInventory(interaction, message, otherUser) {
        try {
            var discordUser = !interaction ? message.member : interaction.user;
            var discordUserId = !interaction ? discordUser.user.id : discordUser.id;

            if (otherUser) {
                discordUser = otherUser;
                discordUserId = otherUser.id;
            }

            var userProfile = await osuUser.findOne({ discordId: discordUserId });

            if (!userProfile) return {
                content: `Please link your osu! account using ${inlineCode("/authosu")} OR specify a username.`
            };

            const tasks = [
                'Sorting Data', 'Loading Cards & Packs', 'Initializing'
            ];

            let taskName = `Getting Inventory`;
            const loading = await loadingMessage(taskName, tasks);

            replying(loading().changeState(0, 'executing'));

            var userInventory = userProfile.inventory;

            var cardsSorted = userInventory.cards.length == 0 ? [] : userInventory.cards.sort(function(a,b) {
                return a.stats.globalRank - b.stats.globalRank;
            });
            let embeds = [];
            let attachments = [];
            let content;
            
            let cardsCom = "";
            let packsCom = "";

            replying(loading().changeState(1, 'executing'));

            let cooldown = new Date();

            const embedTitle = `${discordUser.displayName}'s Inventory`;
            const embedURL = `https://osu.ppy.sh/users/${userProfile.osuUserId}`;

            const leaderboardEmbed = new EmbedBuilder()
                .setTitle(embedTitle)
                .setURL(embedURL)
                .setDescription(`${bold(`romBucks:`)} ${userProfile.currency}\n\n${underline('Packs:')}\n`);
            const leaderboardEmbeds = [leaderboardEmbed];

            let itemCount = 0;
            let embedCount = 0;

            if (userInventory.packs.length != 0) {
                for (let i=0; i<userInventory.packs.length; i++) {
                    if (itemCount != 0 && itemCount % 50 === 0) {
                        embedCount++;
                        leaderboardEmbeds[embedCount] = new EmbedBuilder()
                            .setTitle(embedTitle)
                            .setURL(embedURL)
                            .setDescription('  ');
                    }

                    let pack = userInventory.packs[i];

                    itemCount++;
                    leaderboardEmbeds[embedCount].data.description += `${i+1}. ${pack.country} ${bold(pack.packType)} Pack\n`;
                }
            }

            leaderboardEmbeds[embedCount].data.description += `\n${underline('Cards:')}\n`;

            if (cardsSorted.length != 0) {
                if (cardsSorted.find(c => !c.stats.globalRank)) {
                    let cardsPlaceHolder = cardsSorted;

                    for (let i=0; i<cardsPlaceHolder.length; i++) {
                        if (cardsPlaceHolder[i].stats.globalRank) continue;

                        let cardPlaceHolder = cardsPlaceHolder[i];

                        let index = cardsSorted.findIndex(i => i.id == cardPlaceHolder.id);

                        if (index != -1) {
                            let [removedObject] = cardsSorted.splice(index, 1);

                            cardsSorted.push(removedObject);
                        }
                    }
                }

                for (let i=0; i<cardsSorted.length; i++) {
                    if (itemCount != 0 && itemCount % 50 === 0) {
                        embedCount++;
                        leaderboardEmbeds[embedCount] = new EmbedBuilder()
                            .setTitle(embedTitle)
                            .setURL(embedURL)
                            .setDescription('  ');
                    }

                    let card = cardsSorted[i];
                    let attachment;
                    let cardEmbed;

                    if (i < 3) {
                        attachment = await createCard(card, card['card-type']);
                        
                        attachment.name = attachment.name.replace(/[\s\[\]_,]/g, '');

                        cardEmbed = new EmbedBuilder().setURL(`https://osu.ppy.sh/users/${userProfile.osuUserId}`).setImage(`attachment://${attachment.name}`);
                        embeds.push(cardEmbed);
                        attachments.push(attachment);

                        let interval = new Date();
                        if ((interval - cooldown) / 1000 > 3) {
                            cooldown = interval;

                            let maxValue = cardsSorted.length > 3 ? 3 : cardsSorted.length;
                            let percentage = Math.floor((i / maxValue) * 100);

                            replying(loading().changeState(1, 'executing', percentage));
                        }
                    }

                    if (i == 0) cardEmbed.setTitle(`${discordUser.displayName}'s Inventory`);

                    let rarity = (await cardRarity(card.stats.globalRank, card['card-type'].card.includes('glowing'))).rarity;

                    leaderboardEmbeds[embedCount].data.description += `${i + 1}. ${bold(card.player)} #${numberWithCommas(card.stats.globalRank)}(${italic(`#${numberWithCommas(card.stats.countryRank)}`)} :flag_${card.country.toLowerCase()}: ) ${inlineCode(rarity)} [${card.date}]\n`;
                    itemCount++;
                }
            }

            replying(loading().changeState(2, 'executing'));

            if (cardsSorted.length == 0 && userInventory.packs.length == 0) {
                return interaction.editReply({
                    content: "Your inventory is empty.",
                    embeds: []
                });
            }

            await pagination(interaction, leaderboardEmbeds, undefined, attachments, embeds);

            async function replying(embed) {
                if (!interaction) return;

                await interaction.editReply({
                    content: `  `,
                    embeds: [embed]
                });
            }
        } catch (error) {
            console.error(error);

            return await interaction.editReply({
                content: `There has been an error.`
            });
        }
    },

    async addToInventory(discordId, pack, card, glowing) {
        var userProfile = await osuUser.findOne({ discordId: discordId });
        var userInventory = userProfile.inventory;

        if (pack) {
            return await inventoryAddPack(discordId, userInventory, pack);
        }
        if (card) {
            return await inventoryAddCard(discordId, userInventory, card, glowing);
        }
    }
};