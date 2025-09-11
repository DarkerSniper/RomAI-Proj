const { SlashCommandBuilder } = require('discord.js');

const { playerCard } = require(`../../utils/components/card`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('playercard')
        .setDescription('Posts a player trading card')
        .addStringOption((option) => 
            option
                .setName('username')
                .setDescription("The osu! username you would like to use.")
                .setRequired(false)
        ),
    async execute(interaction, client) {
        var username = interaction.options.getString('username');

        await interaction.deferReply({
            fetchReply: true
        });

        await playerCard(interaction, client, username);
    }
};