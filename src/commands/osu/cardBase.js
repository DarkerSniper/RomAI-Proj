const { SlashCommandBuilder } = require('discord.js');

const { getCardOwners } = require(`../../utils/components/cardBase`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cardbase')
        .setDescription('View the owners of a card')
        .addStringOption((option) => 
            option
                .setName('username')
                .setDescription("The osu! username you would like to use.")
                .setRequired(true)
        ),
    async execute(interaction, client) {
        var username = interaction.options.getString('username');

        await interaction.deferReply({
            fetchReply: true
        });

        await getCardOwners(interaction, username);
    }
};