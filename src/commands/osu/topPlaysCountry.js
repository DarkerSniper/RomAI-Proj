const { SlashCommandBuilder } = require('discord.js');

const { getCountries, getCountryCode } = require(`../../utils/osu/regions`);
const { getTopPlaysByCountry } = require('../../utils/components/topCountryPlays');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('topplayscountry')
        .setDescription("Gets the top 10 pp plays of a country")
        .addStringOption((option) => 
            option
                .setName('country')
                .setDescription("Name of a country")
                .setAutocomplete(true)
                .setRequired(true)
        ),
    async autocomplete(interaction, client) {
        const focusedValue = interaction.options.getFocused();
        const choices = await getCountries();

        const filtered = choices.filter((choice) => 
            choice.toLowerCase().includes(focusedValue.toLowerCase())
        );
        await interaction.respond(
            filtered.map((choice) => ({ name: choice, value: choice }))
        );
    },
    async execute(interaction, client) {
        var country = interaction.options.getString('country');

        let countries = await getCountries();
        
        if (countries.includes(country) == false) return await interaction.reply({
            content: `Wrong country input.`,
        });

        await interaction.deferReply({
            fetchReply: true,
        });

        let countryCode = await getCountryCode(country);

        await getTopPlaysByCountry(interaction, client, countryCode);
    }
};