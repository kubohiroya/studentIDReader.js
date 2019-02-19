/*
  FeliCa Student ID card reader to check attendee
  Copyright (c) 2013 Hiroya Kubo <hiroya@cuc.ac.jp>

  Permission is hereby granted, free of charge, to any person obtaining
  a copy of this software and associated documentation files (the
  "Software"), to deal in the Software without restriction, including
  without limitation the rights to use, copy, modify, merge, publish,
  distribute, sublicense, and/or sell copies of the Software, and to
  permit persons to whom the Software is furnished to do so, subject to
  the following conditions:

  The above copyright notice and this permission notice shall be
  included in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
  LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
  OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
  WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/* jslint node: true */
"use strict";

var Class = require('../lib/class.js').Class;

var EventObservers = Class.create(Array, {
    initialize: function(){
    },
    update: function(ev){
        this.forEach(function(ob){
            ob.update(ev);
        });
    }
});

// device event

var DeviceEvent = Class.create({
    initialize: function(deviceIndex, option){
        this.deviceIndex = deviceIndex;
        this.option = option;
    }
});

var DeviceStartEvent = Class.create(DeviceEvent, {
    initialize: function(deviceIndex){
        DeviceEvent.call(this, deviceIndex, {'command':'start'});
    }
});

var DeviceErrorEvent = Class.create(DeviceEvent, {
    initialize: function(deviceIndex, errorCode, errorMessage){
        DeviceEvent.call(this, deviceIndex, {'command':'error'});
        this.errorCode = errorCode;
        this.errorMessage = errorMessage;
    }
});


// RFID read event

var ReadPollingEvent = Class.create(DeviceEvent, {
    initialize: function(deviceIndex){
        DeviceEvent.call(this, deviceIndex, {'command':'polling'});
    }
});

var ReadIdleEvent = Class.create(DeviceEvent, {
    initialize: function(deviceIndex){
        DeviceEvent.call(this, deviceIndex, {'command':'idle'});
    }
});

var ReadDataEvent = Class.create(DeviceEvent, {
    initialize: function(deviceIndex, data){
        DeviceEvent.call(this, deviceIndex, {'command':'read'});
        this.data = data;
    }
});


// domain logic -- phase 1

var ReadUserIDEvent = Class.create(DeviceEvent, {
    initialize: function(deviceIndex, userID, time, option){
        DeviceEvent.call(this, deviceIndex, option);
        this.userID = userID;
        this.time = time;
    }
});

var InvalidUserIDEvent = Class.create(ReadUserIDEvent, {
    initialize: function(deviceIndex, userID, time, option){
        ReadUserIDEvent.call(this, deviceIndex, userID, time, option);
    }
});


// domain logic -- phase 2

var StudentAttendEvent = Class.create(ReadUserIDEvent, {
    initialize: function(deviceIndex, userID, time, lectureID, option){
        ReadUserIDEvent.call(this, deviceIndex, userID, time, option);
        this.lectureID = lectureID;
    }
});

var TeacherConfigGestureEvent = Class.create(ReadUserIDEvent, {
    initialize: function(deviceIndex, userID, lectureID, time, option){
        ReadUserIDEvent.call(this, deviceIndex, userID, time, option);
        this.lectureID = lectureID;
    }
});


// domain logic -- wrapp context

var EventWrapperEvent = Class.create({
    initialize: function(event){
        this.event = event;
    }
});

var ImplicitlyIgnoranceEvent = Class.create(EventWrapperEvent, {
    initialize: function(event){
        EventWrapperEvent.call(this, event);
    }
});

var ExplicitlyIgnoranceEvent = Class.create(EventWrapperEvent, {
    initialize: function(event){
        EventWrapperEvent.call(this, event);
    }
});


// disk store event

var StoreEvent = Class.create(EventWrapperEvent, {
    initialize: function(event){
        EventWrapperEvent.call(this, event);
    }
});

var ReadEvent = Class.create(EventWrapperEvent, {
    initialize: function(event){
        EventWrapperEvent.call(this, event);
    }
});

var UpdateViewEvent = Class.create(EventWrapperEvent, {
    initialize: function(event){
        EventWrapperEvent.call(this, event);
    }
});

module.export.DeviceStartEvent = DeviceStartEvent;
module.export.ReadPollingEvent = ReadPollingEvent;
module.export.ReadIdleEvent = ReadIdleEvent;
module.export.ReadDataEvent = ReadDataEvent;
module.export.DeviceErrorEvent = DeviceErrorEvent;
module.export.ReadUserIDEvent = ReadUserIDEvent;
module.export.InvalidUserIDEvent = InvalidUserIDEvent;

module.export.StudentAttendEvent = StudentAttendEvent;
module.export.TeacherConfigGestureEvent = TeacherConfigGestureEvent;
module.export.ImplicitlyIgnoranceEvent = ImplicitlyIgnoranceEvent;
module.export.ExplicitlyIgnoranceEvent = ExplicitlyIgnoranceEvent;

module.export.StoreEvent = StoreEvent;
module.exports.ReadEvent = ReadEvent;
module.exports.UpdateViewEvent = UpdateViewEvent;



