const { InteractionType } = require("discord.js");
const mongoose = require('mongoose');

const suggestions = require(`../../schemas/suggestion`);
const mapPools = require(`../../schemas/mapPool`);

const formatResults = require('../../utils/discord/formatResults');
const { saveLogData } = require("../../utils/tests/usageLog");

module.exports = {
  //'interactionCreate' event--
  //If the chat input is a command then check if it's one of the commands that exists
  name: "interactionCreate",
  async execute(interaction, client) {
    try {
      if (interaction.isChatInputCommand()) {
        const { commands } = client;
        const { commandName } = interaction;
        const command = commands.get(commandName);
        if (!command) return;
  
        try {
          await command.execute(interaction, client);

          saveLogData({
            type: "command",
            data: `${commandName}`
          });
        } catch (error) {
          console.error(error);
          await interaction.reply({
            content: `Something went wrong while executing this command...`,
            ephemeral: true,
          });
        }
      } else if (interaction.type == InteractionType.ApplicationCommandAutocomplete) {
        const { commands } = client;
        const { commandName } = interaction;
        const command = commands.get(commandName);
        if (!command) return;
  
        try {
          await command.autocomplete(interaction, client);
        } catch (err) { err.toString().includes("Invalid Form Body") ? err = "we good (over 25 choices)" : console.error(err); }
      } else {
        if (!interaction.isButton() || !interaction.customId) return;

        async function authQ() {
            if (
                interaction.user.tag != 'romdarker' && 
                interaction.user.tag != 'likwy' && 
                interaction.user.tag != "snowfort" &&
                interaction.user.tag != "ducky7329" &&
                interaction.user.tag != "f3n1x." &&
                interaction.user.tag != "yonush."
            ) {
                return false;
            }
            return true;
        }

        try {
            const [type, suggestionId, action] = interaction.customId.split('.');

            if (!type || !suggestionId || !action) return;
            if (type !== 'suggestion') return;

            await interaction.deferReply({
                ephemeral: true
            });

            const targetSuggestion = await suggestions.findOne({ suggestionId });
            const targetMessage = await interaction.channel.messages.fetch(targetSuggestion.messageId);
            const targetPoolEmbed = targetMessage.embeds[0];
            const targetMessageEmbed = targetMessage.embeds[1] ? targetMessage.embeds[1] : targetMessage.embeds[0];

            if (action === 'approve') {
                if (!await authQ()) {
                    return await interaction.editReply({
                        content: `You do not have permission to approve suggestions.`
                    });
                }

                targetSuggestion.status = 'approved';

                targetMessageEmbed.data.color = 0x84e660;
                targetMessageEmbed.fields[1].value = '✅ Approved';

                await targetSuggestion.save();

                // Add pool
                let mapPoolInfo = await new mapPools({
                    _id: new mongoose.Types.ObjectId(),
                    name: targetSuggestion.poolName,
                    elo: targetSuggestion.elo,
                    maps: {
                        noMod: targetSuggestion.maps.noMod,
                        hidden: targetSuggestion.maps.hidden,
                        hardRock: targetSuggestion.maps.hardRock,
                        doubleTime: targetSuggestion.maps.doubleTime,
                        freeMod: targetSuggestion.maps.freeMod,
                        tieBreaker: targetSuggestion.maps.tieBreaker
                    },
                });

                await mapPoolInfo.save();
                console.log(mapPoolInfo);

                interaction.editReply({
                    content: `Suggestion approved!`
                });

                targetMessage.edit({
                    embeds: [targetMessageEmbed],
                    components: [targetMessage.components[0]],
                });

                return;
            }

            if (action === 'reject') {
                if (!await authQ()) {
                    return await interaction.editReply({
                        content: `You do not have permission to reject suggestions.`
                    });
                }

                targetSuggestion.status = 'rejected';

                targetMessageEmbed.data.color = 0xff6161;
                targetMessageEmbed.fields[1].value = '❌ Rejected';

                await targetSuggestion.save();

                interaction.editReply({
                    content: `Suggestion rejected!`
                });

                targetMessage.edit({
                    embeds: [targetMessageEmbed],
                    components: [targetMessage.components[0]],
                });

                return;
            }

            if (action === 'upvote') {
                const hasVoted = targetSuggestion.upvotes.includes(interaction.user.id) || 
                    targetSuggestion.downvotes.includes(interaction.user.id);
                
                if (hasVoted) return await interaction.editReply({
                    content: `You have already casted your vote for this pool.`
                });

                targetSuggestion.upvotes.push(interaction.user.id);

                await targetSuggestion.save();

                interaction.editReply({
                    content: `Upvoted pool!`
                });

                targetMessageEmbed.fields[2].value = formatResults(targetSuggestion.upvotes, targetSuggestion.downvotes);

                if (targetMessage.embeds.length == 2) {
                  targetMessage.edit({
                      embeds: [targetPoolEmbed, targetMessageEmbed]
                  });
                } else {
                  targetMessage.edit({
                      embeds: [targetMessageEmbed]
                  });
                }

                return;            
            }

            if (action === 'downvote') {
                const hasVoted = targetSuggestion.upvotes.includes(interaction.user.id) || 
                    targetSuggestion.downvotes.includes(interaction.user.id);
                
                if (hasVoted) return await interaction.editReply({
                    content: `You have already casted your vote for this pool.`
                });

                targetSuggestion.downvotes.push(interaction.user.id);

                await targetSuggestion.save();

                interaction.editReply({
                    content: `Downvoted pool!`
                });

                targetMessageEmbed.fields[2].value = formatResults(targetSuggestion.upvotes, targetSuggestion.downvotes);

                if (targetMessage.embeds.length == 2) {
                  targetMessage.edit({
                      embeds: [targetPoolEmbed, targetMessageEmbed]
                  });
                } else {
                  targetMessage.edit({
                      embeds: [targetMessageEmbed]
                  });
                }

                return;            
            }

        } catch (error) {
            console.log(`Error in handleSuggestion: ${error}`);
        }
      }
    } catch (err) {
      console.log(err);
    }
  },
};
