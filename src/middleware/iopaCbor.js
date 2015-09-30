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
      iopaStream = require('iopa-common-stream')

const constants = iopa.constants,
  IOPA = constants.IOPA,
  SERVER = constants.SERVER
   
const THISMIDDLEWARE = {CAPABILITY: "urn:io.iopa:cbor"},
     packageVersion = require('../../package.json').version;
      
/**
 * CoAP IOPA Middleware for Encoding and Decoding Message Payload (iopa.Body) in Concise Binary Object Notation
 *
 * @class iopaCborMIddleware
 * @param app with app.properties  the IOPA AppBuilder Properties Dictionary, used to add server.capabilities
 * @constructor
 * @public
 */
function IopaCbor(app) {
  app.properties[SERVER.Capabilities][THISMIDDLEWARE.CAPABILITY] = {};
  app.properties[SERVER.Capabilities][THISMIDDLEWARE.CAPABILITY][SERVER.Version] = packageVersion;
 }

/**
 * @method invoke
 * @param context iopaCborMIddleware IOPA context dictionary
 * @parm next the next appfunc in pipeline
 */
IopaCbor.prototype.invoke = function IopaCbor_invoke(context, next){
  var e = new cbor.Encoder();
  e.pipe(context.response[IOPA.Body]);
  context.response[IOPA.Body] = e;
  return next();
}

/**
 * @method invoke
 * @param context iopaCborMIddleware IOPA context dictionary
 * @parm next the next appfunc in pipeline
 */
IopaCbor.prototype.dispatch = function IopaCbor_connect(context, next){
  context[IOPA.Events].on(IOPA.EVENTS.Response, function(responseContext){
     var originalBody = responseContext[IOPA.Body];
     var newBody = new iopaStream.IncomingObjectStream();
      
      var d = new cbor.Decoder();
      d.on('complete', function(obj){
         newBody.append(obj);
       });
       responseContext[IOPA.Body] = newBody;
       originalBody.pipe(d);
    })
  
   return next();
}

module.exports = IopaCbor;