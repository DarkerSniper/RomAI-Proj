const { SlashCommandBuilder, inlineCode } = require('discord.js');

const packTypes = require(`../../utils/discord/packTypes.json`);
const { getCountries } = require('../../utils/osu/regions');
const { shopBuy, shopView } = require(`../../utils/components/packShop`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('packshop')
        .setDescription('The shop to your packs')
        .addSubcommand(command =>
            command
                .setName('view')
                .setDescription('View the current packs in the shop!')
        )
        .addSubcommand(command =>
            command
            .setName('buy')
            .setDescription('Buy a pack by specifying the pack name and country (if necessary)!')
            .addStringOption((option) => 
                option
                    .setName('type')
                    .setDescription("The pack type you would like to purchase")
                    .setRequired(true)
                    .addChoices(packTypes.map((pack) => ({ name: pack.name, value: pack.name })))
            )
            .addStringOption((option) =>
                option
                    .setName('country')
                    .setDescription("The country of the pack you would like to purchase")
                    .setRequired(false)
                    .setAutocomplete(true)
            )
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
        const command = interaction.options.getSubcommand();
        const pack = interaction.options.getString('type');
        const country = interaction.options.getString('country');

        await interaction.deferReply({
            fetchReply: true,
        });

        switch(command) {
            case 'view':
                shopView(interaction);
                break;
            case 'buy':
                shopBuy(interaction, interaction.user.id, pack, country);
                break;
        }
    }
};