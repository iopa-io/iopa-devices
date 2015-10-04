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
  IopaTCP = require('iopa-tcp'),
  IopaSSDP = require('./iopaSsdp.js'),
  IopaMessageLogger = require('iopa-logger').MessageLogger,
  
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

const THISMIDDLEWARE = { CAPABILITY: "urn:io.iopa:device:upnp.ssdp:server"},
  packageVersion = require('../../package.json').version;
  
const SSDP = {
  CAPABILITY: "urn:io.iopa:ssdp",
  SCHEME: "ssdp:",
  MULTICASTIPV4: '239.255.255.250',
  PORT: 1900,
  MAX_AGE: "max-age=1800",
  TTL: 128,
  MX: 2,
  PROTOCOL: IOPA.PROTOCOLS.HTTP,
  UPNP_ROOTDEVICE: "upnp:rootdevice",
  UPNP_DEVICESCHEMA: "urn:schemas.iopa.io:device:",
  UPNP_SERVICESCHEMA: "urn:schemas.iopa.io:resource:",
  UPNP_UUID: "uuid:",
  UPNP_PROTOCOL: "UPnP/1.0",
  UPNP_IOPA_WELL_KNOWN: "/iopa/upnp",
  UPNP_IOPA_DEVICEXML: "device.xml",
  
  METHODS:
  {
    MSEARCH: "M-SEARCH",
    NOTIFY: "NOTIFY",
    RESPONSE: "RESPONSE"
  },
}

 /**
 * UPNP SSDP IOPA Middleware for Device Discovery Publishing
 *
 * @class DiscoveryServerSSDP
 * @this app.properties  the IOPA AppBuilder Properties Dictionary, used to add server.capabilities
 * @constructor
 * @public
 */
function DiscoveryServerUPNP(app) {
  app.properties[SERVER.Capabilities][THISMIDDLEWARE.CAPABILITY] = {};
  app.properties[SERVER.Capabilities][THISMIDDLEWARE.CAPABILITY][SERVER.Version] = packageVersion;

  //Also register as standard IOPA DISCOVERY SERVER MIDDLEWARE
  app.properties[SERVER.Capabilities][IOPA.CAPABILITIES.DiscoveryServer] = {};
  app.properties[SERVER.Capabilities][IOPA.CAPABILITIES.DiscoveryServer][SERVER.Version] = app.properties[SERVER.Capabilities][IOPA.CAPABILITIES.App][SERVER.Version];

  this._devices = {};
  this._factory = new iopa.Factory();
  this._server = null;
  this._client = null;

  app.device = app.device || {};
  app.device.register = this.register.bind(this, app.device.register || function (device) { return Promise.resolve(device); });
  app.device.unregister = this.register.bind(this, app.device.unregister || function (id) { return Promise.resolve(id); });
  
  this.childApp = new iopa.App();
  this.childApp.use(IopaMessageLogger);
  this.childApp.use(IopaSSDP);
  this.childApp.use(this.invoke.bind(this));
}

/**
 * INVOKE FUNCTIONS 
 */

/**
 * @method invoke
 * @this DiscoveryServerUpnpSSDP 
 * @param context IOPA context properties dictionary
 * @param next the next IOPA AppFunc in pipeline 
 */
DiscoveryServerUPNP.prototype.invoke = function DiscoveryServerUpnpSSDDiscoveryServerSSDP_invoke(context, next) {
  
   if ((context[IOPA.Scheme] === IOPA.SCHEMES.HTTP) 
   && (context[IOPA.Path].indexOf(SSDP.UPNP_IOPA_WELL_KNOWN) === 0) 
   && (context[IOPA.Method] === IOPA.METHODS.GET))
    return this.invokeDEVICEGET(context, next);

  if (context[IOPA.Scheme] !== SSDP.SCHEME)
    return next();

  if (context[IOPA.Method] === SSDP.METHODS.MSEARCH)
    return this.invokeMSEARCH(context, next)

  return next();
}

/* Example 1
 S: uuid:ijklmnop-7dec-11d0-a765-00a0c91e6bf6
 Ext:
 Cache-Control: no-cache="Ext", max-age = 5000
 ST: ge:fridge
 USN: uuid:abcdefgh-7dec-11d0-a765-00a0c91e6bf6
 AL: <blender:ixl><http://foo/bar>
*/

/* Example 2
NOTIFY * HTTP/1.1
HOST: 239.255.255.250:1900
CACHE-CONTROL: max-age=100
LOCATION: http://192.168.1.00:345345/nasdevice.xml
NT: urn:schemas-microsoft-com:service:NULL:1
NTS: ssdp:alive
SERVER: Linux/3.2.26, UPnP/1.0, Portable SDK for UPnP devices/1.6.6
X-User-Agent: redsonic
USN: uuid:12345678-1234-1234-123A-123456789012::urn:schemas-microsoft-com:service:NULL:1
/*

/**
 * @method invokeMSEARCH
 * @this DiscoveryServerIopaWire 
 * @param context IOPA context properties dictionary
 * @param next the next IOPA AppFunc in pipeline 
 */
DiscoveryServerUPNP.prototype.invokeDEVICEGET = function DiscoveryServerSSDP_invokeGET(context, next) {
   console.log(context[IOPA.Path]);
   return Promise.from(null);
}

/**
 * @method invokeMSEARCH
 * @this DiscoveryServerIopaWire 
 * @param context IOPA context properties dictionary
 * @param next the next IOPA AppFunc in pipeline 
 */
