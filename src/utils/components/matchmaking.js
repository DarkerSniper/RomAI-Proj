const MatchMaking = require("gamemaker");
const { bold, italic, strikethrough, underscore, spoiler, quote, blockQuote, inlineCode , codeBlock, ButtonBuilder, ActionRowBuilder, EmbedBuilder, ComponentType, ButtonStyle } = require('discord.js');

const osuUser = require(`../../schemas/osuUser`);

const { getGames, getMatchLimitation } = require(`../osu/activeData`);
const { startingElo } = require(`../osu/skillsCalculation`);
const { getRandomInt, dateConversion } = require(`../osu/formatNum`);
const { handleLobby } = require(`../osu/autoMatches`);
const Guild = require("../../schemas/guild");

const testingServer = '1245368064992870471';

var globalClient;

const duelQueue = new Set();
const duosQueue = new Set();

let isCheckingLobby = false; // Flag to prevent concurrent lobby checks
let lobbyQueue = []; // A queue to manage pending matchmaking requests

// Start Matchmaking
async function startMatch(players) {
    //"player" parameter structure: {player: the player object, addedAt: timestamp when the player was added to the queue}
    let player1 = players[0].name;
    let player2 = players[1].name;
    let guilds = [];

    if (players[0].guild == players[1].guild) {
        if (!players[0].guild) players[0].guild = testingServer;
        guilds.push(players[0].guild);
    } else {
        guilds = [players[0].guild, players[1].guild];
    }
    console.log(guilds);

    for (let i=0; i<guilds.length; i++) {
        if (!guilds[i]) guilds[i] = testingServer;
        let channelId = (await Guild.findOne({ guildId: guilds[i] })).setup.matchmakingChannel;
        let mmChannel = globalClient.channels.cache.get(channelId);

        mmChannel.send(`Match found: <@${players[0].id}> (${players[0].elo}) vs <@${players[1].id}> (${players[1].elo})`);
    }

    handleLobby(player1, player2, guilds, globalClient);
    console.log(`Match found: ${player1} (${players[0].elo}) vs ${player2} (${players[1].elo})`); //fired when a match starts, passing all the players as arguments
}

async function startDuosMatch(players) {
    //"player" parameter structure: {player: the player object, addedAt: timestamp when the player was added to the queue}
    let player1 = players[0].name;
    let player2 = players[1].name;
    let player3 = players[2].name;
    let player4 = players[3].name;
    let guilds = [];

    for (let i=0; i<4; i++) {
        if (!players[i].guild) players[i].guild = testingServer;
        if (guilds.includes(players[i].guild)) continue;

        guilds.push(players[i].guild);
    }

    const teams = {
        teamA: [player1, player2],
        teamB: [player3, player4]
    };

    for (let i=0; i<guilds.length; i++) {
        let channelId = (await Guild.findOne({ guildId: guilds[i] })).setup.matchmakingChannel;
        let mmChannel = globalClient.channels.cache.get(channelId);

        mmChannel.send(`Match found: <@${players[0].id}> (${players[0].elo}) & <@${players[1].id}> (${players[1].elo}) vs <@${players[2].id}> (${players[2].elo}) & <@${players[3].id}> (${players[3].elo})`);
    }

    handleLobby(undefined, undefined, guilds, globalClient, teams);
    console.log(`Match found: ${player1} (${players[0].elo}) & ${player2} (${players[1].elo}) vs ${player3} (${players[2].elo}) & ${player4} (${players[3].elo})`); //fired when a match starts, passing all the players as arguments
}

async function matchPlayers(players) {
    players = Array.from(players);

    let rankLimit = 150;
    let maxLimit = 300;

    // Check if there are exactly 4 games
    if (getGames().length == 4) {
        return false;
    }

    // Loop through each pair of players
    for (let i = 0; i < players.length; i++) {
        let player1 = players[i];

        // Check the match limitations for the first player
        if (getMatchLimitation(player1.id)) {
            removePlayerByID(player1.id, 1);
            continue;
        }

        // Loop through the rest of the players after the current player
        for (let j = i + 1; j < players.length; j++) {
            let player2 = players[j];

            // Check the match limitations for the second player
            if (getMatchLimitation(player2.id)) {
                removePlayerByID(player2.id, 1);
                continue;
            }

            // Calculate the ELO difference between the two players
            let eloRange = Math.abs(player1.elo - player2.elo);

            /*
            let queueTime = players[0].elo < players[1].elo ? players[0].addedAt : players[1].addedAt;

            queueTime = Math.round(((Date.now() - queueTime) / 1000) * 1.5);
            let timeOverElo = (rankLimit + queueTime) >= maxLimit ? maxLimit : (rankLimit + queueTime); 
            */

            // Check if the ELO difference is less than the rankLimit
            if (eloRange <= rankLimit) {
                await startMatch([players[i], players[j]]);

                let status1 = removePlayerByID(player1.id, 1);
                let status2 = removePlayerByID(player2.id, 1);

                console.log(`player1 removed from queue: ${status1}\nplayer2 removed from queue: ${status2}`);
                return true; // Players can be matched
            }
        }
    }

    // If no matching players found
    return false;
}

