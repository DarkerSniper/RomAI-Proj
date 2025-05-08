const osuUser = require(`../../schemas/osuUser`);
const { addCurrecny } = require("./currency");
const { xpAdd } = require("./xp");

const modes = ['1v1', '2v2', '3v3'];
const maps = [
    'nm1', 'nm2', 'nm3', 'nm4', 'nm5', 
    'hd1', 'hd2', 'hd3', 
    'hr1', 'hr2', 'hr3', 
    'dt1', 'dt2', 'dt3',
    'tb'
];

module.exports = {
    async checkChallenges(checkedUser, match, levelingChannels) {
        const userProfile = await osuUser.findOne({ osuUserName: checkedUser });
        let dailies = userProfile.dailies;

        if (!dailies.refresh) return;

        console.log(`1 Passed Refresh`);

        const bonusExists = dailies.challenges.some(c => c.kind === 'bonus' && !c.isCompleted);
        if (dailies.allCompleted && !bonusExists) return;

        console.log(`2 Passed completed`);

        const timeNow = new Date();
        if (dailies.refresh.getTime() < timeNow.getTime()) return;

        console.log(`3 Passed date check`);

        let allChallengesCompleted = true;
        let bonusChallengeIndex = null;

        for (let i = 0; i < dailies.challenges.length; i++) {
            const daily = dailies.challenges[i];

            if (daily.isCompleted) continue;

            if (daily.kind === 'bonus') {
                bonusChallengeIndex = i;
                continue;
            }

            let challengeCompleted = true;

            for (const task of daily.tasks) {
                if (task.completed) continue;

                const name = task.name.toLowerCase();
                console.log(`Checking task: ${name}`);

                task.completed = await checkTaskCompletion(name, match);
                if (!task.completed) challengeCompleted = false;
            }

            if (challengeCompleted) {
                daily.isCompleted = true;
                await rewardChallenge(daily.xpWorth, undefined);
            } else {
                allChallengesCompleted = false;
            }
        }

        if (bonusChallengeIndex !== null && dailies.allCompleted) {
            const bonus = dailies.challenges[bonusChallengeIndex];
            let bonusCompleted = false;

            let c=0;

            for (const bonusTask of bonus.tasks) {
                if (bonusTask.completed) {
                    c++;
                    continue;
                }

                const bonusName = bonusTask.name.toLowerCase();
                bonusTask.completed = await checkTaskCompletion(bonusName, match);

                if (bonusTask.completed && c == bonus.tasks.length - 1) {
                    bonusCompleted = true;
                } else if (bonusTask.completed) {
                    break;
                }

                c++;
            }

            if (bonusCompleted) {
                dailies.challenges[bonusChallengeIndex].isCompleted = true;
                await rewardChallenge(bonus.xpWorth, 200);
            }
        } else if (allChallengesCompleted) {
            dailies.allCompleted = true;
            await rewardChallenge(50, 500);
        }

        await osuUser.updateOne({ osuUserName: checkedUser }, { $set: { dailies } });

        async function rewardChallenge(xp, currency) {
            await xpAdd(userProfile.discordId, xp, levelingChannels);
            if (currency) await addCurrecny(userProfile.discordId, currency);
        }

        async function checkTaskCompletion(name, match) {
            if (name.includes('play') && name.includes('match')) {
                return await checkPlayMatch(name, match);
            } else if (name.includes('win') && name.includes('match')) {
                return await checkWinMatch(name, match);
            } else if (name.includes('play') && name.includes('map')) {
                return await checkPlayMap(name, match);
            } else if (name.includes('win') && name.includes('map')) {
                return await checkWinMap(name, match);
            }
            return false;
        }

        async function checkPlayMatch(name, match) {
            name = name.split(' ');
            const mode = parseInt(name[1].charAt(0));
            return (match.players.length / 2 === mode);
        }

        async function checkWinMatch(name, match) {
            name = name.split(' ');
            const mode = parseInt(name[1].charAt(0));
            const playerIndex = match.players.indexOf(checkedUser);
            const isHalf = match.players.length / 2;

            if (isHalf === mode) {
                return (playerIndex >= isHalf ? match.score[1] > match.score[0] : match.score[0] > match.score[1]);
            }
            return false;
        }

        async function checkPlayMap(name, match) {
            name = name.split(' ');
            const map = name[1];
            return match.picks.some(pick => pick.mod === map);
        }

        async function checkWinMap(name, match) {
            name = name.split(' ');
            const map = name[1];
            const playerIndex = match.players.indexOf(checkedUser);

            return match.picks.some(pick => {
                if (pick.mod === map) {
                    return (playerIndex >= match.players.length / 2 ? pick.scores[1] > pick.scores[0] : pick.scores[0] > pick.scores[1]);
                }
                return false;
            });
        }
    },
};
