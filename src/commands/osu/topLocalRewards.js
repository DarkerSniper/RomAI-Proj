const { SlashCommandBuilder, EmbedBuilder, inlineCode, bold, italic, hyperlink } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('toplocalrewards')
        .setDescription("List of the rewards you can get by settings a top local play!"),
    async execute(interaction, client) {
        await interaction.deferReply({
            fetchReply: true,
            ephemeral: true
        }); 

        const rewardsEmbed = new EmbedBuilder()
            .setTitle(`Top Local Rewards`)
            .setDescription(`The rewards you can get by using the ${inlineCode(`recent`)} command after setting a top local play!`)
            .addFields(
                {
                    name: `Players ranged at 5,000 and below`,
                    value: `- Top Play - 3 **Pro** Packs\n- Top 5 Local - **Pro** and **Contender** Packs\n- Top 10 Local - **Pro** Pack\n- Top 50 Local - **Contender** and **Intermediate** Packs\n- Top 100 Local - **Contender** Pack`
                },
                {
                    name: `Players ranged at 5,000 - 7,500`,
                    value: `- Top Play - 2 **Pro** Packs\n- Top 5 Local - **Pro** and **Intermediate** Packs\n- Top 10 Local - **Contender** and **Starter** Pack\n- Top 50 Local - **Intermediate** and **Starter** Packs\n- Top 100 Local - **Intermediate** Pack`
                }, 
                {
                    name: `Players ranged at 7,500- 30,000`,
                    value: `- Top Play - **Pro** and **Contender** Packs\n- Top 5 Local - **Contender** and **Starter** Packs\n- Top 10 Local - **Contender** Pack\n- Top 50 Local - **Intermediate** Pack\n- Top 100 Local - **Starter** Pack`
                },
                {
                    name: `Players ranged at 30,000 - 70,000`,
                    value: `- Top Play - **Pro** and **Starter** Packs\n- Top 5 Local - **Contender** Pack\n- Top 10 Local - **Intermediate** Pack\n- Top 50 Local - **Starter** Pack`
                },
                {
                    name: `Players ranged at 70,000 and above`,
                    value: `- Top Play - **Intermediate** Pack\n- Top 5 Local - **Starter** Pack`
                }
            );
            
        return interaction.editReply({
            content: `  `,
            embeds: [rewardsEmbed]
        });
    }
};