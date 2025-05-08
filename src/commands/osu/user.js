const { SlashCommandBuilder } = require('discord.js');

const { userProfile } = require(`../../utils/components/user`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('user')
        .setDescription('Displays a whole lot of stats of an osu! user ')
        .addStringOption((option) => 
            option
                .setName('username')
                .setDescription("The osu! username you would like to use.")
                .setRequired(false)
        ),
    async execute(interaction, client) {
        var username = interaction.options.getString('username');

        await interaction.deferReply({
            fetchReply: true
        });

        var reply = await userProfile(interaction, client, username);

        await interaction.editReply(reply);
    }
};