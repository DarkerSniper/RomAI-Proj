module.exports = {
    // Pass the entire Canvas object because you'll need access to its width and context
    applyText(canvas, font, size, text) {
        const context = canvas.getContext('2d');

        // Declare a base size of the font
        let fontSize = size;

        do {
            // Assign the font to the context and decrement it so it can be measured again
            context.font = `${fontSize -= 10}px ${font}`;
            // Compare pixel width of the text to the canvas minus the approximate avatar size
        } while (context.measureText(text).width > canvas.width - 300);

        // Return the result to use in the actual canvas
        return context.font;
    }
};