const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const { mapPools } = require(`../../utils/components/pool`);

const mapPool = require('../../schemas/mapPool');
const privateMapPool = require(`../../schemas/privateMapPool`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mappools')
        .setDescription("Manage the project's map pools")
        // new usage
        .addSubcommand(command =>
            command
                .setName('list')
                .setDescription('View all the current available pools in RomAI')
        )
        .addSubcommand(command =>
            command
                .setName('show')
                .setDescription('Show the maps of a desired mappool.')
                .addStringOption((option) => 
                    option
                        .setName('name')
                        .setDescription("The name of the pool you would like to view.")
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(command =>
            command
                .setName('add')
                .setDescription('Add a mappool to RomAI.')
                .addStringOption((option) => 
                    option
                        .setName('name')
                        .setDescription("The name of the pool.")
                        .setRequired(true)
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
                )
        )
        .addSubcommand(command =>
            command
                .setName('edit')
                .setDescription('Edit a mappool in RomAI.')
                .addStringOption((option) => 
                    option
                        .setName('name')
                        .setDescription("The name of the pool you would like to edit.")
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName('newname')
                        .setDescription("New name you would like to give the pool")
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
                )
        )
        .addSubcommand(command =>
            command
                .setName('remove')
                .setDescription('Remove a map pool from RomAI.')
                .addStringOption((option) => 
                    option
                        .setName('name')
                        .setDescription("The name of the pool.")
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(command =>
            command
                .setName('privateremove')
                .setDescription('Remove a map pool from the private section in RomAI.')
                .addStringOption((option) => 
                    option
                        .setName('name')
                        .setDescription("The name of the pool.")
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(command =>
            command
                .setName('confirm')
                .setDescription('Confirm and add the mappool to the database.')
        )
        .addSubcommand(command =>
            command
                .setName('cancel')
                .setDescription('Cancel the addition of the mappool.')
        ),
    async autocomplete(interaction, client) {
        const focusedValue = interaction.options.getFocused();

        const allPools = await mapPool.find();
        const privatePools = await privateMapPool.find();
        const mapPoolNames = allPools.map(pool => pool.name);
        const privateMapPoolNames = privatePools.map(pool => pool.name);

        const choices = mapPoolNames.concat(privateMapPoolNames);

        const filtered = choices.filter((choice) => 
            choice.toLowerCase().includes(focusedValue.toLowerCase())
        );
        await interaction.respond(
            filtered.map((choice) => ({ name: choice, value: choice }))
        );

        /*
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
        */
    },
    async execute(interaction, client) {
        const action = interaction.options.getSubcommand();
        var name = interaction.options.getString('name');
        var newName = interaction.options.getString('newname');
        var nm = interaction.options.getString('nomod');
        var hd = interaction.options.getString('hidden');
        var hr = interaction.options.getString('hardrock');
        var dt = interaction.options.getString('doubletime');
        var fm = interaction.options.getString('freemod');
        var tb = interaction.options.getString('tiebreaker');

        await interaction.deferReply({
            fetchReply: true
        });

        mapPools(interaction, client, action, name, nm, hd, hr, dt, fm, tb, newName);
    }
};