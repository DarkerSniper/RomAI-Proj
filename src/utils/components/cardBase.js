const { AttachmentBuilder, bold, italic, strikethrough, underscore, spoiler, quote, blockQuote, inlineCode , codeBlock, EmbedBuilder } = require('discord.js');
const { LegacyClient, isOsuJSError, Client, Auth } = require('osu-web.js');

const { createCard } = require(`../soii/createCard`);
const { cardRarity } = require(`../osu/skillsCalculation`);

const osuUser = require(`../../schemas/osuUser`);

const { osuAPI, osuId, osuToken } = process.env;

const auth = new Auth(osuId, osuToken);

module.exports = {
    async getCardOwners(interaction, osuPlayer) {
        try {
            const token = await auth.clientCredentialsGrant();
            const api = new Client(token.access_token);

            const user = await api.users.getUser(osuPlayer, {
                urlParams: {
                  mode: 'osu'
                },
                query: {
                    key: 'username'
                }
              });

            console.log(`Searching for the card of: ${user.username}`);

            const usersWithCard = await osuUser.find({ 'inventory.cards.player': user.username });

            console.log(`Found: ${usersWithCard.length} owners!`);

            if (usersWithCard.length == 0) return await interaction.editReply({
                content: `The card of ${bold(`${user.username}`)} is extinct!`
            });

            console.log(`Sorting owners...`);

            usersWithCard.sort((a, b) => {
                function convertStringToDate(dateString) {
                    const [day, month, year] = dateString.split('-').map(Number);
                    return new Date(year, month - 1, day);
                }

                let cardA = a.inventory.cards.find((card) => card.player == user.username);
                let cardB = b.inventory.cards.find((card) => card.player == user.username);

                let dateA = convertStringToDate(cardA.date);
                let dateB = convertStringToDate(cardB.date);

                return dateA.getTime() - dateB.getTime();
            });

            console.log(`Sorted. Inserting owners to embed`);

            let owners = ``;

            for (let i=0; i<usersWithCard.length; i++) {
                let userWithCard = usersWithCard[i];

                let userDiscordId = userWithCard.discordId;
                let userOsuUsername = userWithCard.osuUserName;
                let userLevel = userWithCard.level.current;
                let userIndex = i == 0 ? `${bold('First Owner')}:` : `${i + 1}.`;

                let userCardDate = userWithCard.inventory.cards.find((card) => card.player == user.username);
                userCardDate = userCardDate.date;

                owners += `${userIndex} <@${userDiscordId}> (${userOsuUsername}) - Level ${userLevel} | Date Packed: ${userCardDate}\n`;
            }

            console.log(`Done. Creating card...`);

            let firstCard = usersWithCard[0].inventory.cards.find((card) => card.player == user.username);
            let attachment = await createCard(firstCard, firstCard['card-type']);

            while (attachment.name.includes(" ")) attachment.name = attachment.name.replace(" ", "");
            while (attachment.name.includes("[")) attachment.name = attachment.name.replace("[","");
            while (attachment.name.includes("]")) attachment.name = attachment.name.replace("]","");
            while (attachment.name.includes("_")) attachment.name = attachment.name.replace("_","");
            while (attachment.name.includes(",")) attachment.name = attachment.name.replace(",","");

            console.log(`Success.`);

            const cardEmbed = new EmbedBuilder()
                .setTitle(`Owners of ${user.username}`)
                .setDescription(`${owners}`)
                .setImage(`attachment://${attachment.name}`);

            return await interaction.editReply({
                content: `  `,
                embeds: [cardEmbed],
                files: [attachment]
            });
        } catch (error) {
            console.log(error);

            return await interaction.editReply({
                content: `Please enter a valid osu! username.`
            });
        }
    },

    async getTopCards(interaction) {
        // WIP
        const packedCards = new Map();
        const allUsers = await osuUser.find();

        for (let user of allUsers) {
            let userCards = user.inventory.cards;

            for (let card of userCards) {
                let player = card.player;

                if (!packedCards.get(player)) {
                    packedCards.set(player, 1);
                } else {
                    let numberPacked = packedCards.get(player);

                    packedCards.set(player, numberPacked + 1);
                }
            }
        }

        const sortedCards = Array.from(packedCards).sort((a, b) => {
            a
        });


    }
};