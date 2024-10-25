//Ulani BLEComm implement
//issue:
//  characteristic ondata 事件會重複 trigger 且無法避免
//  reconnect 會抓不到 characteristic 必需整個 process 重啟
//
const fs = require('fs');
const config = require(fs.existsSync('./config.js')?'./config.js':'./config.sample.js');
const device_name_prefix = 'ULANI Calendar';
const getDitherImage = require('./dither.js').getDitherImage;

var DEVICE_SERVICE = '1234a200-7cbc-11e9-8f9e-2a86e4085a59';
var CHARAC_201_UUID = '1234a201-7cbc-11e9-8f9e-2a86e4085a59';
var CHARAC_202_UUID = '1234a202-7cbc-11e9-8f9e-2a86e4085a59';
var CHARAC_201;
var CHARAC_202;

var BLEComm = function(opts){
    var noble = this.noble = require('noble-winrt');
    var that = this;
    that.events = {};
    that._job_done = false;
    that._event_handler = {};
    that._previous_op_time = (new Date()).getTime();
    if(opts.is_debug == true) {
        that.is_debug = true;
    }
    that.events.stateChange = function(state){
        that.trigger('statechange', {state:state});
        if (state === 'poweredOn') {
            that.nobleStartScanning();
        } else {
            noble.stopScanning();
        }
    };
    that.events.discover = (peripheral) => {
        const device_name = peripheral.advertisement.localName;
        var device_info = {
            device_name: device_name,
            peripheral_id: peripheral.id
        };
        //device_name && console.log(device_name);
        if (!opts.bluetooth_name && device_name.startsWith(device_name_prefix)) {
            that.trigger('discover', device_info);
        } else if (device_name && device_name == opts.bluetooth_name) {
            that.trigger('ulanifound', device_info);
            noble.stopScanning();
            (async function(){
                var connectDevice = function(peripheral){
                    return new Promise(function(resolve, reject){
                        peripheral.connect((error) => {
                            if(error) {
                                reject(error);
                            } else {
                                resolve(peripheral);
                            }
                        });
                    });
                };
                var discoverService = function(peripheral){
                    return new Promise(function(resolve, reject){
                        peripheral.discoverServices([], (error, services) => {
                            if (error) {
                                reject(error);
                            } else {
                                services.forEach((service) => {
                                    if(service.uuid == DEVICE_SERVICE) {
                                        that.trigger('servicefound', {service: service});
                                        resolve(service);
                                    }
                                });
                                reject('service not found');
                            }
                        });
                    });
                };
                var subscribeCharacteristics = function(service){
                    return new Promise(function(resolve, reject){
                        service.discoverCharacteristics([], async (error, characteristics) => {
                            if (error) {
                                reject(error);
                                return;
                            }

                            if(characteristics.length == 0){
                                //console.log('characteristic not found try again');
                                //reject('characteristics not found');
                                resolve(false);
                                return;
                            }
                            for(var i = 0; i < characteristics.length; i++) {
                                var characteristic = characteristics[i];
                                if(characteristic.uuid == CHARAC_201_UUID) {
                                    that.op_charac = characteristic;
                                    await that._subscribeCharac(characteristic, false);
                                    that.trigger('opchannelready', {characteristic: characteristic});
                                } else if (characteristic.uuid == CHARAC_202_UUID) {
                                    that.data_charac = characteristic;
                                    await that._subscribeCharac(characteristic, true);
                                    that.trigger('datachannelready', {characteristic: characteristic});
                                } else {
                                    //console.log('Unknown UUID', characteristic.uuid);
                                }
                            }
                            resolve(true);
                        });
                    });
                };
                
                // 監聽 peripheral 的連接狀態變化
                var onPeripheralConnect = async function() {
                    that.trigger('connect', device_info);
                    var service = await discoverService(peripheral);
                    while(true) {
                        var ready = await subscribeCharacteristics(service);
                        if(ready) {
                            break;
                        } else {
                            throw 'cannot subscribe all characteristics';
                        }
                    }
                    that.trigger('ulaniready',{});
                };
                var onPeripheralDisconnect = async function() {
                    that.trigger('disconnect', device_info);
                    peripheral.removeListener('connect', onPeripheralConnect);
                    peripheral.removeListener('disconnect', onPeripheralDisconnect);
                    that.destroy();
                };
                peripheral.on('connect', onPeripheralConnect);
                peripheral.on('disconnect', onPeripheralDisconnect);
                that.peripheral = peripheral;
                await connectDevice(peripheral);
            })();
        }
    };
    noble.on('stateChange', that.events.stateChange);
    if(noble.state == 'poweredOn') {
        console.log('重新 Scanning', that.nobleStartScanning());
    }
    noble.on('discover', that.events.discover);
};
BLEComm.prototype = {
    constructor: BLEComm,
    _subscribeCharac: function(characteristic, force){
        var got_data = force;
        var that = this;
        return new Promise(function(resolve, reject){
            var dataHnalderGenerator = function(characteristic){
                var seed = characteristic.__seed = (new Date()).getTime().toString()+parseInt(Math.random()*1000, 10);
                characteristic.__dataHandler = function(data, isNotification){
                    if(seed != characteristic.__seed) {
                        console.log('ignore handler');
                        return;
                    }
                    if(seed != characteristic.__seed) return;
                    if(that.is_debug) {
                        console.log(`Received data "${data.toString('hex')}" from characteristic "${characteristic.uuid}"`, isNotification);
                    }
                    got_data = true;
                    var data_hex = data.toString('hex');
                    var op = data_hex.substr(0, 2)
                    characteristic['__resolve'+op]  && characteristic['__resolve'+op](data_hex);
                };
                return characteristic.__dataHandler;
            };
            var doSubscribe = function(){
                characteristic.subscribe((error)=>{
                    if (error) {
                        console.error(`Error subscribing to characteristic: ${error}`);
                        reject();
                        return;
                    }
                    //console.log(`Subscribed to characteristic "${characteristic.uuid}"`);
                    if(got_data) {
                        //console.log('Got response', characteristic.uuid);
                        resolve();
                    } else {
                        //console.log('still not response');
                        characteristic.unsubscribe((error)=>{
                            if (error) {
                                console.error(`Error unsubscribing to characteristic: ${error}`);
                                return;
                            }
                            doSubscribe();
                        });
                    }
                });
                characteristic.__dataHandler && characteristic.removeListener('data', characteristic.__dataHandler);
                characteristic.on('data', dataHnalderGenerator(characteristic));
            };
            doSubscribe();
        });
    },
    setOpValue: function(value, is_silent){
        var that = this;
        if(!is_silent) {
            that._previous_op_time = (new Date()).getTime();
        }
        var characteristic = that.op_charac;
        if(!characteristic) {
            throw "Characteristic not ready!!";
        }
        return new Promise(function(resolve, reject){
            var op = value.substr(0, 2)
            characteristic['__getValue'+op] = new Promise(function(r){
                //console.log('設定新的 resolve function');
                characteristic['__resolve'+op] = r;
                setTimeout(function(){
                    r(op+'9999'); //op value 理論上10秒內一定會有回應
                }, 10000);
                var valueToWrite = hexToUint8Array(value);
                characteristic.write(valueToWrite, false, (error) => {
                    if (error) {
                        console.error(`Error writing to characteristic: ${error}`);
                        return;
                    }
                    //console.log(`Wrote value "${valueToWrite.toString('hex')}" to characteristic "${characteristic.uuid}"`);
                    resolve({p: characteristic['__getValue'+op]});
                });
            });
        });
    },
    setDataValue: function(data){
        var that = this;
        var characteristic = that.data_charac;
        if(!characteristic) {
            throw "Characteristic not ready!!";
        }
        return new Promise(function(resolve, reject){
            var valueToWrite = hexToUint8Array(data);
            characteristic.write(valueToWrite, false, (error) => {
                if (error) {
                    console.error(`Error writing to characteristic: ${error}`);
                    return;
                }
                //console.log(`Wrote value "${valueToWrite.toString('hex')}" to characteristic "${characteristic.uuid}"`);
                resolve();
            });
        });
    },
    nobleStartScanning: function(){
        //要 delay 個兩秒後重新 scanning
        //不然有時候會被前一個 stopScanning 影響到
        var that = this;
        setTimeout(function(){
            that.noble.startScanning([], true);
        }, 2000);
    },
    trigger: function(event_type, data){
        var that = this;
        if(that.is_debug) {
            console.log("Event: ", event_type, data);
        }
        that._event_handler[event_type] && that._event_handler[event_type].forEach(function(fn){
            fn.apply(that, [{
                type: event_type,
                data: data
            }]);
        });
    },
    bind: function(event_type, handler){
        var that = this;
        that._event_handler[event_type] = that._event_handler[event_type] || []; 
        that._event_handler[event_type].push(handler);
    },
    nextSlot: function(){
        return (this.current_slot % 4) + 1;
    },
    binaryAck: async function(){
        var that = this;
        if((new Date()).getTime() - that._previous_op_time > 300000) { //如果超過五分鐘沒有任何操作，中斷連線
            return that.askForDisconnect();
        } else {
            return that.setOpValue('0600', true); //因為是 ack 所以不需要 await
        }
    },
    startSendImage: async function(slot, img_path, job_id = null, opts = config.frame_setting){
        var that = this;
        var img_data = await getDitherImage(img_path);
        await that.checkCustomerID();
        var p = (await that.setOpValue('010002ee000'+slot+'02' + ((new Date()).getTime().toString(16).substr(-8)) + img_data[0])).p;
        var result = await p;
        var data_charac_result = null;
        return new Promise(async function(resolve, reject){
            that.data_charac.__resolve02 = function(r){
                that.trigger('sendimagedone', {rsp: r, slot: slot, job_id: job_id});
                data_charac_result = r;
                resolve(r);
            };
            if(result == '0100'){
                that.trigger('sendimagestart', {});
                for(var i = 1; i < img_data.length; i++){
                    if(data_charac_result) break;
                    await that.setDataValue(img_data[i]);
                    await new Promise((r)=>setTimeout(r,20));
                    if(i % 40 == 0 || ( i == img_data.length - 1 )) {
                        that.trigger('imageprogress', {
                            total: img_data.length,
                            slot: slot,
                            now: i,
                            job_id: job_id || null,
                            percentage: ((i+1)*100) / img_data.length
                        });
                    }
                    //if(i == img_data.length - 10) break; //故意失敗測試 0201
                }
            } else {
                resolve(result);
            }
        });
    },
    checkCustomerID: async function(){
        var that = this;
        return (await that.setOpValue('044e42')).p;
    },
    getBatteryLevel: async function(){
        var that = this;
        return (await that.setOpValue('0600')).p;
    },
    askForDisconnect: async function(){
        var that = this;
        return (await that.setOpValue('0903')).p;
    },
    setActiveImageSlot: async function(slot){
        var that = this;
        var t = (await that.setOpValue('0b0'+slot)).p;
        return t.then(function(r){
            if(r == '0b00') {
                that.trigger('slotchange', {slot: slot} );
                that.current_slot = slot;
            }
            return r;
        });
    },
    getActiveImageSlot: async function(){
        var that = this;
        return (await that.setOpValue('0c00')).p;
    },
    destroy: function(){
        var that = this;
        that.trigger('destroy');
        that.noble.stopScanning();
        that.noble.removeListener('stateChange', that.events.stateChange);
        that.noble.removeListener('discover', that.events.discover);
        that.peripheral.disconnect(() => {
            process.exit(that._job_done?0:-1);
        });
    }
}


var queue = [];
function hexToUint8Array(hex) {
    var array = [];
    for (var i = 0; i < hex.length; i += 2) {
        array.push(parseInt(hex.substr(i, 2), 16));
    }
    //console.log(array);
    return Buffer.from(new Uint8Array(array));
}
if (require.main !== module) {
    module.exports = BLEComm;
}
