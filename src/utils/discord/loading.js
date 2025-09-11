const { EmbedBuilder, bold, italic, strikethrough, underscore, spoiler, quote, blockQuote, inlineCode , codeBlock, underline } = require('discord.js');

module.exports = {
    async loadingMessage(taskName, taskArray) {
        const loadingEmbed = () => {
            // taskArray - string[]

            const tasks = taskArray;
            const embed = new EmbedBuilder()
                .setTitle(`${taskName}`);

            for (let task of tasks) {
                embed.addFields({
                    name: `  `,
                    value: `${task} ⏳`
                });
            }

            const changeState = (taskIndex, taskState, taskPercentage) => {
                // taskState - 'waiting' || 'executing' || 'completed'

                let taskValue = `${tasks[taskIndex]} `;
                
                switch (taskState) {
                    case 'waiting':
                        taskValue += `⏳`;
                        break;
                    case 'executing':
                        taskValue += `🚀`;
                        break;
                    case 'completed':
                        taskValue += `✅`;
                        break;
                }

                if (taskPercentage) taskValue += `${italic(`(${taskPercentage}%)`)}`;

                embed.data.fields[taskIndex].value = taskValue;

                for (let i=0; i<taskIndex; i++) {
                    embed.data.fields[i].value = `${tasks[i]} ✅`;
                }

                return embed;
            };

            const getEmbed = () => { return embed };

            return { changeState, getEmbed };
        };

        return loadingEmbed;
    }
};