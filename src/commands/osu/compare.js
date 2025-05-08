const { SlashCommandBuilder } = require('discord.js');

const { compareScore } = require(`../../utils/components/compare`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('c')
        .setDescription('Shows submitted scores on the most recently used map')
        .addStringOption((option) => 
            option
                .setName('username')
                .setDescription("The osu! username you would like to use.")
                .setRequired(false)
        )
        .addStringOption((option) =>
            option
                .setName('beatmaplink')
                .setDescription("Specify a beatmap link for comparison")
                .setRequired(false)
        ),
    async execute(interaction, client) {
        var username = interaction.options.getString('username');
        var beatmapLink = interaction.options.getString('beatmaplink');

        await interaction.deferReply({
            fetchReply: true
        });

        let beatmapId = undefined;

        if (beatmapLink) {
            if (!beatmapLink.includes("#osu/")) return await interaction.editReply({
                content: `Invalid beatmap link`
            });

            beatmapId = beatmapLink.split("#osu/")[1];
        }

        var reply = await compareScore(interaction, client, username, beatmapId);

        await interaction.editReply(reply);
    }
};