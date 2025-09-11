const mongoose = require('mongoose');
const bancho = require('bancho.js');
const { LegacyClient, isOsuJSError } = require('osu-web.js');

const { ircUser, ircPassword, osuAPI } = process.env;

const legacy = new LegacyClient(osuAPI);

const osuUser = require('../../schemas/osuUser');

const { 
    authReset, authGetUserId, authGetRegion,
    authClearUser,
} = require(`../osu/activeData`);
const { saveLogData } = require('../tests/usageLog');
const { queue } = require(`../components/matchmaking`);

const irc = new bancho.BanchoClient({
    username: ircUser,
    password: ircPassword,
    apiKey: osuAPI,
    botAccount: true
});

const prefix = ".";
const otherPrefix = "!";

module.exports = {
    async startOsuBot() {     
        if (irc.isDisconnected()) {
            await irc.connect();
            console.log(`${irc.getSelf().ircUsername}-irc connected.`);
        } else {
            console.log(`Already connected.`);
            // await irc.connect().catch(err => console.log(err));
        }

        let idleTimer;

        function resetIdleTimer() { 
            clearTimeout(idleTimer);
            idleTimer = setTimeout(handleIdle, 120000);
        }

        async function handleIdle() { 
            console.log(`Idle for 2 minutes, clearing auth...`);
            await authReset();
        }

        async function getOsuUser(username) {
            try {
                let userinOsu = await legacy.getUser({
                    u: username,
                });

                return userinOsu;
            } catch (error) {
                console.log(error);
                return undefined;
            }
        }

        async function databaseLink(user ,verificationCode) {
            let discordUser = await authGetUserId(verificationCode);

            if (!discordUser) return "Incorrect verification code.";

            let osuUserProfile = await osuUser.findOne({ discordId: discordUser });
            let regionCode = await authGetRegion(discordUser);
            console.log(regionCode);
            let region;

            let osuUsername = user.ircUsername ? user.ircUsername : user.username;
            let userOsu = await getOsuUser(osuUsername);
            let osuUserId = userOsu.user_id;
            let osuUserCheck = await osuUser.findOne({ osuUserId: osuUserId });

            if (osuUserCheck && osuUserCheck.discordId != discordUser) return "This osu! user is already connected to another account.";

            if (regionCode[1].toString().toLowerCase() == userOsu.country.toLowerCase()) {
                region = regionCode[0];
            } else {
                region = 'no-region';
            }

            await authClearUser(discordUser);

            if (!osuUserProfile) {
                try {
                    osuUserProfile = await new osuUser({
                        _id: new mongoose.Types.ObjectId(),
                        osuUserId: osuUserId,
                        osuUserName: osuUsername,
                        discordId: discordUser,
                        ilRegion: region,
                    });
                    await osuUserProfile.save();

                    console.log(osuUserProfile);

                    saveLogData({
                        type: "newUser"
                    });
                    return `Discord account id: ${discordUser} is now linked with osu! account: ${osuUsername}`;
                } catch (error) {
                    console.log(error);
                    return false;
                }
            } else {
                await osuUser.updateOne({ discordId: discordUser }, {
                    $set: {
                        osuUserId: osuUserId,
                        osuUserName: osuUsername,
                        ilRegion: region
                    },
                });

                await osuUserProfile.save();
                return `Discord account id: ${discordUser} has changed linked osu! account to: ${osuUsername}`
            }
        }

        async function databaseUnlink(user) {
            let osuUsername = user.ircUsername ? user.ircUsername : user.username;
            let osuProfile = await getOsuUser(osuUsername);

            let deletionStatus = await osuUser.deleteOne({ osuUserId: osuProfile.user_id });

            if (deletionStatus.deletedCount === 1) return `Your account has been unlinked successfully!`;
            else return `Your account is not linked.`;
        }

        resetIdleTimer();

        irc.on("PM", async ({ message, user }) => {
            if (user.ircUsername !== ircUser && message[0] !== prefix && message[0] !== otherPrefix) return;

            resetIdleTimer();

            const isPrefix = message[0] === otherPrefix ? otherPrefix : prefix;

            const command = message.split(" ")[0].toLowerCase();
            console.log(command);

            switch(command) {
                case isPrefix + "info":
                    await user.sendMessage(`RomAI is made by Rom (surprising) aka DarkerSniper! type .help to see the commands!`);
                    break;
                case isPrefix + "verify":
                    let code = message.split(" ").pop();
                    let reply = await databaseLink(user, code);
                    if (!reply) break;
                    await user.sendMessage(reply);
                    break;
                case isPrefix + "help":
                    let helpMsg = '.matchcommands, .verify, .unauth (deletes your account), .info';

                    await user.sendMessage(helpMsg);
                    await user.sendMessage('Be sure to use /help in discord using RomAI for all features!')
                    break;
                case isPrefix + "unauth":
                    let status = await databaseUnlink(user);
                    await user.sendMessage(status);
                    break;
                case isPrefix + "matchcommands":
                    let commandMsg = '.ff, .abort (use before the banning stage, will not work in matchmaking), .tb (can only be used at the end of a game)';

                    await user.sendMessage(commandMsg);
                    break;
                // Add matchmaking
                /*
                case isPrefix + "mm1v1-join":
                    let userProfile1 = await osuUser.findOne({ osuUserId: user.id });
                    if (!userProfile1) return await user.sendMessage("Your account isn't linked yet.");

                    let queueResponse = await queue(undefined, undefined, 'joinqueue', { id: userProfile1.discordId }, 1);

                    await user.sendMessage(queueResponse);
                    break;
                case isPrefix + "mm2v2-join":
                    let userProfile2 = await osuUser.findOne({ osuUserId: user.id });
                    if (!userProfile2) return await user.sendMessage("Your account isn't linked yet.");

                    let queueResponse2 = await queue(undefined, undefined, 'joinqueue', { id: userProfile2.discordId }, 2);

                    await user.sendMessage(queueResponse2);
                    break;
                case isPrefix + "mm-leave":
                    await queue(undefined, undefined, 'leavequeue', { osuUserId: user.id }, 1);
                    await queue(undefined, undefined, 'leavequeue', { osuUserId: user.id }, 2);

                    await user.sendMessage('You have left the queue!');
                    break;
                */
            }
        });
    },
}