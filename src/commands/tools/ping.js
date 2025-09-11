const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    //Creates a new SlashCommand called 'ping'
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Return your ping!'),
    async execute(interaction, client) {
        //Returns a loading message (can also turn this off by changing to 'false')
        const message = await interaction.deferReply({
            fetchReply: true
        });

        //Calculates and returns the API Latency and Client Ping to the user
        const newMessage = `API Latency: ${client.ws.ping}\nClient Ping: ${message.createdTimestamp - interaction.createdTimestamp}`;
        await interaction.editReply({
            content: newMessage
        });
    }
}