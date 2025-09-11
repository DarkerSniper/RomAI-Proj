const { SlashCommandBuilder } = require('discord.js');

const { recentScore } = require(`../../utils/components/recent`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('recent')
        .setDescription('Displays recent osu! score')
        .addStringOption((option) => 
            option
                .setName('username')
                .setDescription("The osu! username you would like to use.")
                .setRequired(false)
        )
        .addNumberOption((option) =>
            option
                .setName(`score-index`)
                .setDescription(`The number of scores before your most recent score (Limited to 100)`)
        ),
    async execute(interaction, client) {
        //local const named 'username' which takes a string from the user
        var username = interaction.options.getString('username');
        var scoreIndex = interaction.options.getNumber(`score-index`);

        await interaction.deferReply({
            fetchReply: true
        });

        var reply = await recentScore(interaction, client, username, undefined, scoreIndex);

        await interaction.editReply(reply);
    }
};