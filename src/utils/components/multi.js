const { EmbedBuilder } = require('discord.js');
const { LegacyClient, isOsuJSError } = require('osu-web.js');
const { BeatmapCalculator } = require('@kionell/osu-pp-calculator');

const osuUser = require(`../../schemas/osuUser`);
const { convertAccuracy } = require(`../osu/modStatCalc`);

const { osuAPI } = process.env;

//Using the APIv1 with the private key that is located in a local file
const legacy = new LegacyClient(osuAPI);

module.exports = {
    async multiMatch(interaction, client, username, message, ignoreMaps) {
        try {
            let result;
            let interUser = !interaction ? message.member : interaction.user;

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

            const lobby = await legacy.getMultiplayerLobby({
                mp: 113460147
            });

            const info = lobby.match;
            const maps = lobby.games;

            let userIcon = interUser.displayAvatarURL();
            let userTag = !interaction ? message.member.user.tag : interUser.tag;

            const multiEmbed = new EmbedBuilder()
                    .setTitle(info.name)
                    .setURL(`https://osu.ppy.sh/community/matches/${info.match_id}`)
                    .setFooter({
                        iconURL: userIcon,
                        text: `Requested by ${userTag}`
                    });
            
            const matchUsers = new Map();

            function insertScore(userId, beatmapId, score) {
                if (matchUsers.has(userId)) {
                    let userInfo = matchUsers.get(userId);

                    userInfo.push({
                        b: beatmapId,
                        s: score
                    });

                    matchUsers.set(userId, userInfo);
                } else {
                    matchUsers.set(userId, [{
                        b: beatmapId,
                        s: score
                    }]);
                }
            }
            
            for (let i=0; i<maps.length; i++) {
                if (ignoreMaps && i < ignoreMaps) continue;

                let map = maps[i];

                if (map.scoring_type != "Score V2") return {
                    content: `This command only works for Score V2 lobbies.`
                };

                let blueScore = 0;
                let redScore = 0;

                if (map.team_type == "Team VS") {
                    for (let score of map.scores) {
                        if (score.team == "Blue") 
                            blueScore += userScore;
                        else
                            redScore += userScore;
                    }
                }

                for (let j=0; j<map.scores.length; j++) {
                    let score = map.scores[j];
                    let userScore = score.score;

                    if (map.team_type == "Team VS") {
                        let teamPercentage = Math.floor((userScore / blueScore) * 100);
                        let oppPercentage = Math.floor((userScore / redScore) * 100);

                        // 100 - (mapRank - 1) - (teamContribution [above 80% bonus]) -

                        matchUsers.set()
                    } else if (map.team_type == "Head To Head") {
                        
                    } else return {
                        content: `This command does not support this type of game mode.`
                    }

                    // method 2
                    if (matchUsers.has(userId)) {
                        let userMapped = matchUsers.get(userId);

                        userMapped.push({
                            b: map.beatmap_id,
                            s: userScore
                        });

                        matchUsers.set(userId, userMapped);
                    } else {
                        matchUsers.set(userId, [{
                            b: map.beatmap_id, // beatmapId 
                            s: userScore // score (number)
                        }]);
                    }
                }
            }

            for(let i=0; i<maps[0].scores.length; i++) {
                let score = maps[0].scores[i];
                // if teams -> blue and red team in embed
                // if solos -> normal free for all leaderboard
                
                let userId = score.user_id;
                let team = score.team;

                const user = await legacy.getUser({
                    u: userId
                });

                multiEmbed.addFields({
                    name: `  `,
                    value: `:flag_${user.country.toLowerCase()}: ${user.username}`,
                    inline: true
                });
            }

            return {
                embeds: [multiEmbed]
            };
        } catch (error) {
            console.log(error);

            return {
                content: `There has been an error calculating this match`
            };
        }
    }
};