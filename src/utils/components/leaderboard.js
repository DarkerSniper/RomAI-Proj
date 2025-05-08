const mongoose = require('mongoose');
const { EmbedBuilder, hyperlink, bold, inlineCode } = require('discord.js');
const { isOsuJSError, Client, Auth } = require('osu-web.js');

const leaderboardDB = require(`../../schemas/leaderboards`);
const osuUser = require(`../../schemas/osuUser`);
const { numberWithCommas } = require(`../osu/formatNum`);
const { relativeTimeThreshold } = require('moment/moment');
const { startingElo } = require('../osu/skillsCalculation');

const { osuId, osuToken } = process.env;

//APIv2
const auth = new Auth(osuId, osuToken);

module.exports = {
    async handleLeaderboards(interaction, client, action, leaderboardName, players) {
        try {
            let reply;

            async function authQ() {
                if (interaction.user.tag != 'romdarker' && interaction.user.tag != 'likwy') {
                    reply = await interaction.editReply({
                        content: `You do not have access to this command.`
                    });
                    return false;
                }
                return true;
            }

            let leaderboardInfo = await leaderboardDB.findOne({ name: leaderboardName });

            async function showLeaderboard() {
                const leaderboardEmbed = new EmbedBuilder();

                    async function createEmbed(leaderboard) {
                        console.log(leaderboard.players);
                        leaderboardEmbed.setTitle(`${leaderboard.name}`);

                        let leaderboardMode = leaderboard.mode;
                        if (leaderboardMode == 1) leaderboardMode = `1v1`;
                        else if (leaderboardMode == 2) leaderboardMode = `2v2`;
                        leaderboardEmbed.setDescription(`Game Mode: ${leaderboardMode}`);

                        let lbCom = [];
                        let nl = [];

                        let sortedPlayers = [...leaderboard.players.entries()].sort(function(a,b) {
                            let elo1 = a[1];
                            let elo2 = b[2];

                            if (isNaN(a[1])) {
                                elo1 = -1;
                            } 
                            if (isNaN(b[1])) {
                                elo2 = -1;
                            }
                            return (+a[1]) - (+b[1]);
                        });
                        console.log(sortedPlayers);
                        let bestAvatar;
                        let i = 0;

                        const token = await auth.clientCredentialsGrant();
                        const api = new Client(token.access_token);

                        async function sortPlayer(value, key) {
                            let user = await osuUser.findOne({ osuUserName: key });

                            if (!user) {
                                nl.push(`${bold(key)} - Discord User is not linked.`);
                                return;
                            } else if (value == 'not-linked') {
                                let tempMap = leaderboard.players;
                                let tempRecords = leaderboard.records;

                                tempMap.set(user.osuUserName, user.elo);
                                tempRecords.set(user.osuUserName, {
                                    wins: 0,
                                    losses: 0
                                });
                                value = 0;
                                
                                await leaderboardDB.updateOne({ name: leaderboard.name }, {
                                    $set: {
                                        players: tempMap,
                                        records: tempRecords
                                    },
                                });
                            }

                            const thisUser = await api.users.getUser(user.osuUserId, {
                                urlParams: {
                                  mode: 'osu'
                                }
                            });

                            let c = 0;
                            let w;
                            /*
                            for (let j=user.recentMatches.length; j>0; j--) {
                                let recents = user.recentMatches;
                                let playerInGame = recents[j].players.indexOf(user.osuUserName);
                                let win = recents[j].score[playerInGame] == 4 ? true : false;
                                
                                if (j == user.recentMatches.length) { 
                                    w = win ? true : false;
                                }

                                if (w) {
                                    if (win) c++; else break;
                                } else {
                                    if (!win) c++; else break;
                                }
                            }
                            */

                            let streak = c == 0 ? "" : `Streak: ${c}${w ? "W" : "L"}`;

                            let globalRank = numberWithCommas(thisUser.statistics.global_rank);
                            let record = leaderboard.records.get(key);
                            let com = `:flag_${thisUser.country_code.toLowerCase()}: ${bold(key)} (#${globalRank}) - ELO: ${value} (${record.wins}W - ${record.losses}L) ${streak}`;
                            console.log(user.elo);
                            lbCom.unshift(com);
                            if (lbCom.indexOf(com) == 0) bestAvatar = thisUser.avatar_url;
                        }
                        
                        for (let i=0; i<sortedPlayers.length; i++) {
                            await sortPlayer(sortedPlayers[i][1], sortedPlayers[i][0]);
                        }

                        lbCom.forEach(com => {
                            leaderboardEmbed.addFields({
                                name: `  `,
                                value: `${lbCom.indexOf(com) + 1}. ${com}`
                            });
                        });

                        nl.forEach(n => {
                            leaderboardEmbed.addFields({
                                name: `  `,
                                value: `${n}`
                            });
                        });
                        leaderboardEmbed.setThumbnail(bestAvatar);
                    }

                    if (!leaderboardInfo) {
                        let latestLB = await leaderboardDB.find({}, {}, { sort: { 'created_at' : -1 } });

                        if (!latestLB) {
                            reply = {
                                content: `There are no leaderboards to display.`
                            };
                            return;
                        }

                        await createEmbed(latestLB[0]);

                        reply = {
                            embeds: [leaderboardEmbed]
                        };
                    } else {
                        await createEmbed(leaderboardInfo);

                        reply = {
                            embeds: [leaderboardEmbed]
                        };
                    }
            }

            switch (action) {
                case "Add":
                    if (!await authQ()) break;

                    if (!leaderboardName) {
                        reply = {
                            content: `You need to specify the leaderboard's name`
                        };
                        break;
                    }

                    if (!players) {
                        reply = {
                            content: `You need to insert osu! usernames`
                        };
                        break;
                    }
            
                    let playerArray = players.split("-");
                    var playerMap = new Map();
                    var recordMap = new Map();
                    for (let i=0; i<playerArray.length; i++) {
                        let user = await osuUser.findOne({ osuUserName: playerArray[i] });
                        if (!user) {
                            playerMap.set(playerArray[i], 'Discord user not linked');
                        } else {
                            playerMap.set(user.osuUserName, user.elo);
                            recordMap.set(user.osuUserName, {
                                wins: 0,
                                losses: 0
                            });
                        }
                    }
                    console.log(playerMap);

                    if (!leaderboardInfo) {
                        leaderboardInfo = await new leaderboardDB({
                            _id: new mongoose.Types.ObjectId(),
                            name: leaderboardName,
                            players: playerMap,
                            records: recordMap
                        });
            
                        await leaderboardInfo.save();
                        console.log(leaderboardInfo);
                        reply = {
                            content: `Leaderboard: ${bold(leaderboardInfo.name)} has been added.\nPlayers: ${playerMap.keys()}`
                        };
                    } else {
                        reply = {
                            content: `This leaderboard already exists.`
                        };
                    }
                    break;
                case "Remove":
                    if (!await authQ()) break;

                    if (!leaderboardInfo) {
                        reply = {
                            content: `This leaderboard does not exist`
                        };
                    } else {
                        await leaderboardDB.deleteOne({ name: leaderboardName });

                        reply = {
                            content: `Leaderboard: ${bold(leaderboardName)} has been removed.`
                        };
                    }
                    break;
                case "Show":
                    await showLeaderboard();
                    break;
                case "Start":
                    if (!await authQ()) break;

                    if (!leaderboardInfo) {
                        reply = {
                            content: `A valid leaderboard name is required`
                        };
                        break;
                    } else {
                        if (!leaderboardInfo.startDate) {
                            await leaderboardInfo.updateOne({ startDate: Date.now() });

                            reply = {
                                content: `${leaderboardInfo.name} has started!`
                            };
                            break;
                        } else {
                            reply = {
                                content: `${leaderboardInfo.name} has already begun.`
                            };
                            break;
                        }
                    }
                case "Finish":
                    if (!await authQ()) break;

                    if (!leaderboardInfo) {
                        reply = {
                            content: `A valid leaderboard name is required`
                        };
                        break;
                    } else {
                        if (!leaderboardInfo.endDate) {
                            await leaderboardInfo.updateOne({ endDate: Date.now() });

                            reply = {
                                content: `${leaderboardInfo.name} has ended!`
                            };
                            break;
                        } else {
                            reply = {
                                content: `${leaderboardInfo.name} has already concluded.`
                            };
                            break;
                        }
                    }
                //case "List":
                //    break;
                default:
                    // same as "Show"
                    await showLeaderboard();
                    break;
            }

            if (!reply) return;

            return await interaction.editReply(reply);
        } catch (error) {
            console.log(error);

            return interaction.editReply({
                content: `Something went wrong...`
            });
        }
    },

    async updateLeaderboards(players) { // players - Array of player names
        players.forEach(async player => {
            let osuPlayer = await osuUser.findOne({ osuUserName: player });
            let playerElo = osuPlayer.elo;

            let playerLeaderboards = await leaderboardDB.find().exists(player);
            console.log(`Player's leaderboards: ${playerLeaderboards}`);

            playerLeaderboards.map(async lb => {
                let playerMap = lb.players;
                playerMap.set(player, playerElo);

                await lb.updateOne({ players: playerMap });
            });
        });
    }
}