const { EmbedBuilder, inlineCode, bold } = require('discord.js');

const { getAwaitingDuel, removeAwaitingDuel, updateAwaitingDuel } = require(`../osu/activeData`);
const { handleLobby } = require(`../osu/autoMatches`);

const osuUser = require(`../../schemas/osuUser`);

module.exports = {
    async duelReply(interaction, discordUser, awaitingUser, client) {
        let inter = interaction;
        let declineTimer;
        let checkTimer;

        let i = 0;

        function resetDeclineTimer() { 
            resetCheckTimer();
            clearTimeout(declineTimer);
            declineTimer = setTimeout(autoDecline, 120000);
        }

        function resetCheckTimer() { 
            clearTimeout(checkTimer);
            checkTimer = setTimeout(checkResponse, 100);
        }

        async function autoDecline() { 
            await removeAwaitingDuel(discordUser.id, awaitingUser.id);

            clearTimeout(checkTimer);
            clearTimeout(declineTimer);
            console.log("2 min passed, declining...");
            return await inter.editReply({
                content: `<@${awaitingUser.id}> has failed to accept <@${discordUser.id}> 's duel.`,
                embeds: [],
                components: []
            });
        }

        async function checkResponse() {
            let res = await getAwaitingDuel(discordUser.id);
            i++;

            if (!res.includes(" ")) return resetCheckTimer();

            clearTimeout(checkTimer);
            clearTimeout(declineTimer);
            await removeAwaitingDuel(discordUser.id, awaitingUser.id);

            if (res.split(" ")[1] == "true") {
                //accept
                let osuUserProfile = await osuUser.findOne({ discordId: discordUser.id });
                let osuAwaitingUserProfile = await osuUser.findOne({ discordId: awaitingUser.id });

                // Pass interaction here for the live discord match updates
                handleLobby(osuUserProfile.osuUserName, osuAwaitingUserProfile.osuUserName, interaction, client);

                return await inter.editReply({
                    content: `<@${discordUser.id}> - <@${awaitingUser.id}> Has accepted your duel!\nInvites are being sent.`,
                    embeds: [],
                    components: []
                });
            } else {
                //decline
                return await inter.editReply({
                    content: `<@${discordUser.id}> - <@${awaitingUser.id}> Has declined your duel.`,
                    embeds: [],
                    components: []
                });
            }
        }

        resetDeclineTimer();
    },

    async duelAccept(discordUser, awaitingUser) {
        let update = await updateAwaitingDuel(awaitingUser.id, discordUser.id, true);

        if (!update) return {
            content: `This duel does not exist, please make sure to input the correct user.`,
            ephemeral: true
        };

        return {
            content: `You have accepted the duel with [${awaitingUser.tag}]`,
            ephemeral: true
        };
    },

    async duelDecline(discordUser, awaitingUser) {
        let update = await updateAwaitingDuel(awaitingUser.id, discordUser.id, false);

        if (!update) return {
            content: `This duel does not exist, please make sure to input the correct user.`,
            ephemeral: true
        };

        return {
            content: `You have declined the duel with [${awaitingUser.tag}]`,
            ephemeral: true
        };
    }
};