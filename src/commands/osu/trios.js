const { SlashCommandBuilder, inlineCode, PermissionFlagsBits } = require('discord.js');

const { triosRequest } = require(`../../utils/components/trios`);

const Guild = require('../../schemas/guild');
const mapPool = require('../../schemas/mapPool');
const privateMapPool = require('../../schemas/privateMapPool');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('trios')
        .setDescription('Start a Trios match with custom teams! (osu! 3v3)')
        .addUserOption((option) => 
            option
                .setName('teammate1')
                .setDescription("The first discord user you want to team up with!")
                .setRequired(true)
        )
        .addUserOption((option) => 
            option
                .setName('teammate2')
                .setDescription("The second discord user you want to team up with!")
                .setRequired(true)
        )
        .addUserOption((option) => 
            option
                .setName('opponent1')
                .setDescription("The first discord user you want to face!")
                .setRequired(true)
        )
        .addUserOption((option) => 
            option
                .setName('opponent2')
                .setDescription("The second discord user you want to face!")
                .setRequired(true)
        )
        .addUserOption((option) => 
            option
                .setName('opponent3')
                .setDescription("The third discord user you want to face!")
                .setRequired(true)
        )
        .addStringOption((option) => 
            option
                .setName('setpool')
                .setDescription("Set a pool for this match!")
                .setRequired(true)
                .setAutocomplete(true)
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
        var mate1 = interaction.options.getUser('teammate1');
        var mate2 = interaction.options.getUser('teammate2');
        var opp1 = interaction.options.getUser('opponent1');
        var opp2 = interaction.options.getUser('opponent2');
        var opp3 = interaction.options.getUser('opponent3');
        var setPool = interaction.options.getString('setpool');
        var setBO = interaction.options.getNumber('setbestof');

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
                content: `This guild is not yet connected to the AI\nPlease setup your guild by using: ${inlineCode("/setguild")}`
            });
        }

        if (setPool && !poolInfo) return await interaction.editReply({
            content: `The map pool you have chosen does not exist.`
        });

        let matchUsers = [mate1, mate2, opp1, opp2, opp3];

        triosRequest(interaction, client, interaction.user, matchUsers, setPool, setBO);
    }
};