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
  coap = require('iopa-coap'),
  udp = require('iopa-udp'),
  devices = require('./index.js'),
  IOPA = iopa.constants.IOPA,
  SERVER = iopa.constants.SERVER,
  DEVICE = iopa.constants.DEVICE,
  RESOURCE = iopa.constants.RESOURCE,
     packageVersion = require('./package.json').version;

const cbor = require('cbor');

const iopaMessageLogger = require('iopa-logger').MessageLogger

var app = new iopa.App();
app.use(iopaMessageLogger);
app.use(coap);
app.use(devices);

app.use(function (context, next) {
  context.log.info("[DEMO] DEVICES APP USE " + context["iopa.Method"] + " " + context["iopa.Path"]);
  return next();
});

var server = udp.createServer(app.build());
app.server = server;
 
var device = {};
device[DEVICE.ModelManufacturer] = "Internet of Protocols Alliance";
device[DEVICE.ModelManufacturerUrl] = "http://iopa.io";
device[DEVICE.ModelName] = "npm install iopa-devices";
device[DEVICE.ModelNumber] = "iopa-devices";
device[DEVICE.ModelUrl] = "http://github.com/iopa-io/iopa-devices";

device[DEVICE.PlatformId] = "LOCALHOST";
device[DEVICE.PlatformName] = "Local Host";
device[DEVICE.PlatformFirmware] = packageVersion;
device[DEVICE.PlatformOS] = require('os').release();

device[DEVICE.Id] = "12345-67890";
device[DEVICE.Type] = "urn:io.iopa:demo:devices";
device[DEVICE.Version] = packageVersion;
device[DEVICE.Location] = [37.7833, 122.4167];
device[DEVICE.LocationName] = "San Francisco, USA";
device[DEVICE.Currency] = "USD";
device[DEVICE.Region] = "Home";
Object.defineProperty(device, DEVICE.SystemTime, { get:  function(){return new Date().toISOString();}})
device[DEVICE.Policy] = null;
device[DEVICE.Schemes] = ["coap:", "coaps:"];

device[RESOURCE.TypeName] = "IOPA Demo Projector";
device[RESOURCE.Type] = "urn:io.iopa:resource:projector";
device[RESOURCE.Interface] = "if.switch.binary";
device[RESOURCE.PathName] = "/media/projector";
device[RESOURCE.Name] = "Projector 1";
device[RESOURCE.Value] = false;
app.device.register(device);

if (!process.env.PORT)
  process.env.PORT = iopa.constants.IOPA.PORTS.COAP;
var client;
server.listen(process.env.PORT, process.env.IP)
  .then(function () {
    app.log.info("[DEMO] Server is on port " + server.port);
    return app.device.probe(null, function(device){
      console.log(device);
    });
  })
  