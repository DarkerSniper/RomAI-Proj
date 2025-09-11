const { SlashCommandBuilder, inlineCode, PermissionFlagsBits } = require('discord.js');

const { createWeekendLeagueCycle } = require(`../../utils/components/weekendLeague`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('createleague')
        .setDescription('Creates a League (up to 4 matches per team) to Playoffs tournament')
        .addStringOption((option) => 
            option
                .setName('leaguename')
                .setDescription("Name of the league")
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName(`gamemode`)
                .setDescription(`Gamemode of the tournament`)
                .setRequired(true)
                .addChoices(
                    { name: "1v1", value: `1` },
                    { name: "2v2", value: `2` },
                    { name: "3v3", value: `3` }
                )
        )
        .addStringOption((option) =>
            option
                .setName('groupstartdate')
                .setDescription("Exact date of Group Stage start in this format: 'YYYY-MM-DD HH:SS'")
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName('playoffsstartdate')
                .setDescription("Exact date of Playoffs start in this format: 'YYYY-MM-DD HH:SS'")
                .setRequired(true)
        )
        .addNumberOption((option) =>
            option
                .setName(`elomin`)
                .setDescription(`Set a minimum ELO range for this tournament`)
                .setRequired(false)
        )
        .addNumberOption((option) =>
            option
                .setName(`elomax`)
                .setDescription(`Set a maximum ELO range for this tournament`)
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction, client) {
        var leagueName = interaction.options.getString('leaguename');
        var gameMode = interaction.options.getString('gamemode');
        var groupDate = interaction.options.getString('groupstartdate');
        var playoffsDate = interaction.options.getString('playoffsstartdate');

        var eloMin = interaction.options.getNumber('elomin');
        var eloMax = interaction.options.getNumber('elomax');

        let guild = interaction.guildId;

        gameMode = parseInt(gameMode);
        groupDate = new Date(groupDate);
        playoffsDate = new Date(playoffsDate);

        await interaction.deferReply({
            fetchReply: true,
            ephemeral: true
        });

        if (interaction.user.tag != 'romdarker') return await interaction.editReply({
            content: `You do not have permission to use this command.`
        });

        if (isNaN(groupDate.getTime())) {
            return await interaction.editReply({
                content: `[Group Stage date]: Please provide a valid date and time.`
            });
        }

        if (isNaN(playoffsDate.getTime())) {
            return await interaction.editReply({
                content: `[Playoffs date]: Please provide a valid date and time.`
            });
        }

        if (groupDate - new Date() < 0) return await interaction.editReply({
            content: `[Group Stage date]: The date you provided is in the past.`
        });

        if (playoffsDate - new Date() < 0) return await interaction.editReply({
            content: `[Playoffs date]: The date you provided is in the past.`
        });

        let eloRange = !eloMin && !eloMax ? undefined : {
            min: eloMin,
            max: eloMax
        }

        await createWeekendLeagueCycle(interaction, client, guild, leagueName, gameMode, groupDate, playoffsDate, eloRange);
    }
};