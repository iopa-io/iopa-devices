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
var db_Subscriptions = {};

const THISMIDDLEWARE = { CAPABILITY: "urn:io.iopa:coap:serverpublisher" },
    packageVersion = require('../../package.json').version;
 
/**
 * CoAP IOPA Middleware for Server PubSub including Auto Subscribing Client Subscribe Requests
 *
 * @class CoapServerPublisher
 * @this app.properties  the IOPA AppBuilder Properties Dictionary, used to add server.capabilities
 * @constructor
 * @public
 */
function CoapServerPublisher(app) {
    if (!app.properties[SERVER.Capabilities][COAPMIDDLEWARE.CAPABILITY])
        throw ("Missing Dependency: IOPA CoAP Server/Middleware in Pipeline");

    app.properties[SERVER.Capabilities][THISMIDDLEWARE.CAPABILITY] = {};
    app.properties[SERVER.Capabilities][THISMIDDLEWARE.CAPABILITY][SERVER.Version] = packageVersion;
    
    //Also register as standard IOPA PUB/SUB PUBLISH MIDDLEWARE
    app.properties[SERVER.Capabilities][IOPA.CAPABILITIES.Publish] = {};
    app.properties[SERVER.Capabilities][IOPA.CAPABILITIES.Publish][SERVER.Version] = app.properties[SERVER.Capabilities][IOPA.CAPABILITIES.App][SERVER.Version];

    this.app = app;
     app[IOPA.PUBSUB.Publish]  = this._publish.bind(this, app[IOPA.PUBSUB.Publish] || function(){return Promise.resolve(null)});
}


/**
 * @method publish
 * @this MQTTSessionManager IOPA context dictionary
 * @param string topic   IOPA Path of  MQTT topic
 * @param buffer payload  payload to publish to all subscribed clients
 */
CoapServerPublisher.prototype._publish = function CoapServerPublisher_publish(nextPublish, topic, payload) {
  return nextPublish(topic, payload).then(function(){
     return CoapServerPublisher_publishCoAP(topic, payload);
  });
}

/**
 * Local utility function to create a unique persistent client ID for each incoming client
 * 
 * @method clientKey
 * @param context IOPA context dictionary
 * @return string unique client id generated from incoming context
 * @private
 */
function clientKey(context) {
    return context[SERVER.RemoteAddress] + ":" + context[SERVER.RemotePort];
}

/**
 * @method invoke
 * @this CoapServerPublisher
 * @param context IOPA context dictionary
 * @param next   IOPA application delegate for the remainder of the pipeline
 */
CoapServerPublisher.prototype.invoke = function CoapServerPublisher_invoke(context, next) {

    if ((context[IOPA.Method] == IOPA.METHODS.GET) && ('Observe' in context[IOPA.Headers])) {
        var clientId = clientKey(context);
        var client;
        var topic = context[IOPA.Path];
        if (clientId in db_Clients) {
            client = db_Clients[clientId];
        } else {
            client = {}
            client[SESSION.Subscriptions] = {};
            db_Clients[clientId] = client;
        }

        var subscription = {};
        subscription[SERVER.RemoteAddress] = context.response[SERVER.RemoteAddress];
        subscription[SERVER.RemotePort] = context.response[SERVER.RemotePort];
        subscription[IOPA.Headers] = context.response[IOPA.Headers];
        subscription[IOPA.Body] = context.response[IOPA.Body];
        subscription[SESSION.ObservationSeq] = 1;
        subscription[SERVER.CancelTokenSource] = context[SERVER.CancelTokenSource];
      
        client[SESSION.Subscriptions][topic] = subscription;
   
        // Add to global subscriptions
        if (topic in db_Subscriptions) {
            if (db_Subscriptions[topic].indexOf(clientId) > -1) {
                // SILENTLY IGNORE ALREADY SUBSCRIBED
            } else {
                db_Subscriptions[topic].push(clientId);
            }

        } else {
            db_Subscriptions[topic] = [clientId];
        }

        return next()
            .then(function () {
                return new Promise(function (resolve, reject) {
                    context[IOPA.CancelToken].onCancelled(resolve);
                });

            });

    } else
        return next();
};

/**
 * @method unsubsubscribe
 * TODO:  CALL THIS METHOD WHEN UDP ERRORS OCCUR FOR GIVEN CLIENT
 * @param context IOPA context dictionary
 * @public
 */
CoapServerPublisher.prototype.unsubsubscribe = function CoapServerPublisher_unsubsubscribe(context) {

    var clientId = clientKey(context);

    if (clientId in db_Clients) {
        db_Clients[clientId].forEach(function (client) {
            client[SESSION.Subscriptions].forEach(function (topic) {
                if (topic in db_Subscriptions) {
                    for (var i = db_Subscriptions[topic].length; i--;) {
                        if (db_Subscriptions[topic][i] === clientId) {
                            db_Subscriptions[topic].splice(i, 1);
                        }
                    }
                } else {
                    // SILENTLY IGNORE NOT SUBSCRIBED FOR ANY CLIENT ON THIS TOPIC
                }
            });
            client[SERVER.CancelTokenSource].cancel("urn:io.iopa:coap:unsubsubscribe");
            delete db_Clients[clientId];
        });
    }
};
    
/**
 * @method publish
 * @param string topic   IOPA Path of  CoAP resource
 * @param buffer payload  payload to publish to all subscribed clients
 */
function CoapServerPublisher_publishCoAP(topic, payload) {
    if (topic in db_Subscriptions) 
    { 
        var client;
        db_Subscriptions[topic].forEach(function (clientId) {
            if (clientId in db_Clients) {
                client = db_Clients[clientId];
                var subscription = client[SESSION.Subscriptions][topic];
                subscription[IOPA.Headers]["Observe"] = new Buffer((subscription[SESSION.ObservationSeq]++).toString(), 'utf8');
                subscription[IOPA.Body].write(payload);
            }
            else {
                // missing client, ignore
            }
        });

    } else {
        // no subscriptions, ignore
    }
    
    return Promise.resolve(null);  // could return promise all and check for PUBACK And delete from db_Clients on no response
 
};

module.exports = CoapServerPublisher;