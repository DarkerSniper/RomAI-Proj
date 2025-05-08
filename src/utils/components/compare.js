const { EmbedBuilder, bold, italic, strikethrough, underline, spoiler, quote, blockQuote, inlineCode , codeBlock } = require('discord.js');
const { LegacyClient, isOsuJSError, Auth, Client } = require('osu-web.js');
const { ScoreCalculator } = require('@kionell/osu-pp-calculator');
const { BeatmapCalculator } = require('@kionell/osu-pp-calculator');

const rosu = require('rosu-pp-js');
const fs = require('fs');

const osuUser = require(`../../schemas/osuUser`);

const { checkTopPlays, checkLeaderboard } = require(`../osu/checkUserScore.js`);
const { downloadAndGetOsuFile } = require('../osu/getOsuFile.js');

const { osuAPI, osuId, osuToken } = process.env;

//Using the APIv1 with the private key that is located in a local file
const legacy = new LegacyClient(osuAPI);

//APIv2
const auth = new Auth(osuId, osuToken);

module.exports = {
    async compareScore(interaction, client, username, message, beatmapId) {
        try {
            let result;
            let interUser = !interaction ? message.member : interaction.user;
            let mention = !interaction ? message.mentions.members.first() : undefined;

            const repliedMessage = !interaction ? (message.reference ? await message.fetchReference().catch(() => undefined) : undefined) : undefined;
            if (repliedMessage && repliedMessage.guild) {
                const member = await repliedMessage.guild.members.fetch(repliedMessage.author.id);
                if (member) mention = undefined;

                console.log(member.user.username);
            }

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

            const { getBeatmap } = require(`../osu/activeData.js`);
            const beatmapid = !beatmapId ? await getBeatmap() : parseInt(beatmapId);
            console.log(beatmapid);

            var user = await legacy.getUser({
                u: username,
            });

            const scores = await api.beatmaps.getBeatmapUserScores(beatmapid, user.user_id, {
                query: {
                  mode: 'osu'
                }
            });

            var beatmaps = await legacy.getBeatmaps({
                b: beatmapid,
            });

            var beatmap = beatmaps[0];
            var beatmapSet = beatmap.beatmapset_id;

            const formatedNum = require(`../osu/formatNum.js`).numberWithCommas;

            let userIcon = interUser.displayAvatarURL();
            let userTag = !interaction ? message.member.user.tag : interUser.tag;

            const compareEmbed = new EmbedBuilder()
                .setTitle(`${beatmap.artist} - ${beatmap.title} [${beatmap.version}]`)
                .setURL(`https://osu.ppy.sh/beatmapsets/${beatmapSet}#osu/${beatmapid}`)
                .setThumbnail(`https://b.ppy.sh/thumb/${beatmapSet}l.jpg`)
                .setFooter({
                    iconURL: userIcon,
                    text: `Requested by ${userTag}`
                })
                .setAuthor({
                    iconURL: `http://s.ppy.sh/a/${user.user_id}`,
                    url: `https://osu.ppy.sh/users/${user.user_id}`,
                    name: `Compared scores of ${user.username} (#${formatedNum(user.pp_rank)} - ${user.country} #${formatedNum(user.pp_country_rank)})`,
                });

            var bytes = await downloadAndGetOsuFile([beatmapid]);

            bytes = bytes[0].filePath;

            console.log(bytes);

            if (!bytes) return await interaction.editReply({
                content: `There has been a problem with getting beatmap information.`
            });

            bytes = fs.readFileSync(bytes);

            for (let i=0; i<scores.length; i++) {
                if (!scores[i]) {
                    continue;
                }

                let score = scores[i];

                var mods = score.mods; 
                var countGeki = score.statistics.count_geki;
                var countKatu = score.statistics.count_katu;
                var count300 = score.statistics.count_300;
                var count100 = score.statistics.count_100;
                var count50 = score.statistics.count_50;
                var misses = score.statistics.count_miss;
                var maxcombo = score.max_combo;
                var rank = score.rank;
                var timePlayed = require(`../osu/formatNum.js`).dateConversion(score.created_at);
                var playerScore = score.score;

                var rankString = require(`../discord/getEmojis.js`).osuRanksAsEmojis(rank);
                var rankEmoji = client.emojis.cache.get(rankString);

                var stringMods = undefined;
                var plus = undefined;

                if (!mods.length == 0 && mods) {
                    stringMods = mods.toString();
                    while (stringMods.includes(",")) stringMods = stringMods.replace(",","");
                    plus = "+";
                }

                const customClockRate = score.replay && (score.mods.includes('DT') || score.mods.includes('HT'))
                    ? /*await getClockRate(score.beatmap.id, score.id)*/ undefined
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

                var beatmapPP = maxAttrs.pp.toFixed(0);
                var scorePP = score.pp ? score.pp : 0; 

                var comboString = maxcombo == beatmap.max_combo ? underline("x" + bold(maxcombo) + "/" + beatmap.max_combo) : "x" + bold(maxcombo) + "/" + beatmap.max_combo;
                var stars = currAttrs.difficulty.stars.toFixed(2);
                var acc = (score.accuracy * 100).toFixed(2);

                stringMods = plus == undefined ? " " : plus + inlineCode(stringMods);

                var topLocal = i == 0 ? await checkTopPlays(scorePP, username) : undefined;
                var topLB = i == 0 ? await checkLeaderboard(playerScore, beatmapid) : undefined;
                var topDisplay = "";

                if (topLB) {
                    topDisplay += bold(`Global Top #${topLB} `);

                    if (topLocal == 1) {
                        topDisplay += bold(` and ${underline("Top Play (Local #1)")}`);
                    } else if (topLocal) {
                        topDisplay += bold(`and Local Top #${topLocal}`);
                    }
                } else if (topLocal == 1) {
                    topDisplay += bold(`${underline("Top Play (Local #1)")}`);
                } else if (topLocal) {
                    topDisplay += bold(`Local Top #${topLocal}`);
                }

                console.log(playerScore);

                let val = `${rankEmoji} (${stars}★) ${stringMods} | ${bold(acc)}% | ${bold(formatedNum(playerScore))}\n${bold("[")} ${count300} • ${count100} • ${count50} • ${misses} ${bold("]")} | ${comboString}\n${bold(scorePP.toFixed(0))}pp/${beatmapPP}pp | ${bold(timePlayed[0].toUpperCase() + timePlayed.substring(1))}`;

                if (i == 0) {
                    compareEmbed.addFields({
                        name: `${topDisplay}\n\nHighest Score:`,
                        value: val
                    });
                } else if (i == 1) {
                    compareEmbed.addFields({
                        name: `Other Scores:`,
                        value: val
                    });
                } else {
                    compareEmbed.addFields({
                        name: `  `,
                        value: val
                    });
                }
            }

            return result = {
                embeds: [compareEmbed]
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
                    content: `This user has no submitted scores on this map.`
                }
            } else {
                return result = {
                    content: `There has been an error executing this command.`
                }
            }
        }
    }
};