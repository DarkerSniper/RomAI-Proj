const { EmbedBuilder, inlineCode, bold, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } = require("discord.js");
const osuUser = require("../../schemas/osuUser");
const { handleLobby } = require("../osu/autoMatches");
const { dateConversion } = require("../osu/formatNum");
const { getGames, getMatchLimitation } = require("../osu/activeData");
const mapPool = require("../../schemas/mapPool");
const privateMapPool = require("../../schemas/privateMapPool");

module.exports = {
    async duosRequest(interaction, client, discordUser, reqUsers, selectedPool, customBO) {
        let osuUserProfile = await osuUser.findOne({ discordId: discordUser.id });
        let reqUserProfiles = [];

        if (!osuUserProfile) return await interaction.editReply({
            content: `Please link your osu! account using ${inlineCode("/authosu")}`,
            ephemeral: true
        });

        let acceptId = `accept-${discordUser.id}`;
        let declineId = `decline-${discordUser.id}`;
        let embedText = ``;
        let responseText = ``;
        let filterIds = [];
        let checkDupe = [];

        console.log(reqUsers);

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

            // Match limitation
            if (await getMatchLimitation(reqUserId)) return await interaction.editReply({
                content: `<@${reqUserId}> is already in a match!`
            });

            reqUserProfiles.push(userProfile);
            acceptId += `-${reqUserId}`;
            declineId += `-${reqUserId}`;
            embedText += ` ${user.username}`;
            responseText += `<@${reqUserId}> `;
        }

        let midGame = await getGames();

        if (midGame.length == 4) {
            return await interaction.editReply({
                content: `There are currently too many matches being played. Please wait for one of them to finish and try again!`
            });
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

        let poolInfo = await mapPool.findOne({ name: selectedPool });
        if (selectedPool && !poolInfo) poolInfo = await privateMapPool.findOne({ name: selectedPool });
        let selectedPoolText = !selectedPool ? `` : `The inviter has set a pool for this match: ${poolInfo.name} (${poolInfo.elo})\n`;

        const duosEmbed = new EmbedBuilder()
            .setDescription(`${selectedPoolText} ${discordUser.username} Has invited${embedText} to a Duos match!\nTeam A: <@${discordUser.id}> <@${reqUsers[0].id}>\nTeam B: <@${reqUsers[1].id}> <@${reqUsers[2].id}>\nThe invite will expire ${dateConversion(Date.now() + 120000)}`)
            .addFields({
                name: `${discordUser.username} Status:`,
                value: `✅ Inviter`,
            });

        for (let i=0; i<reqUsers.length; i++) {
            let user = reqUsers[i];

            duosEmbed.addFields({
                name: `${user.username} Status:`,
                value: `❌ Not Ready`
            });

            filterIds.push(user.id);
        }

        const response = await interaction.editReply({
            content: `  `,
            embeds: [duosEmbed],
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

                duosEmbed.data.fields[indexId + 1].value = `✅ Ready`;

                await interaction.editReply({
                    content: `${responseText} <- Waiting for a response`,
                    embeds: [duosEmbed],
                    components: [buttonRow]
                });

                filterIds[indexId] = 'done';
    
                if (filterIds.every(id => id == 'done')) {
                    done = true;

                    await followUp.delete();

                    await interaction.editReply({
                        content: `${responseText} your match will start soon!\nInvites are being sent.\n${inlineCode(`Map pool will appear here after being chosen`)}`,
                        embeds: [],
                        components: []
                    });

                    let teams = {
                        teamA: [osuUserProfile.osuUserName, reqUserProfiles[0].osuUserName],
                        teamB: [reqUserProfiles[1].osuUserName, reqUserProfiles[2].osuUserName]
                    };

                    handleLobby(undefined, undefined, interaction, client, teams, undefined, selectedPool, customBO); 
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
                content: `${failedText} failed to accept the Duos match.`,
                embeds: [],
                components: []
            });
        })
    }
};