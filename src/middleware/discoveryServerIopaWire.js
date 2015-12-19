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
  querystring = require('querystring');

const constants = iopa.constants,
  IOPA = constants.IOPA,
  SERVER = constants.SERVER,
  DEVICE = constants.DEVICE,
  RESOURCE = constants.RESOURCE,
  WIRE = require('../common/constants.js').WIRE,
  WIRECAPABILITY = require('../common/constants.js').WIRECAPABILITY,
  DEVICESMIDDLEWARE = require('../common/constants.js').DEVICESMIDDLEWARE

var db_Devices = {};

const THISMIDDLEWARE = { CAPABILITY: "urn:io.iopa:device:wire:discovery:server", UdpServer: "discovery.UdpServer" },
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
function DiscoveryServerIopaWire(app) {
  if (!app.properties[SERVER.Capabilities][IOPA.CAPABILITIES.Udp])
    throw ("Missing Dependency: UDP Server/Middleware in Pipeline");

  if (!app.properties[SERVER.Capabilities][DEVICESMIDDLEWARE.CAPABILITY])
    throw ("Missing Dependency: IOPA Devices Server/Middleware in Pipeline");

  app.properties[SERVER.Capabilities][THISMIDDLEWARE.CAPABILITY] = {};
  app.properties[SERVER.Capabilities][THISMIDDLEWARE.CAPABILITY][SERVER.Version] = packageVersion;

  //Also register as standard IOPA DISCOVERY SERVER MIDDLEWARE
  app.properties[SERVER.Capabilities][IOPA.CAPABILITIES.DiscoveryServer] = {};
  app.properties[SERVER.Capabilities][IOPA.CAPABILITIES.DiscoveryServer][SERVER.Version] = app.properties[SERVER.Capabilities][IOPA.CAPABILITIES.App][SERVER.Version];

  this.app = app;
  this._devices = {};
  this._factory = new iopa.Factory();
  this._server = null;

  app.device = app.device || {};
  app.device.register = this.register.bind(this, app.device.register || function (device) { return Promise.resolve(device); });
  app.device.unregister = this.register.bind(this, app.device.unregister || function (id) { return Promise.resolve(id); });
}

/**
* @method register
* @this DiscoveryServerIopaWire 
* @param nextRegister bound to next app.device.register in chain 
* @param device the device context defaults  
*/
DiscoveryServerIopaWire.prototype.register = function DiscoveryServerIopaWire_register(nextRegister, device) {
 var self = this;

  return this._ensureListening().then(function () {
    if (!(DEVICE.Id in device))
      throw new Error("device id must be specified");

    var id = device[DEVICE.Id];
    if (!(id in self._devices)) {
      self._devices[id] = device;
    }
    // else silently ignore;
        
        
    return nextRegister(device);
  });
}

/**
* @method _ensureListening
* @this DiscoveryServerIopaWire 
*/
DiscoveryServerIopaWire.prototype._ensureListening = function DiscoveryServerIopaWire_ensureListening() {
  if (!this._server) {
    this._server = this.app.getServer("udp:", IOPA.PORTS.COAP);

    if (!this._server) {
      this._server = this.app.createServer("udp:");
      return this._server.listen(IOPA.PORTS.COAP, null, {
        "server.MulticastPort": IOPA.PORTS.COAP,
        "server.MulticastAddress": iopa.constants.COAP.MULTICASTIPV4
      });
    } else return Promise.resolve(null);
  }
  else
    return Promise.resolve(null);
}

/**
 * @method register
 * @this DiscoveryServerIopaWire 
 * @param nextRegister bound to next app.device.register in chain 
 * @param device the device context defaults  
 */
DiscoveryServerIopaWire.prototype.unregister = function DiscoveryServerIopaWire_unregister(nextUnregister, id) {

  if (id in this._devices) {
    delete this._devices[id];
  }
  // else silently ignore;
     
  return nextUnregister(id);
} 


/**
 * @method invoke
 * @this DiscoveryServerIopaWire 
 * @param context IOPA context properties dictionary
 * @param next the next IOPA AppFunc in pipeline 
 */
DiscoveryServerIopaWire.prototype.invoke = function DiscoveryServerIopaWire_invoke(context, next) {
  
  if (context[IOPA.Method] !== IOPA.METHODS.GET)
    return next();

  if (context[IOPA.Path] === DISCOVERYURL)
    return this.invokeDiscover(context, next)

  if (context[IOPA.Path] === DEVICEURL)
    return this.invokeDevice(context, next)

  return next();
}

/**
 * @method invokeDiscover
 * @this DiscoveryServerIopaWire 
 * @param context IOPA context properties dictionary
 * @param next the next IOPA AppFunc in pipeline 
 */
DiscoveryServerIopaWire.prototype.invokeDiscover = function DiscoveryServerIopaWire_invokeDiscover(context, next) {
  var payload = [];

  for (var id in this._devices) {
    var device = this._devices[id];
    var wireItem = toWire(device, [DEVICE.Id]);
    var resources = [];
      device[DEVICE.Resources].forEach(function(resource){
         resources.push(toWire(resource, [
              RESOURCE.PathName,
              RESOURCE.Type,
              RESOURCE.Interface,
              RESOURCE.Policy,
              RESOURCE.Name,
              RESOURCE.TypeName
            ]));
      })
      wireItem[WIRE[DEVICE.Resources]] = resources;
     payload.push(wireItem);
  }

  context.response[IOPA.Body].end(payload);

  return Promise.resolve(true);
}

/**
 * @method invokeDiscover
 * @this DiscoveryServerIopaWire 
 * @param context IOPA context properties dictionary
 * @param next the next IOPA AppFunc in pipeline 
 */
DiscoveryServerIopaWire.prototype.invokeDevice = function DiscoveryServerIopaWire_invokeDevice(context, next) {
  var id = querystring.parse(context[IOPA.QueryString]).id;

  var device = this._devices[id];
  if (!device)
    return next();

  var wireItem = toWire(device, [
    DEVICE.Id,
    RESOURCE.PathName,
    DEVICE.ModelManufacturer,
    DEVICE.ModelManufacturerUrl,
    DEVICE.ModelName,
    DEVICE.ModelNumber,
    DEVICE.ModelUrl,
    DEVICE.PlatformDate,
    DEVICE.PlatformFirmware,
    DEVICE.PlatformHardware,
    DEVICE.PlatformId,
    DEVICE.PlatformName,
    DEVICE.PlatformOS,
    DEVICE.Type,
    DEVICE.Version,
    DEVICE.Location,
    DEVICE.LocationName,
    DEVICE.Currency,
    DEVICE.Region,
    DEVICE.SystemTime,
    DEVICE.Schemes]
    );

  context.response[IOPA.Body].end(wireItem);

  return Promise.resolve(true);
}

module.exports = DiscoveryServerIopaWire;


/* ****
 * Helper Methods
 * */

function toWire(source, list) {
  var target = {};
  list.forEach(function (key) {
    if (key in source && (source[key] !== null))
      target[WIRE[key]] = source[key];
  });
  return target;
}

