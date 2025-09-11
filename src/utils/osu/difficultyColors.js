/*
    Return a string (that represents a color) depending on the star difficulty

    As of 27 July 2021, the osu! website automatically assigns a beatmap's difficulty rating colour based on their star rating according to the following spectrum:
        Easy: 0.0★–1.99★ = blue
        Normal: 2.0★–2.69★ = green
        Hard: 2.7★–3.99★ = yellow
        Insane: 4.0★–5.29★ = orange
        Expert: 5.3★–6.49★ = red
        Expert+: 6.5★-7.5★ = purple
        Extreme: 7.5★ and above = black
*/

module.exports = {
    colors(stars){
        //Write the code in here
        //Code for example:
        if (stars >= 7.5) {
            return "black";
        } else if (stars >= 6.5) {
            return "purple";
        } else if (stars >= 5.3) {
            return "red";
        } else if (stars >= 4) {
            return "orange";
        } else if (stars >= 2.7) {
            return "green";
        } else if (stars >= 0) {
            return "blue";
        }
    }
};