const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'usageLog.json');
console.log(filePath);

module.exports = {
    async saveLogData(logData) {
        /*
            logData: {
                type: String -> "command" | "match" | "game" | "newUser",
                data: String
            }
        */

        /*
            monthly: [{
                date: String -> Month/Year,
                matchesPlayed: Number,
                commandsUsed: Number,
                newUsers: Number
            }],

            daily: [{
                date: Day/Month/Year,
                matchesPlayed: [{
                    player: String,
                    matchCount: Number
                }],
                totalMatches: Number,
                commandsUsed: [{
                    command: String,
                    useCount: Number
                }],
                newUsers: Number
            }]
        */

        // Whenever a new month is made, push the existing data into current month
        try {
            const date = new Date();
            let existingData = undefined;

            if (fs.existsSync(filePath)) {
                existingData = JSON.parse(fs.readFileSync(filePath));
            }

            // First log
            if (!existingData) {
                existingData = {
                    monthly: [],
                    daily: [{
                        date: `${date.getDate()}/${date.getMonth()}/${date.getFullYear()}`,
                        matchesPlayed: [],
                        commandsUsed: [],
                        newUsers: 0
                    }]
                }
            }

            // Log today
            let todaysData = existingData.daily.find(day => day.date == `${date.getDate()}/${date.getMonth()}/${date.getFullYear()}`);
            
            if (!todaysData) {
                todaysData = {
                    date: `${date.getDate()}/${date.getMonth()}/${date.getFullYear()}`,
                    matchesPlayed: [],
                    totalMatches: 0,
                    commandsUsed: [],
                    newUsers: 0
                }
            }

            switch(logData.type) {
                case "command":
                    let commandIndex = todaysData.commandsUsed.findIndex(c => c.command == logData.data);

                    if (!commandIndex || commandIndex == -1) {
                        todaysData.commandsUsed.push({
                            command: logData.data,
                            useCount: 1
                        });
                    } else {
                        todaysData.commandsUsed[commandIndex].useCount = parseInt(todaysData.commandsUsed[commandIndex].useCount) + 1;
                    }
                    break;
                case "match":
                    let matchIndex = todaysData.matchesPlayed.findIndex(m => m.player == logData.data);

                    if (!matchIndex || matchIndex == -1) {
                        todaysData.matchesPlayed.push({
                            player: logData.data,
                            matchCount: 1
                        });
                    } else {
                        todaysData.matchesPlayed[matchIndex].matchCount = parseInt(todaysData.matchesPlayed[matchIndex].matchCount) + 1;
                    }
                    break;
                case "game":
                    todaysData.totalMatches = parseInt(todaysData.totalMatches) + 1;
                    break;
                case "newUser":
                    todaysData.newUsers = parseInt(todaysData.newUsers) + 1;
                    break;
            }

            // Save Daily log
            let todaysIndex = existingData.daily.findIndex(day => day.date == `${date.getDate()}/${date.getMonth()}/${date.getFullYear()}`);

            if (!todaysIndex || todaysIndex == -1) {
                existingData.daily.push(todaysData);
            } else {
                existingData.daily[todaysIndex] = todaysData;
            }

            // Monthly log
            if (date.getDate() == 1 && existingData) {
                let monthlyMatches = 0;
                let monthlyCommands = 0;
                let monthlyNewUsers = 0;
                
                existingData.daily.forEach(day => {
                    let dailyYear = parseInt(day.date.split('/'[2]));
                    let dailyMonth = parseInt(day.date.split('/')[1]);

                    if (dailyMonth == date.getMonth() - 1 && dailyYear == date.getFullYear()) {
                        monthlyMatches += day.totalMatches;

                        day.commandsUsed.forEach(c => {
                            if (c)
                                monthlyCommands += parseInt(c.useCount);
                        });

                        monthlyNewUsers += parseInt(day.newUsers);
                    }
                });

                existingData.monthly.push({
                    date: `${date.getMonth() - 1}/${date.getFullYear()}`,
                    matchesPlayed: monthlyMatches,
                    commandsUsed: monthlyCommands,
                    newUsers: monthlyNewUsers
                });
            }

            fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));
            console.log(`data saved.\n`);
            return;
        } catch (error) {
            console.log(error);
        }
    },

    async getLogRewards() {
        const logData = readLog();
        return logData;

        // Read file
        function readLog() {
            if (fs.existsSync(filePath)) {
                const data = fs.readFileSync(filePath);
                return JSON.parse(data);
            } else {
                console.log(`No daily usage data found.`);
                return [];
            }
        }
    },
};