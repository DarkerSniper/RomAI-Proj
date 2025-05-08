const { SlashCommandBuilder } = require('discord.js');

const { verifyOsuAccount } = require(`../../utils/components/auth`);
const { getRegions } = require(`../../utils/osu/regions`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('authosu')
        .setDescription("Link your osu! account to RomAI!"),
        /*
        .addStringOption((option) => 
            option
                .setName('region')
                .setDescription("Choose your district (has to be from the country connected to the osu! account).")
                .setAutocomplete(true)
                .setRequired(false)
        )
        */
    async autocomplete(interaction, client) {
        const focusedValue = interaction.options.getFocused();
        const choices = await getRegions();

        const filtered = choices.filter((choice) => 
            choice.toLowerCase().includes(focusedValue.toLowerCase())
        );
        await interaction.respond(
            filtered.map((choice) => ({ name: choice, value: choice }))
        );
    },
    async execute(interaction, client) {
        /*
        var region = interaction.options.getString('region');
        let regions = await getRegions();
        
        if (region) {
            if (regions.includes(region) == false) return await interaction.reply({
                content: `The region specified is incorrect`,
                ephemeral: true
            });
        } else {
            region = 'no-region';
        }
        */

        await interaction.deferReply({
            fetchReply: true,
            ephemeral: true
        });

        var reply = await verifyOsuAccount(interaction, client, 'no-region');

        await interaction.editReply(reply);
    }
};