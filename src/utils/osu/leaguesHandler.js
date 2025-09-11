const { EmbedBuilder, hyperlink, bold, inlineCode, italic } = require('discord.js');

const leagues = require(`../../schemas/leagues`);
const osuUser = require('../../schemas/osuUser');
const guilds = require(`../../schemas/guild`);

const { swissSystem, singleElimBracket, roundRobin } = require(`../osu/tournamentFormats`);
const { dateConversion } = require(`../osu/formatNum`);
const { inventoryAddPack } = require('../discord/invAddPack');
const { addCurrecny } = require('../discord/currency');

const { startNextRound } = require(`./startNextRound`);


module.exports = {
    async handleLeague(leagueId, client) {
        var league = await leagues.findOne({ _id: leagueId });
        var teams = league.teams;
        var leagueInter = league.interactions;
        var leagueSchedule = league.schedule;

        let channel = client.channels.cache.get(leagueInter.channel);

        if (teams.length < 4) {
            channel.send({
                content: `${league.name} has been canceled. (Not enough teams)`
            });

            // Create next Weekend League
            return;
        }

        // First in Last out (Just don't let people join when 8 teams are in)
        while (teams.length > 8) teams.splice(teams.length - 1, 1);

        let groupsDate = league.stages.groups;
        let groupMessage = await channel.send({
            content: `${league.name} starts in ${dateConversion(new Date().getTime() + 30000)}`
        });

        leagueInter.groups = groupMessage.id;

        console.log(`Getting Matches...`)

        // groupSchedule = Depth 1: Rounds, Depth 2: Matches
        let robinFormat = await roundRobin(teams);

        while (!robinFormat) robinFormat = await roundRobin(teams);

        leagueSchedule.groups = robinFormat;

        console.log(`matches:\n${leagueSchedule.groups}`);

        await leagues.updateOne({ _id: leagueId }, {
            $set: {
                interactions: leagueInter,
                schedule: leagueSchedule
            }
        });

        let desc = `Each team plays ${teams.length == 4 ? bold(`3`) : bold(`4`)} matches.\nTop ${teams.length > 5 ? bold(`4`) : bold(`2`)} qualify for playoffs!\nPlayoffs will be played ${dateConversion(league.stages.playoffs)}`;
        let standings = ``;
        let matchups = ``;
        let c = 1;

        teams.forEach(team => {
            standings += `${c}. ${team.name} - 0 | 0 | 0 | 0 | ${bold(`0`)}\n`;
            c += 1;
        });

        for (let i=0; i<leagueSchedule.groups.length; i++) {
            let roundSchedule = leagueSchedule.groups[i];
            matchups += `\n${italic(`Round ${i + 1}`)}:\n`;
            
            for (let j=0; j<roundSchedule.length; j++) {
                let match = roundSchedule[j];

                let homeTeam = match.home.name;
                let awayTeam = match.away.name;

                matchups += `${homeTeam} vs ${awayTeam}\n`;
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

        await groupMessage.edit({
            content: `Matches are :red_circle: LIVE!`,
            embeds: [groupsEmbed]
        });

        const fetchRegistration = await channel.messages.fetch(leagueInter.registration);

        await fetchRegistration.edit({
            content: `${bold(league.name)} - Registrations are closed!\nGamemode: ${bold(`${league.mode}v${league.mode}`)}\n\nTeams Registered: ${bold(`${league.teams.length}`)}/8`
        });

        setTimeout(async function() {
            // Start Round robin
            // Create Weekend League standings picture
            
            await startNextRound(league, 'Groups', 0, client);
        }, 30000);
    }
};