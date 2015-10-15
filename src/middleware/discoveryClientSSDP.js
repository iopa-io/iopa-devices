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
  IopaCache = require('iopa-common-middleware').Cache,
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

const THISMIDDLEWARE = { CAPABILITY: "urn:io.iopa:device:upnp.ssdp:client"},
  packageVersion = require('../../package.json').version;
  
const SSDP = {
  CAPABILITY: "urn:io.iopa:ssdp",
  SCHEME: "ssdp:",
  MULTICASTIPV4: '239.255.255.250',
  PORT: 1901,
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

const CACHE = {CAPABILITY: "urn:io.iopa:cache",
     DONOTCACHE: "cache.DoNotCache",
     MATCHANYHOST: "cache.MatchAnyHost"
      }

 /**
 * UPNP SSDP IOPA Middleware for Device Discovery Publishing
 *
 * @class DiscoveryServerSSDP
 * @this app.properties  the IOPA AppBuilder Properties Dictionary, used to add server.capabilities
 * @constructor
 * @public
 */
function DiscoveryClientSSDP(app) {
  app.properties[SERVER.Capabilities][THISMIDDLEWARE.CAPABILITY] = {};
  app.properties[SERVER.Capabilities][THISMIDDLEWARE.CAPABILITY][SERVER.Version] = packageVersion;

  //Also register as standard IOPA DISCOVERY SERVER MIDDLEWARE
  app.properties[SERVER.Capabilities][IOPA.CAPABILITIES.DiscoveryServer] = {};
  app.properties[SERVER.Capabilities][IOPA.CAPABILITIES.DiscoveryServer][SERVER.Version] = app.properties[SERVER.Capabilities][IOPA.CAPABILITIES.App][SERVER.Version];

  this._seq = 0;
  this._factory = new iopa.Factory();
  this._SSDPserver = null;
  this._SSDPclient = null;
  this._HTTPClient = null;
  
  this.id = app.properties[SERVER.AppId] + ":";
  this.seq = 0;

  app.device = app.device || {};
  app.device.probe = this.probe.bind(this, app.device.probe || function(query, cb){return Promise.resolve(null);});
  
  this.ssdpApp = new iopa.App();
  this.ssdpApp.use(IopaUDP);
  this.ssdpApp.use(IopaSSDP);
  this.ssdpApp.use(IopaCache.Match);
    this.ssdpApp.use(IopaCache.Cache);
 this.ssdpApp.use(IopaMessageLogger);

 
  this.ssdpApp.use(this.invoke.bind(this));
  
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
DiscoveryClientSSDP.prototype.invoke = function DiscoveryClientSSDP_invoke(context, next) {
   if (context[IOPA.Scheme] !== SSDP.SCHEME)
    return next();

  if (context[IOPA.Method] === SSDP.METHODS.MSEARCH)
    return next();
    
    
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
 * DISCOVERY FUNCTIONS
 */

/**
 * @method probe
 * @this DiscoveryClientIopaWire 
 * @param nextProbe bound to next app.device.probe in chain 
 * @param device the device context defaults  
 */
DiscoveryClientSSDP.prototype.probe = function DiscoveryClientIopaWire_probe(nextProbe, query, cb){
  if (typeof query == "function"){
      cb = query;
      query = "";
  }
  var self = this;
  return this._ensureListening().then(function () {
     return self._search(query, function(response) {
         var deviceContext = self._factory._create();
         deviceContext[SERVER.RemoteAddress] = response[SERVER.RemoteAddress];
         deviceContext[SERVER.RemotePort] = response [SERVER.RemotePort];
         deviceContext[DEVICE.Uri] = response.getHeader("LOCATION");
         deviceContext[DEVICE.Id] = response.getHeader("USN");
         deviceContext[DEVICE.Resources] = {};
         deviceContext[DEVICE.Resources][RESOURCE.Interface] = response.getHeader("ST");
         cb(deviceContext);
     });
  });
        
    return nextProbe(query, cb);
 } 
 
     
/**
* @method register
* @this DiscoveryServerIopaWire 
* @param nextRegister bound to next app.device.register in chain 
* @param device the device context defaults  
*/
DiscoveryClientSSDP.prototype._search = function DiscoveryServerSSDP_notify(query, callback) {
    WireItem.create(this._SSDPclient)
    .setHeader("ST", query)
    .setHeader("S", this.id + this.seq++ )
    .sendSearch(callback);
}

/**
 * Utility Method to ensure transport in place
 */

/**
* @method _ensureListening
* @this DiscoveryServerIopaWire 
*/
DiscoveryClientSSDP.prototype._ensureListening = function DiscoveryClientSSDP_ensureListening() {
  var that = this;
  if (!this._SSDPserver) {    

    this._SSDPserver = this.ssdpApp.createServer("udp:");
  //  this._HTTPClient = this.httpApp.createServer("tcp:");
    return this._SSDPserver.listen(0, null, {"server.MulticastPort": (SSDP.PORT), "server.MulticastAddress": SSDP.MULTICASTIPV4})
      .then(function () { return that._SSDPserver.connect("ssdp://" + SSDP.MULTICASTIPV4 + ":" + (SSDP.PORT).toString() ) })
      .then(function (client) {  
        that._SSDPclient = client;
        that._SSDPclient[SERVER.Capabilities][CACHE.CAPABILITY][CACHE.MATCHANYHOST] = true;
    } );
  }
  else return Promise.resolve(null);
}

module.exports = DiscoveryClientSSDP

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

WireItem.prototype.sendSearch = function (callback) {
  this.transportContext[SERVER.Capabilities][SSDP.CAPABILITY].search(this.context, callback);
  return this;
}
