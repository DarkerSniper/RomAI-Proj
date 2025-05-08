const mongoose = require('mongoose');
const { Interaction } = require('discord.js');

const suggestions = require(`../../schemas/suggestion`);
const mapPools = require(`../../schemas/mapPool`);

const formatResults = require('../../utils/discord/formatResults');

/**
 * 
 * @param {Interaction} interaction 
 */

module.exports = async (interaction) => {
    if (!interaction.isButton() || !interaction.customId) return;

    async function authQ() {
        if (
            interaction.user.tag != 'romdarker' && 
            interaction.user.tag != 'likwy' && 
            interaction.user.tag != "snowfort" &&
            interaction.user.tag != "ducky7329" &&
            interaction.user.tag != "f3n1x."
        ) {
            return false;
        }
        return true;
    }

    try {
        const [type, suggestionId, action] = interaction.customId.split('.');

        if (!type || !suggestionId || !action) return;
        if (tyoe !== 'suggestion') return;

        await interaction.deferReply({
            ephemeral: true
        });

        const targetSuggestion = await suggestions.findOne({ suggestionId });
        const targetMessage = await interaction.channel.messages.fetch(targetSuggestion.messageId);
        const targetPoolEmbed = targetMessage.embeds[0];
        const targetMessageEmbed = targetMessage.embeds[1];

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

            targetMessage.edit({
                embeds: [targetPoolEmbed, targetMessageEmbed]
            });

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

            targetMessage.edit({
                embeds: [targetPoolEmbed, targetMessageEmbed]
            });

            return;            
        }

    } catch (error) {
        console.log(`Error in handleSuggestion: ${error}`);
    }
}