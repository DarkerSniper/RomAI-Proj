const { SlashCommandBuilder, inlineCode } = require('discord.js');

const { queue } = require(`../../utils/components/matchmaking`);

const Guild = require('../../schemas/guild');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('matchmaking')
        .setDescription('Matchmaking (1v1 and 2v2)')
        .addStringOption((option) => 
            option
                .setName('action')
                .setDescription("Queue Action")
                .setRequired(true)
                .addChoices(
                    { name: "JoinQueue", value: "JoinQueue" },
                    { name: "LeaveQueue", value: "LeaveQueue" },
                    { name: "ShowQueue", value: "ShowQueue" }
                )
        )
        .addStringOption((option) => 
            option
                .setName('gamemode')
                .setDescription("Action's Gamemode")
                .setRequired(true)
                .addChoices(
                    { name: '1v1', value: '1' },
                    { name: '2v2', value: '2' },
                )
        )
        .addUserOption((option) =>
            option
                .setName('teammate')
                .setDescription('The user you would like to queue with!')
                .setRequired(false)
        ),
    async execute(interaction, client) {
        const action = interaction.options.getString('action');
        const mode = interaction.options.getString('gamemode');
        const teammate = interaction.options.getUser('teammate');

        let guild = interaction.guildId;
        let guildProfile = await Guild.findOne({ guildId: guild });

        await interaction.deferReply({
            fetchReply: true,
        });

        if (!guildProfile) {
            return await interaction.editReply({
                content: `This guild is not yet connected to the AI\nPlease setup your guild by using: ${inlineCode("/setguild")}`
            });
        }

        queue(interaction, client, action.toLowerCase(), interaction.user, parseInt(mode), teammate);
    }
};