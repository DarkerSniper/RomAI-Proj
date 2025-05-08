const { EmbedBuilder, inlineCode, bold, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } = require(`discord.js`);

const { duelReply, duelAccept, duelDecline } = require(`../discord/duelInvite`);
const { saveAwaitingDuel, getGames, addMatchLimitation, getMatchLimitation } = require(`../osu/activeData`);

const osuUser = require(`../../schemas/osuUser`);
const { dateConversion } = require("../osu/formatNum");
const { handleLobby } = require("../osu/autoMatches");
const mapPool = require("../../schemas/mapPool");
const privateMapPool = require("../../schemas/privateMapPool");

module.exports = {
    async duelRequest(interaction, client, action, discordUser, awaitingUser, selectedPool, customBO) {
        try {
            if (!action) return await interaction.editReply({
                content: `You have to choose a valid option.`,
                ephemeral: true
            });

            if (discordUser.id == awaitingUser.id) return await interaction.editReply({
                content: `You can't use this command with yourself.`,
                ephemeral: true
            });

            if (awaitingUser.bot) return await interaction.editReply({
                content: `You cannot use this command with applications.`,
                ephemeral: true
            });

            let osuUserProfile = await osuUser.findOne({ discordId: discordUser.id });
            let osuAwaitingUserProfile = await osuUser.findOne({ discordId: awaitingUser.id });

            if (!osuUserProfile) return await interaction.editReply({
                content: `Please link your osu! account using ${inlineCode("/authosu")}`,
                ephemeral: true
            });
            
            if (!osuAwaitingUserProfile) return await interaction.editReply({
                content: `The user you have chosen does not have a linked account. (${inlineCode("/authosu")})`,
                ephemeral: true
            });

            let reply;
            let discordUserTag = discordUser.tag;

            let midGame = await getGames();

            action = action.toLowerCase();

            switch (action) {
                case "invite":
                    if (midGame.length == 4) {
                        reply = {
                            content: `There are currently too many matches being played. Please wait for one of them to finish and try again!`
                        };
                        break;
                    }

                    if (await getMatchLimitation(discordUser.id)) {
                        return await interaction.editReply({
                            content: `You are already in a match!`
                        });
                    }

                    if (await getMatchLimitation(awaitingUser.id)) {
                        return await interaction.editReply({
                            content: `<@${awaitingUser.id}> is already in a match!`
                        });
                    }

                    let acceptId = `accept-${discordUser.id}-${awaitingUser.id}`;
                    let declineId = `decline-${discordUser.id}-${awaitingUser.id}`;

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

                    const duelEmbed = new EmbedBuilder()
                        .setTitle(`${selectedPoolText} ${discordUser.username} Has invited ${awaitingUser.username} to a duel!`)
                        .setDescription(`The invite will expire ${dateConversion(Date.now() + 120000)}\nUse the buttons to interact!`);

                    const response = await interaction.editReply({
                        content: `  `,
                        embeds: [duelEmbed],
                        components: [buttonRow]
                    });

                    let followUp = await interaction.followUp({
                        content: `<@${awaitingUser.id}> <- Waiting for a response`
                    });

                    const filter = (i) => i.user.id == awaitingUser.id;

                    const collector = response.createMessageComponentCollector({
                        componentType: ComponentType.Button,
                        filter,
                        time: 120000,
                    });

                    let answered = false;

                    collector.on('collect', async (inter) => {
                        if (inter.customId == acceptId) {
                            answered = true;

                            acceptButton.setDisabled(true);
                            declineButton.setDisabled(true);

                            await followUp.delete();

                            midGame = await getGames();

                            if (midGame.length == 4) {
                                return await interaction.editReply({
                                    content: `There are currently too many matches being played. Please wait for one of them to finish and try again!`
                                });
                            }

                            if (await getMatchLimitation(discordUser.id)) {
                                return await interaction.editReply({
                                    content: `You are already in a match!`
                                });
                            }

                            if (await getMatchLimitation(awaitingUser.id)) {
                                return await interaction.editReply({
                                    content: `One of the selected users are already in a match!`
                                });
                            }

                            handleLobby(osuUserProfile.osuUserName, osuAwaitingUserProfile.osuUserName, interaction, client, undefined, undefined, selectedPool, customBO);

                            await interaction.editReply({
                                content: `<@${osuAwaitingUserProfile.discordId}> has accepted the duel.\nInvites are being sent...\n${inlineCode(`Map pool will appear here after being chosen`)}`,
                                embeds: [],
                                components: []
                            });
                        }

                        if (inter.customId == declineId) {
                            answered = true;
                            acceptButton.setDisabled(true);
                            declineButton.setDisabled(true);

                            await followUp.delete();

                            await interaction.editReply({
                                content: `<@${osuAwaitingUserProfile.discordId}> has declined the duel.`,
                                embeds: [],
                                components: []
                            });
                        }
                    });

                    collector.on('end', async () => {
                        if (answered) return;
                        
                        acceptButton.setDisabled(true);
                        declineButton.setDisabled(true);

                        await followUp.delete();

                        await interaction.editReply({
                            content: `<@${osuAwaitingUserProfile.discordId}> has failed to accept the duel.`,
                            embeds: [],
                            components: []
                        });
                    });
                    break;
                case "accept":
                    if (midGame.length == 4) {
                        reply = {
                            content: `There are currently too many matches being played. Please wait for one of them to finish and try again!`
                        };
                        break;
                    }
                    reply = await duelAccept(discordUser, awaitingUser);
                    break;
                case "decline":
                    reply = await duelDecline(discordUser, awaitingUser);
                    break;
            }

            if (!reply) return;

            return await interaction.editReply(reply);
        } catch (error) {
            console.log(error);
        }
    }
}