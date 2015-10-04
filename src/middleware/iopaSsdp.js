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
  udp = require('iopa-udp'),
  querystring = require('querystring'),
  iopaStream = require('iopa-common-stream'),
  iopaHttp = require('iopa-http'),
  iopaHttp_inboundParseMonitor = iopaHttp.protocol.inboundParseMonitor,
  iopaHttp_outboundWrite = iopaHttp.protocol.outboundWrite;
  
const constants = iopa.constants,
  IOPA = constants.IOPA,
  SERVER = constants.SERVER,
  HTTP = iopaHttp.protocol.constants;

const SSDP = {
  CAPABILITY: "urn:io.iopa:ssdp",
  PROTOCOL: "IETF 1.03",
  SCHEME: "ssdp:",
  SESSIONCLOSE: "ssdp.Finish",

  NOTIFY_TYPES:
  {
    ALIVE: "ssdp:alive",
    BYE: "ssdp:byebye",
    UPDATE: "ssdp:update"
  },

  MAN_TYPES:
  {
    DISCOVER: '"ssdp:discover"',
  },

  METHODS:
  {
    MSEARCH: "M-SEARCH",
    NOTIFY: "NOTIFY",
    RESPONSE: "RESPONSE"
  },

   MULTICASTIPV4: '239.255.255.250',
  PORT: 1900,
  MAX_AGE: "max-age=1800",
  TTL: 128,
  MX: 2,
},
  packageVersion = require('../../package.json').version;

 /**
 * IOPA Middleware for UPNP Simple Service Discovery Protocol (SSDP) protocol
 *
 * @class IopaSsdp
 * @this app.properties  the IOPA AppBuilder Properties Dictionary, used to add server.capabilities
 * @constructor
 * @public
 */
function IopaSsdp(app) {
  app.properties[SERVER.Capabilities][SSDP.CAPABILITY] = {};
  app.properties[SERVER.Capabilities][SSDP.CAPABILITY][SERVER.Version] = packageVersion;
  app.properties[SERVER.Capabilities][SSDP.CAPABILITY][IOPA.Protocol] = SSDP.PROTOCOL;
  
  if (!(HTTP.CAPABILITY in app.properties[SERVER.Capabilities]))
  app.properties[SERVER.Capabilities][HTTP.CAPABILITY] = {};
  app.properties[SERVER.Capabilities][HTTP.CAPABILITY][SERVER.Version] = packageVersion;
  app.properties[SERVER.Capabilities][HTTP.CAPABILITY][IOPA.Protocol] = HTTP.PROTOCOL;
  
  this.app = app;
  this._factory = new iopa.Factory();
 }
 
/**
 * channel method called for each inbound connection
 *
 * @method channel
 * @this IopaSsdp 
 * @param channelContext IOPA context properties dictionary
 * @param next the next IOPA AppFunc in pipeline 
 */
IopaSsdp.prototype.channel = function IopaSsdp_channel(channelContext, next) { 
    channelContext[IOPA.Scheme] = SSDP.SCHEME;
   
    channelContext[IOPA.Events].on(IOPA.EVENTS.Request, function(context){
        return next.invoke(context);
    })
        
    return next().then(iopaHttp_inboundParseMonitor.bind(this, channelContext, channelContext))
}

/**
 * invoke method called for each inbound request message
 * 
 * @method invoke
 * @this IopaSsdp 
 * @param context IOPA context properties dictionary
 * @param next the next IOPA AppFunc in pipeline 
 */
IopaSsdp.prototype.invoke = function IopaHttp_invoke(context, next) {
    context[SERVER.Capabilities][SSDP.CAPABILITY].respond = IopaSsdp_respond.bind(this, context);
    context.response[IOPA.Body].once("finish", function(){ IopaSsdp_reply(context); });
    return next()
}

/**
 * @method connect
 * @this IopaSsdp 
 * @param context IOPA context properties dictionary
 * @param next the next IOPA AppFunc in pipeline 
 */
IopaSsdp.prototype.connect = function CoAPClientPacketSend_dispatch(channelContext, next) {
  channelContext[SERVER.Capabilities][SSDP.CAPABILITY].alive = this._alive.bind(this, channelContext);
  channelContext[SERVER.Capabilities][SSDP.CAPABILITY].bye = this._bye.bind(this, channelContext);
  channelContext[SERVER.Capabilities][SSDP.CAPABILITY].update = this._update.bind(this, channelContext);
  channelContext[SERVER.Capabilities][SSDP.CAPABILITY].search = this._search.bind(this, channelContext);
  
  return next();
};

/**
 * @method dispatch
 * @this IopaSsdp 
 * @param context IOPA context properties dictionary
 * @param next the next IOPA AppFunc in pipeline 
 */
IopaSsdp.prototype.dispatch = function IopaSsdp_dispatch(context, next) {
    return next().then(function () {
        return iopaHttp_outboundWrite(context);
     });
};

