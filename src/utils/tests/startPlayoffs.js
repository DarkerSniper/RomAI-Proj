const leagues = require("../../schemas/leagues");
const { dateConversion } = require("../osu/formatNum");
const { handleLobby } = require("../osu/autoMatches");
const { singleElimBracket } = require("../osu/tournamentFormats");

const { EmbedBuilder, hyperlink, bold, inlineCode, italic } = require('discord.js');

module.exports = {
    async manualPlayoffs(match, tournament, client) {
        var league = await leagues.findOne({ name: tournament.name });
        var schedule = league.schedule;
        var leagueTeams = league.teams;
        var matches = league.matches;

        let leagueChannel = client.channels.cache.get(league.interactions.channel);

        leagueTeams = leagueTeams.sort(function (a, b) {
            if (b.record.wins == a.record.wins) {
                if (b.record.losses == a.record.losses) {
                    return b.mapDiff - a.mapDiff;
                }

                return a.record.losses - b.record.losses;
            }

            return b.record.wins - a.record.wins;
        });

        // Get Playoffs schedule
        let qualified = leagueTeams.length > 5 ? [leagueTeams[0], leagueTeams[1], leagueTeams[2], leagueTeams[3]] : [leagueTeams[0], leagueTeams[1]];
        schedule.playoffs = await singleElimBracket(qualified);

        // Post Playoffs picture
        let leagueInteractions = league.interactions;

        let playoffPrizes = leagueTeams.length > 5 ? 
        `1. 1000 Currency + IL Pro Pack + IL Intermediate Pack\n2. 500 Currency + IL Contender Pack\n3-4. 250 Currency + IL Intermediate Pack` :
        `1. 500 Currency + IL Pro Pack\n2. 200 Currency + IL Intermediate Pack`;

        let playoffDescription = `${bold(`Prizes:`)}\n${playoffPrizes}`;

        const playoffsEmbed = new EmbedBuilder()
            .setTitle(`${league.name} Playoffs (Day 2)`)
            .setDescription(playoffDescription);

        if (leagueTeams.length > 5) {
            playoffsEmbed.addFields(
                {
                    name: `Semi-Finals`,
                    value: `${bold(schedule.playoffs[0][0].home.name)} vs ${bold(schedule.playoffs[0][0].away.name)}\n${bold(schedule.playoffs[0][1].home.name)} vs ${bold(schedule.playoffs[0][1].away.name)}`
                },
                {
                    name: `Finals`,
                    value: `TBD vs TBD`
                }
            );
        } else {
            playoffsEmbed.addFields(
                {
                    name: `Finals`,
                    value: `${bold(schedule.playoffs[0][0].home.name)} vs ${bold(schedule.playoffs[0][0].away.name)}`
                }
            );
        }

        let playoffsMessage = leagueChannel.send({
            content: `${league.name} - ${italic(`Playoffs`)} starts in ${dateConversion(league.stages.playoffs)}`,
            embeds: [playoffsEmbed]
        });

        leagueInteractions.playoffs = playoffsMessage.id;

        // Save schedule in database
        await leagues.updateOne({ _id: league._id }, {
            $set: {
                schedule: schedule,
                interactions: leagueInteractions
            }
        });

        // setTimeout to the first round
        setTimeout(async function() {
            await startNextRound('Playoffs', 0);
        }, league.stages.playoffs.getTime() - Date.now());

        async function startNextRound(stage, round) {
            let delay = 60000;
            let selectedRound = stage == 'Playoffs' ? schedule.playoffs[round] : schedule.groups[round];
    
            let mmChannel = (await guild.findOne({ guildId: league.guildId })).setup.matchmakingChannel;

            mmChannel = client.channels.cache.get(mmChannel);
    
            for (let i=0; i<selectedRound.length; i++) {
                let currentMatch = selectedRound[i];

                // Start every game with a +second delay
                let currentGames = await getGames();
                while (currentGames.length > 4) {
                    console.log(`4 Matches are currently being played. Waiting... (10 sec)`);
                    await new Promise(resolve => setTimeout(resolve, 10000));
                    currentGames = await getGames();
                    console.log(currentGames);
                }
                
                let homeTeamPlayers = currentMatch.home.players;
                let awayTeamPlayers = currentMatch.away.players;

                let tagPlayers = ``;

                for (let p=0; p<homeTeamPlayers.length; p++) {
                    let homePlayer = homeTeamPlayers[p];
                    let awayPlayer = awayTeamPlayers[p];

                    let homeDiscordId = (await osuUser.findOne({ osuUserName: homePlayer })).discordId;
                    let awayDiscordId = (await osuUser.findOne({ osuUserName: awayPlayer })).discordId;

                    tagPlayers += ` <@${homeDiscordId}> <@${awayDiscordId}>`;
                }

                await mmChannel.send({
                    content: `${tagPlayers} \n${bold(league.name)}\n${currentMatch.home.name} (${currentMatch.home.players.join(' ')})\nvs\n${currentMatch.away.name} (${currentMatch.away.players.join(' ')})`
                });

                let newTournamentMatch = {
                    name: league.name,
                    stage: stage,
                    round: round,
                    match: i,
                    teams: [currentMatch.home, currentMatch.away]
                }

                if (homeTeamPlayers.length == 1) {
                    handleLobby(homeTeamPlayers[0], awayTeamPlayers[0], [league.guildId], client, undefined, newTournamentMatch);
                } else {
                    let matchTeams = {
                        teamA: homeTeamPlayers,
                        teamB: awayTeamPlayers
                    };

                    handleLobby(undefined, undefined, [league.guildId], client, matchTeams, newTournamentMatch);
                }

                await new Promise(resolve => setTimeout(resolve, delay));

                delay += 1000;
            }
        }
    }
};