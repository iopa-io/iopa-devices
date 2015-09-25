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
 
const constants = require('iopa').constants,
  IOPA = constants.IOPA,
  SERVER = constants.SERVER,
  COAP = constants.COAP,
  SESSION = require('../common/constants.js').COAPSESSION,
  COAPMIDDLEWARE = require('../common/constants.js').COAPMIDDLEWARE
  
 var db_Clients = {};
 
 const THISMIDDLEWARE = {CAPABILITY: "urn:io.iopa:coap:clientsubscriber"},
     packageVersion = require('../../package.json').version;
 
/**
 * CoAP IOPA Middleware for Managing Server Sessions including Auto Subscribing Client Subscribe Requests
 *
 * @class CoAPSubscriptionClient
 * @this app.properties  the IOPA AppBuilder Properties Dictionary, used to add server.capabilities
 * @constructor
 * @public
 */
function CoAPClientSubscriber(app) {
  if (!app.properties[SERVER.Capabilities][COAPMIDDLEWARE.CAPABILITY])
    throw ("Missing Dependency: IOPA CoAP Server/Middleware in Pipeline");

  app.properties[SERVER.Capabilities][THISMIDDLEWARE.CAPABILITY] = {};
  app.properties[SERVER.Capabilities][THISMIDDLEWARE.CAPABILITY][SERVER.Version] = packageVersion;

 //Also register as standard IOPA PUB/SUB SUBSCRIBE MIDDLEWARE
  app.properties[SERVER.Capabilities][IOPA.CAPABILITIES.Subscribe] = {};
  app.properties[SERVER.Capabilities][IOPA.CAPABILITIES.Subscribe][SERVER.Version] = app.properties[SERVER.Capabilities][IOPA.CAPABILITIES.App][SERVER.Version];

  this.app = app;
 }

/**
 * @method connect
 * @this MQTTSessionClient IOPA context dictionary
 *  @param nextConnect bound to next server.connect in chain 
 * @param string clientid  
 * @param bool clean   use clean (persistent) session
 */
CoAPClientSubscriber.prototype.connect = function CoAPClientSubscriber_connect(channelContext, next){
    if (channelContext[IOPA.Scheme] !== IOPA.SCHEMES.COAP && channelContext[IOPA.Scheme] !== IOPA.SCHEMES.COAPS)
      return next();

    var session;
    var clientid = channelContext[SERVER.SessionId];

    if (!channelContext[IOPA.PUBSUB.Clean] && (clientid in db_Clients)) {
      session = db_Clients[clientid];
    } else {
      session = {}
      session[SESSION.Subscriptions] = {};
      session[SESSION.PendingMessages] = [];
    }

    session[SESSION.ClientId] = clientid;
    session[SESSION.Clean] = channelContext[IOPA.PUBSUB.Clean] || false;
    session[SERVER.ParentContext] = channelContext;

    channelContext[SERVER.Capabilities][THISMIDDLEWARE.CAPABILITY][SESSION.Session] = session;
    db_Clients[clientid] = session;
    
    channelContext[IOPA.PUBSUB.Subscribe] = this.subscribe.bind(this, channelContext);
    channelContext[IOPA.CancelToken].onCancelled(this._disconnect.bind(this, channelContext));
    
    return next();

}

/**
 * @method subscribe
 * @this CoAPSubscriptionClient 
 * @param string topic   IOPA Path of  CoAP resource
 * @param appFunc callback  callback to for published responses
 */
CoAPClientSubscriber.prototype.subscribe = function CoAPClientSubscriber_subscribe(channelContext, topic, callback) {
  var session = channelContext[SERVER.Capabilities][THISMIDDLEWARE.CAPABILITY][SESSION.Session];

  if (topic in session[SESSION.Subscriptions])
    session[SESSION.Subscriptions][topic].push(callback)
  else
    session[SESSION.Subscriptions][topic] = [callback];

  var defaults = {};
  defaults[IOPA.Method] = IOPA.METHODS.GET;
  defaults[IOPA.Headers] = { "Observe":  new Buffer('0')};

  return channelContext.observe(topic, defaults, function (childContext) {
    if (childContext[COAP.Code] === "2.05" && childContext[IOPA.Headers]["Observe"] > 0) {
      callback(childContext);
    }
  });
};


/**
 * @method bye
 * @this CoAPClientSubscriber IOPA context dictionary
 * @param channelContext IOPA context
 */
CoAPClientSubscriber.prototype._disconnect = function CoAPClientSubscriber_disconnect(channelContext) {
      var session = channelContext[SERVER.Capabilities][THISMIDDLEWARE.CAPABILITY][SESSION.Session];
      var client =  session[SESSION.ClientId]; 
      
      if (session[SESSION.Clean])
      {
        if (client in db_Clients)
           {
              delete db_Clients[client] ;
          } else {
          // silently ignore
         }
  
          session[SESSION.Subscriptions] = {};
      };
}

module.exports = CoAPClientSubscriber;