DiscoveryServerUPNP.prototype.invokeMSEARCH = function DiscoveryServerSSDP_invokeMSEARCH(context, next) {
 
  for (var id in this._devices) {
    var device = this._devices[id];
      var resource=device[DEVICE.Resources][0];
      var wireItem = {};
      wireItem[IOPA.Headers] = {};  
      wireItem[IOPA.Headers]["S"] = context[IOPA.Headers]["S"];
      wireItem[IOPA.Headers]["ST"] = resource[RESOURCE.Interface];
      wireItem[IOPA.Headers]["USN"] = device[DEVICE.Id];
       wireItem[IOPA.Headers]["LOCATION"] = resource[RESOURCE.PathName];
      context[SERVER.Capabilities][SSDP.CAPABILITY].respond(wireItem);
  }
  
  return Promise.resolve(true);
}

/**
 * LOCAL REGISTRATION FUNCTIONS
 */

/**
* @method register
* @this DiscoveryServerIopaWire 
* @param nextRegister bound to next app.device.register in chain 
* @param device the device context defaults  
*/
DiscoveryServerUPNP.prototype.register = function DiscoveryServerSSDP_register(nextRegister, device) {
 var self = this;

  return this._ensureListening().then(function () {
    if (!(DEVICE.Id in device))
      throw new Error("device id must be specified");

    var id = device[DEVICE.Id];
    if (!(id in self._devices)) {
      self._devices[id] = device;
    }
 
    self._notify(device);
        
    return nextRegister(device);
  });
}

/**
* @method register
* @this DiscoveryServerIopaWire 
* @param nextRegister bound to next app.device.register in chain 
* @param device the device context defaults  
*/
DiscoveryServerUPNP.prototype._notify = function DiscoveryServerSSDP_notify(device) {
   
    var wireItem = WireItem.create(this._client)
    .set("NT", SSDP.UPNP_ROOTDEVICE)
    .set("USN", SSDP.UPNP_UUID + device[DEVICE.Id] + "::" + SSDP.UPNP_ROOTDEVICE)
    .set("SERVER", device[DEVICE.PlatformOS] + ", " + SSDP.UPNP_PROTOCOL + ", " + device[DEVICE.PlatformName] + "/" + device[DEVICE.PlatformFirmware])
    .set("LOCATION",  IOPA.SCHEMES.HTTP + "//" + this._client[SERVER.LocalAddress] + ":" + this._client[SERVER.LocalPort] + SSDP.UPNP_IOPA_WELL_KNOWN + "/" + device[DEVICE.Id] + "/" + SSDP.UPNP_IOPA_DEVICEXML)
    .sendAlive()
    .set("NT", SSDP.UPNP_UUID + device[DEVICE.Id])
    .set("USN", SSDP.UPNP_UUID + device[DEVICE.Id])
    .sendAlive()
    .set("NT", SSDP.UPNP_DEVICESCHEMA + device[DEVICE.Type])
    .set("USN", SSDP.UPNP_UUID + device[DEVICE.Id] + "::" + SSDP.UPNP_DEVICESCHEMA + device[DEVICE.Type] )
    .sendAlive();
    
    device[DEVICE.Resources].forEach(function(resource){
        wireItem
         .set("NT", SSDP.UPNP_SERVICESCHEMA + resource[RESOURCE.Type])
         .set("USN", SSDP.UPNP_UUID + device[DEVICE.Id] + "::" + SSDP.UPNP_SERVICESCHEMA + resource[RESOURCE.Type] )
         .sendAlive()
     })
}

/**
 * @method register
 * @this DiscoveryServerIopaWire 
 * @param nextRegister bound to next app.device.register in chain 
 * @param device the device context defaults  
 */
DiscoveryServerUPNP.prototype.unregister = function DiscoveryServerSSDP_unregister(nextUnregister, id) {
   var device = this._devices[id];
  if (id in this._devices) {
    delete this._devices[id];
  }
 
  var resource=device[DEVICE.Resources][0];
  WireItem.create(this._client)
  .set("ST", resource[RESOURCE.Interface])
  .set("USN", device[DEVICE.Id])
  .set("LOCATION",  device[DEVICE.Url])
  .sendBye()
     
  return nextUnregister(id);
} 

/**
 * Utility Method to ensure transport in place
 */

/**
* @method _ensureListening
* @this DiscoveryServerIopaWire 
*/
DiscoveryServerUPNP.prototype._ensureListening = function DiscoveryServerSSDP_ensureListening() {
  var that = this;
  if (!this._server) {
    this._server = IopaUDP.createServer({}, this.childApp.build());
     return this._server.listen(0, null, {
        "server.MulticastPort": SSDP.PORT,
        "server.MulticastAddress": SSDP.MULTICASTIPV4
      })
      .then(function(linfo){
          return that._server.connect("ssdp://" + SSDP.MULTICASTIPV4 + ":" + SSDP.PORT)
      })
      .then(function(client){
        that._client = client;
        return null;
      }
      );
  }
  else return Promise.resolve(null);
}


module.exports = DiscoveryServerUPNP

function WireItem(client){
  this.client = client;
  this.context = {};
  this.context[IOPA.Headers] = {};
}

WireItem.create = function(client){
    return new WireItem(client);
}

WireItem.prototype.set = function(key, value){
    this.context[IOPA.Headers][key] = value;
     
  return this;
}

WireItem.prototype.sendAlive = function(){
  this.client[SERVER.Capabilities][SSDP.CAPABILITY].alive(this.context);
  return this;
}

WireItem.prototype.sendBye = function(){
  this.client[SERVER.Capabilities][SSDP.CAPABILITY].bye(this.context);
   return this;
}

WireItem.prototype.sendUpdate = function(){
  this.client[SERVER.Capabilities][SSDP.CAPABILITY].update(this.context);
   return this;
}

WireItem.prototype.sendSearch = function(){
  this.client[SERVER.Capabilities][SSDP.CAPABILITY].search(this.context);
   return this;
}