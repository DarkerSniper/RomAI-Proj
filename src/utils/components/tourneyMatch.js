const { randomUUID } = require('crypto');
const { EmbedBuilder, inlineCode, bold, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } = require("discord.js");
const osuUser = require("../../schemas/osuUser");
const { handleLobby } = require("../osu/autoMatches");
const { dateConversion } = require("../osu/formatNum");
const { getGames, getMatchLimitation } = require("../osu/activeData");

const mapPool = require("../../schemas/mapPool");
const privateMapPool = require("../../schemas/privateMapPool");

module.exports = {
    async tourneyRequest(interaction, client, discordUser, reqUsers, selectedPool, customBO, tournament, gameMode) {
        // gameMode -> '1v1' | '2v2' | '3v3' | '4v4'
        try {
            const teamName1 = tournament.teams[0].name;
            const teamName2 = tournament.teams[1].name;

            let osuUserProfile = await osuUser.findOne({ discordId: discordUser.id });
            let reqUserProfiles = [];
    
            if (!osuUserProfile) return await interaction.editReply({
                content: `Please link your osu! account using ${inlineCode("/authosu")}`,
            });
    
            let acceptId = `accept-tourney-${discordUser.id}`;
            let declineId = `decline-tourney-${discordUser.id}`;
            let embedText = ``;
            let responseText = ``;
            let team1Text = ``;
            let team2Text = ``;
            let filterIds = [];
            let checkDupe = [];
    
            console.log(reqUsers);

            if (reqUsers.length != parseInt(gameMode.charAt(0)) * 2) return await interaction.editReply({
                content: `Please make sure to assign the correct amount of players.`
            });

            // Invitor user match limitation
            if (await getMatchLimitation(discordUser.id)) {
                return await interaction.editReply({
                    content: `You are already in a match!`
                });
            }
    
            for (let i=0; i<reqUsers.length; i++) {
                let user = reqUsers[i];
                let reqUserId = user.id;
                checkDupe.push(reqUserId);
    
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
                });

                // Match limitation
                if (await getMatchLimitation(reqUserId)) return await interaction.editReply({
                    content: `<@${reqUserId}> is already in a match!`
                });
    
                reqUserProfiles.push(userProfile);
                acceptId += `-${parseInt(parseInt(reqUserId)/ 1000000000000)}`;
                declineId += `-${parseInt(parseInt(reqUserId)/ 1000000000000)}`;
                embedText += ` ${user.username}`;
                responseText += `<@${reqUserId}> `;

                if (i < parseInt(gameMode.charAt(0))) {
                    team1Text += `<@${reqUserId}> `;
                } else {
                    team2Text += `<@${reqUserId}>`;
                }
            }
    
            const acceptButton = new ButtonBuilder()
                .setLabel('✅ Accept')
                .setStyle(ButtonStyle.Success)
                .setCustomId(acceptId)
    
            const declineButton = new ButtonBuilder()
                .setLabel('❌ Decline')
                .setStyle(ButtonStyle.Danger)
                .setCustomId(declineId)
    
            const buttonRow = new ActionRowBuilder().addComponents(acceptButton, declineButton);
    
            var poolInfo = await mapPool.findOne({ name: selectedPool });
            if (selectedPool && !poolInfo) poolInfo = await privateMapPool.findOne({ name: selectedPool });
            let selectedPoolText = !selectedPool ? `` : `The pool for this ${gameMode} ${tournament.name} - ${tournament.stage} match: ${poolInfo.name} (${poolInfo.elo})\n`;

            const tourneyEmbed = new EmbedBuilder()
                .setDescription(`${selectedPoolText} ${discordUser.username} Has invited${embedText} to a tournament match!\n${teamName1}: ${team1Text}\n${teamName2}: ${team2Text}\nThe invite will expire ${dateConversion(Date.now() + 120000)}`)
                .addFields({
                    name: `${discordUser.username} Status:`,
                    value: `✅ Inviter`,
                });
    
            for (let i=0; i<reqUsers.length; i++) {
                let user = reqUsers[i];
    
                tourneyEmbed.addFields({
                    name: `${user.username} Status:`,
                    value: `❌ Not Ready`
                });

                filterIds.push(user.id);
            }
    
            const response = await interaction.editReply({
                content: `  `,
                embeds: [tourneyEmbed],
                components: [buttonRow]
            });

            let followUp = await interaction.followUp({
                content: `${responseText} <- Waiting for a response`
            });
    
            const filter = (i) => filterIds.includes(i.user.id);
    
            const collector = response.createMessageComponentCollector({
                componentType: ComponentType.Button,
                filter,
                time: 120000,
            });

            let done = false;
    
            collector.on('collect', async (inter) => {
                if (inter.customId == acceptId) {
                    done = true;

                    // Match limitation check
                    if (await getMatchLimitation(discordUser.id)) return await interaction.editReply({
                        content: `You are already in a match!`
                    });

                    for (let i=0; i<reqUsers.length; i++) {
                        let reqId = reqUsers[i].id;

                        if (await getMatchLimitation(reqId)) return await interaction.editReply({
                            content: `<@${reqId}> is already in a match!`
                        });
                    }

                    let indexId = filterIds.findIndex(u => u == inter.user.id);
                    console.log(inter.user.username);
    
                    tourneyEmbed.data.fields[indexId + 1].value = `✅ Ready`;
    
                    await interaction.editReply({
                        content: `${responseText} <- Waiting for a response`,
                        embeds: [tourneyEmbed],
                        components: [buttonRow]
                    });
    
                    filterIds[indexId] = 'done';
    
                    if (filterIds.every(id => id == 'done')) {
                        await followUp.delete();

                        await interaction.editReply({
                            content: `${responseText} your match will start soon!\nInvites are being sent.\n${inlineCode(`Map pool will appear here`)}`,
                            embeds: [],
                            components: []
                        });
    
                        let teams = {
                            teamA: [],
                            teamB: []
                        };

                        for (let i=0; i<reqUsers.length; i++) {
                            let username = reqUserProfiles[i].osuUserName;

                            if (i < parseInt(gameMode.charAt(0))) {
                                teams.teamA.push(username);
                            } else {
                                teams.teamB.push(username);
                            }
                        }
    
                        let matchId = `romai_${Date.now()}_${randomUUID()}`;
                        let matchData = {
                            osuUser1: undefined,
                            osuUser2: undefined,
                            interaction: interaction,
                            client: client,
                            teams: teams,
                            tournament: tournament,
                            selectedPool: selectedPool,
                            customBO: customBO
                        };
    
                        //startSafeMatch(matchId, matchData);

                        handleLobby(teams.teamA.length === 1 ? teams.teamA[0] : undefined, teams.teamB.length === 1 ? teams.teamB[0] : undefined, interaction, client, teams, undefined, selectedPool, customBO); 
                    }
                }
    
                if (inter.customId == declineId) {
                    done = true;

                    await followUp.delete();

                    await interaction.editReply({
                        content: `<@${inter.user.id}> has declined the match.`,
                        embeds: [],
                        components: []
                    });
    
                    filterIds = [];
                }
    
                await inter.deferUpdate();
            })
    
            collector.on('end', async () => {
                if (done) return;

                acceptButton.setDisabled(true);
                declineButton.setDisabled(true);
    
                if (!filterIds || filterIds.length == 0) return;
    
                let failedText = ``;
    
                for (let i=0; i<filterIds.length; i++) {
                    if (filterIds[i] != 'done') failedText += `<@${filterIds[i]}> `;
                }

                await followUp.delete();
    
                await interaction.editReply({
                    content: `${failedText} failed to accept the Trios match.`,
                    embeds: [],
                    components: []
                });
            })
        } catch(error) {
            console.error(error);

            return await interaction.editReply({
                content: `There has been an error :(`
            });
        }
    }
};