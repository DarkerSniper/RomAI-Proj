const { SlashCommandBuilder } = require('discord.js');
const { multiMatch } = require('../../utils/components/multi');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('matchrating')
        .setDescription(`Display the stats and player ratings of a match`)
        .addStringOption((option) => 
            option
                .setName('mplink')
                .setDescription("The link to the match")
                .setRequired(true)
        )
        .addNumberOption((option) => 
            option
                .setName('ignore-maps-start')
                .setDescription('Number of maps you want to ignore from the start')
                .setRequired(false)
        )
        .addNumberOption((option) => 
            option
                .setName('ignore-maps-end')
                .setDescription('Number of maps you want to ignore from the end')
                .setRequired(false)
        ),
    async execute(interaction, client) {
        var mpLink = interaction.options.getString('mplink');
        var ignoreStart = interaction.options.getNumber('ignore-maps-start');
        var ignoreEnd = interaction.options.getNumber('ignore-maps-end');

        await interaction.deferReply({
            fetchReply: true
        });

        let reply = await multiMatch(interaction, client, undefined, mpLink, ignoreStart, ignoreEnd);

        await interaction.editReply(reply);
    }
};