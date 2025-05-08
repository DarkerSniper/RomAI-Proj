const { EmbedBuilder, hyperlink, bold, inlineCode, italic } = require('discord.js');

const guilds = require(`../../schemas/guild`);
const osuUser = require(`../../schemas/osuUser`);

const { getGames } = require("./activeData");
const { handleLobby } = require("./autoMatches");

module.exports = {
    async startNextRound(league, stage, round, client) {
        let delay = 60000;
        let selectedRound = stage == 'Playoffs' ? league.schedule.playoffs[round] : league.schedule.groups[round];

        let mmChannel = (await guilds.findOne({ guildId: league.guildId })).setup.matchmakingChannel;

        mmChannel = client.channels.cache.get(mmChannel);

        for (let i=0; i<selectedRound.length; i++) {
            let currentMatch = selectedRound[i];

            let currentGames = await getGames();
            while (currentGames.length > 4) {
                console.log(`4 Matches are currently being played. Waiting... (1sec)`);
                await new Promise(resolve => setTimeout(resolve, 10000));
                currentGames = await getGames();
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
};