async function matchDuosPlayers(players) {
    players = Array.from(players);

    const rankLimit = 150;

    if (getGames().length === 4) return false;

    let usedIds = new Set();
    let duos = [];

    let soloPlayers = [];

    // Separate party duos and solo players
    for (let player of players) {
        if (usedIds.has(player.id)) continue;

        if (player.party) {
            if (usedIds.has(player.party.id)) continue;

            duos.push([
                player,
                {
                    name: player.party.name,
                    id: player.party.id,
                    elo: player.party.elo,
                    guild: player.guild,
                    party: { name: player.name, id: player.id, elo: player.elo }
                }
            ]);
            usedIds.add(player.id);
            usedIds.add(player.party.id);
        } else {
            soloPlayers.push(player);
            usedIds.add(player.id);
        }
    }

    // Smart pairing of solo players based on closest ELO
    soloPlayers.sort((a, b) => a.elo - b.elo); // Sort by ELO

    while (soloPlayers.length >= 2) {
        let bestDiff = Infinity;
        let bestPair = null;

        for (let i = 0; i < soloPlayers.length; i++) {
            for (let j = i + 1; j < soloPlayers.length; j++) {
                let diff = Math.abs(soloPlayers[i].elo - soloPlayers[j].elo);
                if (diff < bestDiff) {
                    bestDiff = diff;
                    bestPair = [i, j];
                }
            }
        }

        if (!bestPair) break;

        let [i, j] = bestPair;
        duos.push([soloPlayers[i], soloPlayers[j]]);

        // Remove paired players
        if (i > j) [i, j] = [j, i]; // Ensure correct removal order
        soloPlayers.splice(j, 1);
        soloPlayers.splice(i, 1);
    }

    // Now match duos
    for (let i = 0; i < duos.length; i++) {
        let [p1, p2] = duos[i];

        if (getMatchLimitation(p1.id) || getMatchLimitation(p2.id)) {
            removePlayerByID(p1.id, 2);
            removePlayerByID(p2.id, 2);
            continue;
        }

        let duoAelo = p1.elo + p2.elo;

        for (let j = i + 1; j < duos.length; j++) {
            let [p3, p4] = duos[j];

            let allIds = new Set([p1.id, p2.id, p3.id, p4.id]);
            if (allIds.size < 4) continue;

            if (getMatchLimitation(p3.id) || getMatchLimitation(p4.id)) {
                removePlayerByID(p3.id, 2);
                removePlayerByID(p4.id, 2);
                continue;
            }

            let duoBelo = p3.elo + p4.elo;
            let eloDiff = Math.abs(duoAelo - duoBelo);

            if (eloDiff <= rankLimit) {
                await startDuosMatch([p1, p2, p3, p4]);

                console.log(`Matched: ${p1.name}, ${p2.name}, ${p3.name}, ${p4.name}`);

                removePlayerByID(p1.id, 2);
                removePlayerByID(p2.id, 2);
                removePlayerByID(p3.id, 2);
                removePlayerByID(p4.id, 2);

                return true;
            }
        }
    }

    return false;
}