// PRIVATE METHODS

/**
 * Private method to create message defaults for each new packet
 * 
 * @method IopaHttp_messageDefaults
 * @object ctx IOPA context dictionary
 * @private
 */
function IopaSsdp_messageDefaults(context) { 
  context[IOPA.Headers]['cache-control'] =  context[IOPA.Headers]['cache-control'] || HTTP.CACHE_CONTROL;
  context[IOPA.Headers]['server'] =  context[IOPA.Headers]['server'] || HTTP.SERVER;
};

IopaSsdp.prototype._alive = function (channelContext, values) {
  channelContext[SERVER.Fetch]("*", function(context){
    context[IOPA.Headers]['NTS'] = SSDP.NOTIFY_TYPES.ALIVE;
    IopaSsdp_addNotifyHeaders(context);
    iopa.util.shallow.mergeContext(context, values);
  });
};

IopaSsdp.prototype._bye = function (channelContext, values) {
  channelContext[SERVER.Fetch]("*", function(context){
    iopa.util.shallow.mergeContext(context, values);
    context[IOPA.Headers]['NTS'] = SSDP.NOTIFY_TYPES.BYE;
    IopaSsdp_addNotifyHeaders(context);
  });
};

IopaSsdp.prototype._update = function (channelContext, values) {
    channelContext[SERVER.Fetch]("*", function(context){
    context[IOPA.Headers]['NTS'] = SSDP.NOTIFY_TYPES.UPDATE;
    iopa.util.shallow.mergeContext(context, values);
    IopaSsdp_addNotifyHeaders(context);
  });
};

function IopaSsdp_addNotifyHeaders(context) {
    context[IOPA.Method] = SSDP.METHODS.NOTIFY;
    context[IOPA.Path] = "*";
    context[IOPA.Protocol] = IOPA.PROTOCOLS.HTTP;
    
    var headers = context[IOPA.Headers];
    headers['HOST'] = headers['HOST'] || SSDP.MULTICASTIPV4 + ":" + SSDP.PORT;
    headers['CACHE-CONTROL'] = headers['CACHE-CONTROL'] || SSDP.MAX_AGE;
 //   headers['DATE'] = headers['DATE'] || new Date().toUTCString();
};

IopaSsdp.prototype._search = function (channelContext, values) {
  channelContext[SERVER.Fetch]("*", function (context) {
    context[IOPA.Method] = SSDP.METHODS.MSEARCH;
     context[IOPA.Path] = "*";
    context[IOPA.Protocol] = IOPA.PROTOCOLS.HTTP;
  
    iopa.util.shallow.mergeContext(context, values);
    var headers = context[IOPA.Headers];
    headers['HOST'] = headers['HOST'] || SSDP.MULTICASTIPV4 + ":" + SSDP.PORT;
    headers['MAN'] = SSDP.MAN_TYPES.DISCOVER;
    headers['MX'] = headers['MX'] || SSDP.MX;
    });

  return context[SERVER.Fetch]("", function (context) { });
};

/**
 * Private method to send response packet
 * Triggered on data or finish events
 * 
 * @method _ssdpSendResponse
 * @object ctx IOPA context dictionary
 * @private
 */
function IopaSsdp_reply(context) {
  var response = context.response;
  response[IOPA.Method] = "REPLLLLYYYY";

  response[IOPA.StatusCode] = 200;
  response[IOPA.ReasonPhrase] = "OK";
  var headers = response[IOPA.Headers];
  headers['HOST'] = headers['HOST'] || SSDP.MULTICASTIPV4 + ":" + SSDP.PORT;
  headers['CACHE-CONTROL'] = headers['CACHE-CONTROL'] || SSDP.MAX_AGE;
  headers['EXT'] = headers['EXT'] || "";
  headers['DATE'] = headers['DATE'] || new Date().toUTCString();

  iopaHttp_outboundWrite(context.response);
};
 
 /**
 * Private method to send response packet
 * Triggered on data or finish events
 * 
 * @method _ssdpSendResponse
 * @object ctx IOPA context dictionary
 * @private
 */
function IopaSsdp_respond(originalContext, values) {
   originalContext[SERVER.Fetch]("", function(context){
      context[IOPA.Method] = "234234234234";
      context[IOPA.StatusCode] = 200;
      context[IOPA.ReasonPhrase] = "OK";
      var headers = context[IOPA.Headers];
      context['HOST'] = headers['HOST'] || SSDP.MULTICASTIPV4 + ":" + SSDP.PORT;
      context['CACHE-CONTROL'] = headers['CACHE-CONTROL'] || SSDP.MAX_AGE;
      context['EXT'] = headers['EXT'] || "";
      context['DATE'] = headers['DATE'] || new Date().toUTCString();
      
      iopa.util.shallow.mergeContext(context, values);
   });
 };
 
 module.exports = IopaSsdp;
 