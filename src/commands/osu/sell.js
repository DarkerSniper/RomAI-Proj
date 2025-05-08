const { SlashCommandBuilder, inlineCode } = require('discord.js');

const { sellCard } = require(`../../utils/components/sell`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('quicksell')
        .setDescription('Sell a card by the minimum rarity cost!')
        .addNumberOption((option) => 
            option
                .setName('cardid')
                .setDescription("The cardID of the card you would like to sell.")
                .setMinValue(1)
                .setMaxValue(40)
                .setRequired(true)
        ),
    async execute(interaction, client) {
        const cardId = interaction.options.getNumber('cardid');

        await interaction.deferReply({
            fetchReply: false,
        });

        sellCard(interaction, interaction.user.id, cardId);
    }
};