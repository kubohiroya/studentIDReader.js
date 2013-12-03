var PafeDummy = function(){
    this.pasori_1 = new PasoriDummy();
};
PafeDummy.prototype.open_pasori_multi = function(){
    this.pasoriArray = [this.pasori_1];
    return this.pasoriArray;
};
PafeDummy.prototype.open_pasori_single = function(){
    return this.pasori_1;
};


var PasoriDummy = function(){};
PasoriDummy.prototype.init = function(){};
PasoriDummy.prototype.reset = function(){};
PasoriDummy.prototype.set_timeout = function(msec){};
PasoriDummy.prototype.close = function(){};
PasoriDummy.prototype.polling = function(system_code, polling_timeslot){
    return new FelicaDummy();
};
PasoriDummy.prototype.get_error_code = function(){
    return 0;
};


var FelicaDummy = function(){};
FelicaDummy.prototype.read_single = function(service_code, p, block_num){
    var data = "01000727__";
    return data;
};
FelicaDummy.prototype.close = function(){};

exports.pafe =  new PafeDummy();
