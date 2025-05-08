const { AttachmentBuilder, bold, EmbedBuilder } = require('discord.js');
const { Client, Auth } = require('osu-web.js');
const { BeatmapCalculator } = require('@kionell/osu-pp-calculator');
const lodash = require('lodash');

const osuUser = require('../../schemas/osuUser');
const { createCard } = require('../soii/createCard');
const { convertAccuracy } = require('../osu/modStatCalc');
const { getRegionFlag, fetchUserRegion, fetchRegionInfo } = require('../osu/regions');
const { cardDate } = require('../osu/formatNum');
const { cardRarity } = require('../osu/skillsCalculation');
const { addToInventory } = require('../components/inventory');
const { loadingMessage } = require('../discord/loading');
const { removePackReservation } = require('../osu/activeData');
const { aimCalc, speedCalc, accuracyCalc, potentialCalc } = require('../osu/skillsCalculation');

const { osuId, osuToken } = process.env;

// APIv2
const auth = new Auth(osuId, osuToken);

module.exports = {
    async playerCard(interaction, client, username, message, pack) {
        let result;
        const interUser = interaction?.user || message.member.user;
        const discordUser = interUser.id;
        const mention = message?.mentions.members.first();

        try {
            if (!username) {
                const osuUserProfile = await osuUser.findOne({ discordId: discordUser });
                if (!osuUserProfile) {
                    const content = `Please link your osu! account using ${inlineCode("/authosu")} OR specify a username.`;
                    return interaction ? await interaction.editReply({ content }) : await message.reply({ content });
                }
                username = osuUserProfile.osuUserName;
            }

            if (mention) {
                const osuUserProfile = await osuUser.findOne({ discordId: mention.id });
                if (!osuUserProfile) {
                    return { content: `The user you mentioned did not link their osu! account.` };
                }
                username = osuUserProfile.osuUserName;
            }

            const token = await auth.clientCredentialsGrant();
            const api = new Client(token.access_token);

            const user = await api.users.getUser(username, {
                urlParams: { mode: 'osu' },
                query: { key: 'username' },
            });

            const rarity = await cardRarity(user.statistics.global_rank);

            const cardProg = interaction
                ? await interaction.editReply({ content: `Executing.. (Uncached data might take longer).` })
                : await message.reply({ content: `Executing.. (Uncached data might take longer).` });

            const tasks = ['Getting Scores', 'Calculating Profile', 'Finishing Calculations'];
            const loading = await loadingMessage(!pack ? `${user.username} Card Progress` : `Pack Opening Progress`, tasks);

            const replying = async (msg, embed) => {
                const payload = { content: `${msg}  `, embeds: embed ? [embed] : [] };
                interaction ? await interaction.editReply(payload) : await cardProg.edit(payload);
            };

            replying('  ', loading().changeState(0, 'executing'));

            const scoresV2 = await api.users.getUserScores(user.id, 'best', {
                query: { mode: 'osu', limit: 100 },
            });

            const beatmapCalculator = new BeatmapCalculator();

            let topPlay = {};
            let skillAverages = {
                aimDifficulty: 0,
                circleSize: 0,
                scoreStarRating: 0,
                starRating: 0,
                misses: 0,
                speedDifficulty: 0,
                scoreBpm: 0,
                bpm: 0,
                approachRate: 0,
                accuracy: 0,
                playerCombo: 0,
                mapCombo: 0,
                overallDifficulty: 0,
                hpDrain: 0,
                fixAccuracy: 0,
                fixPP: 0,
                hidden: 0,
                scoreCount: scoresV2.length,
            };

            let cooldown = new Date();
            let i = 0;

            const processScore = async (score) => {
                const {
                    mods,
                    statistics: { count_300, count_100, count_50, count_miss: misses },
                    max_combo: playerCombo,
                    beatmap,
                    beatmapset,
                    pp,
                    rank,
                    score: rawScore,
                } = score;
                const stringMods = mods.length > 0 ? mods.join('') : undefined;
                const playerAcc = convertAccuracy(count_300, count_100, count_50, misses) * 100;
                const fixPlayerAcc = convertAccuracy(count_300 + misses, count_100, count_50, 0) * 100;

                const beatmapCalc = await beatmapCalculator.calculate({
                    beatmapId: beatmap.id,
                    mods: stringMods,
                    accuracy: [fixPlayerAcc],
                });

                const infoBeatmap = (await api.beatmaps.getBeatmapAttributes(beatmap.id)).attributes;
                const bruhBeatmap = await api.beatmaps.getBeatmap(beatmap.id);

                skillAverages.aimDifficulty += beatmapCalc.difficulty.aimDifficulty;
                skillAverages.circleSize += beatmapCalc.difficulty.circleSize ?? beatmapCalc.beatmapInfo.circleSize;
                skillAverages.scoreStarRating += beatmapCalc.difficulty.starRating;
                skillAverages.starRating += infoBeatmap.star_rating;
                skillAverages.misses += misses;
                skillAverages.speedDifficulty += beatmapCalc.difficulty.speedDifficulty;
                skillAverages.scoreBpm += beatmapCalc.beatmapInfo.bpm;
                skillAverages.bpm += bruhBeatmap.bpm;
                skillAverages.approachRate += beatmapCalc.difficulty.approachRate ?? beatmapCalc.beatmapInfo.approachRate;
                skillAverages.accuracy += playerAcc;
                skillAverages.playerCombo += playerCombo;
                skillAverages.mapCombo += infoBeatmap.max_combo !== 0 ? infoBeatmap.max_combo : beatmapCalc.difficulty.maxCombo;
                skillAverages.overallDifficulty += beatmapCalc.difficulty.overallDifficulty ?? beatmapCalc.beatmapInfo.overallDifficulty;
                skillAverages.hpDrain += beatmapCalc.difficulty.drainRate ?? beatmapCalc.beatmapInfo.drainRate;
                skillAverages.fixAccuracy += fixPlayerAcc;
                skillAverages.fixPP += beatmapCalc.performance[0].totalPerformance;
                if (stringMods?.includes('HD')) skillAverages.hidden++;

                if (i === 50 && pack) {
                    replying(bold(rarity.rarity));
                }

                if (scoresV2[0].beatmap.id == beatmap.id) {
                    topPlay = {
                        song: beatmapset.title,
                        diff: beatmap.version,
                        mapId: beatmapset.id,
                        enabled_mods: mods,
                        sr: beatmapCalc.difficulty.starRating.toFixed(2),
                        score: rawScore,
                        pp: pp.toFixed(0),
                        acc: playerAcc.toFixed(2),
                        combo: playerCombo,
                        rank,
                    };
                }

                const interval = new Date();
                if ((interval - cooldown) / 1000 > 3) {
                    cooldown = interval;
                    replying('   ', loading().changeState(1, 'executing', i + 1).setColor(rarity.type.midtoneColor));
                }
                i++;
            };

            await Promise.all(scoresV2.map(processScore));

            loading().changeState(1, 'completed');
            replying('  ', loading().changeState(2, 'executing').setColor(rarity.type.midtoneColor));

            const osuUserProfile = await osuUser.findOne({ osuUserId: user.id });

            const elo = {
                '1v1': osuUserProfile?.elo['1v1'] !== 0 ? osuUserProfile?.elo['1v1'] : undefined,
                '2v2': osuUserProfile?.elo['2v2'] !== 0 ? osuUserProfile?.elo['2v2'] : undefined,
            };

            const matchRecord = {
                '1v1': osuUserProfile?.matchRecord['1v1']?.wins !== undefined ? osuUserProfile.matchRecord['1v1'] : undefined,
                '2v2': osuUserProfile?.matchRecord['2v2']?.wins !== undefined ? osuUserProfile.matchRecord['2v2'] : undefined,
            };

            const userRegionInfo = await fetchUserRegion(user.id);
            let region, regionalRanking, regionImg;

            if (userRegionInfo) {
                const regionInfo = await fetchRegionInfo(userRegionInfo.country, userRegionInfo.region);
                region = regionInfo.name;
                regionalRanking = userRegionInfo.rank;
                regionImg = regionInfo.flag;
            }

            const {
                hit_accuracy: accuracy,
                level: { current: levelCurrent, progress: levelProgress },
                play_time: playTime,
                play_count: playCount,
            } = user.statistics;
            const level = parseFloat(`${levelCurrent}.${levelProgress}`);
            const medals = user.user_achievements.length;

            const normalize = (val) => val / skillAverages.scoreCount;

            const skillAim = await aimCalc(normalize(skillAverages.aimDifficulty), normalize(skillAverages.circleSize), normalize(skillAverages.scoreStarRating), normalize(skillAverages.starRating), normalize(skillAverages.misses), skillAverages.hidden);
            const skillSpeed = await speedCalc(normalize(skillAverages.speedDifficulty), normalize(skillAverages.scoreBpm), normalize(skillAverages.approachRate), normalize(skillAverages.scoreStarRating), normalize(skillAverages.starRating), normalize(skillAverages.playerCombo));
            const skillAccuracy = await accuracyCalc(skillAim, normalize(skillAverages.accuracy), normalize(skillAverages.starRating), normalize(skillAverages.playerCombo), normalize(skillAverages.mapCombo), skillSpeed, normalize(skillAverages.overallDifficulty), normalize(skillAverages.hpDrain));

            const skillAimFix = await aimCalc(normalize(skillAverages.aimDifficulty), normalize(skillAverages.circleSize), normalize(skillAverages.scoreStarRating), normalize(skillAverages.starRating), 0, skillAverages.hidden);
            const skillAccFix = await accuracyCalc(skillAimFix, normalize(skillAverages.fixAccuracy), normalize(skillAverages.starRating), normalize(skillAverages.mapCombo), normalize(skillAverages.mapCombo), skillSpeed, normalize(skillAverages.overallDifficulty), normalize(skillAverages.hpDrain));
            const skillPotential = await potentialCalc(normalize(skillAverages.fixPP), skillAccFix);

            const curDate = cardDate();
            replying('Preparing Card...');

            const inputs = {
                'card-type': rarity.type,
                player: user.username,
                id: user.id,
                country: user.country.code,
                region,
                regionFlag: regionImg,
                date: curDate,
                stats: {
                    pp: user.statistics.pp,
                    globalRank: user.statistics.global_rank,
                    acc: accuracy,
                    level,
                    countryRank: user.statistics.country_rank,
                    regionRank: regionalRanking,
                    playtime: playTime,
                    playcount: playCount,
                    medals,
                },
                skills: {
                    potential: skillPotential,
                    acc: skillAccuracy,
                    speed: skillSpeed,
                    aim: skillAim,
                },
                topPlay,
                elo: {
                    '1v1': { elo: elo['1v1'], wins: matchRecord['1v1']?.wins, loses: matchRecord['1v1']?.losses },
                    '2v2': { elo: elo['2v2'], wins: matchRecord['2v2']?.wins, loses: matchRecord['2v2']?.losses },
                },
            };

            let duplicate = false;
            if (pack) {
                const dupe = await addToInventory(discordUser, undefined, inputs);
                duplicate = dupe !== undefined ? dupe : false;
            }

            const attachment = await createCard(inputs, inputs['card-type']);
            const endTime = new Date();
            const timeDiff = endTime - cooldown;
            console.log(`Calculation Time: ${timeDiff / 1000} seconds`);

            if (pack) {
                await removePackReservation(parseInt(discordUser));
                attachment.name = attachment.name.replace(/[\s\[\]_,]/g, '');
                const cardEmbed = new EmbedBuilder()
                    .setDescription(`You packed a ${bold(rarity.rarity)}`)
                    .setImage(`attachment://${attachment.name}`)
                    .setColor(rarity.type.midtoneColor)
                    .setFooter({ text: `Packed from ${pack.country} ${pack.packType}` });

                const  payload = {
                    content: duplicate !== false ? `Duplicate! +${duplicate} romBucks` : `  `,
                    embeds: [cardEmbed],
                    files: [attachment],
                };
                return interaction ? await interaction.editReply(payload) : await cardProg.edit(payload);
            }

            const payload = { content: `  `, files: [attachment], embeds: [] };
            return interaction ? await interaction.editReply(payload) : await cardProg.edit(payload);

        } catch (err) {
            if (pack) {
                let interUser = !interaction ? message.member : interaction.user;
                const discordUser = !interaction ? interUser.user.id : interUser.id;

                await removePackReservation(discordUser);
            }              

            console.log(err);

            if (err.toString().includes('user_id') || err.toString().includes('enabled_mods')) {
                return result = {
                    content: `Please enter a valid username.`
                }
            } else {
                return result = {
                    content: `There has been an error executing this command.`
                }
            }
        }
    },
};