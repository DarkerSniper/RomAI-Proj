const { AttachmentBuilder } = require(`discord.js`);

const { saveMapPool, getMapPool } = require(`../osu/activeData`);
const { poolAddition, poolDeletion, poolConfirm, poolCancel, poolList, poolShow, poolEdit, poolPrivateConfirm, poolPrivateDeletion } = require(`../discord/poolHandler`);

const mapPools = require(`../../schemas/mapPool`);

module.exports = {
    async mapPools(interaction, client, action, poolName, mapsNM, mapsHD, mapsHR, mapsDT, mapsFM, mapTB) {
        try {
            let reply;
            
            async function authQ() {
                if (
                    interaction.user.tag != 'romdarker' && 
                    interaction.user.tag != 'likwy' && 
                    interaction.user.tag != "snowfort" &&
                    interaction.user.tag != "ducky7329" &&
                    interaction.user.tag != "f3n1x."
                ) {
                    reply = await interaction.editReply({
                        content: `You do not have access to this command.`,
                        ephemeral: true
                    });
                    return false;
                }
                return true;
            }

            if (!action) return await interaction.editReply({
                content: `Choose a valid option brah...`,
                ephemeral: true
            });

            switch (action) {
                case "Edit":
                    if (!await authQ()) break;

                    let tempp = [mapsNM, mapsHD, mapsHR, mapsDT, mapsFM, mapTB];
                    let noNum = false;

                    for (let i=0; i<tempp.length; i++) {
                        if (!tempp[i]) {
                            continue;
                        }

                        if (tempp[i].includes(" ")) tempp[i] = tempp[i].split(" ");
                        if (tempp[i].includes("[a-zA-Z]+")) {noNum = true; break; }

                        if (Array.isArray(tempp[i])) {
                            for (let j=0; j<tempp[i].length; j++) {
                                tempp[i][j] = parseInt(tempp[i][j]);
                            }
                        } else {
                            tempp[i] = parseInt(tempp[i]);
                        }
                    }

                    mapsNM = tempp[0] ? tempp[0] : [];
                    mapsHD = tempp[1] ? tempp[1] : [];
                    mapsHR = tempp[2] ? tempp[2] : [];
                    mapsDT = tempp[3] ? tempp[3] : [];
                    mapsFM = tempp[4] ? tempp[4] : [];
                    mapTB = tempp[5] ? tempp[5] : undefined;

                    if (noNum) {
                        reply = {
                            content: `Make sure beatmap ids contain only numbers.`
                        };
                        break;
                    }

                    reply = await poolEdit(poolName, mapsNM, mapsHD, mapsHR, mapsDT, mapsFM, mapTB);
                    break;
                case "Show":
                    reply = await poolShow(poolName);
                    break;
                case "List":
                    let lists = await poolList();

                    const attachment = new AttachmentBuilder(Buffer.from(lists), {
                        name: `map-pools.txt`,
                    });

                    /*
                    await interaction.user.send({
                        embeds: lists
                    });
                    */

                    await interaction.user.send({
                        files: [attachment]
                    });

                    reply = {
                        content: `Check your DMs!`
                    };

                    /*
                    for (let i=0; i<reply.length; i++) {
                        if (i == reply.length - 1) continue;

                        let textChannel = client.channels.cache.get(interaction.channelId);

                        await textChannel.send({
                            content: `${reply[i]}`
                        });
                    }
                    */
                    break;
                case "Remove":
                    if (!await authQ()) break;
                    if (!poolName) {
                        reply = {
                            content: `You didn't specify the map pool's name. smh`
                        };
                        break;
                    }

                    reply = await poolDeletion(poolName);
                    break;
                case "PrivateRemove":
                    if (!await authQ()) break;
                    if (!poolName) {
                        reply = {
                            content: `You didn't specify the map pool's name. smh`
                        };
                        break;
                    }

                    reply = await poolPrivateDeletion(poolName);
                    break;
                case "Add":
                    if (!await authQ()) break;

                    let poolDB = await mapPools.findOne({ name: poolName });

                    if (poolDB) {
                        reply = {
                            content: `This pool already exists`
                        };
                        break;
                    }

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

                    if (notNum) {
                        reply = {
                            content: `Make sure beatmap ids contain only numbers.`
                        };
                        break;
                    }

                    if (!poolName || mapsNM.length < 5 || mapsHD.length < 3 || mapsHR.length < 3 || mapsDT.length < 3 || !mapTB) {
                        reply = {
                            content: `Missing information, please make sure your inputs contain at least: Pool Name, 5 NM Maps, 3 HD Maps, 3 HR Maps, 3 DT Maps, 2 FM Maps and a TB Map`
                        };
                        break;
                    }

                    if (mapsFM.length > 0 && mapsFM.length < 2) {
                        reply = {
                            content: `Make sure there are at least 2 FMs`
                        };
                        break;
                    }

                    console.log(poolName, mapsNM, mapsHD, mapsHR, mapsDT, mapsFM, mapTB);

                    const pool = await poolAddition(interaction, poolName, mapsNM, mapsHD, mapsHR, mapsDT, mapsFM, mapTB);

                    await saveMapPool(pool);
                    break;
                case "Confirm":
                    if (!await authQ()) break;
                    reply = await poolConfirm(await getMapPool());
                    break;
                case "PrivateConfirm":
                    if (!await authQ()) break;
                    reply = await poolPrivateConfirm(await getMapPool());
                    break;
                case "Cancel":
                    if (!await authQ()) break;
                    reply = await poolCancel(await getMapPool());
                    break;
                default:
                    reply = {
                        content: `Choose a valid option brah...`,
                        ephemeral: true
                    };
                    break;
            }

            if (!reply) return;

            return await interaction.editReply(reply);
        } catch (error) {
            console.log(error);

            return interaction.editReply({
                content: `Something went wrong...`
            });
        }
    }
}