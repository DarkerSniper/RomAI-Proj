const mongoose = require('mongoose');
const { EmbedBuilder, hyperlink, bold, inlineCode, italic } = require('discord.js');

const { isOsuJSError, Client, Auth } = require('osu-web.js');
const { BeatmapCalculator } = require('@kionell/osu-pp-calculator');

const { osuId, osuToken } = process.env;

//APIv2
const auth = new Auth(osuId, osuToken);

const { eloCalc} = require(`../osu/skillsCalculation`);
const { saveMapPool } = require(`../osu/activeData`);
const { getRandomInt } = require(`../osu/formatNum`); 

const mapPool = require(`../../schemas/mapPool`);
const privateMapPool = require(`../../schemas/privateMapPool`);
const osuUser = require(`../../schemas/osuUser`);

module.exports = {
    async poolShow(name) {
        let pool = await mapPool.findOne({ name: name });

        if (!pool) pool = await privateMapPool.findOne({ name: name });

        if (!pool) return {
            content: `This map pool does not exist.`
        };

        const poolEmbed = new EmbedBuilder()
            .setTitle(`Detected Pool:`);

        const beatmapCalculator = new BeatmapCalculator();

        const token = await auth.clientCredentialsGrant();
        const api = new Client(token.access_token);

        let c = 0;

        var nm1Stars;
        var poolStars = 0;

        let maps = pool.maps;
        let combinedMaps = maps.noMod.concat(maps.hidden);
        combinedMaps = combinedMaps.concat(maps.hardRock);
        combinedMaps = combinedMaps.concat(maps.doubleTime);
        combinedMaps = combinedMaps.concat(maps.freeMod);
        combinedMaps.push(maps.tieBreaker);

        const poolBeatmaps = await api.beatmaps.getBeatmaps({
            query: {
              ids: combinedMaps
            }
        });

        let tempPool = [];

        combinedMaps.forEach(m => {
            tempPool.push(0);
        });

        for (let i=0; i<poolBeatmaps.length; i++) {
            let beatmapId = poolBeatmaps[i].id.toString();

            if (maps.noMod.includes(beatmapId)) {
                tempPool[maps.noMod.indexOf(beatmapId)] = poolBeatmaps[i];
            } else if (maps.hidden.includes(beatmapId)) {
                tempPool[maps.hidden.indexOf(beatmapId) + maps.noMod.length] = poolBeatmaps[i];
            } else if (maps.hardRock.includes(beatmapId)) {
                tempPool[maps.hardRock.indexOf(beatmapId) + maps.noMod.length + maps.hidden.length] = poolBeatmaps[i];
            } else if (maps.doubleTime.includes(beatmapId)) {
                tempPool[maps.doubleTime.indexOf(beatmapId) + maps.noMod.length + maps.hidden.length + maps.hardRock.length] = poolBeatmaps[i];
            } else if (maps.freeMod.includes(beatmapId)) {
                tempPool[maps.freeMod.indexOf(beatmapId) + maps.noMod.length + maps.hidden.length + maps.hardRock.length + maps.doubleTime.length] = poolBeatmaps[i];
            } else if (maps.tieBreaker == beatmapId) {
                tempPool[tempPool.length - 1] = poolBeatmaps[i];
            }
        }
        
        for (let i=0; i<tempPool.length; i++) {
            let beatmapId = tempPool[i].id;

            if (maps.noMod.includes(beatmapId)) {
                poolEmbed.addFields({
                    name: `NM${maps.noMod.indexOf(beatmapId) + 1}`,
                    value: await getBeatmapInfo(tempPool[i], 'NM'),
                });
            } else if (maps.hidden.includes(beatmapId)) {
                poolEmbed.addFields({
                    name: `HD${maps.hidden.indexOf(beatmapId) + 1}`,
                    value: await getBeatmapInfo(tempPool[i], 'HD'),
                });
            } else if (maps.hardRock.includes(beatmapId)) {
                poolEmbed.addFields({
                    name: `HR${maps.hardRock.indexOf(beatmapId) + 1}`,
                    value: await getBeatmapInfo(tempPool[i], 'HR'),
                });
            } else if (maps.doubleTime.includes(beatmapId)) {
                poolEmbed.addFields({
                    name: `DT${maps.doubleTime.indexOf(beatmapId) + 1}`,
                    value: await getBeatmapInfo(tempPool[i], 'DT'),
                });
            } else if (maps.freeMod.includes(beatmapId)) {
                poolEmbed.addFields({
                    name: `FM${maps.freeMod.indexOf(beatmapId) + 1}`,
                    value: await getBeatmapInfo(tempPool[i], 'NM'),
                });
            } else if (maps.tieBreaker == beatmapId) {
                poolEmbed.addFields({
                    name: `TB`,
                    value: await getBeatmapInfo(tempPool[i], 'NM'),
                });
            }
        }

        /*
        for (let i=0; i<maps.noMod.length; i++) {
            console.log(maps.noMod[i]);
            poolEmbed.addFields({
                name: `NM${i+1}`,
                value: await getBeatmapInfo(maps.noMod[i], 'NM'),
            });
        }

        for (let i=0; i<maps.hidden.length; i++) {
            poolEmbed.addFields({
                name: `HD${i+1}`,
                value: await getBeatmapInfo(maps.hidden[i], 'HD'),
            });
        }

        for (let i=0; i<maps.hardRock.length; i++) {
            poolEmbed.addFields({
                name: `HR${i+1}`,
                value: await getBeatmapInfo(maps.hardRock[i], 'HR'),
            });
        }

        for (let i=0; i<maps.doubleTime.length; i++) {
            poolEmbed.addFields({
                name: `DT${i+1}`,
                value: await getBeatmapInfo(maps.doubleTime[i], 'DT'),
            });
        }

        poolEmbed.addFields({
            name: `TB`,
            value: await getBeatmapInfo(maps.tieBreaker, 'NM'),
        });
        */

        let poolLength = (maps.noMod.length + maps.hidden.length + maps.hardRock.length + maps.doubleTime.length + maps.freeMod.length + 1);

        poolStars /= (poolLength - 1);

        nm1Stars = parseFloat(nm1Stars);

        let skillElo = pool.elo;

        poolEmbed.setDescription(`${bold(name)}\nAverage Stars: ${((nm1Stars + poolStars)/2).toFixed(2)}★ - ELO: ${skillElo}`);

        return {
            content: `  `,
            embeds: [poolEmbed],
        };

        async function getBeatmapInfo(beatmap, mod) {
            const beatmapCalc = await beatmapCalculator.calculate({
                beatmapId: beatmap.id,
                mods: mod
            });

            let mapName = beatmap.beatmapset.title;
            let mapDiff = beatmap.version;
            let calcLength = mod == 'DT' ? parseInt(beatmap.total_length / 1.5) : beatmap.total_length;
            let mapLength = Math.floor(calcLength / 60);
            mapLength = `${mapLength}:${calcLength - mapLength * 60}`;
            mapLength = mapLength.split(":")[1].length != 2 ? `${mapLength.split(":")[0]}:0${mapLength.split(":")[1]}` : mapLength;

            let scoreStars = beatmapCalc.difficulty.starRating.toFixed(2);

            let infoBeatmap = await api.beatmaps.getBeatmapAttributes(beatmap.id);
            infoBeatmap = infoBeatmap.attributes;
            beatmapCalc.difficulty.aim

            let cs = beatmapCalc.difficulty.circleSize ? beatmapCalc.difficulty.circleSize.toFixed(1) : beatmapCalc.beatmapInfo.circleSize.toFixed(1);
            let scoreBpm = beatmapCalc.beatmapInfo.bpm.toFixed(0);
            let ar = beatmapCalc.difficulty.approachRate ? beatmapCalc.difficulty.approachRate.toFixed(1) : beatmapCalc.beatmapInfo.approachRate.toFixed(1);
            let overallDiff = beatmapCalc.difficulty.overallDifficulty ? beatmapCalc.difficulty.overallDifficulty.toFixed(1) : beatmapCalc.beatmapInfo.overallDifficulty.toFixed(1);
            let hpDrain = beatmapCalc.difficulty.drainRate ? beatmapCalc.difficulty.drainRate.toFixed(1) : beatmapCalc.beatmapInfo.drainRate.toFixed(1);

            if (c == 0) nm1Stars = scoreStars; else poolStars += parseFloat(scoreStars);
            if (c == poolBeatmaps.length - 1) poolEmbed.setImage(`https://assets.ppy.sh/beatmaps/${beatmap.beatmapset_id}/covers/cover.jpg`);

            console.log(c);
            c++;

            return `${hyperlink(`${mapName} [${mapDiff}]`, `https://osu.ppy.sh/b/${beatmap.id}`)} ${scoreStars}★ ${bold("BPM:")} ${scoreBpm}\n${bold("Stats:")} AR:${ar} | OD:${overallDiff} | HP:${hpDrain} | CS:${cs} -- ${bold("Length:")} ${mapLength}`
        }
    },

    async poolEdit(name, nm, hd, hr, dt, fm, tb) {
        let pool = await mapPool.findOne({ name: name });

        if (!pool) return {
            content: `Please enter a valid pool name`
        };

        let noMod = pool.maps.noMod;
        let hidden = pool.maps.hidden;
        let hardRock = pool.maps.hardRock;
        let doubleTime = pool.maps.doubleTime;
        let freeMod = pool.maps.freeMod ?? [];
        let tieBreaker = pool.maps.tieBreaker;

        if (nm && nm.length > 0) noMod = nm;
        if (hd && hd.length > 0) hidden = hd;
        if (hr && hr.length > 0) hardRock = hr;
        if (dt && dt.length > 0) doubleTime = dt;
        if (fm && fm.length > 0) freeMod = fm;
        if (tb) tieBreaker = tb;

        await mapPool.updateOne({ name: name }, {
            $set: {
                maps: {
                    noMod: noMod,
                    hidden: hidden,
                    hardRock: hardRock,
                    doubleTime: doubleTime,
                    freeMod: freeMod,
                    tieBreaker: tieBreaker
                } 
            }
        });

        return {
            content: `${name} updated!`
        };
    },

    async poolList() {
        let pools = await mapPool.find();

        //var lists = [];
        var msg = ``;

        if (!pools) return {
            content: `No maps detected`
        };

        for (let i=0; i<pools.length; i++) {
            let target = pools[i];
            for (var j=i-1; j>=0 && (pools[j].elo < target.elo); j--) {
                pools[j+1] = pools[j];
            }
            pools[j+1] = target;
        }

        //let i = 0;
        let curElo = parseInt(pools[0].elo / 100);

        pools.forEach(pool => {
            /*
            if (lists[i] == undefined) {
                lists.push(new EmbedBuilder().setDescription(`${curElo}00 ELO Pools:\n`));
            } else if (lists[i].data.description.length > 3800) {
                i += 1;
                lists.push(new EmbedBuilder());
            }
            */

            let poolElo = parseInt(pool.elo / 100);

            if (curElo > poolElo) {
                curElo = poolElo;
                //lists[i].data.description += `\n${curElo}00 ELO Pools:\n`;
                msg += `\n${curElo}00 ELO Pools:\n`;
            }

            //lists[i].data.description += `${bold(pool.name)} - ELO: ${pool.elo}\n`;
            msg += `${pool.name} - ELO: ${pool.elo}\n`;
        });

        //return lists;
        return msg;
    },

    async poolAddition(interaction, name, nm, hd, hr, dt, fm, tb) {
        // if no fm, input: []
        try {
            const poolEmbed = new EmbedBuilder()
            .setTitle(`Submitted pool:`);

            const beatmapCalculator = new BeatmapCalculator();

            const token = await auth.clientCredentialsGrant();
            const api = new Client(token.access_token);

            let c = 0;

            var nm1Stars;
            var poolStars = 0;

            let combinedMaps = nm.concat(hd);
            combinedMaps = combinedMaps.concat(hr);
            combinedMaps = combinedMaps.concat(dt);
            combinedMaps = combinedMaps.concat(fm);
            combinedMaps.push(tb);
            console.log(combinedMaps);

            const poolBeatmaps = await api.beatmaps.getBeatmaps({
                query: {
                    ids: combinedMaps
                }
            });

            let tempPool = [];

            combinedMaps.forEach(m => {
                tempPool.push(0);
            });

            for (let i=0; i<poolBeatmaps.length; i++) {
                let beatmapId = poolBeatmaps[i].id.toString();

                if (nm.includes(beatmapId)) {
                    tempPool[nm.indexOf(beatmapId)] = poolBeatmaps[i];
                } else if (hd.includes(beatmapId)) {
                    tempPool[hd.indexOf(beatmapId) + nm.length] = poolBeatmaps[i];
                } else if (hr.includes(beatmapId)) {
                    tempPool[hr.indexOf(beatmapId) + nm.length + hd.length] = poolBeatmaps[i];
                } else if (dt.includes(beatmapId)) {
                    tempPool[dt.indexOf(beatmapId) + nm.length + hd.length + hr.length] = poolBeatmaps[i];
                } else if (fm.includes(beatmapId)) {
                    tempPool[fm.indexOf(beatmapId) + nm.length + hd.length + hr.length + dt.length] = poolBeatmaps[i];
                } else if (tb == beatmapId) {
                    tempPool[tempPool.length - 1] = poolBeatmaps[i];
                }
            }

            console.log(tempPool);
            
            for (let i=0; i<tempPool.length; i++) {
                if (!tempPool[i]) continue;
                let beatmapId = tempPool[i].id.toString();

                if (nm.includes(beatmapId)) {
                    poolEmbed.addFields({
                        name: `NM${nm.indexOf(beatmapId) + 1}`,
                        value: await getBeatmapInfo(tempPool[i], 'NM'),
                    });
                } else if (hd.includes(beatmapId)) {
                    poolEmbed.addFields({
                        name: `HD${hd.indexOf(beatmapId) + 1}`,
                        value: await getBeatmapInfo(tempPool[i], 'HD'),
                    });
                } else if (hr.includes(beatmapId)) {
                    poolEmbed.addFields({
                        name: `HR${hr.indexOf(beatmapId) + 1}`,
                        value: await getBeatmapInfo(tempPool[i], 'HR'),
                    });
                } else if (dt.includes(beatmapId)) {
                    poolEmbed.addFields({
                        name: `DT${dt.indexOf(beatmapId) + 1}`,
                        value: await getBeatmapInfo(tempPool[i], 'DT'),
                    });
                } else if (fm.includes(beatmapId)) {
                    poolEmbed.addFields({
                        name: `FM${fm.indexOf(beatmapId) + 1}`,
                        value: await getBeatmapInfo(tempPool[i], 'NM'),
                    });
                }else if (tb == beatmapId) {
                    poolEmbed.addFields({
                        name: `TB`,
                        value: await getBeatmapInfo(tempPool[i], 'NM'),
                    });
                }
            }

            let poolLength = (nm.length + hd.length + hr.length + dt.length + fm.length + 1);

            poolStars /= (poolLength - 1);

            nm1Stars = parseFloat(nm1Stars);

            let skillElo = await eloCalc(poolStars, nm1Stars);

            poolEmbed.setDescription(`${bold(name)}\nAverage Stars: ${((nm1Stars + poolStars)/2).toFixed(2)}★ - ELO: ${skillElo}`);

            if (!interaction) return {
                embed: poolEmbed,
                name: name,
                elo: skillElo,
                maps: {
                    noMod: nm,
                    hidden: hd,
                    hardRock: hr,
                    doubleTime: dt,
                    freeMod: fm,
                    tieBreaker: tb
                }
            };
    
            await interaction.editReply({
                embeds: [poolEmbed],
                content: `Please make sure the following maps are correct:\n- Use the ${inlineCode("Confirm")} option to add the map pool.\n- Use the ${inlineCode("Cancel")} option to cancel the process.`,
            });
    
            return {
                name: name,
                elo: skillElo,
                maps: {
                    noMod: nm,
                    hidden: hd,
                    hardRock: hr,
                    doubleTime: dt,
                    freeMod: fm,
                    tieBreaker: tb
                }
            };

            async function getBeatmapInfo(beatmap, mod) {
                const beatmapCalc = await beatmapCalculator.calculate({
                    beatmapId: beatmap.id,
                    mods: mod
                });

                let mapName = beatmap.beatmapset.title;
                let mapDiff = beatmap.version;
                let mapLength = Math.floor(beatmap.total_length / 60);
                mapLength = `${mapLength}:${beatmap.total_length - mapLength * 60}`;
                mapLength = mapLength.split(":")[1].length != 2 ? `${mapLength.split(":")[0]}:0${mapLength.split(":")[1]}` : mapLength;

                let scoreStars = beatmapCalc.difficulty.starRating.toFixed(2);

                let infoBeatmap = await api.beatmaps.getBeatmapAttributes(beatmap.id);
                infoBeatmap = infoBeatmap.attributes;

                let cs = beatmapCalc.difficulty.circleSize ? beatmapCalc.difficulty.circleSize.toFixed(1) : beatmapCalc.beatmapInfo.circleSize.toFixed(1);
                let scoreBpm = beatmapCalc.beatmapInfo.bpm.toFixed(0);
                let ar = beatmapCalc.difficulty.approachRate ? beatmapCalc.difficulty.approachRate.toFixed(1) : beatmapCalc.beatmapInfo.approachRate.toFixed(1);
                let overallDiff = beatmapCalc.difficulty.overallDifficulty ? beatmapCalc.difficulty.overallDifficulty.toFixed(1) : beatmapCalc.beatmapInfo.overallDifficulty.toFixed(1);
                let hpDrain = beatmapCalc.difficulty.drainRate ? beatmapCalc.difficulty.drainRate.toFixed(1) : beatmapCalc.beatmapInfo.drainRate.toFixed(1);

                if (c == 0) nm1Stars = scoreStars; else poolStars += parseFloat(scoreStars);
                if (c == poolBeatmaps.length - 1) poolEmbed.setImage(`https://assets.ppy.sh/beatmaps/${beatmap.beatmapset_id}/covers/cover.jpg`);

                console.log(c);
                c++;

                return `${hyperlink(`${mapName} [${mapDiff}]`, `https://osu.ppy.sh/b/${beatmap.id}`)} ${scoreStars}★ ${bold("BPM:")} ${scoreBpm}\n${bold("Stats:")} AR:${ar} | OD:${overallDiff} | HP:${hpDrain} | CS:${cs} -- ${bold("Length:")} ${mapLength}`
            }
        } catch (err) {
            if (isOsuJSError(err)) {
                // `err` is now of type `OsuJSError`
            
                if (err.type === 'invalid_json_syntax') {
                  // `err` is now of type `OsuJSGeneralError`
                  console.error('Error while parsing response as JSON');
                } else if (err.type === 'network_error') {
                  // `err` is now of type `OsuJSGeneralError`
                  console.error('Network error');
                } else if (err.type === 'unexpected_response') {
                  // `err` is now of type `OsuJSUnexpectedResponseError`
            
                  /**
                   * If using the fetch polyfill instead of the native fetch API, write:
                   * `err.response(true)`
                   * "true" means that it will return the Response type from "node-fetch" instead of the native Response
                   */
                  const response = err.response(); // Type: `Response`
            
                  console.error('Unexpected response');
                  console.log(`Details: ${response.status} - ${response.statusText}`);
                  console.log('JSON: ', await response.json());
                }
            }

            console.log(err);

            await interaction.editReply({
                content: `Some maps in this pool are unavailable.`
            });
        }
    },

    async poolDeletion(name) {
        let mapPoolInfo = await mapPool.findOne({ name: name });

        if (!mapPoolInfo) {
            return {
                content: `This map pool does not exist`
            };
        } else {
           await mapPool.deleteOne({ name: name });

           return {
                content: `Map Pool: ${bold(name)} has been removed.`
           };
        }
    },

    async poolPrivateDeletion(name) {
        let mapPoolInfo = await privateMapPool.findOne({ name: name });

        if (!mapPoolInfo) {
            return {
                content: `This map pool does not exist`
            };
        } else {
           await privateMapPool.deleteOne({ name: name });

           return {
                content: `Map Pool: ${bold(name)} has been removed.`
           };
        }
    },

    async poolConfirm(poolObject) {
        if (!poolObject.name) return {
            content: `No submitted map pool detected.`
        };

        let mapPoolInfo = await mapPool.findOne({ name: poolObject.name });

        if (!mapPoolInfo) {
            mapPoolInfo = await new mapPool({
                _id: new mongoose.Types.ObjectId(),
                name: poolObject.name,
                elo: poolObject.elo,
                maps: {
                    noMod: poolObject.maps.noMod,
                    hidden: poolObject.maps.hidden,
                    hardRock: poolObject.maps.hardRock,
                    doubleTime: poolObject.maps.doubleTime,
                    freeMod: poolObject.maps.freeMod,
                    tieBreaker: poolObject.maps.tieBreaker
                },
            });

            await mapPoolInfo.save();
            console.log(mapPoolInfo);
            return {
                content: `Map Pool: ${bold(poolObject.name)} has been added.`
            };
        } else {
            return {
                content: `This map pool already exists.`
            };
        }
    },

    async poolPrivateConfirm(poolObject) {
        if (!poolObject.name) return {
            content: `No submitted map pool detected.`
        };

        let mapPoolInfo = await privateMapPool.findOne({ name: poolObject.name });

        if (!mapPoolInfo) {
            mapPoolInfo = await new privateMapPool({
                _id: new mongoose.Types.ObjectId(),
                name: poolObject.name,
                elo: poolObject.elo,
                maps: {
                    noMod: poolObject.maps.noMod,
                    hidden: poolObject.maps.hidden,
                    hardRock: poolObject.maps.hardRock,
                    doubleTime: poolObject.maps.doubleTime,
                    freeMod: poolObject.maps.freeMod,
                    tieBreaker: poolObject.maps.tieBreaker
                },
            });

            await mapPoolInfo.save();
            console.log(mapPoolInfo);
            return {
                content: `Map Pool: ${bold(poolObject.name)} has been added to the private section.\n${italic(`This pool cannot be found in match unless it's a set pool!`)}`
            };
        } else {
            return {
                content: `This map pool already exists.`
            };
        }
    },

    async poolCancel(poolObject) {
        if (!poolObject.name) return {
            content: `No submitted map pool detected.`
        };

        await saveMapPool({});

        return {
            content: `Map pool insertion canceled.`
        }
    },

    async getSpecificPool(poolName) {
        let pool = await mapPool.findOne({ name: poolName });

        if (!pool) pool = await privateMapPool.findOne({ name: poolName });

        return pool;
    },

    async getBalancedPool(avgElo, playerArray) {
        let pools = await mapPool.find();

        let availablePools = [];

        for (let i=0; i<pools.length; i++) {
            let target = pools[i];
            for (var j=i-1; j>=0 && (Math.abs(pools[j].elo - avgElo) > Math.abs(target.elo - avgElo)); j--) {
                pools[j+1] = pools[j];
            }
            pools[j+1] = target;
        }

        console.log(`Pools Elo:\n1. ${pools[0].name} ${pools[0].elo}\n2.${pools[1].name} ${pools[1].elo}\n3.${pools[2].name} ${pools[2].elo}`);

        for (let i=0; i<6; i++) {
            availablePools.push(pools[i]);
        }

        return availablePools;
    },
};