const { EmbedBuilder, bold ,italic, inlineCode } = require('discord.js');
const { LegacyClient, isOsuJSError } = require('osu-web.js');

const osuUser = require(`../../schemas/osuUser`);
const { getRegionRank, fetchRegionInfo, fetchUserRegion } = require(`../osu/regions`);
const { numberWithCommas } = require('../osu/formatNum.js');
const { getEloRank } = require('../osu/skillsCalculation.js');
const { getPlayerRank } = require('../discord/ranks.js');
const { eloRankAsEmojis } = require('../discord/getEmojis.js');

const { osuAPI } = process.env;

//Using the APIv1 with the private key that is located in a local file
const legacy = new LegacyClient(osuAPI);

module.exports = {
    async userProfile(interaction, client, username, message) {
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

            //Made a local var named 'user' and using the API function "getUser"
            //"getUser" takes two paramiters: u(user)=int/string, m(mode)=we're only going to use 'osu'
            let user = await legacy.getUser({
                u: username,
            });

            var formatNum = require(`../osu/formatNum.js`).numberWithCommas;

            let userIcon = interUser.displayAvatarURL();
            let userTag = !interaction ? message.member.user.tag : interUser.tag;

            //Using the API we grab the user's information and return it in an embed
            const userEmbed = new EmbedBuilder()
                .setThumbnail(`http://s.ppy.sh/a/${user.user_id}`)
                .setTimestamp(Date.now())
                .setFooter({
                    iconURL: userIcon,
                    text: `Requested by ${userTag}`
                })
                .setAuthor({
                    iconURL: `https://assets.ppy.sh/old-flags/${user.country}.png`,
                    url: `https://osu.ppy.sh/users/${user.user_id}`,
                    name: `${user.username}`,
                })
                .addFields({
                    name: `Global Rank:`,
                    value: `#${formatNum(user.pp_rank)}`,
                    inline: true
                })
                .addFields({
                    name: `Country Rank:`,
                    value: `#${formatNum(user.pp_country_rank)}`,
                    inline: true
                });
            
            let userRegion = await fetchUserRegion(user.user_id);

            if (userRegion != undefined) {
                let regionInfo = await fetchRegionInfo(userRegion.country, userRegion.region);

                if (regionInfo.name != undefined) userEmbed.addFields({
                    name: `Region Rank:`,
                    value: `${regionInfo.name} #${userRegion.rank}`,
                    inline: true
                });
            }
            
            let userDB = await osuUser.findOne({ osuUserId: user.user_id });

            if (userDB) {
                let eloText = "";
                let recordText = "";

                let elo = userDB.elo;
                let record = userDB.matchRecord;
                let userLevel = userDB.level;
                let levelMax = 50 + (userLevel.current * 50);

                /* Custom Regional Ranking
                let region = userDB.ilRegion;
                if (region != "no-region") {
                    let regionRank = await getRegionRank(user.username);

                    userEmbed.addFields({
                        name: `Region Rank:`,
                        value: `${region} #${regionRank}`,
                        inline: true
                    });
                }
                */

                const modes = ['1v1', '2v2'];

                for (let mode of modes) {
                    if (elo[mode] != 0) {
                        let playerRank = await getPlayerRank(userDB.osuUserName, mode);

                        playerRank = `${eloRankAsEmojis(playerRank)} ${playerRank}`;

                        if (!playerRank) {
                            playerRank = '';
                        } else if (playerRank == 'Unranked') {
                            let gamesToPlay = userDB.matchRecord[mode];
                            gamesToPlay = gamesToPlay.wins + gamesToPlay.losses;

                            playerRank += ` (Play ${5 - gamesToPlay} more matches)`;
                        }

                        /*
                            Example for 1v1:
                            1v1 - Silver 1 (1500 - #15)
                        */
                        eloText += `${mode} - ${playerRank} (${elo[mode]} - ${italic(`#${await getEloRank(userDB.osuUserName, mode)}`)})\n`;
                        recordText += `${mode} - W: ${record[mode].wins} | L: ${record[mode].losses}\n`;
                    }
                }

                if (eloText != "") {
                    userEmbed.addFields({
                        name: `ELO:`,
                        value: `${eloText}`,
                        inline: true
                    });

                    userEmbed.addFields({
                        name: `Record:`,
                        value: `${recordText}`,
                        inline: true
                    });
                }

                if (userDB.winnings.length != 0) {
                    let userWinnings = userDB.winnings;
                    let winningsString = ``;

                    userWinnings.forEach(win => {
                        winningsString += `${win.name} (${win.mode}v${win.mode})\n`
                    });

                    userEmbed.addFields({
                        name: `Winnings:`,
                        value: `${winningsString}`,
                        inline: true
                    });
                }

                let prestige = userLevel.prestige > 0 ? `${bold(`Prestige ${userLevel.prestige}`)}\n` : '';

                userEmbed.addFields({
                    name: `RomAI Account Level:`,
                    value: `${prestige}Level ${userLevel.current}\nXP: ${userLevel.xp}/${levelMax} ${italic(`(${levelMax - userLevel.xp}XP to go!)`)}`,
                    inline: true
                });

                if (userDB.accomplishments && userDB.accomplishments.length > 0) {
                    let allAccoms = ``;
                    for (let accom of userDB.accomplishments) {
                        if (accom == ('Beta' || 'Alpha' || 'Pre-Alpha')) {
                            accom = `${bold(accom)} Tester`;
                        }

                        allAccoms += `${accom}\n`;
                    }

                    userEmbed.addFields({
                        name: `Accomplishments:`,
                        value: `${allAccoms}`
                    });
                }

                userEmbed.addFields({
                    name: `romBucks:`,
                    value: `${numberWithCommas(userDB.currency)}`,
                    inline: true
                });
            }

            userEmbed.addFields({
                name: `pp:`,
                value: `${formatNum(user.pp_raw)}`,
                inline: true
            });
            userEmbed.addFields({
                name: `osu! Account Level:`,
                value: `${user.level.toFixed(1)}`,
                inline: true
            });

            return result = {
                embeds: [userEmbed]
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
            return result = {
                content: `There has been an error executing this command.`
            };
        }
    }
};