const mongoose = require('mongoose');
const bancho = require('bancho.js');
const { LegacyClient, isOsuJSError, Client, Auth } = require('osu-web.js');
const { EmbedBuilder, hyperlink, bold, inlineCode, italic } = require('discord.js');

const { osuAPI, osuId, osuToken, ircUser, ircPassword, } = process.env;

//Using the APIv1 with the private key that is located in a local file
const legacy = new LegacyClient(osuAPI);

//APIv2
const auth = new Auth(osuId, osuToken);

const leagues = require(`../../schemas/leagues`);
const osuUser = require('../../schemas/osuUser');
const guild = require(`../../schemas/guild`);

const { addCurrecny } = require('../discord/currency');
const { inventoryAddPack } = require('../discord/invAddPack');
const { swissSystem, singleElimBracket, roundRobin } = require(`./tournamentFormats`);
const { 
    addGame, removeGame, getGames,
    addMatchLimitation,
    removeMatchLimitation
} = require(`./activeData`);
const { getRandomInt, numberWithCommas, dateConversion } = require(`./formatNum`);
const { getSpecificPool, getBalancedPool } = require(`../discord/poolHandler`);
const { startingElo, duelElo, addElo, getElo, updateRecord } = require(`./skillsCalculation`);

const { poolShow } = require(`../discord/poolHandler`);
const { xpAdd } = require('../discord/xp');
const { mergeImagesByHalf } = require('../discord/mergeImages');
const { checkChallenges } = require('../discord/dailyChallenges');
const { getPlayerRank, getRankIcon, getRankProgress } = require('../discord/ranks');
const { saveLogData } = require('../tests/usageLog');
const { eloRankAsEmojis, osuRanksAsEmojis } = require('../discord/getEmojis');

const irc = new bancho.BanchoClient({
    username: ircUser,
    password: ircPassword,
    apiKey: osuAPI
});

// Constants
const DEFAULT_SCORE_TO_WIN = 4;
const HIGH_ELO_SCORE_TO_WIN = 5;
const HIGH_ELO_MATCHES = 1700;
const INVITE_DELAY = 500;
const XP_WIN = 100;
const XP_LOSE = 25;

// Timers
const JOIN_TIMER = 200;
const AUTO_ROLL_TIMER = 15;

