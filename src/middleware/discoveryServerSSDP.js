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
  IopaUDP = require('iopa-udp'),
  IopaTCP = require('iopa-tcp'),
  IopaSSDP = require('./iopaSsdp.js'),
  IopaHTTP = require('iopa-http'),
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
function DiscoveryServerSSDP(app) {
  app.properties[SERVER.Capabilities][THISMIDDLEWARE.CAPABILITY] = {};
  app.properties[SERVER.Capabilities][THISMIDDLEWARE.CAPABILITY][SERVER.Version] = packageVersion;

  //Also register as standard IOPA DISCOVERY SERVER MIDDLEWARE
  app.properties[SERVER.Capabilities][IOPA.CAPABILITIES.DiscoveryServer] = {};
  app.properties[SERVER.Capabilities][IOPA.CAPABILITIES.DiscoveryServer][SERVER.Version] = app.properties[SERVER.Capabilities][IOPA.CAPABILITIES.App][SERVER.Version];

  this._devices = {};
  this._factory = new iopa.Factory();
  this._SSDPserver = null;
  this._HTTPserver = null;
 
  this._SSDPclient = null;

  app.device = app.device || {};
  app.device.register = this.register.bind(this, app.device.register || function (device) { return Promise.resolve(device); });
  app.device.unregister = this.register.bind(this, app.device.unregister || function (id) { return Promise.resolve(id); });
  
  this.ssdpApp = new iopa.App();
  this.ssdpApp.use(IopaUDP);
  this.ssdpApp.use(IopaSSDP);
    this.ssdpApp.use(IopaMessageLogger);

  this.ssdpApp.use(this.invoke.bind(this));
  
  this.httpApp = new iopa.App();
  this.httpApp.use(IopaTCP);
  this.httpApp.use(IopaMessageLogger);
  this.httpApp.use(IopaHTTP);
  this.httpApp.use(this.invoke.bind(this));
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
DiscoveryServerSSDP.prototype.invoke = function DiscoveryServerUpnpSSDDiscoveryServerSSDP_invoke(context, next) {
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
DiscoveryServerSSDP.prototype.invokeDEVICEGET = function DiscoveryServerSSDP_invokeGET(context, next) {
  context.response["iopa.Body"].end("<HTML><HEAD></HEAD><BODY>Hello World</BODY>");
  return Promise.resolve(null);
}

/**
 * @method invokeMSEARCH
 * @this DiscoveryServerIopaWire 
 * @param context IOPA context properties dictionary
 * @param next the next IOPA AppFunc in pipeline 
 */
DiscoveryServerSSDP.prototype.invokeMSEARCH = function DiscoveryServerSSDP_invokeMSEARCH(context, next) {
 
  for (var id in this._devices) {
    var device = this._devices[id];
      var resource=device[DEVICE.Resources][0];
      
      WireItem.create(context)
        .set(IOPA.StatusCode, 200)
        .set(IOPA.ReasonPhrase, "OK")
        .set(IOPA.Method, null)
        .set(SERVER.IsRequest, false)
        .setHeader("S", context.getHeader("S"))
        .setHeader("ST", resource[RESOURCE.Interface])
        .setHeader("USN", device[DEVICE.Id])
        .setHeader("LOCATION", IOPA.SCHEMES.HTTP + "//" + this._HTTPserver[SERVER.LocalAddress] + ":" + this._HTTPserver[SERVER.LocalPort] + SSDP.UPNP_IOPA_WELL_KNOWN + "/" + device[DEVICE.Id] + "/" + SSDP.UPNP_IOPA_DEVICEXML)
        .setHeader("SERVER", device[DEVICE.PlatformOS] + ", " + SSDP.UPNP_PROTOCOL + ", " + device[DEVICE.PlatformName] + "/" + device[DEVICE.PlatformFirmware])
       .sendResponse();
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
DiscoveryServerSSDP.prototype.register = function DiscoveryServerSSDP_register(nextRegister, device) {
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
DiscoveryServerSSDP.prototype._notify = function DiscoveryServerSSDP_notify(device) {
   
    var wireItem = WireItem.create(this._SSDPclient)
    .setHeader("NT", SSDP.UPNP_ROOTDEVICE)
    .setHeader("USN", SSDP.UPNP_UUID + device[DEVICE.Id] + "::" + SSDP.UPNP_ROOTDEVICE)
    .setHeader("SERVER", device[DEVICE.PlatformOS] + ", " + SSDP.UPNP_PROTOCOL + ", " + device[DEVICE.PlatformName] + "/" + device[DEVICE.PlatformFirmware])
    .setHeader("LOCATION",  IOPA.SCHEMES.HTTP + "//" + this._HTTPserver[SERVER.LocalAddress] + ":" + this._HTTPserver[SERVER.LocalPort] + SSDP.UPNP_IOPA_WELL_KNOWN + "/" + device[DEVICE.Id] + "/" + SSDP.UPNP_IOPA_DEVICEXML)
    .sendAlive()
    .setHeader("NT", SSDP.UPNP_UUID + device[DEVICE.Id])
    .setHeader("USN", SSDP.UPNP_UUID + device[DEVICE.Id])
    .sendAlive()
    .setHeader("NT", SSDP.UPNP_DEVICESCHEMA + device[DEVICE.Type])
    .setHeader("USN", SSDP.UPNP_UUID + device[DEVICE.Id] + "::" + SSDP.UPNP_DEVICESCHEMA + device[DEVICE.Type] )
    .sendAlive();
    
    device[DEVICE.Resources].forEach(function(resource){
        wireItem
         .setHeader("NT", SSDP.UPNP_SERVICESCHEMA + resource[RESOURCE.Type])
         .setHeader("USN", SSDP.UPNP_UUID + device[DEVICE.Id] + "::" + SSDP.UPNP_SERVICESCHEMA + resource[RESOURCE.Type] )
         .sendAlive()
     })
}

/**
 * @method register
 * @this DiscoveryServerIopaWire 
 * @param nextRegister bound to next app.device.register in chain 
 * @param device the device context defaults  
 */
DiscoveryServerSSDP.prototype.unregister = function DiscoveryServerSSDP_unregister(nextUnregister, id) {
   var device = this._devices[id];
  if (id in this._devices) {
    delete this._devices[id];
  }
 
  var resource=device[DEVICE.Resources][0];
  WireItem.create(this._SSDPclient)
  .setHeader("ST", resource[RESOURCE.Interface])
  .setHeader("USN", device[DEVICE.Id])
  .setHeader("LOCATION",  device[DEVICE.Url])
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
DiscoveryServerSSDP.prototype._ensureListening = function DiscoveryServerSSDP_ensureListening() {
  var that = this;
  if (!this._SSDPserver) {    

    this._SSDPserver = this.ssdpApp.createServer("udp:");
    this._HTTPserver = this.httpApp.createServer("tcp:");
    return this._HTTPserver.listen()
      .then(function (linfo) {
        that._SSDPserver.listen(0, null, {"server.MulticastPort": (SSDP.PORT), "server.MulticastAddress": SSDP.MULTICASTIPV4});  })
      .then(function () { return that._SSDPserver.connect("ssdp://" + SSDP.MULTICASTIPV4 + ":" + (SSDP.PORT).toString() ) })
      .then(function (client) {  that._SSDPclient = client;  } );
  }
  else return Promise.resolve(null);
}


module.exports = DiscoveryServerSSDP

function WireItem(transportContext) {
  this.transportContext = transportContext;
  this.context = {};
  this.context[IOPA.Headers] = {};
}

WireItem.create = function (transportContext) {
  return new WireItem(transportContext);
}


WireItem.prototype.set = function (key, value) {
  this.context[key] = value;
  return this;
}

WireItem.prototype.setHeader = function (key, value) {
  this.context[IOPA.Headers][key] = value;
  return this;
}

WireItem.prototype.sendAlive = function () {
  this.transportContext[SERVER.Capabilities][SSDP.CAPABILITY].alive(this.context);
  return this;
}

WireItem.prototype.sendBye = function () {
  this.transportContext[SERVER.Capabilities][SSDP.CAPABILITY].bye(this.context);
  return this;
}

WireItem.prototype.sendUpdate = function () {
  this.transportContext[SERVER.Capabilities][SSDP.CAPABILITY].update(this.context);
  return this;
}

WireItem.prototype.sendSearch = function () {
  this.transportContext[SERVER.Capabilities][SSDP.CAPABILITY].search(this.context);
  return this;
}

WireItem.prototype.sendResponse = function () {
  this.transportContext[SERVER.Capabilities][SSDP.CAPABILITY].respond(this.context);
}