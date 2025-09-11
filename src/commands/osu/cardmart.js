const { SlashCommandBuilder, inlineCode } = require('discord.js');
const { cardmartBuy, cardmartShow, cardmartSell, cardmartRetrieve } = require('../../utils/components/cardmart');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cardmart')
        .setDescription('The marketplace for RomAI cards')
        .addSubcommand(command =>
            command
                .setName('buy')
                .setDescription('Buy a specific item in cardmart!')
                .addStringOption((option) => 
                    option
                        .setName('cardmartid')
                        .setDescription("The item's ID in cardmart")
                        .setRequired(true)
                )
        )
        .addSubcommand(command =>
            command
            .setName('search')
            .setDescription('Go through the cards available in cardmart!')
            .addBooleanOption((option) => 
                option
                    .setName('showavailable')
                    .setDescription("Show the available items in cardmart")
                    .setRequired(false)
            )
            .addBooleanOption((option) =>
                option
                    .setName('showsold')
                    .setDescription("Show sold items in cardmart")
                    .setRequired(false)
            )
            .addStringOption((option) => 
                option
                    .setName('searchplayer')
                    .setDescription("Search a player card in cardmart")
                    .setRequired(false)
            )
        )
        .addSubcommand(command =>
            command
                .setName('sell')
                .setDescription('List a player card in cardmart!')
                .addStringOption((option) => 
                    option
                        .setName('cardid')
                        .setDescription("The cardID of the card you would like to sell.")
                        .setRequired(true)
                )
                .addNumberOption((option) => 
                    option
                        .setName('price')
                        .setDescription("The price of the card you would like to list.")
                        .setRequired(true)
                        .setMinValue(0)
                        .setMaxValue(999999)
                )
        )
        .addSubcommand(command =>
            command
                .setName('retrieve')
                .setDescription('Retrieve an item you have listed in cardmart.')
                .addStringOption((option) => 
                    option
                        .setName('cardmartid')
                        .setDescription("The item's ID in cardmart.")
                        .setRequired(true)
                )
        ),
    async execute(interaction, client) {
        const command = interaction.options.getSubcommand();
        const discordId = interaction.user.id;

        var cardmartId = interaction.options.getString('cardmartid');

        var showAvailable = interaction.options.getBoolean('showavailable');
        var showSold = interaction.options.getBoolean('showsold');
        var searchPlayer = interaction.options.getString('searchplayer');

        var cardId = interaction.options.getString('cardid');
        var price = interaction.options.getNumber('price');

        switch(command) {
            case "buy":
                await cardmartBuy(interaction, discordId, cardmartId);
                break;
            case "search":
                await cardmartShow(interaction, client, discordId, showAvailable ?? true, showSold ?? false, searchPlayer)
                break;
            case "sell":
                await cardmartSell(interaction, discordId, cardId, price);
                break;
            case "retrieve":
                await cardmartRetrieve(interaction, discordId, cardmartId);
                break;
        }
    }
};