async function checkMatches() {
    console.log('[Matchmaking Queue]: Handling requests...');

    while (lobbyQueue.length > 0) {
        // lobbyQueue = [string] -> 'duels' || 'duos'
        const request = lobbyQueue.shift(); // Get the next matchmaking request
        console.log(`[Matchmaking Queue]: Request: ${request}`);

        // Check if there are exactly 4 games
        if (getGames().length >= 4) {
            let lobbyOpen = false;

            while (!lobbyOpen) {
                if (getGames().length < 4) {
                    lobbyOpen = true;
                } else {
                    // Wait for 5 seconds before checking again
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }
        }

        // Matchmaking logic for duels
        if (request === 'duels') {
            const result = await matchPlayers(duelQueue);
            // Timeout here needed for about 5 seconds
            // This is necessary to prevent two matches to start at the same time
            if (result) {
                console.log('[Matchmaking Queue]: Duel matched');
                await new Promise(resolve => setTimeout(resolve, 5000));
                continue;
            }
        }

        // Matchmaking logic for duos
        if (request === 'duos') {
            const result = await matchDuosPlayers(duosQueue);
            if (result) {
                console.log('[Matchmaking Queue]: Duos matched');
                await new Promise(resolve => setTimeout(resolve, 5000));
                continue;
            }
        }
    }

    // No more requests in the queue, reset the checking flag
    console.log('[Matchmaking Queue]: No more requests');
    isCheckingLobby = false;
}

function getPlayerByID(id, mode) {
    if (duelQueue.size == 0 && mode == 1) return false;
    if (duosQueue.size == 0 && mode == 2) return false;

    if (mode == 1) {
        for (let p of duelQueue) {
            if (p.id == id) return p;
        }
    } else if (mode == 2) {
        for (let p of duosQueue) {
            if (p.id == id) return p;
            else if (p.party && p.party.id == id) return p;
        }
    }

    return false;
} 

function removePlayerByID(id, mode) {
    if (duelQueue.size == 0 && mode == 1) return false;
    if (duosQueue.size == 0 && mode == 2) return false;

    if (mode == 1) {
        for (let p of duelQueue) {
            if (p.id == id) {
                duelQueue.delete(p);
                return true;
            }
        }
    } else if (mode == 2) {
        for (let p of duosQueue) {
            if (p.id == id) {
                duosQueue.delete(p);
                return true;
            } else if (p.party && p.party.id == id) {
                duosQueue.delete(p);
                return true;
            }
        }
    }

    return false;
}

/*
matcher.addPlayer({
    name: "",
    id: 1,
    elo: 1,
});
*/

module.exports = {
    async assignClient(client) {
        globalClient = client;
    },

    async queue(interaction, client, action, discordUser, mode, teammate) {
        let discordId = discordUser.id;
        let osuUserProfile = await osuUser.findOne({ discordId: discordId });

        if (!osuUserProfile && interaction) return await interaction.editReply({
            content: `Please link your osu! account using ${inlineCode("/authosu")}`,
            ephemeral: true
        });

        let midGame = await getGames();
        let player = await getPlayerByID(discordId, mode);

        switch (action) {
            case "joinqueue":
                if (player) {
                    if (interaction) {
                        return await interaction.editReply({
                            content: `You have already joined the queue.`
                        });
                    } else {
                        return 'You are already in queue.';
                    }
                }

                if (client) globalClient = client;

                let playerProfile = await osuUser.findOne({ discordId: discordId });

                let playerElo = mode == 1 ? playerProfile.elo["1v1"] : playerProfile.elo["2v2"];
                playerElo = playerElo == 0 ? await startingElo(playerProfile.osuUserId) : playerElo;

                if (mode == 1) {
                    duelQueue.add({
                        name: playerProfile.osuUserName,
                        id: discordId,
                        elo: playerElo,
                        guild: interaction ? interaction.guildId : undefined,
                    });

                    lobbyQueue.push('duels');

                    if (!isCheckingLobby) {
                        isCheckingLobby = true;
                        checkMatches();
                    }

                    if (interaction) {
                        await interaction.editReply({
                            content: `You are now in queue for 1v1!`
                        });
                    } else {
                        return 'You are now in queue for 1v1!';
                    }
                } else if (mode == 2) {
                    // ask user's teammate for queue
                    if (teammate) {
                        let teammateProfile = await osuUser.findOne({ discordId: teammate.id });

                        if (!teammateProfile) return await interaction.editReply({
                            content: `The user you have chosen hasn't linked an account. ${inlineCode("/authosu")}`
                        });

                        if (await getPlayerByID(teammate.id, mode)) return await interaction.editReply({
                            content: `The user you have chosen is in queue already.`
                        });

                        let acceptId = `party-accept-${discordUser.id}-${teammate.id}`;
                        let declineId = `party-decline-${discordUser.id}-${teammate.id}`;

                        const acceptButton = new ButtonBuilder()
                            .setLabel('✅ Accept')
                            .setStyle(ButtonStyle.Success)
                            .setCustomId(acceptId)

                        const declineButton = new ButtonBuilder()
                            .setLabel('❌ Decline')
                            .setStyle(ButtonStyle.Danger)
                            .setCustomId(declineId)

                        const buttonRow = new ActionRowBuilder().addComponents(acceptButton, declineButton);

                        const queueEmbed = new EmbedBuilder()
                            .setTitle(`${discordUser.username} Has invited ${teammate.username} to party up!`)
                            .setDescription(`The invite will expire ${dateConversion (Date.now() + 120000)}\nUse the buttons to interact!`);

                        const response = await interaction.editReply({
                            content: `  `,
                            embeds: [queueEmbed],
                            components: [buttonRow]
                        });

                        let followUp = await interaction.followUp({
                            content: `<@${teammate.id}> <- Waiting for a response`
                        });

                        const filter = (i) => i.user.id == teammate.id;

                        const collector = response.createMessageComponentCollector({
                            componentType: ComponentType.Button,
                            filter,
                            time: 120000,
                        });

                        let answered = false;

                        collector.on('collect', async (inter) => {
                            if (inter.customId == acceptId) {
                                answered = true;

                                acceptButton.setDisabled(true);
                                declineButton.setDisabled(true);

                                await followUp.delete();

                                if (await getPlayerByID(teammate.id, mode)) return await interaction.editReply({
                                    content: `The user you have chosen is in queue already.`,
                                    embeds: [],
                                    components: []
                                });

                                let teammateElo = teammateProfile.elo["2v2"];
                                teammateElo = teammateElo == 0 ? await startingElo(teammateProfile.osuUserId) : teammateElo;
                                
                                duosQueue.add({
                                    name: playerProfile.osuUserName,
                                    id: discordId,
                                    elo: playerElo,
                                    guild: interaction.guildId,
                                    party: {
                                        name: teammateProfile.osuUserName,
                                        id: teammate.id,
                                        elo: teammateElo
                                    }
                                });

                                lobbyQueue.push('duos');

                                await interaction.editReply({
                                    content: `You are now in queue for 2v2 with <@${teammate.id}> !`,
                                    embeds: [],
                                    components: []
                                });

                                if (!isCheckingLobby) {
                                    isCheckingLobby = true;
                                    checkMatches();
                                }
                            }

                            if (inter.customId == declineId) {
                                answered = true;
                                acceptButton.setDisabled(true);
                                declineButton.setDisabled(true);

                                await followUp.delete();

                                await interaction.editReply({
                                    content: `<@${teammate.id}> has declined the party invite.`,
                                    embeds: [],
                                    components: []
                                });
                            }
                        });

                        collector.on('end', async () => {
                            if (answered) return;
                            
                            acceptButton.setDisabled(true);
                            declineButton.setDisabled(true);

                            await followUp.delete();

                            await interaction.editReply({
                                content: `<@${teammate.id}> has failed to accept the party invite.`,
                                embeds: [],
                                components: []
                            });
                        });
                    } else {
                        duosQueue.add({
                            name: playerProfile.osuUserName,
                            id: discordId,
                            elo: playerElo,
                            guild: interaction ? interaction.guildId : undefined,
                            party: undefined
                        });
    
                        lobbyQueue.push('duos');
    
                        if (interaction) {
                            await interaction.editReply({
                                content: `You are now in queue for 2v2!`
                            });
                        } else {
                            return 'You are now in queue for 2v2!';
                        }

                        if (!isCheckingLobby) {
                            isCheckingLobby = true;
                            checkMatches();
                        }
                    }   
                }

                return;
            case "leavequeue":
                if (!player) {
                    if (interaction) {
                        return await interaction.editReply({
                            content: `You are not in queue.`
                        });
                    } else {
                        return 'You are not in queue.';
                    }
                }

                await removePlayerByID(discordId, mode);

                if (interaction) {
                    return await interaction.editReply({
                        content: `You have left the queue!`
                    });
                } else {
                    return 'You have left the queue!';
                }
            case "showqueue":
                let queue = mode == 1 ? duelQueue : duosQueue;
                let msg = "";

                if (queue.size == 0) msg = `No one is in queue :(`;
                    else queue.forEach(player => {
                        msg += `${player.name}(${player.elo}) `;

                        if (player.party) {
                            msg += `${player.party.name}(${player.party.elo}) `;
                        }
                    });

                return await interaction.editReply({
                    content: `${msg}`
                });
            default:
                return await interaction.editReply({
                    content: `Please pick a valid action.`
                });
        }
    }
};