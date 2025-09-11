const { SlashCommandBuilder, inlineCode } = require('discord.js');

const { cardTrading } = require(`../../utils/components/trading`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tradeoffer')
        .setDescription('Trade cards or packs with another user!')
        .addUserOption((option) => 
            option
                .setName('user')
                .setDescription("The discord user you want to trade with!")
                .setRequired(true)
        )
        .addStringOption((option) => 
            option
                .setName('yourcardids')
                .setDescription("The cardIDs in YOUR inventory that you would to trade. Connected by '-'")
                .setRequired(false)
        )
        .addStringOption((option) => 
            option
                .setName('yourpackids')
                .setDescription("The packIDs in YOUR inventory that you would to trade. Connected by '-'")
                .setRequired(false)
        )
        .addStringOption((option) => 
            option
                .setName('invitedcardids')
                .setDescription("The cardIDs in the OTHER USER's inventory that you would to trade. Connected by '-'")
                .setRequired(false)
        )
        .addStringOption((option) => 
            option
                .setName('invitedpackids')
                .setDescription("The packIDs in the OTHER USER's inventory that you would to trade. Connected by '-'")
                .setRequired(false)
        ),
    async execute(interaction, client) {
        var tradeUser = interaction.options.getUser('user');

        var user1cards = interaction.options.getString('yourcardids');
        var user1packs = interaction.options.getString('yourpackids');
        var user2cards = interaction.options.getString('invitedcardids');
        var user2packs = interaction.options.getString('invitedpackids');

        await interaction.deferReply({
            fetchReply: true,
        });

        /*
            itemsUser = {
                packs: [packId],
                cards: [cardId]
            }
        */

        async function handleInput(input) {
            if (!input) return [];
            if (!input.includes('-')) return [parseInt(input) - 1];

            let newArray = input.split('-');

            for (let i=0; i<newArray.length; i++) {
                let toNumber = parseInt(newArray[i]) || 0;

                newArray[i] = toNumber - 1;
            }

            return newArray;
        }

        user1cards = await handleInput(user1cards);
        user1packs = await handleInput(user1packs);
        user2cards = await handleInput(user2cards);
        user2packs = await handleInput(user2packs);

        let items1 = {
            packs: user1packs,
            cards: user1cards
        };

        let items2 = {
            packs: user2packs,
            cards: user2cards
        };

        cardTrading(interaction, client, interaction.user, tradeUser, items1, items2);
    }
};