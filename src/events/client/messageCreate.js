const syntax = "!";

const authorizedUsers = process.env.authorizedUsers.split(',');

const osuUser = require(`../../schemas/osuUser`);

const { getRandomInt } = require(`../../utils/osu/formatNum`);

const { beatmapDetection } = require(`../../utils/components/beatmap`);
const { recentScore } = require(`../../utils/components/recent`);
const { userProfile } = require(`../../utils/components/user`);
const { compareScore } = require(`../../utils/components/compare`);
const { playerCard } = require(`../../utils/components/card`);
const { createInvite } = require(`../../utils/components/invite`);
const { showInventory } = require(`../../utils/components/inventory`);

const { userSecret, removePackReservation, getGames, removeGame, removeMatchLimitation } = require(`../../utils/osu/activeData`);
const { simulateWeekendLeague } = require("../../utils/tests/leagueSimulation");
const leagues = require("../../schemas/leagues");
const { testRankDistribution, testRankProgress } = require("../../utils/tests/rankCommands");

module.exports = {
    name: "messageCreate",
    async execute(message, client) {
        try {
            if (message.content.startsWith("https://osu.ppy.sh/beatmapsets/")) {
                await beatmapDetection(message);
            }
    
                switch (message.content) {
                    case "63":
                        await message.reply({
                            content: `  `,
                            files: [{ attachment: `./src/utils/images/secrets/accident.png`, name: "SPOILER_FILE.png" }]
                        });
                        break;
                    case "saggin":
                        await message.reply({
                            content: `My main concern about this point is the map feel more like a full screen jump spam more than actually representing the song, and I believe that the song is not really necessary to have such high spacing`,
                        });
                        break;
                    case "pixel":
                        await message.reply({
                            content: `"I love The Roundtable II pools, I wish every map I ever play would be from The Roundtable II" - WhitePixel`
                        });
                        break;
                    case "juvenile":
                        await message.reply({
                            content: `  `,
                            files: [{ attachment: `./src/utils/images/secrets/juvenile.png`, name: "SPOILER_FILE.png" }]
                        });
                        break;
                    case "f3n1x":
                        await message.reply({
                            content: `ze lo matzhik, yesh anashim shegarim bekiryat ata.. mitpotzetzim.. ahi ze lo matzhik`
                        });
                        break;
                    case "deer":
                        await message.reply({
                            content: `https://www.youtube.com/watch?v=Xi6tAdbxX6Y`
                        });
                        break;
                    case "g8pple":
                        await message.reply({
                            content: `One day he'll understand the weight of the world`
                        });
                        break;
                    case "80 shekel":
                        await message.reply({
                            content: `mi shote shnitzel?!`
                        });
                        break;
                    case "likey":
                        await message.reply({
                            content: `msk`
                        });
                        break;
                    case "abuse?":
                        await message.reply({
                            content: `  `,
                            files: [{ attachment: `./src/utils/images/secrets/abusing.png`, name: "SPOILER_FILE.png" }]
                        });
                        break;
                    case "yo":
                        await message.reply({
                            content: `yo yo yo yo yo yo yo, hey yo yo yo yo yo, lie yo, yo yo yo yo, yo yo yo, who got the yo yo yo yo yo yoyoyoyo, yo yo yo yo yo, yo yo yo yo yo yo yo yo yo. Voight yo. yo yo uh yo yo yo yo yo yo, yo yo yo yo, yo yo yo, yo yo yo, yo yo yo, yo yo yo, yo yo yo, yo yo. Yoyoyoyoyo, yoyoyoyoyo, yoyoyoyoyoyo yoyoyoyoyoyo eeeyeah yo, party handicap, yeah!`
                        });
                        break;
                    case "maftle":
                        await message.reply({
                            content: `ban hd2 again just to make sure`
                        });
                        break;
                    case "ducky":
                        await message.reply({
                            content: `en quatro ka`
                        });
                        break;
                    case "no cry":
                        await message.reply({
                            content: `here's no paaaaaain`
                        });
                        break;
                    case "temptation":
                        await message.reply({
                            content: `in my heart`
                        });
                        break;
                    case "95":
                        await message.reply({
                            content: `ma misim?`
                        });
                        break;
                    case "shtok":
                        await message.reply({
                            content: `mi ata bihlal`
                        });
                        break;
                    case "doitsumo":
                        await message.reply({
                            content: `koitsumo`
                        });
                        break;
                    case "otvet":
                        await message.reply({
                            content: `chupa chups`
                        });
                        break;
                    case "following the echoes":
                        await message.reply({
                            content: `OOOOOOOOOOOO`
                        });
                        break;
                    case "what is your name":
                        await message.reply({
                            content: `uvuvwevwevwe onetyewevwe ugemubem osas`
                        });
                        break;
                    case "verificame":
                        await message.reply({
                            content: `gracias`
                        });
                        break;
                    case "alice":
                        await message.reply({
                            content: `CAN'T YOU SEE`
                        });
                        break;
                    case "i remember":
                        await message.reply({
                            content: `the way your lipstick`
                        });
                        break;
                    case "smart farm":
                        await message.reply({
                            content: `f3n1x nobel prize`
                        });
                        break;
                    case "king von":
                        await message.reply({
                            content: `kiryat ata`
                        });
                        break;
                    case "jm":
                        await message.reply({
                            content: `hop on ranked`
                        });
                        break;
                    case "what ban?":
                        await message.reply({
                            content: `MAFTLE WARNING`
                        });
                        break;
                    case "315":
                        await message.reply({
                            content: `he a random`
                        });
                        break;
                }
    
            if (message.content.startsWith(syntax)) {
                var msg = message.content.split(syntax).pop();
                console.log(msg);
    
                var getUsername = msg.includes(" ") ? msg.split(" ")[1] : undefined;
                var getCommand = msg.includes(" ") ? msg.split(" ")[0] : msg;
                getCommand = getCommand.toLowerCase();

                console.log(`Command's username: ${getUsername}`);
    
                var getPreviousRecent = 0;
    
                if (getCommand.includes('rs') || getCommand.includes('recent') || getCommand.includes('r')) {
                    console.log(`recent command used`);
                    for (let i=1; i<101; i++) {
                        if (getCommand == `rs${i}` || getCommand == `recent${i}` || getCommand == `r${i}`) {
                            getPreviousRecent = i;
                            console.log(`found recent arg of: ${getPreviousRecent}`);
                            getCommand = getCommand.replace(`${i}`, '');
                        }
                    }
                }
    
                if (getCommand == "rs" || getCommand == "recent" || getCommand == "r") {
                    var reply;
    
                    if (getPreviousRecent == 0) {
                        reply = await recentScore(undefined, client, getUsername, message);
                    } else {
                        reply = await recentScore(undefined, client, getUsername, message, getPreviousRecent);
                    }
    
                    await message.reply(reply);
                } else if (getCommand == "user") {
                    var reply = await userProfile(undefined, client, getUsername, message);
    
                    await message.reply(reply);
                } else if (getCommand == "c" || getCommand == "compare") {
                    let params = msg.includes(" ") ? msg.split(" ") : undefined;

                    var reply;
                    let beatmapId = undefined;

                    const repliedMessage = message.reference ? await message.fetchReference().catch(() => undefined) : undefined;

                    if (repliedMessage) {
                        console.log(`Refrence detected in '!c'`);

                        let found = false;

                        for (const embed of repliedMessage.embeds) {
                            console.log(embed);
                            if (embed.data.url.includes("#osu/")) {
                                const match = embed.data.url.split("#osu/")[1];
                                beatmapId = match;
                                found = true;
                                console.log(`Found beatmap in embed: ${beatmapId}`);
                            }
                        }

                        if (!found && repliedMessage.content.includes("#osu/")) {
                            const match = repliedMessage.content.split("#osu/")[1];
                            beatmapId = match;
                        } 
                    } else if (params) {
                        params = params.slice(1);

                        let userIndex = null;

                        for (let i=0; i<params.length; i++) {
                            let param = params[i];

                            if (param.includes("#osu/")) {
                                beatmapId = param.split("#osu/")[1];
                                userIndex = i == 1 ? 0 : 1;
                                break;
                            }
                        }

                        getUsername = params[userIndex];
                    }

                    reply = await compareScore(undefined, client, getUsername, message, beatmapId);
    
                    await message.reply(reply);
                } else if (getCommand == "playercard") {
                    await playerCard(undefined, client, getUsername, message);
                } else if (getCommand == "invitelink") {
                    var reply = await createInvite(client, message);
    
                    await message.reply(reply);
                } else if (getCommand == "inventory") {
                    var reply = await showInventory(undefined, message, undefined);
    
                    await message.reply(reply);
                } else if (getCommand == "rankprogress" && message.author.username == 'romdarker') {
                    var reply = await testRankProgress(getUsername);

                    await message.reply(reply);
                } else if (authorizedUsers.includes(message.author.username)) {
                    let debugIndex = "debug";
                    let mention = message.mentions.members.first();

                    switch (getCommand) {
                        case debugIndex + "rpackreserve":
                            let packRemoved = await removePackReservation(mention.id);

                            if (!packRemoved) 
                                await message.reply(`${mention.displayName} wasn't found in Pack Reservation.`);
                            else
                                await message.reply(`${mention.displayName} has been removed from Pack Reservation!`);

                            break;
                        case debugIndex + "rshow":
                            let games = await getGames();

                            await message.reply(`Ongoing games:\n${games.join(` | `)}`);
                            break;
                        case debugIndex + "rgame":
                            let gameRemoved = await removeGame(getUsername);

                            if (!gameRemoved) 
                                await message.reply(`Game wasn't found.`);
                            else
                                await message.reply(`Game removed successfully!`);

                            break;
                        case debugIndex + "rmatchlimit":
                            let matchRemoved = await removeMatchLimitation(mention.id);

                            if (!matchRemoved)
                                await message.reply(`${mention.displayName} wasn't found in Match Limitation`);
                            else
                                await message.reply(`${mention.displayName} has been removed from Match Limitation!`);
                            break;
                    }
                }
            }
        } catch (error) {
            console.log(error);
        }
    }, 
};
