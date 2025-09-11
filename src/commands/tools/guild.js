const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const mongoose = require('mongoose');

const Guild = require('../../schemas/guild');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setguild')
        .setDescription('Guild setup for RomAI!')
        .addChannelOption((option) => 
            option
                .setName('matches-output')
                .setDescription("Select a channel for real-time match updates.")
                .setRequired(true)
        )
        .addChannelOption((option) => 
            option
                .setName('matchmaking-channel')
                .setDescription("Select a channel for Matchmaking.")
                .setRequired(true)
        )
        .addChannelOption((option) => 
            option
                .setName('leveling-channel')
                .setDescription("Select a channel for Leveling notifications.")
                .setRequired(true)
        )
        .addChannelOption((option) => 
            option
                .setName('tournament-channel')
                .setDescription("Select a channel for Tournaments.")
                .setRequired(true)
        )
        .addChannelOption((option) =>
            option
                .setName('highelo-matches-output')
                .setDescription("Select a channel for high ELO real-time match updates.")
                .setRequired(false)
        )
        .addChannelOption((option) => 
            option
                .setName('suggestion-channel')
                .setDescription("Select a channel for map pool suggestions")
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction, client) {
        var channel = interaction.options.getChannel('matches-output');
        var mm = interaction.options.getChannel('matchmaking-channel');
        var leveling = interaction.options.getChannel('leveling-channel');
        var tournament = interaction.options.getChannel(`tournament-channel`);
        var topChannel = interaction.options.getChannel('highelo-matches-output');
        var suggestion = interaction.options.getChannel('suggestion-channel');

        var channelId = channel.id;
        var topChannelId = !topChannel ? undefined : `${topChannel.id}`;
        var suggestionId = !suggestion ? undefined : `${suggestion.id}`;
        console.log(channel.id);
        let guildProfile = await Guild.findOne({ guildId: interaction.guild.id });

        if (!guildProfile) {
            guildProfile = await new Guild({
                _id: new mongoose.Types.ObjectId(),
                guildId: interaction.guild.id,
                guildName: interaction.guild.name,
                guildIcon: interaction.guild.iconURL() ? interaction.guild.iconURL() : "None",
                setup: {
                    matchesOutput: `${channelId}`,
                    matchmakingChannel: `${mm.id}`,
                    levelingChannel: `${leveling.id}`,
                    tournamentChannel: `${tournament.id}`,
                    highEloMatchesOutput: topChannelId,
                    suggestionsChannel: suggestionId
                }
            });

            await guildProfile.save().catch(console.error);
            await interaction.reply({
                content: `Server added to database!\nServer Name: ${guildProfile.guildName}`
            });
            console.log(guildProfile);
        } else {
            await Guild.deleteOne({ guildId: interaction.guild.id });

            guildProfile = await new Guild({
                _id: new mongoose.Types.ObjectId(),
                guildId: interaction.guild.id,
                guildName: interaction.guild.name,
                guildIcon: interaction.guild.iconURL() ? interaction.guild.iconURL() : "None",
                setup: {
                    matchesOutput: `${channelId}`,
                    matchmakingChannel: `${mm.id}`,
                    levelingChannel: `${leveling.id}`,
                    tournamentChannel: `${tournament.id}`,
                    highEloMatchesOutput: topChannelId,
                    suggestionsChannel: suggestionId
                }
            });

            await guildProfile.save();

            await interaction.reply({
                content: `Server updated in database.\nServer ID: ${guildProfile.guildId}`
            });
            console.log(guildProfile);
        }
    }
}