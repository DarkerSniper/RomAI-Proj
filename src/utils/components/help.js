const fetch = require(`node-fetch`);
const { EmbedBuilder, inlineCode, bold, italic, hyperlink } = require("discord.js");

const { discordId, discordToken } = process.env;

module.exports = {
    async commandsInfo(interaction, client) {
        const commands = await client.application.commands.fetch();

        // Setup Commands
        const setupEmbed = new EmbedBuilder()
            .setTitle(`Setup Commands`)
            .setDescription(`Using these commands are necessary for most features.`);
        
        addCommandValue(setupEmbed, `authosu`, `Link your osu! account to RomAI by receiving a command then sending it to the ingame bot!`);
        addCommandValue(setupEmbed, `setguild`, `${bold(`Admin Only`)} Configure important settings to get RomAI started on your server!`);

        // Card Trading
        const cardTradingEmbed = new EmbedBuilder()
            .setTitle(`Card Trading Commands`)
            .setDescription(`Pack, trade, collect and sell osu! player cards (Designed and built by ${bold(`soiiyu`)})\n${italic(`Make sure to connect your osu! account to ${hyperlink(`osu!world`, `https://osuworld.octo.moe`)} and choose a region to have your card appear in packs.`)}`);

        addCommandValue(cardTradingEmbed, `inventory`, `Displays a user's inventory including: Packs, Cards and romBucks`, `inventory`);
        addCommandValue(cardTradingEmbed, `packuse`, `Open a pack using this command! (Pack ID is the number of the pack in the user's inventory)`);
        addCommandValue(cardTradingEmbed, `quicksell`, `Sell a card from your inventory by it's rarity's worth (you can check the price by just using the command, there's a confirm button)`);
        addCommandValue(cardTradingEmbed, `tradeoffer`, `Trade cards or packs with a desired user! (if you're trading multiple items in one option, make sure to use '-' between the IDs)`);
        addCommandValue(cardTradingEmbed, `cardbase`, `Check which users own a user's player card!`);
        addCommandValue(cardTradingEmbed, `packshop view`, `View the available packs in the shop!`);
        addCommandValue(cardTradingEmbed, `packshop buy`, `Use your romBucks to buy packs!`);
        addCommandValue(cardTradingEmbed, `toplocalrewards`, `Shows you the rewards you can get by settings a top local play! (Get the rewards only by using the ${inlineCode(`recent`)} command)`);

        // RomAI Matches
        const matchesEmbed = new EmbedBuilder()
            .setTitle(`RomAI Matches`)
            .setDescription(`Play in a tournament match setting with picks/bans!\n${bold(`Match Procedures`)}:\n1. After finding a match, both you and your opponent will receive invites to the lobby every 20 seconds. (max 2 min to join the lobby)\n2. If you haven't picked a pool before the match started, you'll have to choose a pool from 6 different map pools that are calculated to fit you and your opponent's skill.\n3. The format for pick/ban follows the 'Corsace Closed' format: A ban > B ban > B pick > A pick > A ban > B ban > B pick > A pick > ...B pick A pick\n4.Pick/Ban maps by typing their mod followed by a number ${bold(`(has to be lower cased)`)}. For example: 'nm2'`);

        addCommandValue(matchesEmbed, `matchmaking`, `Join/Leave/Show the queue to matchmaking. Play against a random opponent with simillar skill rating!`);
        addCommandValue(matchesEmbed, `duel`, `Play a 1v1 match with a specific user! (With an option to choose any pool from the database)`);
        addCommandValue(matchesEmbed, `duos`, `Play a 2v2 match with specific users! (With an option to choose any pool from the database)`);
        addCommandValue(matchesEmbed, `trios`, `Play a 3v3 match with specific users using any pool from the database!`);
        addCommandValue(matchesEmbed, `dailychallenges`, `Displays your daily challenges with an option to reroll if non have been completed`);
        addCommandValue(matchesEmbed, `mappools`, `Interact with RomAI's map pools with the following actions:\n- ${italic(`Public Actions:`)}\n  - ${bold(`List`)}: Sends you a DM with all the available map pools!\n  - ${bold(`Show`)}: Shows the given pool's maps. (Pool name is needed for this command)\n- ${italic(`Private Access Required:`)}\n  - ${bold(`Add`)}: (Only available for some users currently) Add a pool to the database by providing a name and beatmap IDs!\n  - ${bold(`Remove`)}: (Only available for some users currently) Deletes a map pool from the database! (Pool name is needed for this command)\n  - ${bold(`Confirm`)}: (Only available for allowed users currently) Confirm the addition of a pool.\n  - ${bold(`Cancel`)}: (Only available for allowed users currently) Cancels the addition of a pool.`);

        // osu! Commands
        const osuEmbed = new EmbedBuilder()
            .setTitle(`osu! Commands`)
            .setDescription(`Common osu! commands. The commands that are used by the '!' prefix can work using @s`);

        addCommandValue(osuEmbed, `user`, `Displays the osu! stats of a user followed by ELO, Match Records, RomAI Account Level and romBucks!`, `user`);
        addCommandValue(osuEmbed, `recent`, `Displays a recent osu! score, you could also input a number to use up to ${bold(`10`)} recent scores. For example: ${inlineCode(`!r4`)}`, `r`);
        addCommandValue(osuEmbed, `c`, `Shows the submitted scores of a user! (Handled from best to worse)`, `c`);
        addCommandValue(osuEmbed, `playercard`, `Displays the custom player card of a user! ${italic(`Made by the one and only: soiiyu`)}`, `playercard`);
        addCommandValue(osuEmbed, `serverleaderboard`, `View the leaderboards of the server! (1v1, 2v2, Inventory and Level)`);
        addCommandValue(osuEmbed, `topplayscountry`, `Displays the top osu! plays of a country!`);

        // League Commands
        const leagueEmbed = new EmbedBuilder()
            .setTitle(`League Commands (WIP)`)
            .setDescription(`Commands for the new League feature!`);

        addCommandValue(leagueEmbed, `createleague`, `(Currently not available) Creates an automated league! (Group Stage and Playoffs)`);
        addCommandValue(leagueEmbed, `weekendleague register`, `Joins an ongoing league (Double XP and rewards for top placed players)`);
        addCommandValue(leagueEmbed, `weekendleague leave`, `Leaves an ongoing league`);

        const categories = [setupEmbed, osuEmbed, matchesEmbed, cardTradingEmbed];

        await interaction.user.send({
            embeds: categories
        });

        return await interaction.editReply({
            content: `Check your messages for help! :^)`
        });

        function addCommandValue(embed, command, desc, prefixCommand) {
            console.log(command);
            const commandInfo = command.includes(" ") 
                ? commands.find(c => c.name === command.split(" ")[0])
                : commands.find(c => c.name === command);

            let commandString = !prefixCommand
                ? `- </${command}:${commandInfo.id}>`
                : `- </${command}:${commandInfo.id}> or ${inlineCode(`!${prefixCommand}`)}`;

            embed.addFields({
                name: `  `,
                value: `${commandString} - ${desc}`
            });
        }
    }
};