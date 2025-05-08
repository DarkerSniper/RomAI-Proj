const { EmbedBuilder, inlineCode, bold, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType, italic } = require("discord.js");
const mongoose = require('mongoose');
//const profanity = require('profane-words');

const leagues = require(`../../schemas/leagues`);
const guilds = require(`../../schemas/guild`);
const osuUser = require(`../../schemas/osuUser`);

const { handleLeague } = require(`../osu/leaguesHandler`);
const { dateConversion } = require("../osu/formatNum");
const { startNextRound } = require("../osu/startNextRound");

module.exports = {
    async checkWeekendLeague(client) {
        let latestWeekendLeagues = await leagues.find().sort({ _id: -1 });

        console.log(`Checking Weekend Leagues...`);
    
        if (latestWeekendLeagues.length != 0) {
            let closestWeekendLeague = latestWeekendLeagues[0];

            console.log(`Found most recent Weekend League: ${closestWeekendLeague.name}`);
    
            let groupsDate = closestWeekendLeague.stages.groups;
            let playoffDate = closestWeekendLeague.stages.playoffs;
    
            var eta_ms = playoffDate.getTime() - Date.now();

            console.log(`Checking ${closestWeekendLeague.name} date...`);

            if (eta_ms < 0) {
                // Create new Weekend League
                console.log(`${closestWeekendLeague.name} has expired.`);
            } else {
                console.log(`Starting countdown for: ${closestWeekendLeague.name}`);
                if (groupsDate.getTime() - Date.now() > 0) {
                    console.log(`- Group Stage`);
                    setTimeout(function() {
                        handleLeague(closestWeekendLeague._id, client);
                    }, groupsDate.getTime() - Date.now());
                } else {
                    // else start Playoffs where it left off
                    console.log(`- Playoffs`);

                    setTimeout(function() {
                        startNextRound(closestWeekendLeague, 'Playoffs', 0, client);
                    }, playoffDate.getTime() - Date.now());
                }
            }
        } else {
            console.log(`Weekend League not found.`);
        }
    },
    async createWeekendLeagueCycle(interaction, client, guildId, leagueName, mode, groupsDate, playoffsDate, eloRanges) {
        /*
            eloRanges = {
                min: Number,
                max: Number
            }
        */

        let guildInfo = await guilds.findOne({ guildId: guildId });

        if (!guildInfo) return await interaction.editReply({
            content: `This guild is not yet connected to the AI\nPlease setup your guild by using: ${inlineCode("/setguild")}`
        });

        let leagueInfo = await leagues.findOne({ name: leagueName });

        if (leagueInfo) return await interaction.editReply({
            content: `There's a tournament with this name already!`
        });

        let tourneyChannel = client.channels.cache.get(guildInfo.setup.tournamentChannel);

        console.log(`tourneyChannel: ${tourneyChannel.id}`);

        const minString = eloRanges ? (eloRanges.min ? `Minimum ELO for this tournament: ${eloRanges.min}` : ``) : ``;
        const maxString = eloRanges ? (eloRanges.max ? `Maximum ELO for this tournament: ${eloRanges.max}` : ``) : ``;

        let registrationMessage = await tourneyChannel.send({
            content: `${bold(leagueName)} - Registrations are now open!\nGamemode: ${bold(`${mode}v${mode}`)}\n\nRegistrations will close ${dateConversion(groupsDate)}\n${minString}\n${maxString}`
        });

        leagueInfo = await new leagues({
            _id: new mongoose.Types.ObjectId(),
            name: leagueName,
            guildId: interaction.guild.id,
            mode: mode, // '1' or '2' or '3' (1v1, 2v2, 3v3)
            eloRange: eloRanges,
            stages: {
                groups: groupsDate,
                playoffs: playoffsDate
            },
            interactions : {
                channel: tourneyChannel,
                registration: `${registrationMessage.id}`
            }
        });

        await leagueInfo.save().catch(console.error);
        await interaction.editReply({
            content: `${leagueInfo.name} has been created!\nRegistrations are now available and will close ${dateConversion(leagueInfo.stages.groups)}.`
        });
        console.log(leagueInfo);

        console.log(leagueInfo.stages.groups.getTime() - Date.now());

        setTimeout(function() {
            handleLeague(leagueInfo._id, client);
        }, leagueInfo.stages.groups.getTime() - Date.now());
    },

    async weekendLeagueRegister(interaction, client, teamName, teammates) {
        let discordUser = interaction.user;
        let osuUserProfile = await osuUser.findOne({ discordId: discordUser.id });
        let reqUserProfiles = [];

        if (!osuUserProfile) return await interaction.editReply({
            content: `Please link your osu! account using ${inlineCode("/authosu")}`,
            ephemeral: true
        });

        let latestWeekendLeagues = await leagues.find().sort({ _id: -1 });
        
        if (!latestWeekendLeagues || latestWeekendLeagues[0].stages.groups.getTime() - Date.now() < 0) return await interaction.editReply({
            content: `There aren't any available tournaments.`
        });

        if (teammates && latestWeekendLeagues[0].mode != teammates.length + 1) return await interaction.editReply({
            content: `This tournament is ${latestWeekendLeagues[0].mode}v${latestWeekendLeagues[0].mode}, the team you submitted has ${teammates.length + 1} players.`
        });

        if (!teammates && latestWeekendLeagues[0].mode != 1) return await interaction.editReply({
            content: `Please choose teammates for this tournament! (${latestWeekendLeagues[0].mode}v${latestWeekendLeagues[0].mode})`
        });

        if (latestWeekendLeagues[0].eloRange.min && osuUserProfile.elo[`${latestWeekendLeagues[0].mode}v${latestWeekendLeagues[0].mode}`] < latestWeekendLeagues[0].eloRange.min) return await interaction.editReply({
            content: `Your ELO is below the required level for this tournament.`
        });

        if (latestWeekendLeagues[0].eloRange.max && osuUserProfile.elo[`${latestWeekendLeagues[0].mode}v${latestWeekendLeagues[0].mode}`] > latestWeekendLeagues[0].eloRange.max) return await interaction.editReply({
            content: `Your ELO is above the required level for this tournament.`
        });

        let alreadyRegistered = false;
        let playersCheck = [osuUserProfile.osuUserName];

        const leagueChannel = client.channels.cache.get(latestWeekendLeagues[0].interactions.channel);
        const fetchRegistration = await leagueChannel.messages.fetch(latestWeekendLeagues[0].interactions.registration);

        // Check if team name is taken!
        if (latestWeekendLeagues[0].teams.find((t) => t.name == teamName)) return await interaction.editReply({
            content: `The team name you have submitted is taken.`
        });

        if (!teammates) {
            for (let i=0; i<latestWeekendLeagues[0].teams.length; i++) {
                let team = latestWeekendLeagues[0].teams[i];
    
                if (team.players.includes(osuUserProfile.osuUserName)) {
                    alreadyRegistered = true;
                } 
            }

            if (alreadyRegistered) return await interaction.editReply({
                content: `You are already in this tournament.`
            });

            teamName = osuUserProfile.osuUserName;

            await interaction.editReply({
                content: `${bold(teamName)} - has joined ${latestWeekendLeagues[0].name}.`,
            });

            let league = latestWeekendLeagues[0];
            let leagueTeams = league.teams;

            let teamPlayers = [osuUserProfile.osuUserName];

            leagueTeams.push({
                players: teamPlayers,
                name: teamName,
                mapDiff: 0,
                record: {
                    wins: 0,
                    losses: 0
                }
            });

            await leagues.updateOne({ _id: league._id }, {
                $set: {
                    teams: leagueTeams
                }
            });

            console.log(`${teamName} Joined ${league.name}.\n\n${leagueTeams}`);

            const eloRanges = league.eloRange;

            const minString = eloRanges ? (eloRanges.min ? `Minimum ELO for this tournament: ${eloRanges.min}` : ``) : ``;
            const maxString = eloRanges ? (eloRanges.max ? `Maximum ELO for this tournament: ${eloRanges.max}` : ``) : ``;

            await fetchRegistration.edit({
                content: `${bold(league.name)} - Registrations are now open!\nGamemode: ${bold(`${league.mode}v${league.mode}`)}\n\nTeams Registered: ${bold(`${leagueTeams.length}`)}/8\nRegistrations will close ${dateConversion(league.stages.groups)}\n${minString}\n${maxString}`
            });

            return;
        }

        /*
        const normalizedTeamName = teamName.toLowerCase();

        // Check if any profane words are found
        const hasProfanity = profanity.some((word) => normalizedTeamName.includes(word));

        if (hasProfanity == true) return await interaction.editReply({
            content: `Please use a team name that's more... chill`
        });
        */

        let acceptId = `accept-team-${discordUser.id}`;
        let declineId = `decline-team-${discordUser.id}`;
        let embedText = ``;
        let responseText = `<@${discordUser.id}>`;
        let filterIds = [];
        let checkDupe = [];

        console.log(teammates);

        for (let i=0; i<teammates.length; i++) {
            let user = teammates[i];
            let reqUserId = user.id;
            checkDupe.push(reqUserId);

            if (reqUserId == discordUser.id) return await interaction.editReply({
                content: `You can't use this command with yourself.`,
                ephemeral: true
            });

            if (user.bot) return await interaction.editReply({
                content: `You cannot use this command with applications.`,
                ephemeral: true
            });

            if (checkDupe.includes(user.id) && checkDupe.indexOf(user.id) != i) return await interaction.editReply({
                content: `You cannot have duplicate users.`,
                ephemeral: true
            });

            let userProfile = await osuUser.findOne({ discordId: reqUserId });

            if (!userProfile) return await interaction.editReply({
                content: `<@${reqUserId}> does not have a linked account. (${inlineCode("/authosu")})`,
                ephemeral: true
            });

            if (latestWeekendLeagues[0].eloRange.min && userProfile.elo[`${latestWeekendLeagues[0].mode}v${latestWeekendLeagues[0].mode}`] < latestWeekendLeagues[0].eloRange.min) return await interaction.editReply({
                content: `<@${reqUserId}> ELO is below the required level for this tournament.`
            });
    
            if (latestWeekendLeagues[0].eloRange.max && userProfile.elo[`${latestWeekendLeagues[0].mode}v${latestWeekendLeagues[0].mode}`] > latestWeekendLeagues[0].eloRange.max) return await interaction.editReply({
                content: `<@${reqUserId}> ELO is above the required level for this tournament.`
            });

            playersCheck.push(userProfile.osuUserName);
            reqUserProfiles.push(userProfile);
            acceptId += `-${reqUserId}`;
            declineId += `-${reqUserId}`;
            embedText += ` ${user.username}`;
            responseText += `<@${reqUserId}> `;
            filterIds.push(reqUserId);
        }

        let playerRegistered = undefined;

        for (let i=0; i<latestWeekendLeagues[0].teams.length; i++) {
            let team = latestWeekendLeagues[0].teams[i];

            playersCheck.some(item => {
                if (team.players.includes(item)) {
                    playerRegistered = item;
                }
            });
        }

        if (playerRegistered) return await interaction.editReply({
            content: `${playerRegistered} is already in this tournament.`
        });

        const acceptButton = new ButtonBuilder()
            .setLabel('✅ Join Team')
            .setStyle(ButtonStyle.Success)
            .setCustomId(acceptId)

        const declineButton = new ButtonBuilder()
            .setLabel('❌ Decline Invitation')
            .setStyle(ButtonStyle.Danger)
            .setCustomId(declineId)

        const buttonRow = new ActionRowBuilder().addComponents(acceptButton, declineButton);

        const teamEmbed = new EmbedBuilder()
            .setDescription(`${discordUser.username} Has invited${embedText} to compete in ${bold(latestWeekendLeagues[0].name)} as ${bold(teamName)}!\n\nThe invite will expire ${dateConversion(Date.now() + 120000)}`)
            .addFields({
                name: `${discordUser.username} Status:`,
                value: `✅ Inviter`,
            });

        for (let i=0; i<teammates.length; i++) {
            let user = teammates[i];

            teamEmbed.addFields({
                name: `${user.username} Status:`,
                value: `❌ Hasn't accepted`
            });
        }

        const response = await interaction.editReply({
            content: `${responseText} <- Waiting for a response`,
            embeds: [teamEmbed],
            components: [buttonRow]
        });

        const filter = (i) => filterIds.includes(i.user.id);

        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter,
            time: 120000,
        });

        collector.on('collect', async (inter) => {
            if (inter.customId == acceptId) {
                let indexId = filterIds.indexOf(inter.user.id);
                console.log(inter.user.username);

                teamEmbed.data.fields[indexId + 1].value = `✅ Accepted`;

                await interaction.editReply({
                    content: `${responseText} <- Waiting for a response`,
                    embeds: [teamEmbed],
                    components: [buttonRow]
                });

                filterIds.splice(indexId, 1);

                if (!filterIds || filterIds.length == 0) {
                    await interaction.editReply({
                        content: `${bold(teamName)} ( ${responseText} ) - have joined ${latestWeekendLeagues[0].name}.`,
                        embeds: [],
                        components: []
                    });

                    let league = await leagues.find().sort({ _id: -1 });
                    league = league[0];

                    let leagueTeams = league.teams;

                    let teamPlayers = [osuUserProfile.osuUserName];

                    reqUserProfiles.forEach(profile => {
                        teamPlayers.push(profile.osuUserName);
                    });

                    leagueTeams.push({
                        players: teamPlayers,
                        name: teamName,
                        mapDiff: 0,
                        record: {
                            wins: 0,
                            losses: 0
                        }
                    });

                    await leagues.updateOne({ _id: league._id }, {
                        $set: {
                            teams: leagueTeams
                        }
                    });

                    await fetchRegistration.edit({
                        content: `${bold(league.name)} - Registrations are now open!\nGamemode: ${bold(`${league.mode}v${league.mode}`)}\n\nTeams Registered: ${bold(`${leagueTeams.length}`)}/8\nRegistrations will close ${dateConversion(league.stages.groups)}`
                    });

                    return console.log(`${teamName} Joined ${league.name}.\n\n${leagueTeams}`);
                }
            }

            if (inter.customId == declineId) {
                await interaction.editReply({
                    content: `<@${inter.user.id}> has declined the team invite.`,
                    embeds: [],
                    components: []
                });

                filterIds = [];
                return;
            }

            await inter.deferUpdate();
        })

        collector.on('end', async () => {
            acceptButton.setDisabled(true);
            declineButton.setDisabled(true);

            if (!filterIds || filterIds.length == 0) return;

            let failedText = ``;

            for (let i=0; i<filterIds.length; i++) {
                failedText += `<@${filterIds[i]}> `
            }

            await interaction.editReply({
                content: `${failedText} failed to accept the team invite.`,
                embeds: [],
                components: []
            });
        })
    },

    async weekendLeagueLeave(interaction, client) {
        let discordUser = interaction.user;
        let osuUserProfile = await osuUser.findOne({ discordId: discordUser.id });

        if (!osuUserProfile) return await interaction.editReply({
            content: `Please link your osu! account using ${inlineCode("/authosu")}`,
            ephemeral: true
        });

        let latestWeekendLeagues = await leagues.find().sort({ _id: -1 });
        
        if (!latestWeekendLeagues || latestWeekendLeagues[0].stages.groups.getTime() - Date.now() < 0) return await interaction.editReply({
            content: `There aren't any available tournaments.`
        });

        const leagueChannel = client.channels.cache.get(latestWeekendLeagues[0].interactions.channel);
        const fetchRegistration = await leagueChannel.messages.fetch(latestWeekendLeagues[0].interactions.registration);

        let leagueTeams = latestWeekendLeagues[0].teams;

        let alreadyRegistered = false;
        let teamLeader = -1;

        for (let i=0; i<leagueTeams.length; i++) {
            let team = leagueTeams[i];
            let index = team.players.indexOf(osuUserProfile.osuUserName);

            if (index > -1) {
                alreadyRegistered = true;
                teamLeader = i;
            }
        }

        if (!alreadyRegistered) return await interaction.editReply({
            content: `You have yet to join ${bold(latestWeekendLeagues[0].name)}.`
        });

        if (teamLeader == -1) return await interaction.editReply({
            content: `Only the team captain can disband the team.`
        });

        leagueTeams.splice(teamLeader, 1);

        await leagues.updateOne({ _id: latestWeekendLeagues[0]._id }, {
            $set: {
                teams: leagueTeams
            }
        });

        let league = latestWeekendLeagues[0];

        await fetchRegistration.edit({
            content: `${bold(league.name)} - Registrations are now open!\nGamemode: ${bold(`${league.mode}v${league.mode}`)}\n\nTeams Registered: ${bold(`${leagueTeams.length}`)}/8\nRegistrations will close ${dateConversion(league.stages.groups)}`
        });

        return await interaction.editReply({
            content: `Your team has left ${latestWeekendLeagues[0].name}`
        });
    }
};