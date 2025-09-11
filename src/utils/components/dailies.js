const { EmbedBuilder, bold, italic, strikethrough, underscore, spoiler, quote, blockQuote, inlineCode , codeBlock, underline, ComponentType, ButtonStyle, ActionRowBuilder, ButtonBuilder } = require('discord.js');

const challenges = require(`../discord/challenges.json`);

const osuUser = require(`../../schemas/osuUser`);
const { getRandomInt, dateConversion } = require('../osu/formatNum');

module.exports = {
    async challengesRefreshAndShow(interaction) {
        let userProfile = await osuUser.findOne({ discordId: interaction.user.id });

        if (!userProfile) return await interaction.editReply({
            content: `Please connect your osu! account using ${inlineCode(`/authosu`)}`
        });

        let userDailies = userProfile.dailies;
        let date = userDailies.refresh;
        
        let timeNow = new Date;

        if (!date || date.getTime() < timeNow.getTime()) {
            userDailies.rerollAvailable = true;
            await prepareRefresh();
        }

        var dailyEmbed = await getDailyEmbed();

        const allowReroll = userDailies.rerollAvailable && !userDailies.challenges.some(challenge => challenge.isCompleted == true);

        if (allowReroll) {
            let refreshId = `daily-reroll-${userProfile.discordId}-${getRandomInt(0, 999)}`;

            const refreshButton = new ButtonBuilder()
                .setLabel('⟳ Reroll')
                .setStyle(ButtonStyle.Success)
                .setCustomId(refreshId)

            const buttonRow = new ActionRowBuilder().addComponents(refreshButton);

            const response = await interaction.editReply({
                content: `  `,
                embeds: [dailyEmbed],
                components: [buttonRow]
            });

            const filter = (i) => i.user.id == userProfile.discordId;

            const collector = response.createMessageComponentCollector({
                componentType: ComponentType.Button,
                filter,
                time: 60000,
            });

            let answered = false;

            collector.on('collect', async (inter) => {
                if (inter.customId == refreshId) {
                    answered = true;

                    userDailies.rerollAvailable = false;
                    await prepareRefresh();

                    userDailies = (await osuUser.findOne({ discordId: interaction.user.id })).dailies;
                    dailyEmbed = await getDailyEmbed();

                    await interaction.editReply({
                        content: `Rerolled Daily Challenges!`,
                        embeds: [dailyEmbed],
                        components: []
                    });

                    refreshButton.setDisabled(true);
                }
            });

            collector.on('end', async () => {
                if (answered) return;
                
                refreshButton.setDisabled(true);

                await interaction.editReply({
                    content: `  `,
                    embeds: [dailyEmbed],
                    components: []
                });
            });
        } else {
            return await interaction.editReply({
                content: `  `,
                embeds: [dailyEmbed]
            });
        }

        // Executing Functions
        async function refreshChallenge() {
            const maps = new Set(['nm1', 'nm2', 'nm3', 'nm4', 'nm5', 'hd1', 'hd2', 'hd3','hr1', 'hr2', 'hr3','dt1', 'dt2', 'dt3']);

            let main = [];
            let side = [];
            let bonus = [];

            let previousMainQuest = userDailies ? userDailies.challenges.find(c => c.kind == 'main') : undefined;
            let previousMainMods = getChallengeMods(previousMainQuest, false, maps);

            let previousSideQuest = userDailies ? userDailies.challenges.find(c => c.kind == 'side') : undefined;
            let previousSideMods = getChallengeMods(previousSideQuest, true, maps);

            challenges.forEach(c => {
                switch(c.kind) {
                    case "main":
                        main.push(c);
                        break;
                    case "side":
                        if (previousSideQuest) {
                            let revertQuest = previousSideQuest.challenge.split(" ");
                            revertQuest[2] = maps.has(revertQuest[2]) ? '[mod]' : '[mode]';
                            revertQuest = revertQuest.join(' ');
                            
                            if (revertQuest === side) break;
                        }

                        side.push(c);
                        break;
                    case "bonus":
                        bonus.push(c);
                        break;
                }
            });

            var mainChallenge = main[await getRandomInt(0, main.length - 1)];
            var sideChallenge = side[await getRandomInt(0, side.length - 1)];
            var bonusChallenge;

            if (userProfile.level.current >= 10 || userProfile.level.prestige > 0) {
                bonusChallenge = bonus[await getRandomInt(0, bonus.length - 1)];
            }

            let newChallenges = [mainChallenge, sideChallenge];

            if (bonusChallenge) newChallenges.push(bonusChallenge);

            for (let i=0; i<newChallenges.length; i++) {
                const modes = new Set(['1v1','2v2']);

                let challengeName = newChallenges[i].challenge;

                if (newChallenges[i].kind == 'main' && previousMainMods) {
                    // Remove previous task's mods
                    for (let mod of previousMainMods) {
                        maps.delete(mod);
                        console.log(`Removed: ${mod}. Since it's been on the last daily challenge`);
                    }
                } else if (newChallenges[i].kind == 'side' && previousSideMods) {
                    // Remove previous task's mods and modes
                    for (let mod of previousSideMods) {
                        if (maps.has(mod)) {
                            maps.delete(mod);
                            console.log(`Removed: ${mod}. Since it's been on the last daily challenge`);
                        } else if (modes.has(mod)) {
                            modes.delete(mod);
                            console.log(`Removed: ${mod}. Since it's been on the last daily challenge`);
                        }
                    }
                }

                let challengeModes = [];
                let challengeMods = [];
                
                while (challengeName.includes('[mode]')) {
                    let randomMode = await getRandomInt(0, modes.size - 1);
                    if (newChallenges[i].kind == 'bonus') randomMode = getRandomInt(0, 1);

                    challengeModes.push([...modes][randomMode]);
                    challengeName = challengeName.replace('[mode]', [...modes][randomMode]);

                    modes.delete([...modes][randomMode]);
                }

                while (challengeName.includes('[mod]')) {
                    let randomMap = await getRandomInt(0, maps.size - 1);

                    challengeMods.push([...maps][randomMap]);
                    challengeName = challengeName.replace('[mod]', [...maps][randomMap]);

                    maps.delete([...maps][randomMap]);
                }

                newChallenges[i].challenge = challengeName;

                for (let j=0; j<newChallenges[i].tasks.length; j++) {
                    let taskName = newChallenges[i].tasks[j].name;

                    let cMode = newChallenges[i].kind == 'bonus' ? challengeModes[0] : challengeModes[j];
                    let cMod = newChallenges[i].kind == 'bonus' ? challengeMods[0] : challengeMods[j];

                    while (taskName.includes('[mode]')) taskName = taskName.replace('[mode]', cMode);
                    while (taskName.includes('[mod]')) taskName = taskName.replace('[mod]', cMod);

                    newChallenges[i].tasks[j].name = taskName;
                }
            }

            return newChallenges;
        }

        function getChallengeMods(challenge, getModes, maps) {
            let challengeMods = challenge ? (challenge.tasks.some(t => maps.has(t.name.split(" ")[1])) 
                ? challenge.tasks.map(t => t.name.split(" ")[1])
                : (getModes ? challenge.tasks.map(t => t.name.split(" ")[1]) : undefined)
            ) : undefined;

            console.log(challengeMods);

            return challengeMods;
        }

        async function prepareRefresh() {
            date = new Date;
            date.setDate(date.getDate() + 1);
            date.setHours(0, 0, 0, 0);

            userDailies.allCompleted = false;
            userDailies.challenges = await refreshChallenge();
            userDailies.refresh = date;

            await osuUser.updateOne({ discordId: interaction.user.id }, {
                $set: {
                    dailies: userDailies
                }
            });
        }

        async function getDailyEmbed() {
            const dailiesEmbed = new EmbedBuilder()
                .setTitle(`${userProfile.osuUserName}'s Daily Challenges`)
                .setDescription(`Reward for completing all challenges: ${bold(`50xp`)} + ${bold(`500 romBucks`)}\n\nNew challenges ${dateConversion(userDailies.refresh)}`);

            for (let i=0; i<userDailies.challenges.length; i++) {
                let challenge = userDailies.challenges[i];

                let completion = challenge.isCompleted ? `✅ Completed` : `⏳ Yet to be completed`;
                let bonusString = challenge.kind == 'bonus' ? `Bonus:` : ``;

                dailiesEmbed.addFields({
                    name: `${bonusString} ${challenge.challenge}`,
                    value: `${completion}\n${bold(`${challenge.xpWorth}xp`)}\n\n`
                });

                let tasksNum = challenge.tasks.length;
                let tasksCompleted = 0;

                challenge.tasks.forEach(task => {
                    if (task.completed) tasksCompleted++;
                });

                dailiesEmbed.data.fields[i].value += `Tasks Completed: ${bold(`[${tasksCompleted}/${tasksNum}]`)}\n`
            }

            return dailiesEmbed;
        }
    }
};