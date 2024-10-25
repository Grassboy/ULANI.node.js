console.log('請注意，請將 /src/config.sample.js 複製成 /src/config.js, 並將 bluetooth_name 改成你在 windows 下配對到的 ulani 裝置名稱');
//如果你已存成 config.js 了，上面這行就可以刪除了

if(require.main !== module) {
    module.exports = {
        is_debug: true,                             //是否顯示偵錯訊息
        bluetooth_name: 'ULANI CalendarC0FFEE',     //藍牙裝置名稱
        frame_setting: {                            //相框設定

            background_color: '#00000066',          //若圖片沒有填滿相框，要填入的背景顏色為何？可接受 rgb() rgba() #RRGGBB #RRGGBBAA 或顏色保留字
            cover_background: true,                 //若圖片沒有填滿相框，是否要用該圖片刷一層背景 (background_color 帶有透明度時才看得到)
            rotate_deg: 0,                          //是否要旋轉相框，可接受的值為 0 90 180 270 (若要放直式相片建議調成 90 or 270)

            display_time: true,                     //是否顯示圖片傳輸的時間點(以便確認相框上次換圖是何時)
                                                    //若 display_time == true 則可決定文字樣式
            font_color: 'black',                         //顏色，可接受 rgb() rgba() #RRGGBB #RRGGBBAA 或顏色保留字
            font_size: 64,                               //文字大小(px)
            font_family: 'Georgia',                      //字型
            font_left: 20,                               //x 位置
            font_top: 40                                 //y 位置(注意，這是以文字底線的垂直位置)

        }
    };

}
