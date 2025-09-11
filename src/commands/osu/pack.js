const { SlashCommandBuilder } = require('discord.js');

const { usePack } = require(`../../utils/components/usePack`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('packuse')
        .setDescription("Opens the selected pack.")
        .addNumberOption((option) => 
            option
                .setName('packid')
                .setDescription("Pack's number in the user's inventory")
                .setRequired(true)
        ),
    async execute(interaction, client) {
        const packId = interaction.options.getNumber('packid');

        await interaction.deferReply({
            fetchReply: true
        });

        await usePack(interaction, client, interaction.user.id, packId - 1);
    }
};