/*
 * Copyright (c) 2015 Internet of Protocols Alliance (IOPA)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
global.Promise = require('bluebird');

const iopa = require('iopa'),
    util = require('util'),
    EventEmitter = require('events').EventEmitter,
    coap = require('iopa-coap'),
    udp = require('iopa-udp');
   
var should = require('should');

var numberConnections = 0;

const iopaMessageLogger = require('iopa-logger').MessageLogger

describe('#CoAP Server()', function() {
  
  var server, coapClient;
  var events = new EventEmitter();

  before(function (done) {

    var app = new iopa.App();

    app.use(iopaMessageLogger);
    app.use(coap);

    app.use(function (context, next) {
      context.log.info("[TEST] SERVER APP USE " + context["iopa.Method"] + " " + context["iopa.Path"]);

      if (context["iopa.Headers"]['Observe']) {
        process.nextTick(function(){
          app["pubsub.Publish"]("/projector", new Buffer("Hello World2"));});
        setTimeout(function () {
          events.emit("data2", context);
        }, 40);
      } else {
        context.response["iopa.Body"].end("Hello World");
        setTimeout(function () {
          events.emit("data", context);
        }, 40);
      }
     return next();

   });
                                 
    server = udp.createServer(app.build());
  
    if (!process.env.PORT)
      process.env.PORT = iopa.constants.IOPA.PORTS.COAP;

    server.listen(process.env.PORT, process.env.IP).then(function () {
      done();
      setTimeout(function () { events.emit("SERVER-UDP"); }, 50);
    });
    
  });
    
   it('should listen via UDP', function(done) {   
           server.port.should.equal(5683);
           done();
    });
    
         
   it('should connect via UDP', function (done) {
     server.connect("coap://127.0.0.1")
       .then(function (cl) {
         coapClient = cl;
         coapClient["server.RemotePort"].should.equal(5683);
         done();
       });
   });

   it('should GET via IOPA-DEVICES', function (done) {
     coapClient.send("/projector", "GET")
       .then(function (response) {
         response.log.info("[TEST] /projector RESPONSE " + response["iopa.Body"].toString());
         response["iopa.Method"].should.equal('2.05');
         response["iopa.Body"].toString().should.equal('Hello World');
         done();
       });
   });
    
   it('should respond with state via IOPA-DEVICES', function (done) {
     events.once("data", function (context) {
       done();
     });
   });

   it('should SUBSCRIBE via IOPA-DEVICES', function (done) {
     coapClient["pubsub.Subscribe"]("/projector", function (response) {
       response.log.info("[TEST] /projector RESPONSE " + response["iopa.Body"].toString());
       response["iopa.Method"].should.equal('2.05');
       response["iopa.Body"].toString().should.equal('Hello World2');
       done();
     });
   });

   it('should PUBLISH state via IOPA-DEVICES', function (done) {
     events.once("data2", function (context) {
       done();
     });
   });  
    
   it('should close', function(done) {
       server.close().then(function(){
         console.log("[TEST] Server Closed");
         done();});
    });
    
});
