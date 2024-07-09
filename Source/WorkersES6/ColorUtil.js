'use strict';
class ColorUtil {
    constructor()
    {
        this.rgb = [];
        this.alpha = 255;
        this.hex = "";
    }

    fromHex(color)
    {
        color = color.toUpperCase();
        var regexpHex=/^#[0-9a-fA-F]{3,6}$/;//Hex

        if(regexpHex.test(color)){

            var hexArray = [];
            var count=1;

            for(var i=1;i<=3;i++){

                if(color.length-2*i>3-i){
                    hexArray.push(Number("0x"+color.substring(count,count+2)));
                    count+=2;

                }else{
                    hexArray.push(Number("0x"+color.charAt(count)+color.charAt(count)));
                    count+=1;
                }
            }

            this.rgb = hexArray;
            this.hex = color;
        }
    }

    fromRGB(color)
    {
        var regexpRGB=/^(rgb|RGB)\([0-9]{1,3},\s?[0-9]{1,3},\s?[0-9]{1,3}\)$/;//RGB

        if(regexpRGB.test(color)){

            color = color.replace(/(\(|\)|rgb|RGB)*/g,"").split(",");

            var colorHex="#";

            for(var i=0;i<color.length;i++){

                var hex = Number(color[i]).toString(16);
                if(hex.length==1) hex = "0"+hex;
                colorHex+=hex;
            }

            this.rgb = color;
            this.hex = colorHex;
        }
    }
}

export default ColorUtil;