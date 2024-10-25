const fs = require('fs');
const config = require(fs.existsSync('./config.js')?'./config.js':'./config.sample.js');
const BLEComm = require('./BLEComm.js');

var comm = new BLEComm(config);
comm.bind('ulaniready', async function(){
    console.log('取得電量等級', await comm.getBatteryLevel() );
    var slot = await comm.getActiveImageSlot();
    console.log(slot);
    if(slot.startsWith('0c')) {
        comm.current_slot = parseInt(slot[3], 10);
    }
    console.log('當前顯示第', comm.current_slot, '個相框');

    //先前好像幾秒後沒連線就會藍牙斷線，所以加了10秒 ack 機制
    setInterval(async function(){
        console.log('binary ack');
        await comm.binaryAck();
    }, 10000);

    var has_failed = 0;
    setTimeout(async function(){
        while(true){
            console.log('開始測試換圖');
            var r = await comm.startSendImage(comm.current_slot, '../img/sample.png');
            console.log('結果: ', r);
            if(r != '0200') {
                await comm.setActiveImageSlot(1); 
            } else {
                console.log('成功換圖 bye');
                process.exit();
            }
            if(r != '0200' && has_failed == 0) { //換圖失敗的話就重試
                has_failed++;
            } else if(has_failed >= 2) { //失敗2次就跳出
                break;
            } else if(has_failed == 1){ //失敗一次再加一次
                has_failed++;
            }
            await new Promise((r)=>setTimeout(r,60000));
        }
    }, 15000);
});
