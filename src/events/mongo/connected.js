const chalk = require("chalk");

module.exports = {
    name: "connected",
    execute() {
        console.log(`[Database Status]: ${chalk.green("Connected.")}`);
    },
};