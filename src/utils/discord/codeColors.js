/*
    Name	        	Hex Code(should always start with '0x')
    Default	 	        #000000
    Aqua	      	    #1ABC9C
    DarkAqua            #11806A
    Green	       	    #57F287
    DarkGreen	   	    #1F8B4C
    Black	        	#23272A
    Blue	       	    #3498DB
    DarkBlue	   	    #206694
    Purple	         	#9B59B6
    DarkPurple	  	    #71368A
    LuminousVividPink	#E91E63
    DarkVividPink	 	#AD1457
    Gold	         	#F1C40F
    DarkGold	    	#C27C0E
    Orange	         	#E67E22
    DarkOrange	    	#A84300
    Red	            	#ED4245
    DarkRed	        	#992D22
    Grey	       	    #95A5A6
    DarkGrey	   	    #979C9F
    DarkerGrey	  	    #7F8C8D
    LightGrey	    	#BCC0C0
    Navy	            #34495E
    DarkNavy	        #2C3E50
    Yellow	           	#FFFF00 

    Default value should always be 'DarkerGrey' (0x7F8C8D)
*/

module.exports = {
    hex(color){
        //Code for example:
        switch(color) {
            case 'orange':
                return 0xE67E22; //using the data above
            case 'green':
                return 0x57F287;
            case 'black':
                return 0x23272A;
            case 'blue':
                return 0x3498DB;
            case 'purple':
                return 0x9B59B6;
            case 'red':
                return 0xED4245;
            case 'yellow':
                return 0xFFFF00;
            default:
                return 0x7F8C8D; //DarkerGrey
        }
    }
};