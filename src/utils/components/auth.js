const { inlineCode, hyperlink, bold } = require('discord.js');

const { authSaveUser, authGetUserCode, getBotStatus, startBot } = require(`../osu/activeData`);
const { getCountryRegions } = require(`../osu/regions`);

module.exports = {
    async verifyOsuAccount(interaction, client, region) {
        let result;
        let interUser = interaction.user;

        const discordUser = interUser.id;

        try {
            await authSaveUser(discordUser, region);

            let code = await authGetUserCode(discordUser);

            return result = {
                content: `Send the command below to '${hyperlink("DarkerSniper", 'https://osu.ppy.sh/users/13448067')}' in osu! ingame messages to verify your account:\n${inlineCode(`.verify ${code}`)}`,
                ephemeral: true
            };
        } catch (err) {
            console.log(err);
        }
    },

    async postRegions(interaction, client, country) {
        try {
            let regions = await getCountryRegions(country);

            let seperatedRegions = regions.toString();

            while (seperatedRegions.includes(",")) seperatedRegions = seperatedRegions.replace(",", "\n");

            country = `${country.charAt(0).toUpperCase()}${country.substring(1)}`;

            return {
                content: `${bold(`Regions in ${country}`)}:\n${seperatedRegions}`,
                ephemeral: true
            }
        } catch (err) {
            console.log(err);
        }
    }
};