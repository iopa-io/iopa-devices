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

const iopa = require('iopa'),
      cbor = require('cbor'),
      querystring = require('querystring');

const constants = iopa.constants,
  IOPA = constants.IOPA,
  SERVER = constants.SERVER,
  DEVICE = constants.DEVICE,
  RESOURCE = constants.RESOURCE,
  WIRE = require('../common/constants.js').WIRE,
  FROMWIRE = require('../common/constants.js').FROMWIRE,
  WIRECAPABILITY = require('../common/constants.js').WIRECAPABILITY,
  DEVICESMIDDLEWARE = require('../common/constants.js').DEVICESMIDDLEWARE
  
 var db_Devices = {};
 
  const THISMIDDLEWARE = {CAPABILITY: "urn:io.iopa:device:wire:discovery:client"},
    packageVersion = require('../../package.json').version;
     
     
const DISCOVERYURL = WIRE.WELLKNOWN[DEVICE.WELLKNOWN.PathBase] + WIRE.WELLKNOWN[DEVICE.WELLKNOWN.Resources];
const DEVICEURL = WIRE.WELLKNOWN[DEVICE.WELLKNOWN.PathBase] + WIRE.WELLKNOWN[DEVICE.WELLKNOWN.Device];
 
/**
 * CoAP IOPA Middleware for Managing Server Sessions including Auto Subscribing Client Subscribe Requests
 *
 * @class CoAPSubscriptionClient
 * @this app.properties  the IOPA AppBuilder Properties Dictionary, used to add server.capabilities
 * @constructor
 * @public
 */
function DiscoveryClientIopaWire(app) {
  if (!app.properties[SERVER.Capabilities][DEVICESMIDDLEWARE.CAPABILITY])
    throw ("Missing Dependency: IOPA Devices Server/Middleware in Pipeline");

  app.properties[SERVER.Capabilities][THISMIDDLEWARE.CAPABILITY] = {};
  app.properties[SERVER.Capabilities][THISMIDDLEWARE.CAPABILITY][SERVER.Version] = packageVersion;

 //Also register as standard IOPA DISCOVERY CLIENT MIDDLEWARE
  app.properties[SERVER.Capabilities][IOPA.CAPABILITIES.DiscoveryClient] = {};
  app.properties[SERVER.Capabilities][IOPA.CAPABILITIES.DiscoveryClient][SERVER.Version] = app.properties[SERVER.Capabilities][IOPA.CAPABILITIES.App][SERVER.Version];

  this.app = app;
  // this._devices = {};
  this._factory = new iopa.Factory();
 
  app.device = app.device || {};
  app.device.probe = this.probe.bind(this, app.device.probe || function(query, cb){return Promise.resolve(null);});
  app.device.resolve = this.resolve.bind(this, app.device.resolve || function(id, cb){return Promise.resolve(null);});
 }
 
 /**
 * @method probe
 * @this DiscoveryClientIopaWire 
 * @param nextProbe bound to next app.device.probe in chain 
 * @param device the device context defaults  
 */
DiscoveryClientIopaWire.prototype.probe = function DiscoveryClientIopaWire_probe(nextProbe, query, cb){
  var client;
   this.server = this.app.server;
   var deviceContext = this._factory._create();

  this.server.connect("coap://127.0.0.1", this.app[SERVER.AppId], false).then(function (cl) {
    client = cl;
    return client.send('/.iopa/resources');
  })
  .then(function(response) {
    var device = fromWire(response[IOPA.Body].read()[0]);
    iopa.util.shallow.merge(deviceContext, device);
    console.log(device);
    return client.send('/.iopa/device?id=' + device[DEVICE.Id]);
  })
  .then(function(response) {
    var deviceDetail = fromWire(response[IOPA.Body].read());
    iopa.util.shallow.merge(deviceContext, deviceDetail);
    cb(deviceContext);
  });
  
  return nextProbe(query, cb);  
} 

 /**
 * @method resolve
 * @this DiscoveryClientIopaWire 
 * @param nextResolve bound to next app.device.resolve in chain 
 * @param device the device context defaults  
 */
DiscoveryClientIopaWire.prototype.resolve = function DiscoveryClientIopaWire_probe(nextResolve, id, cb){
  return nextResolve(id, cb);
} 

module.exports = DiscoveryClientIopaWire;


/* ****
 * Helper Methods
 * */

function fromWire(source){
  var target = {};
  for (var key in source){  
   if (source.hasOwnProperty(key)  && (source[key] !== null))
      target[FROMWIRE[key]] = source[key];
  };
  return target;
}