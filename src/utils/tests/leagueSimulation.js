const { EmbedBuilder, hyperlink, bold, inlineCode, italic } = require('discord.js');

const { roundRobin } = require("../osu/tournamentFormats");
const { getRandomInt } = require('../osu/formatNum');

module.exports = {
    async simulateWeekendLeague(message, teamLimit) {
        console.log(`Started.`);
        var teams = [
            {
                name: `Team Z`,
                players: [`Player1`],
                mapDiff: 0,
                record: {
                    wins: 0,
                    losses: 0
                }
            },
            {
                name: `Team Y`,
                players: [`Player2`],
                mapDiff: 0,
                record: {
                    wins: 0,
                    losses: 0
                }
            },
            {
                name: `Team X`,
                players: [`Player3`],
                mapDiff: 0,
                record: {
                    wins: 0,
                    losses: 0
                }
            },
            {
                name: `Team W`,
                players: [`Player4`],
                mapDiff: 0,
                record: {
                    wins: 0,
                    losses: 0
                }
            },
            {
                name: `Team V`,
                players: [`Player5`],
                mapDiff: 0,
                record: {
                    wins: 0,
                    losses: 0
                }
            },
            {
                name: `Team U`,
                players: [`Player6`],
                mapDiff: 0,
                record: {
                    wins: 0,
                    losses: 0
                }
            },
            {
                name: `Team T`,
                players: [`Player7`],
                mapDiff: 0,
                record: {
                    wins: 0,
                    losses: 0
                }
            },
            {
                name: `Team S`,
                players: [`Player8`],
                mapDiff: 0,
                record: {
                    wins: 0,
                    losses: 0
                }
            }
        ];

        teams = teams.slice(0, teamLimit);

        var groupsSchedule = await roundRobin(teams);

        while (!groupsSchedule) {
            groupsSchedule = await roundRobin(teams);
        }

        let groupsEmbed = await getGroupEmbed();

        await message.reply({
            content: `Simulation Matches:`,
            embeds: [groupsEmbed]
        });

        let count = 0;

        // Simulate Rounds in 30 second delays
        for (let i=0; i<groupsSchedule.length; i++) {
            let round = groupsSchedule[i];
            console.log(`Simulating round ${i + 1}...`);

            for (let m=0; m<round.length; m++) {
                let winner = await getRandomInt(0, 1);

                let homeIndex = teams.findIndex((team) => team.name === groupsSchedule[i][m].home.name);
                let awayIndex = teams.findIndex((team) => team.name === groupsSchedule[i][m].away.name);

                if (winner === 0) {
                    groupsSchedule[i][m].score = [4, await getRandomInt(0, 3)];

                    teams[homeIndex].record.wins += 1;
                    teams[awayIndex].record.losses += 1;
                } else {
                    groupsSchedule[i][m].score = [await getRandomInt(0, 3), 4];

                    teams[homeIndex].record.losses += 1;
                    teams[awayIndex].record.wins += 1;
                }

                teams[homeIndex].mapDiff += groupsSchedule[i][m].score[0] - groupsSchedule[i][m].score[1];
                teams[awayIndex].mapDiff += groupsSchedule[i][m].score[1] - groupsSchedule[i][m].score[0];
            }

            count++;
        }

        let updatedEmbed = await getGroupEmbed();

        await message.reply({
            content: `Simulation count: ${count}`,
            embeds: [updatedEmbed]
        });

        console.log(`Finished Simulation.`);

        async function getGroupEmbed() {
            let desc = `Each team plays ${teams.length == 4 ? bold(`3`) : bold(`4`)} matches.\nTop ${teams.length > 5 ? bold(`4`) : bold(`2`)} qualify for playoffs!`;
            let standings = ``;
            let matchups = ``;
            let c = 1;

            let embedTeams = teams.sort(function (a, b) {
                if (b.record.wins == a.record.wins) {
                    if (b.record.losses == a.record.losses) {
                        return b.mapDiff - a.mapDiff;
                    }
    
                    return a.record.losses - b.record.losses;
                }
    
                return b.record.wins - a.record.wins;
            });

            embedTeams.forEach(team => {
                standings += `${c}. ${team.name} - ${team.record.wins + team.record.losses} | ${team.record.wins} | ${team.record.losses} | ${team.mapDiff} | ${bold(`${team.record.wins * 3}`)}\n`;

                let qualify = teams.length > 5 ? 4 : 2;
                if (c == qualify) standings += `----------\n`;
                c += 1;
                console.log(c);
            });

            for (let i=0; i<groupsSchedule.length; i++) {
                let roundSchedule = groupsSchedule[i];
                matchups += `\n${italic(`Round ${i + 1}`)}:\n`;
                
                for (let j=0; j<roundSchedule.length; j++) {
                    let match = roundSchedule[j];
    
                    let homeTeam = match.home.name;
                    let awayTeam = match.away.name;
    
                    if (!match.score) {
                        matchups += `${homeTeam} vs ${awayTeam}\n`;
                    } else {
                        let homeScore = match.score[0];
                        let awayScore = match.score[1];
    
                        homeScore = homeScore == 4 ? bold(`4`) : `${homeScore}`;
                        awayScore = awayScore == 4 ? bold(`4`) : `${awayScore}`;
    
                        matchups += `${homeTeam} ${homeScore} | ${awayScore} ${awayTeam}\n`;
                    }
                }
            }
    
            const groupsEmbed = new EmbedBuilder()
                    .setTitle(`Weekend League Simulation Group Stage (Day 1)`)
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
            
            return groupsEmbed;
        }
    }
};