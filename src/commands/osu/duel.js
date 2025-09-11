const { SlashCommandBuilder, inlineCode } = require('discord.js');

const { duelRequest } = require(`../../utils/components/duel`);

const Guild = require('../../schemas/guild');
const mapPool = require('../../schemas/mapPool');
const privateMapPool = require(`../../schemas/privateMapPool`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('duel')
        .setDescription('Duels a discord user (osu! 1v1)')
        .addUserOption((option) => 
            option
                .setName('user')
                .setDescription("The discord user you want to duel with!")
                .setRequired(true)
        )
        .addStringOption((option) => 
            option
                .setName('setpool')
                .setDescription("Option to set a pool for this match!")
                .setRequired(false)
                .setAutocomplete(true)
        )
        .addNumberOption((option) => 
            option
                .setName('setelo')
                .setDescription("Set the ELO of this match (instead of picking a specific pool)")
                .setRequired(false)
        )
        .addNumberOption((option) =>
            option
                .setName('setbestof')
                .setDescription("Set a custom 'Best of' for this match! (Defaults to BO7)")
                .setRequired(false)
                .addChoices(
                    {
                        name: 'Best of 9 (First to 5)',
                        value: 9
                    },
                    {
                        name: 'Best of 11 (First to 6)',
                        value: 11
                    },
                )
        ),
    async autocomplete(interaction, client) {
        const focusedValue = interaction.options.getFocused();

        const allPools = await mapPool.find();
        const privatePools = await privateMapPool.find();
        const mapPoolNames = allPools.map(pool => pool.name);
        const privateMapPoolNames = privatePools.map(pool => pool.name);

        const choices = mapPoolNames.concat(privateMapPoolNames);

        const filtered = choices.filter((choice) => 
            choice.toLowerCase().includes(focusedValue.toLowerCase())
        );
        await interaction.respond(
            filtered.map((choice) => ({ name: choice, value: choice }))
        );
    },
    async execute(interaction, client) {
        var user = interaction.options.getUser('user');
        var setPool = interaction.options.getString('setpool');
        var setBO = interaction.options.getNumber('setbestof');
        var setELO = interaction.options.getNumber('setelo');

        let guild = interaction.guildId;
        var channel = interaction.channelId;

        let guildProfile = await Guild.findOne({ guildId: guild });
        let poolInfo = await mapPool.findOne({ name: setPool });

        if (setPool && !poolInfo) poolInfo = await privateMapPool.findOne({ name: setPool });

        await interaction.deferReply({
            fetchReply: true,
        });

        if (!guildProfile) {
            return await interaction.editReply({
                content: `This guild has not been setup yet\nPlease setup your guild by using: ${inlineCode("/setguild")}`
            });
        }

        if (setPool && !poolInfo) return await interaction.editReply({
            content: `The map pool you have chosen does not exist.`
        });

        duelRequest(interaction, client, interaction.user, user, setPool, setBO, setELO);
    }
};