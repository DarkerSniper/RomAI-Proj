const { SlashCommandBuilder } = require('discord.js');

const { getCountries } = require(`../../utils/osu/regions`);
const { postRegions } = require(`../../utils/components/auth`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('regionsearch')
        .setDescription("Provides all regions from the specified country")
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
            ephemeral: true
        });

        await interaction.deferReply({
            fetchReply: true,
            ephemeral: true
        });

        var reply = await postRegions(interaction, client, country);

        await interaction.editReply(reply);
    }
};