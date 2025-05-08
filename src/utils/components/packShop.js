const { EmbedBuilder, bold, italic, strikethrough, underscore, spoiler, quote, blockQuote, inlineCode , codeBlock, underline, ButtonBuilder, ActionRowBuilder } = require('discord.js');
const { LegacyClient, isOsuJSError, Auth, Client } = require('osu-web.js');

const { numberWithCommas } = require(`../osu/formatNum`);

const packTypes = require(`../discord/packTypes.json`);
const tiers = require(`../osu/cardTiers.json`);

const osuUser = require(`../../schemas/osuUser`);

const { inventoryAddPack } = require('../discord/invAddPack');
const { getCountryCode } = require(`../osu/regions`);
const { removeCurrency } = require(`../discord/currency`);

const countryPackAddon = 200;

const { osuId, osuToken } = process.env;

//APIv2
const auth = new Auth(osuId, osuToken);

module.exports = {
    async shopView(interaction) {
        var discordUser = interaction.user;
        var userProfile = await osuUser.findOne({ discordId: discordUser.id });

        if (!userProfile) return await interaction.editReply({
            content: `Please link your osu! account using ${inlineCode("/authosu")}`,
        });

        const token = await auth.clientCredentialsGrant();
        const api = new Client(token.access_token);

        const userOsu = await api.users.getUser(userProfile.osuUserName, {
            urlParams: {
              mode: 'osu'
            },
            query: {
                key: 'username'
            }
        });

        let shopEmbed = new EmbedBuilder()
            .setAuthor({
                iconURL: `${discordUser.displayAvatarURL()}`,
                name: `${discordUser.username} has: ${userProfile.currency} romBucks`
            })
            .setTitle('Pack Shop');

        var packsSorted = packTypes.sort(function(a,b) {
            return b.cost - a.cost;
        });

        for (let i=0; i<packsSorted.length; i++) {
            let pack = packsSorted[i];
            let country = pack.name == 'Legend' ? 'Worldwide' : userOsu.country.code;
            let worldwidePrice = pack.name == 'Legend' ? '' : `Custom country price: ${bold(numberWithCommas(pack.cost + countryPackAddon))} ${italic(`(Only available for level 10+)`)}`;

            let chances = ``;

            /*
            chances += `${bold(`${tiers.tier1}`)} - ${pack.chances.tier1}%\n`;
            chances += `${tiers.tier2} - ${100 - Math.abs(pack.chances.tier1 - pack.chances.tier2)}%\n`;
            chances += `${tiers.tier3} - ${100 - Math.abs(pack.chances.tier2 - pack.chances.tier3)}%\n`;
            chances += `${tiers.tier4} - ${100 - Math.abs(pack.chances.tier3 - pack.chances.tier4)}%\n`;
            chances += `${tiers.tier5} - ${100 - pack.chances.tier4}%`;
            */

            shopEmbed.addFields({
                name: `Item ${i + 1}`,
                value: `Pack: ${country} ${bold(pack.name)} Pack\nPrice: ${bold(`${numberWithCommas(pack.cost)}`)}\n${worldwidePrice}\n\n${chances}`,
                inline: true
            });
        }

        await interaction.editReply({
            content: `  `,
            embeds: [shopEmbed],
            ephemeral: true
        });
    },

    async shopBuy(interaction, discordId, packType, country) {
        var userProfile = await osuUser.findOne({ discordId: discordId });

        if (!userProfile) return await interaction.editReply({
            content: `Please link your osu! account using ${inlineCode("/authosu")}`,
        });

        if (country != undefined && userProfile.level.current < 10 && userProfile.level.prestige < 1) return await interaction.editReply({
            content: `You cannot choose a pack country until you're level 10!`
        });

        const token = await auth.clientCredentialsGrant();
        const api = new Client(token.access_token);

        const userOsu = await api.users.getUser(userProfile.osuUserId, {
            urlParams: {
              mode: 'osu'
            },
            query: {
                key: 'id'
            }
        });

        var pack;
        var chosenCountry = userOsu.country.code;
        var cost;

        packTypes.forEach(p => {
            if (p.name == packType) pack = p;
        });

        cost = pack.cost;

        if (country != undefined) {
            let countryCode = await getCountryCode(country);

            if (!countryCode) return await interaction.editReply({
                content: `Invalid country.`
            });

            cost += countryPackAddon;

            chosenCountry = countryCode;
        }

        if (userProfile.currency < cost) return await interaction.editReply({
            content: `Insufficient funds.`
        });

        await removeCurrency(discordId, cost);

        await inventoryAddPack(discordId, userProfile.inventory, {
            packType: pack.name,
            country: chosenCountry
        });

        await interaction.editReply({
            content: `${chosenCountry} ${bold(`${pack.name}`)} Pack has been added to your inventory! ${italic(`(-${cost})`)}`
        });
    }
};