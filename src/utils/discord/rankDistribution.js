const { AttachmentBuilder } = require('discord.js');
const Canvas = require('@napi-rs/canvas');

const loadImage = Canvas.loadImage;

Canvas.GlobalFonts.registerFromPath('./src/utils/fonts/Torus/Torus-Bold.otf', 'Torus-Bold');
Canvas.GlobalFonts.registerFromPath('./src/utils/fonts/Torus/Torus-Regular.otf', 'Torus');
Canvas.GlobalFonts.registerFromPath('./src/utils/fonts/Torus/Torus-SemiBold.otf', 'Torus SemiBold');

async function getDominantColor(imagePath) {
    try {
        const image = await loadImage(imagePath);
        const canvas = Canvas.createCanvas(image.width, image.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0, image.width, image.height);

        const imageData = ctx.getImageData(0, 0, image.width, image.height).data;
        const pixels = [];

        for (let i = 0; i < imageData.length; i += 4) {
            const r = imageData[i];
            const g = imageData[i + 1];
            const b = imageData[i + 2];
            const a = imageData[i + 3];

            if (a < 128) continue; // Skip transparent pixels

            pixels.push({ r, g, b });
        }

        if (pixels.length === 0) return '#FFFFFF';

        const palette = medianCutQuantization(pixels, 1);
        return rgbToHex(palette[0].r, palette[0].g, palette[0].b);

    } catch (error) {
        console.error('Error getting dominant color:', error);
        return '#FFFFFF';
    }
}

