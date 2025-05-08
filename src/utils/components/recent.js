const { EmbedBuilder, bold, italic, strikethrough, underscore, spoiler, quote, blockQuote, inlineCode , codeBlock, underline } = require('discord.js');
const { LegacyClient, isOsuJSError, Auth, Client } = require('osu-web.js');
const { ScoreCalculator } = require('@kionell/osu-pp-calculator');
const { BeatmapCalculator } = require('@kionell/osu-pp-calculator');
const rosu = require('rosu-pp-js');
const fs = require('fs');

const osuUser = require(`../../schemas/osuUser`);

const { checkLeaderboard, checkTopPlays } = require(`../osu/checkUserScore.js`);
const { xpAdd } = require(`../discord/xp.js`);
const { inventoryAddPack } = require('../discord/invAddPack.js');
const { topPlayReward } = require('../discord/packs.js');
const { downloadAndGetOsuFile, getClockRate } = require('../osu/getOsuFile.js');

const { osuAPI, osuId, osuToken } = process.env;

//Using the APIv1 with the private key that is located in a local file
const legacy = new LegacyClient(osuAPI);

//APIv2
const auth = new Auth(osuId, osuToken);

module.exports = {
    async recentScore(interaction, client, username, message, previous) {
        let result;
        let interUser = !interaction ? message.member : interaction.user;
        let mention = !interaction ? message.mentions.members.first() : undefined;

        try {
            if (!username) {
                const discordUser = !interaction ? interUser.user.id : interUser.id;
                let osuUserProfile = await osuUser.findOne({ discordId: discordUser });
    
                if (!osuUserProfile) {
                    return result = {
                        content: `Please link your osu! account using ${inlineCode("/authosu")} OR specify a username.`
                    };
                }
    
                username = osuUserProfile.osuUserName;
            }

            if (mention) {
                let osuUserProfile = await osuUser.findOne({ discordId: mention.id });

                if (!osuUserProfile) {
                    return result = {
                        content: `The user you mentioned did not link his osu! account.`
                    };
                }

                username = osuUserProfile.osuUserName;
            }

            const token = await auth.clientCredentialsGrant();
            const api = new Client(token.access_token);

            let user = await legacy.getUser({
                u: username,
            });

            console.log(`getting recent scores`);

            const score = await api.users.getUserScores(user.user_id, 'recent', {
                query: {
                  mode: 'osu',
                  limit: 100,
                  include_fails: true
                }
            });

            previous = !previous ? 0 : (previous >= 100 ? previous = 99 : previous - 1);
            previous = parseInt(previous);
            console.log(`calculating recent score with ${previous} args`);

            var beatmapid = score[previous].beatmap.id;
            var mods = score[previous].mods; 
            var countGeki = score[previous].statistics.count_geki;
            var countKatu = score[previous].statistics.count_katu;
            var count300 = score[previous].statistics.count_300;
            var count100 = score[previous].statistics.count_100;
            var count50 = score[previous].statistics.count_50;
            var misses = score[previous].statistics.count_miss;
            var maxcombo = score[previous].max_combo;
            var rank = score[previous].rank;
            var timePlayed = require(`../osu/formatNum.js`).dateConversion(score[previous].created_at);
            var playerScore = score[previous].score;

            var rankString = require(`../discord/getEmojis.js`).osuRanksAsEmojis(rank);
            var rankEmoji = client.emojis.cache.get(rankString);

            var stringMods = undefined;
            var plus = undefined;

            if (!mods.length == 0) {
                stringMods = mods.toString();
                while (stringMods.includes(",")) stringMods = stringMods.replace(",","");
                plus = "+";
            } 

            console.log(`Mods used in this play: ${mods.toString()}`);

            let beatmaps = await legacy.getBeatmaps({
                b: beatmapid,
            });

            var beatmap = beatmaps[0];

            var beatmapSet = beatmap.beatmapset_id;
            
            var bytes = await downloadAndGetOsuFile([score[previous].beatmap.id]);

            bytes = bytes[0].filePath;

            console.log(bytes);

            if (!bytes) return await interaction.editReply({
                content: `There has been a problem with getting beatmap information.`
            });

            bytes = fs.readFileSync(bytes);

            const customClockRate = score[previous].replay && (score[previous].mods.includes('DT') || score[previous].mods.includes('HT'))
                ? /*await getClockRate(score[previous].beatmap.id, score[previous].id)*/undefined
                : undefined;

            let map = new rosu.Beatmap(bytes);

            console.log(map);

            const maxAttrs = new rosu.Performance({ mods: !stringMods ? "" : stringMods, clockRate: customClockRate }).calculate(map);

            console.log(`maxAttrs: ${maxAttrs}`);

            const currAttrs = new rosu.Performance({
                mods: !stringMods ? "" : stringMods,
                n300: count300,
                n100: count100,
                n50: count50,
                misses: misses,
                combo: maxcombo,
                clockRate: customClockRate
            }).calculate(maxAttrs);
            
            const fixedAttrs = new rosu.Performance({
                mods: !stringMods ? "" : stringMods,
                n300: count300 + misses,
                n300: count300,
                n100: count100,
                n50: count50,
                misses: 0,
                combo: beatmap.max_combo,
                clockRate: customClockRate
            }).calculate(maxAttrs);

            /*
            const beatmapCalculator = new BeatmapCalculator();
            const scoreCalculator = new ScoreCalculator();

            const beatmapCalc = await beatmapCalculator.calculate({
                beatmapId: beatmapid,
                mods: stringMods,
                accuracy: [100],
            });
            
            const scoreCalc = await scoreCalculator.calculate({
                beatmapId: beatmapid,
                mods: stringMods,
                count300: count300,
                count100: count100,
                count50: count50,
                countGeki: countGeki,
                countKatu: countKatu,
                countMiss: misses,
                maxCombo: maxcombo,
            });

            const noMissCalc = await scoreCalculator.calculate({
                beatmapId: beatmapid,
                mods: stringMods,
                count300: count300,
                count100: count100,
                count50: count50,
                countGeki: countGeki,
                countKatu: countKatu,
                countMiss: misses,
                maxCombo: maxcombo,
                fix: true,
            });
            
            var beatmapPP = beatmapCalc.performance[0].totalPerformance.toFixed(0);
            var scorePP = parseInt(scoreCalc.performance.totalPerformance.toFixed(0)); 
            var fixPP = noMissCalc.performance.totalPerformance.toFixed(0);
            */

            var beatmapPP = maxAttrs.pp.toFixed(0);
            var scorePP = score[previous].pp ? score[previous].pp.toFixed(0) : currAttrs.pp.toFixed(0); 
            var fixPP = fixedAttrs.pp.toFixed(0);

            var acc = (score[previous].accuracy * 100).toFixed(2);

            const formatedNum = require(`../osu/formatNum.js`).numberWithCommas;

            var comboString = maxcombo == beatmap.max_combo ? underline("x" + bold(maxcombo) + "/" + beatmap.max_combo) : "x" + bold(maxcombo) + "/" + beatmap.max_combo;
            var stars = currAttrs.difficulty.stars.toFixed(2);
            var mapCompletion = Math.floor(((misses + count50 + count100 + count300) / (beatmap.count_normal + beatmap.count_slider + beatmap.count_spinner)) * 100);

            stringMods = plus == undefined ? " " : plus + inlineCode(stringMods);

            let userIcon = interUser.displayAvatarURL();
            let userTag = !interaction ? message.member.user.tag : interUser.tag;

            var isRanked = beatmap.approved == 'ranked' || beatmap.approved == 'approved' ? (score[previous].score == 0 ? italic("(if ranked)") : "") : italic("(if ranked)");

            var topLocal = rank == 'F' ? undefined : (beatmap.approved == 'ranked' ? await checkTopPlays(score[previous].pp, username, beatmapid, score[previous].id) : undefined);
            var topLB = rank == 'F' ? undefined : await checkLeaderboard(playerScore, beatmapid);
            var topDisplay = "";

            if (topLB && isRanked == "") {
                topDisplay += bold(`Global Top #${topLB} `);

                if (topLocal == 1) {
                    topDisplay += bold(`and ${underline("NEW TOP PLAY")} ${isRanked}`);
                } else if (topLocal) {
                    topDisplay += ` and ${bold(`Local Top #${topLocal} ${isRanked}`)}`;
                }
            } else if (topLocal == 1 && isRanked == "") {
                topDisplay += bold(`${underline("NEW TOP PLAY")} ${isRanked}`);
            } else if (topLocal && isRanked == "") {
                topDisplay += bold(`Local Top #${topLocal} ${isRanked}`);
            }

            const recentEmbed = new EmbedBuilder()
                .setTitle(`${beatmap.artist} - ${beatmap.title}`)
                .setURL(`https://osu.ppy.sh/beatmapsets/${beatmapSet}#osu/${beatmapid}`)
                .addFields({
                    name: `${topDisplay}\n\n`,
                    value: `${rank == 'F' ? `${mapCompletion}% Map Completion\n` : ''}${rankEmoji} ${italic(bold(beatmap.version))} (${stars}★) ${stringMods} | ${bold(formatedNum(playerScore))}\n\n${bold("Acc: " + acc)}% 🌟 ${comboString} 🌟 ${bold("[")} ${/*300emoji*/count300} • ${/*100emoji*/count100} • ${/*50emoji*/count50} • ${/*xemoji*/misses} ${bold("]")}\n${bold("pp: " + scorePP + "pp")}${isRanked}/${fixPP}pp (if FC) | ${bold("pp for SS:")} ${beatmapPP}pp`
                }, 
                {
                    name: `  `,
                    value: `
                    Played ${bold(timePlayed[0].toUpperCase() + timePlayed.substring(1))}
                    `
                },
                )
                .setThumbnail(`https://b.ppy.sh/thumb/${beatmapSet}l.jpg`)
                .setFooter({
                    iconURL: userIcon,
                    text: `Requested by ${userTag}`
                })
                .setAuthor({
                    iconURL: `http://s.ppy.sh/a/${user.user_id}`,
                    url: `https://osu.ppy.sh/users/${user.user_id}`,
                    name: `Recent play by ${user.username} (#${formatedNum(user.pp_rank)} - ${user.country} #${formatedNum(user.pp_country_rank)})`,
                });

            const saveMap = require(`../osu/activeData.js`).saveBeatmap;

            saveMap(beatmapid);

            // Top Local Rewards
            let userDB = await osuUser.findOne({ osuUserId: user.user_id });

            if (topLocal && userDB && isRanked == "") {
                const storeScore = {
                    beatmapId: beatmapid,
                    score: playerScore,
                    date: score[previous].created_at,
                    topLocal: topLocal
                };

                let scoreRewards = userDB.scoreRewards;

                let found = false;

                scoreRewards.forEach(s => {
                    if (s.beatmapId == storeScore.beatmapId && 
                        s.score == storeScore.score &&
                        s.date == storeScore.date) {
                            found = true;
                        }
                });

                if (!found) {
                    scoreRewards.push(storeScore);

                    let rewards = await topPlayReward(userDB.discordId, topLocal);
                    let rewardText = ``;

                    if (rewards.length == 0) return {
                        content: `  `,
                        embeds: [recentEmbed]
                    };

                    await osuUser.updateOne({ osuUserId: user.user_id }, {
                        $set: {
                            scoreRewards: scoreRewards
                        }
                    });

                    for (let reward of rewards) {
                        /*
                            reward = {
                                packType: String,
                                country: String
                            }
                        */

                        let userInventory = (await osuUser.findOne({ discordId: userDB.discordId })).inventory;
                        await inventoryAddPack(userDB.discordId, userInventory, reward);

                        rewardText += `+ ${bold(reward.packType)} ${user.country} Pack\n`;
                        console.log(`${userDB.osuUserName} has just got a top ${topLocal} play and has been rewarded with: ${reward.packType}`);
                    }

                    maxAttrs.free();
                    currAttrs.free();
                    fixedAttrs.free();

                    return {
                        content: `<@${userDB.discordId}> TOP ${topLocal} LOCAL PLAY DETECTED!\n${rewardText}`,
                        embeds: [recentEmbed]
                    }
                }
            }

            if (beatmap.title == 'Heat abnormal' && beatmap.creator_id == 7777875) return result = {
                content: `You shouldn't play this map. Consider this a friendly warning.`,
                embeds: [recentEmbed]
            }

            return result = {
                embeds: [recentEmbed]
            };
        } catch (err) { //error handling
            if (isOsuJSError(err)) {
                // `err` is now of type `OsuJSError`
            
                if (err.type === 'invalid_json_syntax') {
                  // `err` is now of type `OsuJSGeneralError`
                  console.error('Error while parsing response as JSON');
                } else if (err.type === 'network_error') {
                  // `err` is now of type `OsuJSGeneralError`
                  console.error('Network error');
                } else if (err.type === 'unexpected_response') {
                  // `err` is now of type `OsuJSUnexpectedResponseError`
            
                  /**
                   * If using the fetch polyfill instead of the native fetch API, write:
                   * `err.response(true)`
                   * "true" means that it will return the Response type from "node-fetch" instead of the native Response
                   */
                  const response = err.response(); // Type: `Response`
            
                  console.error('Unexpected response');
                  console.log(`Details: ${response.status} - ${response.statusText}`);
                  console.log('JSON: ', await response.json());
                }
            }

            console.log(err);
            if (err.toString().includes('beatmap_id')) {
                return result = {
                    content: `This user has no played maps in the last 24 hours.`
                }
            } else {
                return result = {
                    content: `There has been an error executing this command.`
                }
            }
        }
    }
};