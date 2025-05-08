const { SlashCommandBuilder } = require('discord.js');

const { showInventory } = require(`../../utils/components/inventory`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription("Returns your cards' stats and available packs (top 3 cards are showcased)")
        .addUserOption((option) => 
            option
                .setName('user')
                .setDescription("View another user's inventory!")
                .setRequired(false)
        ),
    async execute(interaction, client) {
        var user = interaction.options.getUser('user');

        await interaction.deferReply({
            fetchReply: true
        });

        var reply = await showInventory(interaction, undefined, user);

        await interaction.editReply(reply);
    }
};