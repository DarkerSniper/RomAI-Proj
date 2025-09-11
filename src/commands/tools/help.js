const { SlashCommandBuilder } = require('discord.js');

const { commandsInfo } = require(`../../utils/components/help`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription("Check out all of the different commands you can use!"),
    async execute(interaction, client) {
        await interaction.deferReply({
            fetchReply: true,
            ephemeral: true
        });

        commandsInfo(interaction, client);
    }
};