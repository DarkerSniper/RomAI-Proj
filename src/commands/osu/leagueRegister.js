const { SlashCommandBuilder, inlineCode } = require('discord.js');

const leagues = require(`../../schemas/leagues`);
const { weekendLeagueRegister, weekendLeagueLeave } = require(`../../utils/components/weekendLeague`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('weekendleague')
        .setDescription('Weekend League actions')
        .addSubcommand(command =>
            command
            .setName('register')
            .setDescription('Participate in a 2 day high stakes tournament with awesome rewards!')
            .addStringOption((option) => 
                option
                    .setName('teamname')
                    .setDescription("Choose your team name for this tournament! (In gamemode: 1v1 changes to your osu! username)")
                    .setRequired(true)
            )
            .addUserOption((option) => 
                option
                    .setName('teammate1')
                    .setDescription("The first teammate of your team. (In case of 2v2)")
                    .setRequired(false)
            )
            .addUserOption((option) => 
                option
                    .setName('teammate2')
                    .setDescription("The second teammate of your team. (In case of 3v3)")
                    .setRequired(false)
            )
        )
        .addSubcommand(command =>
            command
                .setName('leave')
                .setDescription('Disband your team (only available for the CAPTAIN)')
        ),
    async execute(interaction, client) {
        const command = interaction.options.getSubcommand();

        const teamName = interaction.options.getString('teamname');
        const mate1 = interaction.options.getUser('teammate1');
        const mate2 = interaction.options.getUser(`teammate2`);


        await interaction.deferReply({
            fetchReply: true,
        });

        switch(command) {
            case 'register':
                let latestWeekendLeagues = await leagues.find().sort({ _id: -1 });

                if (latestWeekendLeagues[0].teams.length == 8) return await interaction.editReply({
                    content: `This tournament is full! (8/8)`
                });

                if (!mate1 && !mate2) {
                    await weekendLeagueRegister(interaction, client);
                    break;
                }

                let team = [];

                if (mate1) team.push(mate1);
                if (mate2) team.push(mate2);

                await weekendLeagueRegister(interaction, client, teamName, team);
                break;
            case 'leave':
                await weekendLeagueLeave(interaction, client);
                break;
        }
    }
};