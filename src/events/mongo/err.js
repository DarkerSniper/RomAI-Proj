const chalk = require("chalk");

module.exports = {
    name: "err",
    execute(err) {
        console.log(`${chalk.red("An error has occured with the database: ")}\n ${err}`);
    },
};