const fs = require('fs');
const { connection } = require('mongoose');

module.exports = (client) => {
    //Letting the bot know where the *events* folder is and importing all files inside of it
    client.handleEvents = async () => {
        const eventFolders = fs.readdirSync(`./src/events`);
        for ( const folder of eventFolders) {
            const eventFiles = fs
                .readdirSync(`./src/events/${folder}`)
                .filter(file => file.endsWith('.js'));

            //Seperating the folders inside of the events folder
            switch (folder) {
                case "client":
                    for (const file of eventFiles) {
                        const event = require(`../../events/${folder}/${file}`);
                        if (event.once) 
                            client.once(event.name, (...args) => 
                                event.execute(...args, client));
                        else 
                            client.on(event.name, (...args) => 
                                event.execute(...args, client));
                    }
                    break;

                case "mongo":
                    for (const file of eventFiles) {
                        const event = require(`../../events/${folder}/${file}`);
                        if (event.once) 
                            connection.once(event.name, (...args) =>
                                event.execute(...args, client));
                        else 
                            connection.on(event.name, (...args) => 
                                event.execute(...args, client));
                    }
                    break;
                
                default:
                    break;
            }
        }
    };
};