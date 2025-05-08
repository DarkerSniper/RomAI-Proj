const { SlashCommandBuilder } = require('discord.js');

const { globalLeaderboard, cardLeaderboard, levelLeaderboard } = require(`../../utils/components/guildLeaderboard`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('globalleaderboard')
        .setDescription("View the global top 15 players!")
        .addStringOption((option) => 
            option
                .setName('gamemode')
                .setDescription("Leaderboard Gamemode (1v1 or 2v2)")
                .setRequired(true)
                .addChoices(
                    { name: '1v1', value: '1v1' },
                    { name: '2v2', value: '2v2' },
                    { name: 'Inventory', value: 'inventory' },
                    { name: `Level`, value: `level` }
                )
        ),
    async execute(interaction, client) {
        const mode = interaction.options.getString('gamemode');

        await interaction.deferReply({
            fetchReply: true
        });

        if (mode == 'inventory') {
            cardLeaderboard(interaction, client, true);
        } else if (mode == 'level') {
            levelLeaderboard(interaction, client, true);
        } else {
            globalLeaderboard(interaction, client, mode, true);
        }
    }
};