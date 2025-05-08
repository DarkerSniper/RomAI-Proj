
const { EmbedBuilder, hyperlink, bold, inlineCode, italic } = require('discord.js');

const leagues = require("../../schemas/leagues");
const osuUser = require('../../schemas/osuUser');
const { addCurrecny } = require('../discord/currency');
const { inventoryAddPack } = require('../discord/invAddPack');

module.exports = {
    async playoffRewards(client) {
        afterMatch({
            "pool": {
              "maps": {
                "noMod": [
                  4722255,
                  4722272,
                  4720822,
                  4724708,
                  4722227
                ],
                "hidden": [
                  4722412,
                  4722094,
                  4722352
                ],
                "hardRock": [
                  4722326,
                  4722307,
                  4722252
                ],
                "doubleTime": [
                  4722333,
                  4722365,
                  4721143
                ],
                "tieBreaker": 4722606
              },
              "_id": {
                "$oid": "66da21165fe7ed48242adfac"
              },
              "name": "Corsace Open 2024 (Week 1)",
              "elo": 1730
            },
            "players": [
              "snowfort",
              "PaintedKoala",
              "WhitePixel_",
              "CIash_of_Clans"
            ],
            "score": [
              3,
              4
            ],
            "eloInfo": {
              "elo1": {
                "gain": 1673,
                "lose": 1641
              },
              "elo2": {
                "gain": 1823,
                "lose": 1791
              }
            },
            "date": {
              "$date": "2024-12-01T18:15:06.641Z"
            },
            "bans": [
              "nm5",
              "hd2",
              "dt2",
              "hd3"
            ],
            "picks": [
              {
                "map": 4722272,
                "mod": "nm2",
                "scores": [
                  508762,
                  1072894
                ],
                "_id": {
                  "$oid": "674cb06f7ddeb2aecdfc96a0"
                }
              },
              {
                "map": 4720822,
                "mod": "nm3",
                "scores": [
                  726038,
                  282044
                ],
                "_id": {
                  "$oid": "674cb06f7ddeb2aecdfc96a1"
                }
              },
              {
                "map": 4721143,
                "mod": "dt3",
                "scores": [
                  751883,
                  616703
                ],
                "_id": {
                  "$oid": "674cb06f7ddeb2aecdfc96a2"
                }
              },
              {
                "map": 4724708,
                "mod": "nm4",
                "scores": [
                  998283,
                  553114
                ],
                "_id": {
                  "$oid": "674cb06f7ddeb2aecdfc96a3"
                }
              },
              {
                "map": 4722333,
                "mod": "dt1",
                "scores": [
                  456272,
                  515761
                ],
                "_id": {
                  "$oid": "674cb06f7ddeb2aecdfc96a4"
                }
              },
              {
                "map": 4722252,
                "mod": "hr3",
                "scores": [
                  296667,
                  384743
                ],
                "_id": {
                  "$oid": "674cb06f7ddeb2aecdfc96a5"
                }
              },
              {
                "map": 4722606,
                "mod": "tb",
                "scores": [
                  440354,
                  500055
                ],
                "_id": {
                  "$oid": "674cb06f7ddeb2aecdfc96a6"
                }
              }
            ],
            "_id": {
              "$oid": "674cb06f7ddeb2aecdfc969f"
            }
          }, {
            name: 'Weekend League Beta #2',
            stage: 'Playoffs',
            round: 0,
            match: 0,
            teams: [
              {
                "name": "F2alon UCK",
                "players": [
                  "snowfort",
                  "PaintedKoala"
                ],
                "mapDiff": 9,
                "record": {
                  "wins": 3,
                  "losses": 0
                },
                "_id": {
                  "$oid": "674b36f10a8317aa9b10d323"
                }
              },{
                "name": "natania union",
                "players": [
                  "WhitePixel_",
                  "CIash_of_Clans"
                ],
                "mapDiff": 5,
                "record": {
                  "wins": 2,
                  "losses": 1
                },
                "_id": {
                  "$oid": "674b11180a8317aa9b10d2ee"
                }
              }]
        });

        async function afterMatch(match, tournament) {
            var league = await leagues.findOne({ name: tournament.name });
            var schedule = league.schedule;
            var leagueTeams = league.teams;
            var matches = league.matches;

            let leagueChannel = client.channels.cache.get(league.interactions.channel);
    
            if (match.score[0] != 4 && match.score[1] != 4) {
                if (match.score[0] < match.score[1]) 
                    match.score[1] = 4;
                else
                    match.score[0] = 4;
            }
    
            matches.push(match);
    
            let schedType = tournament.stage == 'Playoffs' ? schedule.playoffs : schedule.groups;
    
            schedType[tournament.round][tournament.match].score = match.score;
    
            // Check if playoffs
            if (tournament.stage == 'Playoffs') {
                // Input winner to next round
                let winner = match.score[0] == 4 ? tournament.teams[0] : tournament.teams[1];
                console.log(`Winner: ${winner.name}`);
                
                if (tournament.round + 1 != schedule.playoffs.length) {
                    let seed = tournament.match == 1 ? 'away' : 'home';
        
                    schedule.playoffs[tournament.round + 1][0][seed] = winner;
        
                    await leagues.updateOne({ _id: league._id }, {
                        $set: {
                            schedule: schedule
                        }
                    });
                }
    
                let playoffPrizes = leagueTeams.length > 5 ? 
                `1. 1000 Currency + IL Pro Pack + IL Intermediate Pack\n2. 500 Currency + IL Contender Pack\n3-4. 250 Currency + IL Intermediate Pack` :
                `1. 500 Currency + IL Pro Pack\n2. 200 Currency + IL Intermediate Pack`;
    
                let playoffDescription = `${bold(`Prizes:`)}\n${playoffPrizes}`;
    
                const playoffsEmbed = new EmbedBuilder()
                    .setTitle(`${league.name} Playoffs (Day 2)`)
                    .setDescription(playoffDescription);

                const fetchedPlayoffs = await leagueChannel.messages.fetch(league.interactions.playoffs);
    
                for (let i=0; i<schedule.playoffs.length; i++) {
                    let round = schedule.playoffs.length == 2 ? (i == 0 ? `Semi-Finals` : `Finals`) : `Finals`;
                    let game = ``;
    
                    for (let j=0; j<schedule.playoffs[i].length; j++) {
                        let currentMatch = schedule.playoffs[i][j];
    
                        let homeTeam = !currentMatch.home ? `TBD` : currentMatch.home.name;
                        let awayTeam = !currentMatch.away ? `TBD` : currentMatch.away.name;
                        
                        if (currentMatch.score == undefined) {
                            game += `${homeTeam} vs ${awayTeam}\n`;
                        } else {
                            let homeScore = currentMatch.score[0];
                            let awayScore = currentMatch.score[1];
    
                            homeScore = homeScore == 4 ? bold(`4`) : `${homeScore}`;
                            awayScore = awayScore == 4 ? bold(`4`) : `${awayScore}`;
                            game += `${homeTeam} ${homeScore} | ${awayScore} ${awayTeam}`;
                        }
                    }
    
                    playoffsEmbed.addFields({
                        name: round,
                        value: game
                    });
                }
    
                var podium = league.podium;
    
                if (tournament.round == schedule.playoffs.length - 1) {
                    // Get Playoffs teams
                    for (let i=0; i<schedule.playoffs.length; i++) {
                        for (let j=0; j<schedule.playoffs[i].length; j++) {
                            let currentMatch = schedule.playoffs[i][j];
        
                            let homeTeam = currentMatch.home;
                            let awayTeam = currentMatch.away;
    
                            let loser = currentMatch.score[0] == 4 ? awayTeam : homeTeam;
                            let champ = currentMatch.score[0] == 4 ? homeTeam : awayTeam;
                            
                            if (leagueTeams.length > 5) {
                                // 3rd-4th
                                if (i == 0) podium.thirdFourth.push(loser);
    
                                if (i == 1) {
                                    // 2nd
                                    podium.second = loser;
    
                                    // 1st
                                    podium.first = champ;
                                }
                            } else {
                                podium.second = loser;
                                podium.first = champ;
                            }
                        }
                    }
    
                    await leagues.updateOne({ _id: league._id }, {
                        $set: {
                            podium: podium
                        }
                    }); 
    
                    // Post Podium
                    /*
                    await fetchedPlayoffs.edit({
                        content: `${league.name} has concluded.\nThank you for playing!`,
                        embeds: [playoffsEmbed]
                    });
                    */
    
                    const podiumEmbed = new EmbedBuilder()
                        .setTitle(`${league.name} Podium`)
                        .setDescription(`Congratulations to ${winner.name}!`)
                        .addFields(
                            {
                                name: `CHAMPION`,
                                value: `${podium.first.name}\n${podium.first.players.join(' ')}`,
                                inline: true
                            },
                            {
                                name: `2nd Place`,
                                value: `${podium.second.name}\n${podium.second.players.join(' ')}`,
                                inline: true
                            }
                        );
                    
                    if (podium.thirdFourth != undefined) {
                        let thirdFourth = podium.thirdFourth;
                        podiumEmbed.addFields({
                            name: `3rd-4th Place`,
                            value: `${thirdFourth[0].name}\n${thirdFourth[0].players.join(' ')}\n\n${thirdFourth[1].name}\n${thirdFourth[1].players.join(' ')}`,
                            inline: true
                        });
                    }
    
                    leagueChannel.send({
                        content: `  `,
                        embeds: [podiumEmbed]
                    });
    
                    // Give prizes
                    await Promise.all(podium.first.players.map(async player => {
                        let playerProfile = await osuUser.findOne({ osuUserName: player });
                        let discordId = playerProfile.discordId;
                        let inv = playerProfile.inventory;
    
                        if (leagueTeams.length > 5) {
                            await addCurrecny(discordId, 1000);
                            await inventoryAddPack(discordId, inv, {
                                packType: 'Champion',
                                country: 'IL'
                            });
                            await inventoryAddPack(discordId, (await osuUser.findOne({ osuUserName: player })).inventory, {
                                packType: 'Intermediate',
                                country: 'IL'
                            });
                        } else {
                            await addCurrecny(discordId, 1000);
                            await inventoryAddPack(discordId, inv, {
                                packType: 'Pro',
                                country: 'IL'
                            });
                        }
    
                        let playerWinnings = playerProfile.winnings;
    
                        playerWinnings.push({
                            name: league.name,
                            mode: league.mode
                        });
    
                        // Update users' winnings
                        await osuUser.updateOne({ osuUserName: player }, {
                            $set: {
                                winnings: playerWinnings
                            }
                        }); 
                    }));
     
                    await Promise.all(podium.second.players.map(async player => {
                        let playerProfile = await osuUser.findOne({ osuUserName: player });
                        let discordId = playerProfile.discordId;
                        let inv = playerProfile.inventory;
    
                        if (leagueTeams.length > 5) {
                            await addCurrecny(discordId, 500);
                            await inventoryAddPack(discordId, inv, {
                                packType: 'Contender',
                                country: 'IL'
                            });
                        } else {
                            await addCurrecny(discordId, 400);
                            await inventoryAddPack(discordId, inv, {
                                packType: 'Intermediate',
                                country: 'IL'
                            });
                        }
                    }));
    
                    if (leagueTeams.length > 5) await Promise.all(podium.thirdFourth.map(team => team.players.map(async player => {
                        let playerProfile = await osuUser.findOne({ osuUserName: player });
                        let discordId = playerProfile.discordId;
                        let inv = playerProfile.inventory;
    
                        await addCurrecny(discordId, 250);
                        await inventoryAddPack(discordId, inv, {
                            packType: 'Intermediate',
                            country: 'IL'
                        });
                    })));
    
                    console.log(`Tournament Finished!\nPrizes were given!`);
                } else { 
                    await fetchedPlayoffs.edit({
                        content: `Matches are :red_circle LIVE!`,
                        embeds: [playoffsEmbed]
                    });
        
                    // If current round is finished start next round
                    let currentRound = schedule.playoffs[0];
                    let roundOngoing = false;
    
                    for (let i=0; i<currentRound.length; i++) {
                        if (currentRound[i].score == undefined) {
                            roundOngoing = true;
                            break; 
                        }
                    }
    
                    if (!roundOngoing) {
                        await startNextRound('Playoffs', tournament.round + 1);
                    }
                }
    
                return;
            }
            
            for (let i=0; i<leagueTeams.length; i++) {
                let team = leagueTeams[i];
    
                if (team.name == tournament.teams[0].name) {
                    if (match.score[0] == 4) 
                        leagueTeams[i].record.wins += 1;
                    else 
                        leagueTeams[i].record.losses += 1;
    
                    leagueTeams[i].mapDiff += match.score[0] - match.score[1];
                } else if (team.name == tournament.teams[1].name) {
                    if (match.score[1] == 4) 
                        leagueTeams[i].record.wins += 1;
                    else
                        leagueTeams[i].record.losses += 1;
    
                    leagueTeams[i].mapDiff += match.score[1] - match.score[0];
                }
            }
    
            await leagues.updateOne({ _id: league._id }, {
                $set: {
                    teams: leagueTeams,
                    schedule: schedule,
                    matches: matches
                }
            });
    
            let desc = `Each team plays ${leagueTeams.length == 4 ? bold(`3`) : bold(`4`)} matches.\nTop ${leagueTeams.length > 5 ? bold(`4`) : bold(`2`)} qualify for playoffs!\nPlayoffs will be played ${dateConversion(league.stages.playoffs)}`;
            let standings = ``;
            let matchups = ``;
            let c = 1;
    
            leagueTeams = leagueTeams.sort(function (a, b) {
                if (b.record.wins == a.record.wins) {
                    if (b.record.losses == a.record.losses) {
                        return b.mapDiff - a.mapDiff;
                    }
    
                    return a.record.losses - b.record.losses;
                }
    
                return b.record.wins - a.record.wins;
            });
    
            leagueTeams.forEach(team => {
                let played = team.record.wins + team.record.losses;
                standings += `${c}. ${team.name} - ${played} | ${team.record.wins} | ${team.record.losses} | ${team.mapDiff} | ${bold(`${team.record.wins * 3}`)}\n`;

                let qualify = leagueTeams.length > 5 ? 4 : 2;
                if (c == qualify) standings += `----------\n`;

                c += 1;
            });
    
            for (let i=0; i<schedule.groups.length; i++) {
                let roundSchedule = schedule.groups[i];
                matchups += `\n${italic(`Round ${i + 1}`)}:\n`;
                
                for (let j=0; j<roundSchedule.length; j++) {
                    let currentMatch = roundSchedule[j];
    
                    let homeTeam = currentMatch.home.name;
                    let awayTeam = currentMatch.away.name;
                    
                    if (!currentMatch.score) {
                        matchups += `${homeTeam} vs ${awayTeam}\n`;
                    } else {
                        let homeScore = currentMatch.score[0];
                        let awayScore = currentMatch.score[1];
    
                        homeScore = homeScore == 4 ? bold(`4`) : `${homeScore}`;
                        awayScore = awayScore == 4 ? bold(`4`) : `${awayScore}`;
    
                        matchups += `${homeTeam} ${homeScore} | ${awayScore} ${awayTeam}\n`;
                    }
                }
            }
    
            const groupsEmbed = new EmbedBuilder()
                    .setTitle(`${league.name} Group Stage (Day 1)`)
                    .setDescription(desc)
                    .addFields(
                        {
                            name: `Standings:`,
                            value: `${bold(`Team ~ P ~ W ~ L ~ DIFF ~ PTS`)}\n${standings}`
                        },
                        {
                            name: `Matchups:`,
                            value: matchups
                        }
                    );
            
            const fetchedGroups = await leagueChannel.messages.fetch(league.interactions.groups);
    
            await fetchedGroups.edit({
                content: `Matches are :red_circle: LIVE!`,
                embeds: [groupsEmbed]
            });
    
            // If Group round over start next round
            // If Groups over start Playoffs at the start time
            if (tournament.stage != 'Playoffs') {
                let currentRound = schedule.groups[tournament.round];
                let roundOngoing = false;
    
                for (let i=0; i<currentRound.length; i++) {
                    if (currentRound[i].score == undefined) {
                        roundOngoing = true;
                        break; 
                    }
                }
    
                if (!roundOngoing) {
                    if (tournament.round != schedule.groups.length - 1) {
                        await startNextRound('Groups', tournament.round + 1);
                    } else {
                        let teamsQualified = `Qualified for ${bold(`Playoffs`)}:\n`;
    
                        teamsQualified += leagueTeams.length > 5 ? `${leagueTeams[0].name} - ${leagueTeams[1].name} - ${leagueTeams[2].name} - ${leagueTeams[3].name}` : `${leagueTeams[0].name} - ${leagueTeams[1].name}`;
    
                        groupsEmbed.setDescription(`${bold(`Group Stage`)} Completed!\n${teamsQualified}`);
    
                        await fetchedGroups.edit({
                            content: `  `,
                            embeds: [groupsEmbed]
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
                    }
                } 
            }

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
                        module.exports.handleLobby(homeTeamPlayers[0], awayTeamPlayers[0], [league.guildId], client, undefined, newTournamentMatch);
                    } else {
                        let matchTeams = {
                            teamA: homeTeamPlayers,
                            teamB: awayTeamPlayers
                        };
    
                        module.exports.handleLobby(undefined, undefined, [league.guildId], client, matchTeams, newTournamentMatch);
                    }

                    await new Promise(resolve => setTimeout(resolve, delay));
    
                    delay += 1000;
                }
            }
        }
    }
};