module.exports = {
    async handleLobby(osuUser1, osuUser2, interaction, client, teams, tournament, selectedPool, customBO) {
        try {
            if (irc.isDisconnected()) await irc.connect();

            /* 
                tournament = {
                    name: String,
                    stage: String, -> 'Groups', 'Playoffs'
                    round: Number,
                    match: Number,
                    teams: [{
                        name: String,
                        players: [String],
                    }]
                }

                teams = {
                    teamA: [Player],
                    teamB: [Player]
                }

                First player in each team is the CAPTAIN
                If teams is not empty then make the match 2v2, if empty make 1v1
            */

            const gameMode = teams ? (teams.teamA.length == 3 ? '3v3' : '2v2') : '1v1';
            const mode = parseInt(gameMode.charAt(0));

            var scoreToWin = !customBO ? DEFAULT_SCORE_TO_WIN : (customBO / 2) + 0.5;

            var playerArray = teams ? teams.teamA.concat(teams.teamB) : [osuUser1, osuUser2];
            console.log(`Players in this lobby:\n${playerArray}`);

            if (gameMode == '1v1') {
                osuUser1 = osuUser1.replace(/ /g, "_");
                osuUser2 = osuUser2.replace(/ /g, "_");
            }

            // High ELO matches logic & Match limitation
            let eloAvg = 0;

            for (let i=0; i<playerArray.length; i++) {
                let playerProfile = await osuUser.findOne({ osuUserName: playerArray[i] });
                let limitId = playerProfile.discordId;
                let userId = playerProfile.osuUserId;

                // name change check
                const token = await auth.clientCredentialsGrant();
                const api = new Client(token.access_token);

                const osuUserV2 = await api.users.getUser(userId, {
                    urlParams: {
                        mode: 'osu'
                    }
                });

                let ingameUsername = osuUserV2.username;

                ingameUsername = ingameUsername.replace(/ /g, "_");

                if (ingameUsername != playerArray[i]) {
                    await osuUser.updateOne({ osuUserId: userId }, {
                        $set: {
                            osuUserName: ingameUsername
                        }
                    });

                    playerArray[i] = ingameUsername;
                }

                await addMatchLimitation(limitId);

                let playerElo = await getElo(playerArray[i], mode);
                if (playerElo == 0) await addElo(playerArray[i], await startingElo(userId), mode);

                playerElo = await getElo(playerArray[i], mode);
                eloAvg += playerElo;
            }

            eloAvg /= playerArray.length;

            // Initiate high ELO ranked
            if (eloAvg >= HIGH_ELO_MATCHES) {
                if (Array.isArray(interaction)) {
                    scoreToWin = HIGH_ELO_SCORE_TO_WIN;
                }
            }

            const bestOf = scoreToWin * 2 - 1;

            let interactions = !Array.isArray(interaction) ? [interaction] : interaction;

            let fetchChannel = [];
            var textChannel = [];
            var matchMessage = [];

            for (let i=0; i<interactions.length; i++) {
                let guildId = !Array.isArray(interaction) ? interactions[i].guildId : interactions[i];

                fetchChannel.push(await guild.findOne({ guildId: guildId }));
                textChannel.push(client.channels.cache.get(fetchChannel[i].setup.matchesOutput));

                console.log(`ELO Average: ${eloAvg}`);

                if (eloAvg >= 1800) {
                    console.log(`High ELO match detected.`);

                    if (fetchChannel[i].setup.highEloMatchesOutput) {
                        textChannel.push(client.channels.cache.get(fetchChannel[i].setup.highEloMatchesOutput));
                    }
                }
            }

            for (let i=0; i<textChannel.length; i++) {
                let matchMsg = teams ? `Waiting for Team ${teams.teamA[0]} (${bold(teams.teamA.toString())}) and Team ${teams.teamB[0]} (${bold(teams.teamB.toString())})` : `Waiting for ${bold(osuUser1)} and ${bold(osuUser2)} to join the lobby...`;
                matchMessage.push(await textChannel[i].send({
                    content: matchMsg
                }));
            }

            var teamNames = teams ? [customTeamNames(teams.teamA[0], teams.teamA[1]), customTeamNames(teams.teamB[0], teams.teamB[1])] : undefined;

            if (tournament) {
                teamNames = [tournament.teams[0].name, tournament.teams[1].name];
            }

            let channelName = teams ? `ROMAI: (${teamNames[0]}) vs (${teamNames[1]})` : `ROMAI: (${osuUser1}) vs (${osuUser2})`;

            var channel;

            try {
                channel = await irc.createLobby(channelName, false);
            } catch (error) {
                console.log(error);
                
                for (let p of playerArray) {
                    let pId = await osuUser.findOne({ osuUserName: p });

                    await removeMatchLimitation(pId.discordId);
                }

                return await interaction.editReply({
                    content: `There has been an error creating your match.`
                });
            }

            console.log(`Lobby: ${channel.name} has been created!`);
            var lobby = channel.lobby; // mp commands can be used with this

            const states = Object.freeze({
                Joined: Symbol("joined"),
                Pool: Symbol("Pool"),
                Roll: Symbol("roll"),
                Banning: Symbol("banning"),
                Picking: Symbol("picking"),
                InMatch: Symbol("inMatch"),
                Ended: Symbol("ended"),
                extraTB: Symbol("tbFun")
            });

            var poolInfo = undefined; // Get Database Object as Pool;
            var poolOptions = [];

            var availablePools = [];
            var pickedPools = [undefined, undefined];

            const match = {
                pool: poolInfo,
                players: playerArray,
                score: [0 , 0],
                eloInfo: {},
                date: new Date(),
                bans: [],
                picks: [], // Object: {map: ,mod: ,scores []}
            };

            var matchEmbed = new EmbedBuilder();

            const attachment = gameMode == '1v1' ? await mergeImagesByHalf(osuUser1, osuUser2) : undefined;

            var matchState = states.Joined;
            var rolls = [];

            var playersJoined = [];
            var playersIngame = [];

            var firstPick;
            var secondPick;

            for (let i=0; i< mode * 2; i++) {
                playersJoined.push(false);
                playersIngame.push(false);
            }

            // Apply Settings
            await lobby.updateSettings();

            await addGame(lobby.id);

            switch (gameMode) {
                case '3v3':
                    await lobby.setSettings(2, 3, 7);
                    break;
                case '2v2':
                    await lobby.setSettings(2, 3, 5);
                    break;
                case '1v1':
                    await lobby.setSettings(0, 3, 2);
                    break;
            }
            // HeadToHead: 0, TagCoop: 1, TeamVs: 2, TagTeamVs: 3
            // Score: 0, Accuracy: 1, Combo: 2, ScoreV2: 3
            // Size: number

            await lobby.updateSettings();

            await lobby.startTimer(JOIN_TIMER);

            // Timer function for bans/picks
            let pTimer;

            async function handleTimer() { 
                if (matchState == states.Banning) {
                    await banPick("no-ban");
                } else if (matchState == states.Picking) {
                    await banPick("no-pick")
                }
            }

            lobby.on("timerTick", async (seconds) => {
                if (matchState == states.Joined && seconds % 20 == 0) {
                    for (let i=0; i<playerArray.length; i++) {
                        if (!playersJoined[i]) {
                            await new Promise(resolve => setTimeout(resolve, INVITE_DELAY));

                            let userDB = await osuUser.findOne({ osuUserName: playerArray[i] });
                            await lobby.invitePlayer(`#${userDB.osuUserId}`);
                        }
                    }
                }
            });

            let rolled = false;

            lobby.on("timerEnded", async () => {
                switch (matchState) {
                    case states.Joined:
                        if (tournament) {
                            for (let i=0; i<playersJoined.length; i++) {
                                let joined = playersJoined[i];

                                if (!joined) {
                                    const isHalf = playerArray.length / 2;

                                    if (i >= isHalf) {
                                        match.score[0] = scoreToWin;
                                        break;
                                    } else {
                                        match.score[1] = scoreToWin;
                                        break;
                                    }
                                }
                            }
                        }

                        await closeNdisconnect();
                        break;
                    case states.Pool:
                        if (pickedPools[0] == undefined && pickedPools[1] == undefined) {
                            let randomPool = getRandomInt(0,5);
                            let confirmedPool = availablePools[randomPool];

                            poolInfo = confirmedPool;
                        } else if (pickedPools[0] == undefined) {
                            poolInfo = pickedPools[1];
                        } else if (pickedPools[1] == undefined) {
                            poolInfo = pickedPools[0];
                        } else {
                            let randomPool = getRandomInt(0,1);
                            let confirmedPool = availablePools[randomPool];

                            poolInfo = confirmedPool;
                        }

                        if (poolInfo.maps.freeMod && poolInfo.maps.freeMod.length > 0) {
                            console.log(`Adding FMs to the pool.`);
                            poolOptions = await setPoolOptions(
                                poolInfo.maps.noMod.length,
                                poolInfo.maps.hidden.length,
                                poolInfo.maps.hardRock.length,
                                poolInfo.maps.doubleTime.length,
                                poolInfo.maps.freeMod.length
                            );
                        } else {
                            console.log(`No FMs found.`);
                            poolOptions = await setPoolOptions(
                                poolInfo.maps.noMod.length,
                                poolInfo.maps.hidden.length,
                                poolInfo.maps.hardRock.length,
                                poolInfo.maps.doubleTime.length
                            );
                        }

                        match.pool = poolInfo;
                        await lobby.channel.sendMessage(`This match's Map Pool: ${match.pool.name} (${match.pool.elo})`);
                        await lobby.channel.sendMessage(`You can find the Map Pool in the match's message!`);
                        await lobby.channel.sendMessage(`Auto Rolling in ${AUTO_ROLL_TIMER} seconds...`);

                        postPool();

                        matchState = states.Roll;
                        await lobby.startTimer(AUTO_ROLL_TIMER);
                        break;
                    case states.Roll:
                        if (rolled) break;

                        rolls.push(await getRandomInt(1,100));
                        rolls.push(await getRandomInt(1,100));

                        let p1;
                        let p2;

                        if (gameMode != '1v1') {
                            p1 = teams.teamA[0];
                            p2 = teams.teamB[0];
                        } else {
                            p1 = osuUser1;
                            p2 = osuUser2;
                        }

                        firstPick = rolls[0] >= rolls[1] ? p1 : p2;
                        secondPick = firstPick == p2 ? p1 : p2;

                        await lobby.channel.sendMessage(`${p1}'s roll: ${rolls[0]}, ${p2}'s roll: ${rolls[1]}`);

                        informDiscord(matchState);

                        rolled = true;
                        await new Promise(resolve => setTimeout(resolve, 1000));

                        matchState = states.Banning;
                        await stageMessage(secondPick);
                        break;
                    case states.Banning:
                        //await banPick("no-ban");
                        console.log(`Timer ended in a ban state.`);
                        break;
                    case states.Picking:
                        //await banPick("no-pick");
                        console.log(`Timer ended in a pick state.`);
                        break;
                    case states.InMatch:
                        if (!lobby.playing) {
                            await lobby.startMatch(5);
                            break;
                        } else if (!playersIngame.includes(true)) {
                            if (tournament) {
                                if (match.score[0] < match.score[1]) 
                                    match.score[1] = scoreToWin; 
                                else
                                    match.score[0] = scoreToWin;
                            }
                            await closeNdisconnect();
                            break;
                        } else if (playersIngame.includes(false)) {
                            let score1;
                            let score2;

                            if (gameMode == '1v1') {
                                score1 = playersIngame[0] ? 1 : 0;
                                score2 = playersIngame[1] ? 1 : 0;
                                playersIngame = [true, true];
                            } else if (gameMode == '2v2') {
                                if (!playersIngame[0] && !playersIngame[1]) {
                                    score1 = 0;
                                    score2 = 1;
                                } else if (!playersIngame[2] && !playersIngame[3]) {
                                    score1 = 1;
                                    score2 = 0;
                                } else {
                                    playersIngame = [true, true, true, true];
                                    await lobby.startMatch(5);
                                    break;
                                }

                                playersIngame = [true, true, true, true];
                            } else if (gameMode == '3v3') {
                                if (!playersIngame[0] && !playersIngame[1] && !playersIngame[2]) {
                                    score1 = 0;
                                    score2 = 1;
                                } else if (!playersIngame[3] && !playersIngame[4] && !playersIngame[5]) {
                                    score1 = 1;
                                    score2 = 0;
                                } else {
                                    playersIngame = [true, true, true, true, true, true];
                                    await lobby.startMatch(5);
                                    break;
                                }

                                playersIngame = [true, true, true, true, true, true];
                            }

                            await endMap(score1, score2);
                        } else {
                            await lobby.startMatch(5);
                        }
                        break;
                    case states.Ended:
                        // End of match procedure

                        if (matchState == states.extraTB) break;

                        await closeNdisconnect();

                        let levelingChannels = [];
                        for (let i=0; i<fetchChannel.length; i++) {
                            let leveling = client.channels.cache.get(fetchChannel[i].setup.levelingChannel);
        
                            levelingChannels.push(leveling);
                        }

                        let winningXp = tournament ? XP_WIN * 2 : XP_WIN;
                        let losingXp = tournament ? XP_LOSE * 2 : XP_LOSE;

                        let teamAavg = 0;
                        let teamBavg = 0;

                        if (mode <= 2) {
                            for (let i=0; i<playerArray.length; i++) {
                                let playerElo = await getElo(playerArray[i], mode);

                                if (i < mode) {
                                    teamAavg += playerElo;
                                } else {
                                    teamBavg += playerElo;
                                }
                            }
                        }

                        teamAavg /= mode;
                        teamBavg /= mode;

                        for (let i=0; i<playerArray.length; i++) {
                            // match.eloInfo.elo1.gain/lose - teamA player ELOs
                            // match.eloInfo.elo2.gain/lose - teamB player ELOs
                            // isHalf = mode

                            let playerProfile = await osuUser.findOne({ osuUserName: playerArray[i] });
                            let playerElo = playerProfile.elo[gameMode];
                            let discordId = playerProfile.discordId;
                            let discordUser = client.users.cache.get(discordId);

                            let eloDiff = 0;
                            let wonMatch = false;

                            if (i < mode) {
                                // elo1
                                if (match.score[0] == scoreToWin) {
                                    // gain
                                    wonMatch = true;
                                    eloDiff = match.eloInfo.elo1.gain - teamAavg;
                                } else {
                                    eloDiff = match.eloInfo.elo1.lose - teamAavg;
                                }
                            } else {
                                // elo2
                                if (match.score[0] != scoreToWin) {
                                    // gain
                                    wonMatch = true;
                                    eloDiff = match.eloInfo.elo2.gain - teamBavg;
                                } else {
                                    eloDiff = match.eloInfo.elo2.lose - teamBavg;
                                }
                            }

                            eloDiff = Math.round(eloDiff);
                            
                            let xpToAdd = wonMatch ? winningXp : losingXp;
                            let eloDiffString = wonMatch ? `+${eloDiff}` : `${eloDiff}`;

                            if (!tournament && mode <= 2) await addElo(playerArray[i], playerElo + eloDiff, mode);
                            await updateRecord(playerArray[i], wonMatch, mode);
                            await xpAdd(discordId, xpToAdd, levelingChannels);

                            let rankProgress = mode <= 2 ? await getRankProgress(discordId, gameMode, eloDiffString) : '';

                            let resultString = wonMatch ? `You have won the match!` : `You have lost the match!`;
                            let xpString = wonMatch ? `+${winningXp}XP` : `+${losingXp}XP`;

                            await discordUser.send({
                                content: `${resultString} ${italic(xpString)}\n${rankProgress}\n\nThanks for playing!`
                            });
                        }

                        match.players.forEach(async playerName => {
                            let playerRecent = await osuUser.findOne({ osuUserName: playerName });
                            let newRecent = playerRecent.recentMatches;

                            if (!newRecent) {
                                newRecent = [];
                            } else if (newRecent.length == 5) {
                                newRecent.shift();
                            }

                            newRecent.unshift(match);

                            await osuUser.updateOne({ osuUserName: playerName }, {
                                $set: {
                                    recentMatches: newRecent
                                },
                            });

                            await checkChallenges(playerName, match, levelingChannels);

                            let packChance = await getRandomInt(1, 10000);

                            console.log(`${playerName} has hit: ${packChance}`);

                            if (packChance <= 2) {
                                await packReceived("Champion", packChance);
                            } else if (packChance <= 11) {
                                await packReceived("Pro", packChance);
                            } else if (packChance <= 31) {
                                await packReceived("Contender", packChance);
                            }

                            await saveLogData({
                                type: "match",
                                data: playerName
                            });
                            
                            async function packReceived(typePack, chance) {
                                const { osuId, osuToken } = process.env;
                                const { Client, Auth } = require('osu-web.js');

                                //APIv2
                                const auth = new Auth(osuId, osuToken);

                                const token = await auth.clientCredentialsGrant();
                                const api = new Client(token.access_token);

                                const userinOsu = await api.users.getUser(playerName, {
                                    urlParams: {
                                    mode: 'osu'
                                    },
                                    query: {
                                        key: 'username'
                                    }
                                });

                                let packCountry = typePack == 'Legend' ? "Worldwide" : userinOsu.country.code;

                                const packToAdd = {
                                    packType: typePack,
                                    country: packCountry
                                };

                                await inventoryAddPack(playerRecent.discordId, (await osuUser.findOne({ osuUserName: playerName })).inventory, packToAdd);

                                for (let i=0; i<levelingChannels.length; i++) {
                                    if (levelingChannels[i].members.find(member => member.user.id == playerRecent.discordId)) {
                                        levelingChannels[i].send({
                                            content: `<@${playerRecent.discordId}> has completed a match and randomly received ${bold(typePack)} Pack\n${italic(`Number hit: ${chance}/10000`)}`
                                        });
                                    }
                                }
                            }
                        });

                        await saveLogData({
                            type: "game"
                        });
                        break;
                    case states.extraTB:
                        await lobby.startMatch(5);
                        break;
                }
            });

            lobby.on("timerAborted", async () => {
                console.log("Timer Aborted.");
            });

            lobby.on("matchFinished", async (scores) => {
                if (matchState == states.extraTB) {
                    matchState = states.Ended;

                    await lobby.channel.sendMessage(`The lobby will close in 30 seconds!`);
                    await lobby.startTimer(30);
                    return;
                }

                let score1 = 0;
                let score2 = 0;

                console.table(scores);

                if (match.picks[match.picks.length - 1].mod.includes('fm')) {
                    await lobby.updateSettings();
                }

                scores.forEach(({ player }) => {
                    let playerName = player.user.ircUsername;

                    playerName = playerName.replace(/ /g, "_");

                    let playerIndex = playerArray.findIndex(p => p == playerName);

                    if (playerIndex < mode) {
                        score1 += checkFM(player.score.score, player.mods);
                    } else {
                        score2 += checkFM(player.score.score, player.mods);
                    }
                });

                await endMap(score1, score2);

                function checkFM(score, mods) {
                    // If freemod detected punish whoever didn't pick a mod
                    if (!match.picks[match.picks.length - 1].mod.includes('fm')) return score;

                    let isPunished = true;

                    if (mods) for (let i=0; i<mods.length; i++) {
                        let mod = mods[i];
                        console.log(mod);

                        let modString = mod.shortMod.toLowerCase();
                        if (modString == 'hd' || modString == 'hr' || modString == 'ez') {
                            isPunished = false;
                        }
                    }

                    if (isPunished) return Math.round(score * 0.5);

                    return score;
                }
            });

            lobby.on("matchAborted", async () => {
                let score1;
                let score2;

                if (gameMode == '1v1') {
                    score1 = playersIngame[0] ? 1 : 0;
                    score2 = playersIngame[1] ? 1 : 0;

                    playersIngame = [true, true];
                } else if (gameMode == '2v2') {
                    score1 = playersIngame[0] && playersIngame[1] ? 1 : 0;
                    score2 = playersIngame[2] && playersIngame[3] ? 1 : 0;

                    playersIngame = [true, true, true, true];
                } else if (gameMode == '3v3') {
                    score1 = playersIngame[0] && playersIngame[1] && playersIngame[2] ? 1 : 0;
                    score2 = playersIngame[3] && playersIngame[4] && playersIngame[5] ? 1 : 0;

                    playersIngame = [true, true, true, true, true, true];
                }

                await endMap(score1, score2);
            });

            lobby.on("playerJoined", async ({ player }) => {
                if (matchState != states.Joined && matchState != states.Ended) {
                    playersInLobby++;
                }

                let playerName = playerArray.includes(player.user.username) ? player.user.username : player.user.ircUsername;

                if (playerArray.includes(playerName)) {
                    let playerIndex = playerArray.indexOf(playerName);
                    playersJoined[playerIndex] = true;
                } else {
                    await lobby.kickPlayer(player.user.ircUsername);
                }

                if (gameMode != '1v1') {
                    if (teams.teamA.includes(playerName)) {
                        await lobby.changeTeam(player, "Blue");
                    } else {
                        await lobby.changeTeam(player, "Red");
                    }
                }

                if (matchState == states.Joined && !playersJoined.includes(false)) {
                    // ELO Handling
                    let eloArray = [];

                    let eloTeamA = 0;
                    let eloTeamB = 0;

                    for (let i=0; i<playerArray.length; i++) {
                        let playerElo = await getElo(playerArray[i], mode);
                        if (playerElo == 0) await addElo(playerArray[i], await startingElo(playerArray[i]), mode);

                        playerElo = await getElo(playerArray[i], mode);
                        eloArray.push(parseInt(playerElo));

                        if (i < mode) {
                            eloTeamA += eloArray[i];
                        } else {
                            eloTeamB += eloArray[i];
                        }
                    }

                    eloTeamA /= mode;
                    eloTeamB /= mode;

                    match.eloInfo = await duelElo(Math.round(eloTeamA), Math.round(eloTeamB));

                    console.log(match.eloInfo);

                    if (selectedPool) {
                        poolInfo = await getSpecificPool(selectedPool);

                        if (poolInfo.maps.freeMod && poolInfo.maps.freeMod.length > 0) {
                            console.log(`Adding FMs to the pool.`);
                            poolOptions = await setPoolOptions(
                                poolInfo.maps.noMod.length,
                                poolInfo.maps.hidden.length,
                                poolInfo.maps.hardRock.length,
                                poolInfo.maps.doubleTime.length,
                                poolInfo.maps.freeMod.length
                            );
                        } else {
                            console.log(`No FMs found.`);
                            poolOptions = await setPoolOptions(
                                poolInfo.maps.noMod.length,
                                poolInfo.maps.hidden.length,
                                poolInfo.maps.hardRock.length,
                                poolInfo.maps.doubleTime.length
                            );
                        }

                        match.pool = poolInfo;

                        // Start auto roll
                        await lobby.channel.sendMessage(`This match's Map Pool: ${match.pool.name} (${match.pool.elo})`);
                        await lobby.channel.sendMessage(`You can find the Map Pool in the match's message!`);
                        await lobby.channel.sendMessage(`Auto Rolling in ${AUTO_ROLL_TIMER} seconds...`);

                        postPool();

                        matchState = states.Roll;
                        await lobby.startTimer(AUTO_ROLL_TIMER);
                    } else {
                        // Assign new pool
                        let eloSum = 0;
                        eloArray.forEach(e => eloSum += e);

                        availablePools = await getBalancedPool(eloSum / eloArray.length, playerArray);

                        await lobby.channel.sendMessage(`Available pools for this match:`);

                        // Start Map Pool picking
                        for (let i=0; i<availablePools.length; i++) {
                            let curPool = availablePools[i];
                            await lobby.channel.sendMessage(`${i + 1}. ${curPool.name} ELO - ${curPool.elo}`);
                        }

                        await lobby.channel.sendMessage(`Please type the number of the map pool you would like to play...`);
                        matchState = states.Pool;
                        await lobby.startTimer(60);
                    }
                }
            });

            let playersInLobby = playerArray.length;

            lobby.on("playerLeft", async () => {
                if (matchState != states.Joined && matchState != states.Ended) {
                    playersInLobby--;

                    if (playersInLobby == 0) {
                        await closeNdisconnect();
                    }
                }

                /*
                if (lobby.playing) {
                    await checkPlayers();
                    await lobby.abortMatch();
                }
                */

                // System to check if 30 secs of the map has passed (only if it's the first time the user left)
            });

            lobby.on("playerChangedTeam", async ({ player, team }) => {
                let playerName = player.user.username != undefined ? player.user.username : player.user.ircUsername;

                playerName = playerName.replace(/ /g, "_");

                if (teams.teamA.includes(playerName) && team.toLowerCase() == "red") {
                    await lobby.changeTeam(player, "Blue");
                } else if (teams.teamB.includes(playerName) && team.toLowerCase() == "blue") {
                    await lobby.changeTeam(player, "Red");
                }
            });

            lobby.on("allPlayersReady", async () => {
                if (matchState == states.InMatch || matchState == states.extraTB) {
                    await lobby.abortTimer();
                    await lobby.startMatch(5);
                }
            });

            let tbStatus = [false, false];

            lobby.channel.on("message", async ({ message, user }) => {
                let username = user.ircUsername;
                username.replace(/ /g, "_");
                console.log(`${username}: ${message}`);

                if (message == ".abort" &&
                    !Array.isArray(interaction) && // checks if not matchmaking
                    playerArray.includes(username) &&
                    (matchState == states.Joined || matchState == states.Pool || matchState == states.Roll)
                ) {
                    await closeNdisconnect();
                }

                if (message == ".ff") {
                    let playerIndex = playerArray.findIndex(p => p == username);

                    if (playerIndex > -1) {
                        await lobby.abortTimer();
                        matchState = states.Ended;

                        let team1name = gameMode == '1v1' ? osuUser1 : `Team ${playerArray[0]}`;
                        let team2name = gameMode == '1v1' ? osuUser2 : `Team ${playerArray[mode]}`;

                        let ffTeam;
                        let winningTeam;

                        if (playerIndex < mode) {
                            match.score[1] = scoreToWin;

                            ffTeam = team1name;
                            winningTeam = team2name
                        } else {
                            match.score[0] = scoreToWin;

                            ffTeam = team2name;
                            winningTeam = team1name;
                        }

                        await lobby.channel.sendMessage(`${ffTeam} has forfeited the match. ${winningTeam} is the WINNER!`);
                        await lobby.startTimer(5);
                    }
                }

                switch (matchState) {
                    case states.Banning:
                        if (match.bans.length % 2 == 0 && secondPick == username && poolOptions.includes(message.toLowerCase())) {
                            clearTimeout(pTimer);
                            await banPick(message.toLowerCase());
                        } else if (match.bans.length % 2 != 0 && firstPick == username && poolOptions.includes(message.toLowerCase())) {
                            clearTimeout(pTimer);
                            await banPick(message.toLowerCase());
                        }
                        break;
                    case states.Picking:
                        if (await getMapsNum() % 2 == 0 && firstPick == username && poolOptions.includes(message.toLowerCase())) {
                            clearTimeout(pTimer);
                            await banPick(message.toLowerCase());
                        } else if (await getMapsNum() % 2 != 0 && secondPick == username && poolOptions.includes(message.toLowerCase())) {
                            clearTimeout(pTimer);
                            await banPick(message.toLowerCase());
                        } else if (match.bans.includes(message.toLowerCase())) {
                            await lobby.channel.sendMessage("This map is banned.");
                        }
                        break;
                    case states.Pool:
                        async function checkPickedPools() {
                            if (pickedPools[0] != undefined && pickedPools[1] != undefined) {
                                let randomPool = getRandomInt(0,1);
                                let confirmedPool = pickedPools[randomPool];
        
                                poolInfo = confirmedPool;

                                if (poolInfo.maps.freeMod && poolInfo.maps.freeMod.length > 0) {
                                    console.log(`Adding FMs to the pool.`);
                                    poolOptions = await setPoolOptions(
                                        poolInfo.maps.noMod.length,
                                        poolInfo.maps.hidden.length,
                                        poolInfo.maps.hardRock.length,
                                        poolInfo.maps.doubleTime.length,
                                        poolInfo.maps.freeMod.length
                                    );
                                } else {
                                    console.log(`No FMs found.`);
                                    poolOptions = await setPoolOptions(
                                        poolInfo.maps.noMod.length,
                                        poolInfo.maps.hidden.length,
                                        poolInfo.maps.hardRock.length,
                                        poolInfo.maps.doubleTime.length
                                    );
                                }

                                match.pool = poolInfo;
                                await lobby.channel.sendMessage(`This match's Map Pool: ${match.pool.name} (${match.pool.elo})`);
                                await lobby.channel.sendMessage(`Auto Rolling in ${AUTO_ROLL_TIMER} seconds...`);
                                matchState = states.Roll;

                                postPool();

                                await lobby.startTimer(AUTO_ROLL_TIMER);
                            }
                        }

                        if (parseInt(message) > 0 && parseInt(message) < 7) {
                            if (username == playerArray[0] || username == playerArray[mode]) {
                                let mapPicked;

                                if (username == playerArray[0] && pickedPools[0] == undefined) {
                                    pickedPools[0] = availablePools[parseInt(message) - 1];

                                    mapPicked = pickedPools[0].name;
                                } else if (username == playerArray[mode] && pickedPools[1] == undefined) {
                                    pickedPools[1] = availablePools[parseInt(message) - 1];

                                    mapPicked = pickedPools[1].name;
                                }

                                await lobby.channel.sendMessage(`${username} has chosen: ${mapPicked}`);
                                await checkPickedPools();
                            }
                        }
                        break;
                    case states.InMatch:
                        // Timeout feature
                        break;
                    case states.Ended:
                        if (message == ".tb" && lobby.playing == false) {
                            if (await getMapsNum() == (bestOf)) break;

                            if (username == playerArray[0] || username == playerArray[mode]) {
                                if (username == playerArray[0]) tbStatus[0] = true;
                                else tbStatus[1] = true;

                                await lobby.channel.sendMessage(`TB for fun: ${playerArray[0]} - ${tbStatus[0] ? 'yes' : 'no'} | ${playerArray[mode]} - ${tbStatus[1] ? 'yes' : 'no'}`);
                            }

                            if (tbStatus[0] && tbStatus[1]) {
                                await lobby.abortTimer();

                                // put TB
                                matchState = states.extraTB;

                                await lobby.setMods("NF", true);
                                await lobby.setMap(poolInfo.maps.tieBreaker);
                                await lobby.startTimer(120);
                            }
                        }
                }
            });

            async function postPool() {
                console.log(`Calculating pool`);
                let poolEmbed = await poolShow(match.pool.name);

                if (gameMode == '1v1') {
                    let user1 = await osuUser.findOne({ osuUserName: osuUser1 });
                    let user2 = await osuUser.findOne({ osuUserName: osuUser2 });
                    poolEmbed.content = `<@${user1.discordId}> and <@${user2.discordId}> 's pool`;
                } else {
                    let embedContent = ``;

                    for (let i=0; i<playerArray.length; i++) {
                        let u = await osuUser.findOne({ osuUserName: playerArray[i] });

                        if (i == playerArray.length - 1) {
                            embedContent += `<@${u.discordId}> 's pool`;
                        } else {
                            embedContent += `<@${u.discordId}> , `;
                        }
                    }

                    poolEmbed.content = embedContent;
                }

                if (Array.isArray(interaction)) {
                    for (let i=0; i<interaction.length; i++) {
                        let mmChannel = client.channels.cache.get(fetchChannel[i].setup.matchmakingChannel);

                        mmChannel.send(poolEmbed);
                    }
                } else {
                    interaction.editReply(poolEmbed);
                }
            }

            async function endMap(score1, score2) {
                let mapWinner;
                let matchPoint;

                if (score1 > score2) {
                    mapWinner = gameMode == '1v1' ? osuUser1 : teamNames[0];
                    match.score[0] += 1;
                    matchPoint = match.score[0] == scoreToWin - 1 ? true : false;
                } else { 
                    mapWinner = gameMode == '1v1' ? osuUser2 : teamNames[1];
                    match.score[1] += 1; 
                    matchPoint = match.score[1] == scoreToWin - 1 ? true : false;
                }
                if (score1 == score2) {
                    console.log("TIE?");
                }

                let endMapMessage = gameMode == '1v1' ? `Map Won by ${mapWinner} | Scores - ${osuUser1}: ${score1}, ${osuUser2}: ${score2}` : `Map Won by ${mapWinner} | Scores - ${teamNames[0]}: ${score1}, ${teamNames[1]}: ${score2}`;
                await lobby.channel.sendMessage(endMapMessage);

                match.picks[match.picks.length - 1].scores[0] = score1;
                match.picks[match.picks.length - 1].scores[1] = score2;

                informDiscord(matchState);

                if (match.score.includes(scoreToWin)) {
                    matchState = states.Ended;

                    if (match.score[0] == scoreToWin) gameMode == '1v1' ? await stageMessage(osuUser1) : await stageMessage(teams.teamA[0]); else gameMode == '1v1' ? await stageMessage(osuUser2) : await stageMessage(teams.teamB[0]);
                } else if (scoreToWin - 1 == match.score[0] && scoreToWin - 1 == match.score[1]) {
                    await lobby.channel.sendMessage(`WE HAVE A TIE... TIEBREAKER MAP INCOMING!`);

                    let tbMessage = gameMode == '1v1' ? `${osuUser1} | ${match.score[0]} - ${match.score[1]} | ${osuUser2}` : `${teamNames[0]} | ${match.score[0]} - ${match.score[1]} | ${teamNames[1]}`;
                    await lobby.channel.sendMessage(tbMessage);
                    await setPick("tb");
                } else if (await getMapsNum() == 2 && scoreToWin < 6) { // Ensures 2nd ban happens only on BO7 & BO9
                    matchState = states.Banning;
                    lobby.channel.sendMessage(`Starting: Second Ban Phase...`);

                    await stageMessage(secondPick);
                } else {
                    if (matchPoint) await lobby.channel.sendMessage(`${mapWinner} is on MATCH POINT!`);
                    matchState = states.Picking;

                    if (await getMapsNum() % 2 != 0) {
                        await stageMessage(secondPick); 
                    } else { 
                        await stageMessage(firstPick);
                    }
                }
            }

            async function checkPlayers() {
                await Promise.all(lobby.slots.map(player => {
                    if (player) {
                        let username = playerArray.includes(player.user.username) ? player.user.username : player.user.ircUsername;

                        if (player.username) {
                            username = playerArray.includes(player.username) ? player.username : player.ircUsername;
                        }

                        if (playerArray.includes(username)) {
                            playersIngame[playerArray.indexOf(username)] = false;
                        } else {
                            playersIngame[playerArray.indexOf(username)] = true;
                        }
                    }
                }));
            }

            async function informDiscord(state) {
                // using the 'match' Object and the channelId
                // keep sending updates after every pick/ban/matchFinished etc...
                // use ONLY first pick/second pick for player names
                let captain1;
                
                let team1;
                let team2;

                if (gameMode == '1v1') {
                    captain1 = osuUser1;
                } else {
                    captain1 = teams.teamA[0];
                    team1 = firstPick == captain1 ? `:blue_square: ${teamNames[0]}` : `:red_square: ${teamNames[1]}`;
                    team2 = secondPick == captain1 ? `:blue_square: ${teamNames[0]}` : `:red_square: ${teamNames[1]}`;
                }
                
                let score1 = firstPick == captain1 ? match.score[0] : match.score[1];
                let score2 = secondPick == captain1 ? match.score[0] : match.score[1];

                async function getDescription() {
                    let groupRound = tournament ? (tournament.stage != 'Playoffs' ? italic(`(Round ${tournament.round + 1})`) : ``) : ``;
                    let tourneyString = tournament ? `\n${bold(tournament.name)} - ${tournament.stage} ${groupRound}\n${tournament.teams[0].name} (${tournament.teams[0].record.wins}-${tournament.teams[0].record.losses})\n${tournament.teams[1].name} (${tournament.teams[1].record.wins}-${tournament.teams[1].record.losses})\n` : ``;

                    let boString = `(BO${(scoreToWin * 2) - 1})`

                    let elo1 = 0;
                    let elo2 = 0;

                    for (let i=0; i<playerArray.length; i++) {
                        let playerElo = await getElo(playerArray[i], mode);

                        if (i < mode) {
                            if (firstPick == captain1) elo1 += playerElo;
                            else elo2 += playerElo;
                        } else {
                            if (firstPick == captain1) elo2 += playerElo;
                            else elo1 += playerElo;
                        }
                    }

                    elo1 /= mode;
                    elo2 /= mode;

                    elo1 = Math.round(elo1);
                    elo2 = Math.round(elo2);

                    let rank1 = await getPlayerRank(undefined, gameMode, elo1);
                    let rank2 = await getPlayerRank(undefined, gameMode, elo2);

                    rank1 = `${eloRankAsEmojis(rank1)} ${rank1}`;
                    rank2 = `${eloRankAsEmojis(rank2)} ${rank2}`;

                    let teamInfo = '';

                    if (gameMode != '1v1') {
                        let players1 = firstPick == captain1 ? playerArray.slice(0, mode) : playerArray.slice(-mode);
                        let players2 = firstPick == captain1 ? playerArray.slice(-mode) : playerArray.slice(0, mode);

                        players1 = players1.join(' & ');
                        players2 = players2.join(' & ');

                        teamInfo = `\n${team1}\n${players1}\nvs\n${players2}\n${team2}\n`;
                    } else {
                        team1 = firstPick;
                        team2 = secondPick;
                    }

                    return `${tourneyString}Map Pool: ${match.pool.name}\n${bold(team1)} - ${rank1} ${italic(`(${elo1})`)} | ${bold(team2)} - ${rank2} ${italic(`(${elo2})`)}\n${hyperlink('MP Link', lobby.getHistoryUrl())}\n${teamInfo}\nScore: ${bold(`${team1}`)} | ${score1} - ${score2} | ${bold(`${team2}`)} ${boString}`;
                }

                let live;
                if (match.score[0] == scoreToWin || match.score[1] == scoreToWin) {
                    live = `Ended ${dateConversion(Date.now())}`;
                } else {
                    live = `:red_circle: LIVE\nStarted ${dateConversion(match.date)}`;
                }
                matchEmbed.setDescription(`${live}\n${await getDescription()}`);

                if (gameMode == '1v1') {
                    matchEmbed.setThumbnail(`attachment://${attachment.name}`);
                }

                if (state == states.Roll) {
                    if (gameMode == '1v1') {
                        matchEmbed.setTitle(`${firstPick} vs ${secondPick} (RomAI 1v1)`);
                    } else {
                        matchEmbed.setTitle(`${team1} vs ${team2} (RomAI ${gameMode})`);
                    }
                } else if (state == states.Banning) {
                    if (match.bans.length % 2 != 0) {
                        matchEmbed.addFields(
                            {
                                name: `Ban`,
                                value: `Waiting...`,
                                inline: true
                            },
                            {
                                name: `Ban`,
                                value: `${secondPick}'s Ban: ${match.bans[match.bans.length - 1].toUpperCase()}`, // secondPick's ban
                                inline: true
                            },
                            {
                                name: `\u200b`,
                                value: `\u200b`
                            }
                        );
                    } else {
                        let banFields = matchEmbed.data.fields.filter(field => {
                            return field.name == 'Ban';
                        });

                        banFields[banFields.length - 2].value = `${firstPick}'s Ban: ${match.bans[match.bans.length - 1].toUpperCase()}`; // firstPick's ban
                    }
                } else if (state == states.Picking) {
                    let matchPick = match.picks[match.picks.length - 1];
                    let beatmapUrl = `https://osu.ppy.sh/b/${matchPick.map}`;

                    if (match.picks.length % 2 != 0) {
                        matchEmbed.addFields({
                            name: `Pick`,
                            value: `${firstPick}'s Pick: ${hyperlink(matchPick.mod.toUpperCase(), `${beatmapUrl}`)}`,
                            inline: true
                        });
                    } else {
                        matchEmbed.addFields({
                            name: `Pick`,
                            value: `${secondPick}'s Pick: ${hyperlink(matchPick.mod.toUpperCase(), `${beatmapUrl}`)}`,
                            inline: true
                        }, {
                            name: `\u200b`,
                            value: `\u200b`
                        });
                    }
                } else if (state == states.InMatch) {
                    let winningScore;
                    let pickFields = matchEmbed.data.fields.filter(field => {
                        return field.name == 'Pick';
                    });

                    let mapScore1 = firstPick == captain1 ? match.picks[match.picks.length - 1].scores[0] : match.picks[match.picks.length - 1].scores[1];
                    let mapScore2 = secondPick == captain1 ? match.picks[match.picks.length - 1].scores[0] : match.picks[match.picks.length - 1].scores[1];

                    let difference = numberWithCommas(Math.abs(mapScore1 - mapScore2));
                    if (mapScore1 >= mapScore2) {
                        winningScore = `<-`;
                    } else {
                        winningScore = `->`;
                    }

                    if (match.picks.length % 2 != 0) {
                        pickFields[pickFields.length - 1].value += ` ${bold(winningScore)}`;
                        difference = mapScore1 >= mapScore2 ? `Won by ${difference}` : `Lost by ${difference}`;
                    } else {
                        pickFields[pickFields.length - 1].value = `${bold(winningScore)} ${pickFields[pickFields.length - 1].value}`;
                        difference = mapScore1 >= mapScore2 ? `Lost by ${difference}` : `Won by ${difference}`;
                    }
                    pickFields[pickFields.length - 1].value += `\n${difference}`;
                }

                if (gameMode == '1v1') {
                    matchMessage.forEach(async msg => {
                        await msg.edit({
                            content: `  `,
                            embeds: [matchEmbed],
                            files: [attachment]
                        });
                    });
                } else {
                    matchMessage.forEach(async msg => {
                        await msg.edit({
                            content: `  `,
                            embeds: [matchEmbed],
                        });
                    });
                }
                
            }

            async function getMapsNum() {
                return match.score[0] + match.score[1];
            }

            async function stageMessage(player) {
                let currentPool = poolOptions.toString();

                let team1 = gameMode == '1v1' ? osuUser1 : teamNames[0];
                let team2 = gameMode == '1v1' ? osuUser2 : teamNames[1];

                currentPool.replace(/,/g, " ");

                if (matchState == states.Banning) {
                    await lobby.channel.sendMessage(`Available maps: ${currentPool}`);
                    await lobby.channel.sendMessage(`Waiting for ${player}'s Ban...`);

                    await lobby.startTimer(90);
                    pTimer = setTimeout(handleTimer, 90000);
                } else if (matchState == states.Picking) {
                    if (tournament) {
                        let tournamentStage = tournament.stage == 'Playoffs' ? `Playoffs` : `${tournament.stage} (Round ${tournament.round + 1})`;
                        await lobby.channel.sendMessage(`${tournament.name} - ${tournamentStage}`);
                    } 
                    await lobby.channel.sendMessage(`${team1} | ${match.score[0]} - ${match.score[1]} | ${team2} // BO${bestOf}`);
                    await lobby.channel.sendMessage(`Available maps: ${currentPool}`);
                    await lobby.channel.sendMessage(`Waiting for ${player}'s Pick...`);
                    await lobby.startTimer(90);
                    pTimer = setTimeout(handleTimer, 90000);
                } else if (matchState == states.Ended) {
                    let winner = gameMode == '1v1' ? player : player == teams.teamA[0] ? teamNames[0] : teamNames[1];

                    await lobby.channel.sendMessage(`${team1} | ${match.score[0]} - ${match.score[1]} | ${team2}`);
                    await lobby.channel.sendMessage(`${winner} IS THE WINNER!`);
                    await lobby.channel.sendMessage(`The match has concluded. Thanks for playing!`);
                    if (await getMapsNum() != (bestOf)) await lobby.channel.sendMessage(`Want to play the Tie Breaker map for fun? type: '.tb'`);
                    await lobby.startTimer(45);
                }
            }

            async function banPick(map) {
                await lobby.abortTimer();

                if (matchState == states.Banning) {
                    if (poolOptions.includes(map)) {
                        match.bans.push(map);
                        removeFromPool(map);
                    } else {
                        match.bans.push("no-ban");
                    }

                    informDiscord(matchState);
                    
                    if (match.bans.length == 2 || match.bans.length == 4) {
                        matchState = states.Picking;
                        
                        let banPhase = match.bans.length == 2 ? "First" : "Second";
                        let currentBans = match.bans.toString().toUpperCase();

                        await lobby.channel.sendMessage(`${banPhase} Ban Phase is over. Bans: ${currentBans}`);

                        await stageMessage(firstPick);
                    } else {
                        await stageMessage(firstPick);
                    }
                } else if (matchState == states.Picking) {
                    if (poolOptions.includes(map)) {
                        removeFromPool(map);
                    } else if (map == 'no-pick'){
                        for (let i=0; i<poolOptions.length; i++) {
                            if (poolOptions[i] != undefined) {
                                map = poolOptions[i];
                                break;
                            } 
                        }

                        removeFromPool(map);
                    }
                    
                    await setPick(map);
                }
            }

            async function setPick(map) {
                let mapId;
                let mapNum = map;
                let mapMod = map != "tb" ? `${map[0]}${map[1]}` : map;
                mapNum = map != "tb" ? parseInt(mapNum.substring(2)) - 1 : map;

                switch (mapMod) {
                    case "nm":
                        await lobby.setMods("NF");
                        mapId = poolInfo.maps.noMod[mapNum];
                        break;
                    case "hd":
                        await lobby.setMods("NF HD");
                        mapId = poolInfo.maps.hidden[mapNum];
                        break;
                    case "hr":
                        await lobby.setMods("NF HR");
                        mapId = poolInfo.maps.hardRock[mapNum];
                        break;
                    case "dt":
                        await lobby.setMods("NF DT");
                        mapId = poolInfo.maps.doubleTime[mapNum];
                        break;
                    case "fm":
                        await lobby.setMods("NF");
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        await lobby.setMods('', true);
                        mapId = poolInfo.maps.freeMod[mapNum];
                        break;
                    case "tb":
                        await lobby.setMods("NF");
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        await lobby.setMods('', true);
                        mapId = poolInfo.maps.tieBreaker;
                        break;
                }

                match.picks.push({
                    map: mapId,
                    mod: map,
                    scores: []
                });

                if (mapMod == "tb") {
                    informDiscord(states.Picking);
                } else {
                    informDiscord(matchState);
                }
                
                await lobby.setMap(mapId);

                if (matchState != states.InMatch) matchState = states.InMatch;

                if (mapMod == "fm") {
                    await lobby.channel.sendMessage(`Freemod rules: NM = 0.5x, HR - 1.10x, HD - 1.06x`);
                }

                await lobby.startTimer(120);
            }

            async function setPoolOptions(nm, hd, hr, dt, fm) {
                let pool = [];

                for (let i=1; i < nm + 1; i++) {
                    pool.push(`nm${i}`);
                }

                for (let i=1; i < hd + 1; i++) {
                    pool.push(`hd${i}`);
                }

                for (let i=1; i < hr + 1; i++) {
                    pool.push(`hr${i}`);
                }

                for (let i=1; i < dt + 1; i++) {
                    pool.push(`dt${i}`);
                }

                if (fm) {
                    for (let i=1; i < fm + 1; i++) {
                        pool.push(`fm${i}`);
                    }
                }

                console.log(pool); 

                return pool;
            }

            function removeFromPool(map) {
                const index = poolOptions.indexOf(map);

                if (index > -1) {
                    poolOptions.splice(index, 1);
                }
            }

            function customTeamNames(player1, player2, player3) {
                if (player1 == "DarkerSniper" && player2 == "Soii" || player2 == "DarkerSniper" && player1 == "Soii") {
                    return `Team Devs`;
                } else if (player1 == "F3n1X" && player2 == "Dripster1" || player2 == "F3n1X" && player1 == "Dripster1") {
                    return `Team Backshotters`;
                }

                return `Team ${player1}`;
            }

            async function closeNdisconnect() {
                try {
                    console.log('Closing the lobby and disconnecting...');
                    console.log(match);

                    await removeGame(lobby.id);

                    let midGame = await getGames();
                    console.log(`Active Matches: ${midGame}`);

                    await lobby.closeLobby();
                    console.log('Lobby Closed.');

                    // Remove Match limitation
                    for (let i=0; i<playerArray.length; i++) {
                        let limitId = (await osuUser.findOne({ osuUserName: playerArray[i] })).discordId;

                        await removeMatchLimitation(limitId);
                    }

                    if (tournament) afterMatch(match, tournament);

                    // Handle match-output
                    matchMessage.forEach(async msg => {
                        if (msg.embeds.length == 0 || matchEmbed.data.description.includes('LIVE')) await msg.delete();
                    });

                    return console.log('osuBot disconnected.');
                } catch (error) {
                    console.log(error);
                }
            }

            async function afterMatch(match, tournament) {
                var league = await leagues.findOne({ name: tournament.name });
                var schedule = league.schedule;
                var leagueTeams = league.teams;
                var matches = league.matches;

                let leagueChannel = client.channels.cache.get(league.interactions.channel);
        
                if (match.score[0] != scoreToWin && match.score[1] != scoreToWin) {
                    if (match.score[0] <= match.score[1]) 
                        match.score[1] = scoreToWin;
                    else
                        match.score[0] = scoreToWin;
                }
        
                matches.push(match);
        
                let schedType = tournament.stage == 'Playoffs' ? schedule.playoffs : schedule.groups;
        
                schedType[tournament.round][tournament.match].score = match.score;
        
                // Check if playoffs
                if (tournament.stage == 'Playoffs') {
                    // Input winner to next round
                    let winner = match.score[0] == scoreToWin ? tournament.teams[0] : tournament.teams[1];
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
                    `1. 1000 Currency + IL Champion Pack + IL Pro Pack\n2. 500 Currency + IL Contender Pack\n3-4. 250 Currency + IL Intermediate Pack` :
                    `1. 800 Currency + IL Champion Pack\n2. 400 Currency + IL Intermediate Pack`;
        
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
        
                                homeScore = homeScore == scoreToWin ? bold(`${scoreToWin}`) : `${homeScore}`;
                                awayScore = awayScore == scoreToWin ? bold(`${scoreToWin}`) : `${awayScore}`;
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
        
                                let loser = currentMatch.score[0] == scoreToWin ? awayTeam : homeTeam;
                                let champ = currentMatch.score[0] == scoreToWin ? homeTeam : awayTeam;
                                
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
                        try {
                            await fetchedPlayoffs.edit({
                                content: `${league.name} has concluded.\nThank you for playing!`,
                                embeds: [playoffsEmbed]
                            });
                        } catch (error) {
                            console.log(error);
                        }
        
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
                                    packType: 'Pro',
                                    country: 'IL'
                                });
                            } else {
                                await addCurrecny(discordId, 800);
                                await inventoryAddPack(discordId, inv, {
                                    packType: 'Champion',
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
                        if (match.score[0] == scoreToWin) 
                            leagueTeams[i].record.wins += 1;
                        else 
                            leagueTeams[i].record.losses += 1;
        
                        leagueTeams[i].mapDiff += match.score[0] - match.score[1];
                    } else if (team.name == tournament.teams[1].name) {
                        if (match.score[1] == scoreToWin) 
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
        
                            homeScore = homeScore == scoreToWin ? bold(`${scoreToWin}`) : `${homeScore}`;
                            awayScore = awayScore == scoreToWin ? bold(`${scoreToWin}`) : `${awayScore}`;
        
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
                                content: `${league.name} - ${italic(`Playoffs`)} starts ${dateConversion(league.stages.playoffs)}`,
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
        } catch (error) {
            console.log(error);
        }
        
    }
};
