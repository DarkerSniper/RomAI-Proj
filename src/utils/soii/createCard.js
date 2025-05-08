const { AttachmentBuilder } = require(`discord.js`);
const Canvas = require("@napi-rs/canvas");

const ranks = require(`../discord/ranks.json`);
const { getPlayerRank, getRankIcon } = require("../discord/ranks");

const loadImage = Canvas.loadImage;

Canvas.GlobalFonts.registerFromPath(
  "./src/utils/fonts/Torus/Torus-Bold.otf",
  "Torus-Bold"
);
Canvas.GlobalFonts.registerFromPath(
  "./src/utils/fonts/Torus/Torus-Regular.otf",
  "Torus"
);
Canvas.GlobalFonts.registerFromPath(
  "./src/utils/fonts/Torus/Torus-SemiBold.otf",
  "Torus SemiBold"
);
console.log("Fonts loaded: " + Canvas.GlobalFonts.has("Torus-Bold"));

module.exports = {
  async createCard(inputs, cardType) {
    console.log("creating card...");
    try {
      const canv = Canvas.createCanvas(800, 1200);
      const ctx = canv.getContext("2d");

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      console.log("Loading images...");

      var topPlayMods = inputs.topPlay.enabled_mods;
      if (topPlayMods.length == 0) {
        topPlayMods = ['NM'];
      }
      const loadedMods = {}
      topPlayMods.forEach(async mod => {loadedMods[mod] = await loadImage(`./src/utils/images/mod-icons/${mod}.png`)});
      
      let fetchCountry = await setImage(`https://assets.ppy.sh/old-flags/${inputs.country}.png`);
      let fetchAvatar = await setImage(`https://a.ppy.sh/${inputs.id}`);
      let fetchBg = await setImage(`https://assets.ppy.sh/beatmaps/${inputs.topPlay.mapId}/covers/cover.jpg`);

      const card = await loadImage(cardType.card);
      const regionBg = await loadImage(cardType.region);
      const eloBase = await loadImage(cardType.elo)
      const eloBg = await loadImage(cardType.eloBg)
      const eloTitle = await loadImage(cardType.eloTitle)
      const avatar = await loadImage(fetchAvatar);
      const flag = await loadImage(fetchCountry);
      const mapBg = await loadImage(fetchBg);
      const grade = await loadImage(`./src/utils/images/grades/${inputs.topPlay.rank}.png`);
      const winLoseBar = await loadImage(`./src/utils/images/misc/win-lose-bar.png`);
      const winLoseMask = await loadImage(`./src/utils/images/misc/win-lose-mask.png`);

      const totalMedals = 338;

      // Adjust svg dimensions before rasterization
      flag.width = 37;
      flag.height = 37;

      ctx.fillStyle ='#0e0d13'
      ctx.fillRect(0, 0, 800, 1200)
      ctx.drawImage(avatar, 69, 166, 331, 331);
      ctx.drawImage(mapBg, 0, 953, 765, 213);
      ctx.drawImage(card, 0, 0);
      ctx.drawImage(flag, 704, 335, 45, 30);
      ctx.drawImage(grade, 149, 1122, 53, 59);

      console.log(loadedMods);
        topPlayMods.forEach((mod, i) => {
          const x = 20 + i * 56
          ctx.drawImage(loadedMods[mod], x, 1077, 56, 40)
      })

      // ELO ratio bar
      const playerElo = hasElo(inputs.elo)
        if (playerElo.length > 0) {
            const bgHeight = 113 + 61 * (playerElo.length - 1)
            const bgX = -22 * (3 - playerElo.length) // 3 for total gamemodes
            ctx.drawImage(eloBg, 0, 0, eloBg.width, bgHeight, bgX, 655, eloBg.width, bgHeight)

            const titleX = (eloBg.width - 12 - eloTitle.width + bgX) / 2
            ctx.drawImage(eloTitle, titleX, 659)

            playerElo.forEach(async (stats, i) => {
                const origin = {
                    x: 8 + 22 * (playerElo.length - 1 - i),
                    y: 695 + 61 * i
                }

                const bar = Canvas.createCanvas(170, 56);
                const barCtx = bar.getContext('2d');

                const { mode, elo, wins, loses } = stats
                const ratio = wins / (wins + loses)
                const userRank = await getRankIcon(elo, wins + loses);
                const rankIcon = await loadImage(userRank);

                const x = map(ratio, 0, 1, -149, 0)

                barCtx.drawImage(winLoseMask, 0, 0)

                barCtx.globalCompositeOperation = 'source-in'
                barCtx.drawImage(winLoseBar, x, 23)

                ctx.drawImage(bar, origin.x, origin.y, 170, 56)
                ctx.drawImage(eloBase, origin.x, origin.y, 170, 56)
                drawText(commaNum(elo), origin.x + 72, origin.y + 22, 'Torus', 24, 'center', cardType.lightColor, { textStyling: 'bold' })

                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                ctx.drawImage(rankIcon, origin.x + 170 + 4, origin.y, 45, 45)

                drawText(commaNum(wins), origin.x + 22, origin.y + 48, 'Torus SemiBold', 18, 'left', '#5ce575')
                drawText(commaNum(loses), origin.x + 128, origin.y + 48, 'Torus SemiBold', 18, 'right', '#e55c5c')

                const gamemode = Canvas.createCanvas(20, 45);
                const modeCtx = gamemode.getContext('2d');

                modeCtx.save();
                modeCtx.translate(5, gamemode.height / 2);
                modeCtx.rotate(Math.PI / 2);
                modeCtx.font = `bold 16px "Torus"`;
                modeCtx.textAlign = 'center';
                modeCtx.fillStyle = cardType.darkColor;
                modeCtx.fillText(mode, 0, 0);
                modeCtx.restore();

                ctx.drawImage(gamemode, origin.x + 149, origin.y, 20, 45)
            })
        }

      // Region rank, if applicable
      // Quebec crashes the bot
        if (inputs.region) {
          let regionImage = inputs.regionFlag;
  
          let fetchImg = await setImage(regionImage).catch(err => {
            console.log(err);
            fetchImg = undefined;
          });
          
          var regionFlag;

          if (!fetchImg || inputs.region == "Quebec") {
            regionFlag = undefined;
          } else {
            try {
              regionFlag = await loadImage(fetchImg);
            } catch (err) {
              console.log(err);
              regionFlag = undefined;
            }
          }
  
          ctx.drawImage(regionBg, 416, 334, 194, 163);
  
          drawText(inputs.region, 504, 418, 'Torus SemiBold', 18, 'center', cardType.lightColor, { maxWidth: 168, minSize: 15 });
          drawText(
            `#${commaNum(inputs.stats.regionRank)}`,
            456,
            387,
            "Torus SemiBold",
            30,
            "left",
            cardType.lightColor
          );
  
          // Maintain ratio to 58x58 Square at (515, 433)
          if (regionFlag) {
            const offset = { x: 515, y: 433 }
            const scale = 58 / Math.max(regionFlag.width, regionFlag.height)
            const difference = Math.abs(regionFlag.width - regionFlag.height) * scale;
            const dimensions = { w: regionFlag.width * scale, h: regionFlag.height * scale }
  
            if (regionFlag.width >= regionFlag.height) {
                offset.y = 433 + difference * 0.5
            } else {
                offset.x = 515 + difference * 0.5
            }
  
            if (regionFlag.src.toString().endsWith('.svg')) {
                regionFlag.width = regionFlag.width * scale
                regionFlag.height = regionFlag.height * scale
            }
            ctx.drawImage(regionFlag, offset.x, offset.y, dimensions.w, dimensions.h);
        }
      }
      

      // Stats - Player, Total pp, Global rank, Country rank, Profile accuracy, Level
      console.log("writing text");
      drawText(inputs.player, 400, 92, 'Torus', 60, 'center', '#ffffff', { textStyling: 'bold' });
      drawText(
        `${inputs.stats.pp == 0 ? "no " : commaNum(inputs.stats.pp)}pp`,
        565,
        221,
        "Torus SemiBold",
        30,
        "left",
        cardType.lightColor
      );
      drawText(
        `#${commaNum(inputs.stats.globalRank)}`,
        578,
        288,
        "Torus SemiBold",
        30,
        "left",
        cardType.lightColor
      );
      drawText(`#${commaNum(inputs.stats.countryRank)}`, 593, 359, 'Torus SemiBold', 30, 'left', cardType.lightColor, { maxWidth: 100 });
      drawText(
        `${inputs.stats.acc.toFixed(2)}%`,
        606,
        426,
        "Torus SemiBold",
        30,
        "left",
        cardType.lightColor
      );
      drawText(
        `${Math.floor(inputs.stats.level)}`,
        621,
        497,
        "Torus SemiBold",
        30,
        "left",
        cardType.lightColor
      );

      // More Stats - Playtime, Playcount, Medals
      drawText(`${commaNum(Math.round(inputs.stats.playtime / 3600))}h`, 102, 590, 'Torus', 26, 'center', cardType.lightColor, { textStyling: 'bold' })
      drawText(`${commaNum(inputs.stats.playcount)}`, 307, 590, 'Torus', 26, 'center', cardType.lightColor, { textStyling: 'bold' })
      centerMultipleText(512, 590, [[`${inputs.stats.medals}`, 512, 590, 'Torus', 26, 'left', cardType.lightColor, { textStyling: 'bold' }], [`/${totalMedals}`, 512, 590, 'Torus', 20, 'left', cardType.midtoneColor, { textStyling: 'bold' }]])

      // Skills - potential, accuracy, speed, aim
      drawText(
        `${inputs.skills.potential}`,
        476,
        750,
        "Torus SemiBold",
        50,
        "center",
        cardType.lightColor
      );
      console.log(inputs.skills.potential);
      drawText(
        `${inputs.skills.acc}`,
        677,
        750,
        "Torus SemiBold",
        50,
        "center",
        cardType.lightColor
      );
      drawText(
        `${inputs.skills.speed}`,
        445,
        859,
        "Torus SemiBold",
        50,
        "center",
        cardType.lightColor
      );
      drawText(
        `${inputs.skills.aim}`,
        646,
        859,
        "Torus SemiBold",
        50,
        "center",
        cardType.lightColor
      );

      // Top play - Song, Difficulty, sr, Score, pp, Acc + Combo
    fillStrokeText(trimText(inputs.topPlay.song, 476, 36), 18, 992, 'Torus SemiBold', 36, 'left', '#ffffff', '#000000', 6);
    fillStrokeText(trimText(inputs.topPlay.diff, 464, 28), 18, 1023, 'Torus SemiBold', 28, 'left', '#d2d2d2', '#000000', 6);
    drawText(inputs.topPlay.sr, 59, 1159, 'Torus SemiBold', 36, 'left', '#ffffff', { maxWidth: 70 });
    fillStrokeText(commaNum(inputs.topPlay.score), 684, 1012, 'Torus SemiBold', 30, 'right', '#d2d2d2', '#000000', 6, { maxWidth: 180 });
      fillStrokeText(
        `${inputs.topPlay.pp}pp`,
        705,
        1075,
        "Torus SemiBold",
        65,
        "right",
        "#ffffff",
        "#000000",
        8
      );
      fillStrokeText(
        `${inputs.topPlay.acc}% x${commaNum(inputs.topPlay.combo)}`,
        724,
        1121,
        "Torus SemiBold",
        30,
        "right",
        "#d2d2d2",
        "#000000",
        6
      );

      // Level Pie chart
      drawPiechart(746, 479, 16, inputs.stats.level);

      // Helper functions
      async function setImage(imageUrl) {
        try {
          const response = await fetch(imageUrl);
          console.log(`${imageUrl} Status: ${response.status}`);
          return response.url;
        } catch (error) {
          console.error(error);
          return undefined;
        }
      }

      function hasElo(elo = {}) {
          // expects input.elo
          return Object.entries(elo).reduce((acc, [gamemode, playerElo]) => {
              if (playerElo.elo && typeof playerElo.elo == 'number') {
                  playerElo.mode = gamemode
                  acc.push(playerElo)
              }
              return acc
          }, [])
      }

      function drawText(text, x, y, font, size, align, color, args = {}) {
        ctx.font = `${args.textStyling ?? ''} ${size}px "${font}"`.trim()

        if (args.maxWidth) {
          const adjusted = fitText(text, y, size, args.maxWidth)
          if(args.minSize && adjusted.fontSize < args.minSize) {
              ctx.font = `${args.textStyling ?? ''} ${args.minSize}px "${font}"`.trim()
              text = trimText(text, args.maxWidth, args.minSize)
          } else {
              ctx.font = `${args.textStyling ?? ''} ${adjusted.fontSize}px "${font}"`.trim()
              y = adjusted.y
        }
        }
        ctx.fillStyle = color;
        ctx.textAlign = align;
        ctx.fillText(text, x, y);
      }

      function fillStrokeText(text, x, y, font, size, align, color, strokeColor, strokeWidth, args = {}) {
        ctx.font = `${args.textStyling ?? ''} ${size}px "${font}"`.trim()

        if (args.maxWidth) {
          const adjusted = fitText(text, y, size, args.maxWidth)
          if(args.minSize && adjusted.fontSize < args.minSize) {
              ctx.font = `${args.textStyling ?? ''} ${args.minSize}px "${font}"`.trim()
              text = trimText(text, args.maxWidth, args.minSize)
          } else {
              ctx.font = `${args.textStyling ?? ''} ${adjusted.fontSize}px "${font}"`.trim()
              y = adjusted.y
          }
        }
        ctx.fillStyle = color;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.textAlign = align;
        ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);
      }

      function fitText(text, y, fontSize, maxWidth) {
        const centerY = y - (ctx.measureText(text).actualBoundingBoxAscent + ctx.measureText(text).actualBoundingBoxDescent) / 2
        while (fontSize > 0 && ctx.measureText(text).width > maxWidth) {
            fontSize--
            ctx.font = ctx.font.replace(/\d{1,3}px/, `${fontSize}px`)
        }
        return { fontSize, y: centerY + (ctx.measureText(text).actualBoundingBoxAscent + ctx.measureText(text).actualBoundingBoxDescent) / 2 }
    }

      function drawPiechart(x, y, r, lvl) {
        const percent = lvl - Math.floor(lvl);

        const startAngle = -Math.PI * 0.5;
        const endAngle = startAngle + percent * 2 * Math.PI;

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 6;
        ctx.moveTo(x, y);
        ctx.beginPath();
        ctx.arc(x, y, r - ctx.lineWidth * 0.5, startAngle, endAngle);
        ctx.stroke();
        ctx.closePath();
      }

      function commaNum(n) {
        if (n == 0) return "0";
        const nr = Math.floor(n);
        const dec = (n % nr).toFixed(2);
        return (
          nr.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") +
          (dec != 0 ? dec.substring(1) : "")
        );
      }

      function map(n, start1, stop1, start2, stop2, withinBounds) {
          const newval = (n - start1) / (stop1 - start1) * (stop2 - start2) + start2;
          if (!withinBounds) {
              return newval;
          }
          if (start2 < stop2) {
              return constrain(newval, start2, stop2);
          } else {
              return constrain(newval, stop2, start2);
          }
      }
      
      function constrain(n, low, high) {
          return Math.max(Math.min(n, high), low);
      }

      function getCountryHex(country) {
        const regionalIndicators = country
          .split("")
          .map((letter) => String.fromCodePoint(letter.charCodeAt(0) + 127397));
        return regionalIndicators
          .map((symbol) => symbol.codePointAt(0).toString(16))
          .join("-");
      }

      function trimText(text, maxWidth, fontSize, prefix = '', suffix = '') {
        ctx.font = ctx.font.replace(/\d{1,3}px/, `${fontSize}px`)

        let output = text
        if(ctx.measureText(prefix + text + suffix).width < maxWidth) return `${prefix}${output}${suffix}`

        const paddingLength = ctx.measureText(prefix + suffix + '...').width

        while(ctx.measureText(output).width >= maxWidth - paddingLength) {
            output = output.substring(0, output.length - 1).trim()
        }

        return `${prefix}${output}...${suffix}`
       }
      
       function centerMultipleText(x, y, textArray) {
        const totalWidth = textArray.reduce((total, [text, x, y, font, size, align, color, args = {}]) => {
            ctx.font = `${args.textStyling ?? ''} ${size}px "${font}"`.trim()
            return total + ctx.measureText(text).width
        }, 0)

        const startX = x - totalWidth / 2
        let xOffset = 0
        textArray.forEach(([text, x, y, font, size, align, color, args = {}]) => {
            ctx.font = `${args.textStyling ?? ''} ${size}px "${font}"`.trim()
            drawText(text, startX + xOffset, y, font, size, align, color, args)

            xOffset += ctx.measureText(text).width
        })
    }

      // Export card
      console.log("exporting card");
      const attachment = new AttachmentBuilder(await canv.encode("png"), {
        name: `${inputs.player}-RomAI-PlayerCard.png`,
      });
      return attachment;
    } catch (err) {
      console.error(err);
    }
  },
};
