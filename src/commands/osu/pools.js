const { SlashCommandBuilder } = require('discord.js');

const { mapPools } = require(`../../utils/components/pool`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mappools')
        .setDescription("Manage the AI's map pools")
        .addStringOption((option) => 
            option
                .setName('action')
                .setDescription("MapPools action")
                .setAutocomplete(true)
                .setRequired(true)
        )
        .addStringOption((option) => 
            option
                .setName('name')
                .setDescription("Map Pool's name")
                .setRequired(false)
        )
        .addStringOption((option) => 
            option
                .setName('nomod')
                .setDescription("(5) NM beatmap ids connected by spaces")
                .setRequired(false)
        )
        .addStringOption((option) => 
            option
                .setName('hidden')
                .setDescription("(3) HD beatmap ids connected by spaces")
                .setRequired(false)
        )
        .addStringOption((option) => 
            option
                .setName('hardrock')
                .setDescription("(3) HR beatmap ids connected by spaces")
                .setRequired(false)
        )
        .addStringOption((option) => 
            option
                .setName('doubletime')
                .setDescription("(3) DT beatmap ids connected by spaces")
                .setRequired(false)
        )
        .addStringOption((option) => 
            option
                .setName('freemod')
                .setDescription("(2) FM beatmap ids connected by spaces")
                .setRequired(false)
        )
        .addStringOption((option) => 
            option
                .setName('tiebreaker')
                .setDescription("(1) TB beatmap id")
                .setRequired(false)
        ),
    async autocomplete(interaction, client) {
        const focusedValue = interaction.options.getFocused();
        const choices = [
            "List",
            "Show",
            "Add",
            "Edit",
            "Remove",
            "PrivateRemove",
            "Confirm",
            "PrivateConfirm",
            "Cancel"
        ];
        const filtered = choices.filter((choice) => 
            choice.toLowerCase().includes(focusedValue.toLowerCase())
        );
        await interaction.respond(
            filtered.map((choice) => ({ name: choice, value: choice }))
        );
    },
    async execute(interaction, client) {
        const action = interaction.options.getString('action');
        var name = interaction.options.getString('name');
        var nm = interaction.options.getString('nomod');
        var hd = interaction.options.getString('hidden');
        var hr = interaction.options.getString('hardrock');
        var dt = interaction.options.getString('doubletime');
        var fm = interaction.options.getString('freemod');
        var tb = interaction.options.getString('tiebreaker');

        await interaction.deferReply({
            fetchReply: true
        });

        mapPools(interaction, client, action, name, nm, hd, hr, dt, fm, tb);
    }
};