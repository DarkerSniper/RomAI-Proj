const { bold, hyperlink } = require('discord.js');
const { LegacyClient, isOsuJSError } = require('osu-web.js');

const { osuAPI } = process.env;

const legacy = new LegacyClient(osuAPI);

const osuUser = require(`../../schemas/osuUser`);
const ranks = require("../discord/ranks.json")

const { getEloRank } = require('../osu/skillsCalculation');
const { getPlayerRank } = require('../discord/ranks');

module.exports = {
    async countryRankRole(interaction, client, message) {
        let result;
        let interUser = !interaction ? message.member : interaction.member;

        try {
            const discordUser = !interaction ? interUser.user.id : interUser.id;
            let osuUserProfile = await osuUser.findOne({ discordId: discordUser });

            if (!osuUserProfile) {
                return result = {
                    content: `No account detected, please link your osu! account using ${inlineCode("/authosu")}`
                };
            }

            let osuUsername = osuUserProfile.osuUserName;

            let user = await legacy.getUser({
                u: osuUsername,
                m: 'osu'
            });

            let countryRank = user.pp_country_rank;
            let countryRole;

            if (countryRank <= 10) {
                countryRole = "Top 10 STD";
            } else if (countryRank <= 25) {
                countryRole = "Top 25 STD";
            } else if (countryRank <= 50) {
                countryRole = "Top 50 STD";
            } else if (countryRank <= 100) {
                countryRole = "Top 100 STD";
            } else if (countryRank <= 250) {
                countryRole = "Top 250 STD";
            } else if (countryRank <= 500) {
                countryRole = "Top 500 STD";
            } else { // Rank 1000
                countryRole = "Top 1000 STD";
            } 

            let role = interUser.guild.roles.cache.find(role => role.name === countryRole);
            interUser.roles.add(role);

            return result = {
                content: `${bold(countryRole)} role has now been added to ${interUser.displayName}`
            }
        } catch (err) {
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
            }
            
        }
    },

    async eloRankRoles(interaction, client) {
        let interUser = interaction.member;

        try {
            if (interaction.guild.id != "1245368064992870471") { // RomAI Testing Server
                return {
                    content: `To use this command please join: ${hyperlink('RomAI Testing Server', 'https://discord.gg/QgdqscCsJkxx')}`
                };
            }

            const discordUser = interUser.id;
            let osuUserProfile = await osuUser.findOne({ discordId: discordUser });

            if (!osuUserProfile) {
                return {
                    content: `No account detected, please link your osu! account using ${inlineCode("/authosu")}`
                };
            }

            let duelPlayerRank = await getPlayerRank(undefined, '1v1', osuUserProfile.elo['1v1'], osuUserProfile.matchRecord['1v1'].losses + osuUserProfile.matchRecord['1v1'].wins);
            let duosPlayerRank = await getPlayerRank(undefined, '2v2', osuUserProfile.elo['2v2'], osuUserProfile.matchRecord['2v2'].losses + osuUserProfile.matchRecord['2v2'].wins);

            if (duelPlayerRank == 'Unranked' && duosPlayerRank == 'Unranked' || !duelPlayerRank && !duosPlayerRank) return {
                content: `You need to have a rank first.`
            };

            let peakRank;

            for (let rank of ranks) {
                if (duelPlayerRank && duelPlayerRank.includes(rank.rank) || duosPlayerRank && duosPlayerRank.includes(rank.rank)) {
                    peakRank = rank.rank;

                    break;
                }
            }

            if (!peakRank) return {
                content: 'You need to obtain a rank first!'
            };

            let role = interUser.guild.roles.cache.find(role => role.name.includes(peakRank));
            interUser.roles.add(role);

            return {
                content: `${bold(peakRank)} role has now been added to ${interUser.displayName}`
            }
        } catch (err) {
            console.log(err);
            return {
                content: `There has been an error executing this command.`
            }
            
        }
    }
};