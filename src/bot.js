//grabbing private bot token from a local file
require('dotenv').config();
const { discordToken, mongodbToken } = process.env;
const { connect } = require('mongoose');

//imports
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const fs = require('fs');

//consts for the botClient and all commands
const client = new Client({ intents: 
    [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildEmojisAndStickers,
    ]
});
client.commands = new Collection();
client.commandArray = [];

//Letting the bot know where the *functions* folder is and importing all files inside of it
const functionFolders = fs.readdirSync(`./src/functions`);
for (const folder of functionFolders) {
    const functionFiles = fs
        .readdirSync(`./src/functions/${folder}`)
        .filter(file => file.endsWith(".js"));

        for (const file of functionFiles) 
            require(`./functions/${folder}/${file}`)(client);
}

const utilsFolders = fs.readdirSync(`./src/utils`);
for (const folder of utilsFolders) {
    const utilsFiles = fs
        .readdirSync(`./src/utils/${folder}`)
        .filter(file => file.endsWith(".js"));

        for (const file of utilsFiles)
            require(`./utils/${folder}/${file}`);
}

//Calling functions
client.handleEvents();
client.handleCommands();
client.login(discordToken);
(async () => {
    await connect(mongodbToken).catch(console.error);
})();
