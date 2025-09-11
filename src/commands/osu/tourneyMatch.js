const { SlashCommandBuilder, inlineCode, PermissionFlagsBits } = require('discord.js');

const Guild = require('../../schemas/guild');
const mapPool = require('../../schemas/mapPool');
const privateMapPool = require('../../schemas/privateMapPool');
const { tourneyRequest } = require('../../utils/components/tourneyMatch');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('create-tourney-match')
        .setDescription('Start a tourney match with custom teams!')
        .addStringOption((option) => 
            option
                .setName('tournamentname')
                .setDescription("The tournament's name.")
                .setRequired(true)
        )
        .addStringOption((option) => 
            option
                .setName('tournamentstage')
                .setDescription("The tournament's current stage.")
                .setRequired(true)
        )
        .addStringOption((option) => 
            option
                .setName('gamemode')
                .setDescription("The tournament's game mode.")
                .setRequired(true)
                .addChoices(
                    {
                        name: '1v1',
                        value: '1v1'
                    },
                    {
                        name: '2v2',
                        value: '2v2'
                    },
                    {
                        name: '3v3',
                        value: '3v3'
                    },
                    {
                        name: '4v4',
                        value: '4v4'
                    },
                )
        )
        .addStringOption((option) => 
            option
                .setName('team1name')
                .setDescription("The name of team 1!.")
                .setRequired(true)
        )
        .addUserOption((option) => 
            option
                .setName('captain1')
                .setDescription("The first discord user on team 1!")
                .setRequired(true)
        )
        .addStringOption((option) => 
            option
                .setName('team2name')
                .setDescription("The name of team 2!.")
                .setRequired(true)
        )
        .addUserOption((option) => 
            option
                .setName('captain2')
                .setDescription("The first discord user on team 2!")
                .setRequired(true)
        )
        .addStringOption((option) => 
            option
                .setName('setpool')
                .setDescription("Set a pool for this match!")
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addUserOption((option) => 
            option
                .setName('team1player2')
                .setDescription("The second discord user on team 1!")
                .setRequired(false)
        )
        .addUserOption((option) => 
            option
                .setName('team1player3')
                .setDescription("The third discord user on team 1!")
                .setRequired(false)
        )
        .addUserOption((option) => 
            option
                .setName('team1player4')
                .setDescription("The forth discord user on team 1!")
                .setRequired(false)
        )
        
        .addUserOption((option) => 
            option
                .setName('team2player2')
                .setDescription("The second discord user on team 2!")
                .setRequired(false)
        )
        .addUserOption((option) => 
            option
                .setName('team2player3')
                .setDescription("The third discord user on team 2!")
                .setRequired(false)
        )
        .addUserOption((option) => 
            option
                .setName('team2player4')
                .setDescription("The forth discord user on team 2!")
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
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
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
        const tournamentName = interaction.options.getString('tournamentname');
        const tournamentStage = interaction.options.getString('tournamentstage');
        const gameMode = interaction.options.getString('gamemode');
        const team1name = interaction.options.getString('team1name');
        var cap1 = interaction.options.getUser('captain1');
        var team1player2 = interaction.options.getUser('team1player2');
        var team1player3 = interaction.options.getUser('team1player3');
        var team1player4 = interaction.options.getUser('team1player4');
        const team2name = interaction.options.getString('team2name');
        var cap2 = interaction.options.getUser('captain2');
        var team2player2 = interaction.options.getUser('team2player2');
        var team2player3 = interaction.options.getUser('team2player3');
        var team2player4 = interaction.options.getUser('team2player4');
        var setPool = interaction.options.getString('setpool');
        var setBO = interaction.options.getNumber('setbestof');

        let guild = interaction.guildId;
        var channel = interaction.channelId;

        if (interaction.user.tag != 'romdarker') return await interaction.editReply({
            content: `You do not have permission to use this command.`
        });

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

        let tournament = {
            name: tournamentName,
            stage: tournamentStage,
            round: null,
            teams: [
                { name: team1name },
                { name: team2name }
            ]
        }

        let matchUsers = [];

        if (cap1) matchUsers.push(cap1);
        if (team1player2) matchUsers.push(team1player2);
        if (team1player3) matchUsers.push(team1player3);
        if (team1player4) matchUsers.push(team1player4);
        if (cap2) matchUsers.push(cap2);
        if (team2player2) matchUsers.push(team2player2);
        if (team2player3) matchUsers.push(team2player3);
        if (team2player4) matchUsers.push(team2player4);

        tourneyRequest(interaction, client, interaction.user, matchUsers, setPool, setBO, tournament, gameMode);
    }
};