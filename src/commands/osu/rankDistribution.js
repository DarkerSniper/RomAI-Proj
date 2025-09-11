const { SlashCommandBuilder } = require('discord.js');
const { testRankDistribution } = require('../../utils/tests/rankCommands');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rankdistribution')
        .setDescription("Show the rank distribution in RomAI!")
        .addStringOption((option) => 
            option
                .setName('gamemode')
                .setDescription("Gamemode (1v1 or 2v2)")
                .setRequired(true)
                .addChoices(
                    { name: '1v1', value: '1v1' },
                    { name: '2v2', value: '2v2' }
                )
        ),
    async execute(interaction, client) {
        const mode = interaction.options.getString('gamemode');

        await interaction.deferReply({
            fetchReply: true
        });

        var reply = await testRankDistribution(mode);

        await interaction.editReply(reply);
    }
};