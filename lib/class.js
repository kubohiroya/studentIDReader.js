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

var Class = function(superclass, definition) {
    return Class.create(superclass, definition);
};

Class.create = function(superclass, definition) {
    if (arguments.length === 0) {
        return Class.create(Object, definition);
    } else if (arguments.length == 1 && typeof arguments[0] != 'function') {
        return Class.create(Object, arguments[0]);
    }

    for (var prop in definition) if (definition.hasOwnProperty(prop)) {
        if (Object.getPrototypeOf(definition[prop]) == Object.prototype) {
            if (!('enumerable' in definition[prop])) definition[prop].enumerable = true;
        } else {
            definition[prop] = { value: definition[prop], enumerable: true, writable: true };
        }
    }
    var Constructor = function() {
        if (this instanceof Constructor) {
            Constructor.prototype.initialize.apply(this, arguments);
        } else {
            return new Constructor();
        }
    };
    Constructor.prototype = Object.create(superclass.prototype, definition);
    Constructor.prototype.constructor = Constructor;
    if (Constructor.prototype.initialize === null) {
        Constructor.prototype.initialize = function() {
            superclass.apply(this, arguments);
        };
    }
    return Constructor;
};

Function.prototype.curry = function() {
  var fn = this;
  var args = [].slice.call(arguments, 0);
  return function() {
    return fn.apply(this, args.concat([].slice.call(arguments, 0)));
  };
};

exports.Class = Class;


/*
@example

var Point2D = Class.create({
    initialize: function(x, y){
        this.x = x;
        this.y = y;
    }
});

var Point3D = Class.create(Point2D,{
    initialize: function(x, y, z){
        Point2D.call(this, x, y);
        this.z = z;
    }
});

var a = new Point3D(1, 0, 2);
console.log(a);

/////

var asColored = (function(){
    return function(options){
        this.color = options['color'];
        return this;
    }
})();

var ColoredPoint =

*/