/*
 * Image Dither Processor
 *
 * */


const {createCanvas, loadImage} = require('canvas');

const DitherJS = require('ditherjs/server');
const fs = require('fs');
const config = require(fs.existsSync('./config.js')?'./config.js':'./config.sample.js');

var ditherjs = new DitherJS();

var options = {
    "step": 1, // The step for the pixel quantization n = 1,2,3...
    "palette": 
    [
        [ 0, 0, 0 ],
        [ 209, 208, 202 ],
        [ 69, 121, 81 ],
        [ 82, 91, 151 ],
        [ 175, 76, 74 ],
        [ 207, 194, 88 ],
        [ 192, 99, 30 ]
    ],
    skip_reload: true,
    "algorithm": "diffusion" // one of ["ordered", "diffusion", "atkinson"]
};
var CRC16 = function(paramShort, paramArrayOfByte, paramLong1, paramLong2) {
    var i = paramLong1;
    var j;
    for (j = paramShort; paramLong2 > 0; j = k) {
        var k = (j ^ paramArrayOfByte[i] << 8) & 0xFFFF;
        for (paramShort = 0; paramShort < 8; paramShort++) {
            if (k & 0x8000) {
                k = (k << 1 ^ 0x1021) & 0xFFFF;
            } else {
                k = (k << 1) & 0xFFFF;
            }
        }
        i++;
        paramLong2--;
    }
    return j.toString(16);
};
var hexToUint8Array = function(hex) {
    var array = [];
    for (var i = 0; i < hex.length; i += 2) {
        array.push(parseInt(hex.substr(i, 2), 16));
    }
    //console.log(array);
    return new Uint8Array(array);
};
var calcBoundingBox = function(width, height, box_width, box_height){
    var result;
    if(width / height > box_width / box_height) { //垂直置中
        result = [0, (box_height - (box_width / width * height))/2, box_width, box_width / width * height ];
        result.push(result[2]*(1 - box_height/result[3]) / 2, 0, result[2]/result[3]*box_height, box_height);
    } else { //水平置中
        result = [(box_width - (box_height / height * width))/2, 0, box_height / height * width, box_height];
        result.push(0, result[3]*(1 - box_width/result[2]) / 2, box_width, result[3]/result[2]*box_width);
    }
    return result;
};
var getDitherData = function(img_data){
    var map = {};
    options.palette.forEach(function(pair, i){
        map[pair.join(',')] = i;
    });
    var getXY = function(x, y){ //取 canvas x,y 的相素對應值
        var p = (y*800+x)*4;
        var search = img_data.slice(p, p+3);
        if(map[search] === undefined){
            console.log(search, x, y);
            throw '找不到'+search;
        }
        return map[search];
    };
    var result = [];
    var str = '';
    for(var y = 0; y < 480; y++) {
        for(var x = 0; x < 800; x++ ) {
            str+= getXY(x, y);
            if(str.length == 460) {
                result.push(str);
                str = '';
            }
        }
    }
    result.push(str);
    var crc16 = CRC16(0, hexToUint8Array(result.join('')), 0, 192000);
    result.splice(0,0,crc16);
    return result;
};

/*
 * dither process
 * resolve format:
 *  [ 
 *      [CRC16], ...[pixcel data series]
 *  ]
 * */
var getDitherImage = function(file, opts){
    opts = Object.assign({}, config.frame_setting, (opts || {}));
    return new Promise(function(resolve, reject){
        var buffer = fs.readFileSync(file);
        loadImage(buffer).then(function(img){
            var canvas = createCanvas(800, 480);
            var ctx = canvas.getContext('2d');
            ctx.font = opts.font_size+'px '+opts.font_family;
            ctx.save();
            switch(opts.rotate_deg) {
            case 0:
                box = calcBoundingBox(img.naturalWidth, img.naturalHeight, 800, 480);
                break;
            case 90:
                ctx.translate(0, canvas.height);  // 平移畫布
                ctx.rotate(-Math.PI / 2);         // 向左旋轉90度 (逆時針)
                box = calcBoundingBox(img.naturalWidth, img.naturalHeight, 480, 800);
                break;
            case 180:
                ctx.translate(canvas.width, canvas.height); // 平移基準點到右下角，然後旋轉180度
                ctx.rotate(Math.PI); // 旋轉180度
                box = calcBoundingBox(img.naturalWidth, img.naturalHeight, 800, 480);
                break;
            case 270:
                ctx.translate(canvas.width, 0);  // 移動基準點到右上角
                ctx.rotate(Math.PI / 2);
                box = calcBoundingBox(img.naturalWidth, img.naturalHeight, 480, 800);
                break;
            }

            if(opts.cover_background) {
                ctx.drawImage.apply(ctx, [img, ...(box.slice(4))]);
            }
            ctx.fillStyle = opts.background_color;
            ctx.fillRect(0,0,800,800);
            ctx.drawImage.apply(ctx, [img, ...(box.slice(0,4))]);
            if(opts.display_time) {
                ctx.fillStyle = opts.font_color;
                ctx.textBaseline = 'top';
                ctx.fillText(new Date().toString().split(' ')[4], opts.font_left, opts.font_top);
            }

            ctx.restore();
            var buffer2 = ditherjs.dither(canvas.toBuffer('image/png'),options);
            loadImage(buffer2).then(function(img){
                var canvas = createCanvas(800, 480);
                var ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, 800, 480);
                /*
                // 將 Canvas 匯出為 PNG 圖片並寫入檔案系統中
                const out = fs.createWriteStream('./output.png');
                const stream = canvas.createPNGStream();
                stream.pipe(out);
                */
                resolve(getDitherData(ctx.getImageData(0,0,800,480).data));
            });
        });

    });
};

this.getDitherImage = getDitherImage;
if (require.main === module) {
    var main = async function(global){
        var result = await getDitherImage('../img/sample_ai_building.png');
        console.log(result);
    }
    main(this);
}
