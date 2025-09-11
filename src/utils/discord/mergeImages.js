const { AttachmentBuilder } = require(`discord.js`);
const Canvas = require("@napi-rs/canvas");

const loadImage = Canvas.loadImage;
const osuUser = require(`../../schemas/osuUser`);

module.exports = {
    async mergeImagesByHalf(username1, username2) {
        async function setImage(imageUrl) {
            const response = await fetch(imageUrl);
            console.log(`${imageUrl} Status: ${response.status}`);
            return response.url;
        }

        var userId1 = (await osuUser.findOne({ osuUserName: username1 })).osuUserId;
        var userId2 = (await osuUser.findOne({ osuUserName: username2 })).osuUserId;

        const avatar1 = await loadImage(await setImage(`https://a.ppy.sh/${userId1}`));
        const avatar2 = await loadImage(await setImage(`https://a.ppy.sh/${userId2}`));
        
        const cropWidth1 = avatar1.width / 2;
        const cropWidth2 = avatar2.width / 2;
        const canvasWidth = cropWidth1 + cropWidth2;
        const canvasHeight = Math.max(avatar1.height, avatar2.height);

        const canv = Canvas.createCanvas(canvasWidth, canvasHeight);
        const ctx = canv.getContext("2d");

        ctx.drawImage(avatar1, 0, 0, cropWidth1, avatar1.height, 0, 0, cropWidth1, canvasHeight);
        ctx.drawImage(avatar2, avatar2.width / 2, 0, cropWidth2, avatar2.height, cropWidth1, 0, cropWidth2, canvasHeight);

        const attachment = new AttachmentBuilder(await canv.encode("png"), {
            name: `${userId1}-${userId2}-Cropped.png`,
        });

        return attachment;
    }
};