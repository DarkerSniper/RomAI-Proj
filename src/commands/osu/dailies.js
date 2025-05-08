const { SlashCommandBuilder } = require('discord.js');

const { challengesRefreshAndShow } = require(`../../utils/components/dailies`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dailychallenges')
        .setDescription('Refreshes and shows your Daily Challenges!'),
    async execute(interaction, client) {
        await interaction.deferReply({
            fetchReply: true
        });

        await challengesRefreshAndShow(interaction);
    }
};