function rgbToHex(r, g, b) {
    const componentToHex = (c) => {
        const hex = c.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    return '#' + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function medianCutQuantization(pixels, colorCount) {
    const box = { pixels };
    const palette = [];

    function splitBox(box) {
        if (box.pixels.length === 0) return;

        let rMin = Infinity, rMax = -Infinity;
        let gMin = Infinity, gMax = -Infinity;
        let bMin = Infinity, bMax = -Infinity;

        for (const pixel of box.pixels) {
            rMin = Math.min(rMin, pixel.r);
            rMax = Math.max(rMax, pixel.r);
            gMin = Math.min(gMin, pixel.g);
            gMax = Math.max(gMax, pixel.g);
            bMin = Math.min(bMin, pixel.b);
            bMax = Math.max(bMax, pixel.b);
        }

        const rRange = rMax - rMin;
        const gRange = gMax - gMin;
        const bRange = bMax - bMin;

        let splitChannel;
        if (rRange >= gRange && rRange >= bRange) splitChannel = 'r';
        else if (gRange >= rRange && gRange >= bRange) splitChannel = 'g';
        else splitChannel = 'b';

        box.pixels.sort((a, b) => a[splitChannel] - b[splitChannel]);

        const medianIndex = Math.floor(box.pixels.length / 2);
        const box1 = { pixels: box.pixels.slice(0, medianIndex) };
        const box2 = { pixels: box.pixels.slice(medianIndex) };

        return [box1, box2];
    }

    function averageBoxColor(box) {
        if (box.pixels.length === 0) return null;

        let rSum = 0, gSum = 0, bSum = 0;
        for (const pixel of box.pixels) {
            rSum += pixel.r;
            gSum += pixel.g;
            bSum += pixel.b;
        }

        const pixelCount = box.pixels.length;
        return {
            r: Math.round(rSum / pixelCount),
            g: Math.round(gSum / pixelCount),
            b: Math.round(bSum / pixelCount),
        };
    }

    const boxes = [box];
    while (boxes.length < colorCount) {
        let maxPixels = 0;
        let maxBoxIndex = -1;

        for (let i = 0; i < boxes.length; i++) {
            if (boxes[i].pixels.length > maxPixels) {
                maxPixels = boxes[i].pixels.length;
                maxBoxIndex = i;
            }
        }

        if (maxBoxIndex === -1) break;

        const split = splitBox(boxes[maxBoxIndex]);
        if (split) {
            boxes.splice(maxBoxIndex, 1, split[0], split[1]);
        } else {
            break;
        }
    }

    for (const box of boxes) {
        const color = averageBoxColor(box);
        if (color) palette.push(color);
    }

    return palette;
}

module.exports = {
    async rankDistributionGraph(ranks, labels, rankImagePaths) {
      const width = 1920;
      let height = 1080;
  
      const canvas = Canvas.createCanvas(width, height);
      const ctx = canvas.getContext('2d');
  
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#1a1a1a');
      gradient.addColorStop(1, '#000000');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
  
      const baseX = 150;
      let baseY = height - 110;
  
      const maxRank = Math.max(...ranks);
      const scaleFactor = (height - 300) / maxRank;
  
      const maxBarHeight = maxRank * scaleFactor;
      if (maxBarHeight > height - 300) {
        height = maxBarHeight + 300;
        canvas.height = height;
        baseY = height - 150;
      }
  
      ctx.font = '20px Torus-SemiBold';
  
      let maxLabelWidth = 0;
      for (const label of labels) {
        const labelWidth = ctx.measureText(label).width;
        maxLabelWidth = Math.max(maxLabelWidth, labelWidth);
      }
  
      const totalBars = ranks.length;
      const availableWidth = width - 2 * baseX;
  
      const barWidth = Math.floor(availableWidth / (totalBars * 1.8));
      const spacing = Math.floor((availableWidth - barWidth * totalBars) / (totalBars + 4));
  
      let currentX = baseX;
  
      for (let index = 0; index < ranks.length; index++) {
        const rank = ranks[index];
        const barHeight = rank * scaleFactor;
        const y = baseY - barHeight;
  
        let barColor = '#333333';
  
        if (rankImagePaths && rankImagePaths[index]) {
          const dominantColor = await getDominantColor(rankImagePaths[index]);
          if (dominantColor) {
            barColor = dominantColor;
          }
        }
  
        ctx.fillStyle = barColor;
        const borderRadius = 10;
        ctx.beginPath();
        ctx.roundRect(Math.round(currentX), y, barWidth, barHeight, borderRadius);
        ctx.fill();
  
        currentX += barWidth + spacing;
      }
  
      ctx.fillStyle = 'white';
      ctx.font = '20px Torus-SemiBold';
      ctx.textAlign = 'center';
  
      currentX = baseX + barWidth / 2;
  
      for (let index = 0; index < ranks.length; index++) {
        const label = labels[index];
        const labelWidth = ctx.measureText(label).width;
  
        const labelX = Math.round(currentX);
        const labelY = baseY + 70;
  
        const rank = ranks[index];
        const barHeight = rank * scaleFactor;
  
        if (labelWidth > barWidth) {
          ctx.save();
          ctx.translate(labelX, labelY);
          ctx.rotate(Math.PI / 4);
          ctx.fillText(label, 0, 0);
          ctx.restore();
        } else {
          ctx.fillText(label, labelX, labelY);
        }
  
        // Move rank image below the bar and above the label, lower down
        if (rankImagePaths && rankImagePaths[index]) {
          try {
            const image = await loadImage(rankImagePaths[index]);
            const imageWidth = 70;
            const imageHeight = 70;
            const imageY = baseY - barHeight - imageHeight - 10;
            ctx.drawImage(image, Math.round(currentX - imageWidth / 2), imageY, imageWidth, imageHeight);
          } catch (error) {
            console.error(`Error loading image: ${rankImagePaths[index]}`, error);
          }
        }
  
        currentX += barWidth + spacing;
      }
  
      ctx.fillStyle = 'white';
      ctx.font = '48px Torus-Bold';
      ctx.textAlign = 'center';
      ctx.fillText('RomAI Rank Distribution', width / 2, 80);
  
      const attachment = new AttachmentBuilder(await canvas.encode('png'), {
        name: 'Rank-Distribution.png',
      });
  
      return attachment;
    },
  };