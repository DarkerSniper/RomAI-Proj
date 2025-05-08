const { SlashCommandBuilder, inlineCode, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedAssertions, EmbedBuilder, ButtonBuilder, ButtonStyle, hyperlink } = require('discord.js');

const guilds = require(`../../schemas/guild`);
const suggestions = require(`../../schemas/suggestion`);
const mapPools = require(`../../schemas/mapPool`);

const formatResults = require('../../utils/discord/formatResults');
const { poolAddition } = require('../../utils/discord/poolHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mappool-suggest')
        .setDescription("Suggest a map pool to RomAI!")
        .setDMPermission(false)
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
    async execute(interaction, client) {
        try {
            const guildConfig = await guilds.findOne({ guildId: interaction.guildId });

            if (!guildConfig) return await interaction.reply({
                content: `This server hasn't been configured yet. (${inlineCode(`/setguild`)})`,
                ephemeral: true
            });

            if (!guildConfig.setup.suggestionsChannel) return await interaction.reply({
                content: `This server doesn't have a suggestion channel set yet.`,
                ephemeral: true
            });

            if (guildConfig.setup.suggestionsChannel != interaction.channelId) return await interaction.reply({
                content: `This channel is not configured to use suggestions. Try this channel instead: <#${guildConfig.setup.suggestionsChannel}>`,
                ephemeral: true
            });

            const modal = new ModalBuilder()
                .setTitle(`Map pool suggestion for RomAI`)
                .setCustomId(`suggestion-${interaction.user.id}`);

            const poolNameInput = new TextInputBuilder()
                .setCustomId(`suggestion-name-input`)
                .setLabel(`Map pool's name. Example Tourney (Finals)`)
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(100);

            const spreadsheetInput = new TextInputBuilder()
                .setCustomId(`suggestion-sheet-input`)
                .setLabel(`Link to the spreadsheet of the pool`)
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMaxLength(300);

            const firstActionRow = new ActionRowBuilder().addComponents(poolNameInput);
            const secondActionRow = new ActionRowBuilder().addComponents(spreadsheetInput);

            modal.addComponents(firstActionRow, secondActionRow);

            await interaction.showModal(modal);

            const filter = (i) => i.customId === `suggestion-${interaction.user.id}`;

            const modalInteraction = await interaction.awaitModalSubmit({
                filter,
                time: 1000 * 60 * 3
            }).catch((error) => console.log(error));

            await modalInteraction.deferReply({ ephemeral: true });

            let suggestionMessage;

            try {
                suggestionMessage = await interaction.channel.send('Creating suggestion...');
            } catch (error) {
                return modalInteraction.editReply({
                    content: `Failed to create suggestion message in this channel.`
                });
            }

            const suggestionPoolName = modalInteraction.fields.getTextInputValue('suggestion-name-input');
            const suggestionSheet = modalInteraction.fields.getTextInputValue('suggestion-sheet-input'); 

            // Check pool info
            let poolDB = await mapPools.findOne({ name: suggestionPoolName });

            var mapsNM = interaction.options.getString('nomod');
            var mapsHD = interaction.options.getString('hidden');
            var mapsHR = interaction.options.getString('hardrock');
            var mapsDT = interaction.options.getString('doubletime');
            var mapsFM = interaction.options.getString('freemod');
            var mapTB = interaction.options.getString('tiebreaker');
            
            if (poolDB) return modalInteraction.editReply({
                content: `This pool already exists.`
            });

            if (!suggestionSheet.startsWith(`https://docs.google.com/spreadsheets`)) return modalInteraction.editReply({
                content: `Make sure the link of the spreadsheet is correct.`
            });

            let tempPool = [mapsNM, mapsHD, mapsHR, mapsDT, mapsFM, mapTB];
            let notNum = false;

            for (let i=0; i<tempPool.length; i++) {
                if (!tempPool[i]) {
                    break;
                }

                if (tempPool[i].includes(" ")) tempPool[i] = tempPool[i].split(" ");
                if (tempPool[i].includes("[a-zA-Z]+")) {notNum = true; break; }
            }

            mapsNM = tempPool[0] ? tempPool[0] : [];
            mapsHD = tempPool[1] ? tempPool[1] : [];
            mapsHR = tempPool[2] ? tempPool[2] : [];
            mapsDT = tempPool[3] ? tempPool[3] : [];
            mapsFM = tempPool[4] ? tempPool[4] : [];
            mapTB = tempPool[5] ? tempPool[5] : [];

            if (notNum) return modalInteraction.editReply({
                content: `Make sure beatmap ids contain only numbers.`
            });

            if (!suggestionPoolName || mapsNM.length < 5 || mapsHD.length < 3 || mapsHR.length < 3 || mapsDT.length < 3 || !mapTB) return modalInteraction.editReply({
                content: `Missing information, please make sure your inputs contain: Pool Name, 5 NM Maps, 3 HD Maps, 3 HR Maps, 3 DT Maps, 2 FM Maps and a TB Map`
            });

            if (mapsFM.length > 0 && mapsFM.length < 2) return modalInteraction.editReply({
                content: `Make sure there are more than 1 FMs`
            }); 

            if (!mapsFM) mapsFM = [];

            console.log(suggestionPoolName, mapsNM, mapsHD, mapsHR, mapsDT, mapsFM, mapTB);

            let poolInfo = await poolAddition(undefined, suggestionPoolName, 
                mapsNM, mapsHD, mapsHR, mapsDT, mapsFM, mapTB);

            const newSuggestion = new suggestions({
                authorId: interaction.user.id,
                guildId: interaction.guildId,
                messageId: suggestionMessage.id,
                poolName: poolInfo.name,
                elo: poolInfo.elo,
                spreadsheet: suggestionSheet,
                maps: {
                    noMod: poolInfo.maps.noMod,
                    hidden: poolInfo.maps.hidden,
                    hardRock: poolInfo.maps.hardRock,
                    doubleTime: poolInfo.maps.doubleTime,
                    freeMod: poolInfo.maps.freeMod,
                    tieBreaker: poolInfo.maps.tieBreaker
                }
            });

            await newSuggestion.save();

            modalInteraction.editReply({
                content: `Suggestion Created!`
            });

            // Suggestion embed
            const suggestionEmbed = new EmbedBuilder()
                .setAuthor({
                    name: interaction.user.username,
                    iconURL: interaction.user.displayAvatarURL({ size: 256 }),
                })
                .addFields([
                    { name: 'Pool:', value: `${hyperlink(`${suggestionPoolName}`, suggestionSheet)}` },
                    { name: 'Status', value: '⏳ Pending' },
                    { name: 'Votes', value: formatResults() } // import format results
                ])
                .setColor('Yellow');

            // Buttons
            const upvoteButton = new ButtonBuilder()
                .setEmoji('👍')
                .setLabel('Upvote')
                .setStyle(ButtonStyle.Primary)
                .setCustomId(`suggestion.${newSuggestion.suggestionId}.upvote`);

            const downvoteButton = new ButtonBuilder()
                .setEmoji('👎')
                .setLabel('Downvote')
                .setStyle(ButtonStyle.Primary)
                .setCustomId(`suggestion.${newSuggestion.suggestionId}.downvote`);

            const approveButton = new ButtonBuilder()
                .setEmoji('✅')
                .setLabel('Approve')
                .setStyle(ButtonStyle.Success)
                .setCustomId(`suggestion.${newSuggestion.suggestionId}.approve`);

            const rejectButton = new ButtonBuilder()
                .setEmoji('🗑️')
                .setLabel('Reject')
                .setStyle(ButtonStyle.Danger)
                .setCustomId(`suggestion.${newSuggestion.suggestionId}.reject`);

            const firstRow = new ActionRowBuilder().addComponents(upvoteButton, downvoteButton);
            const secondRow = new ActionRowBuilder().addComponents(approveButton, rejectButton);

            suggestionMessage.edit({
                content: `${interaction.user} Suggestion created!`,
                embeds: [poolInfo.embed, suggestionEmbed],
                components: [firstRow, secondRow]
            });
        } catch (error) {
            console.log(`Error in /suggest: ${error}`);
        }
    }
};