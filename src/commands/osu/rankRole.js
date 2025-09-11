const { SlashCommandBuilder } = require('discord.js');
const { eloRankRoles } = require('../../utils/components/sync');



module.exports = {
    data: new SlashCommandBuilder()
        .setName('rankrole')
        .setDescription("Get a RomAI rank role!"),
    async execute(interaction, client) {
        await interaction.deferReply({
            fetchReply: true
        });

        var reply = await eloRankRoles(interaction, client);

        await interaction.editReply(reply);
    }
};