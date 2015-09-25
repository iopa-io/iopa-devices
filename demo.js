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

const iopa = require('iopa')
  , coap = require('iopa-coap')
  , udp = require('iopa-udp')
  , devices = require('./index.js')
  , IOPA = iopa.constants.IOPA
  , THING = iopa.constants.THING

const iopaMessageLogger = require('iopa-logger').MessageLogger

var app = new iopa.App();
app.use(iopaMessageLogger);
app.use(coap);
app.use(devices);

app.use(function (context, next) {
  context.log.info("[DEMO] DEVICES APP USE " + context["iopa.Method"] + " " + context["iopa.Path"]);

  if (context["iopa.Method"] === "GET") {

    setTimeout(function () {
      server[IOPA.PUBSUB.Publish]("/projector", new Buffer("Hello World"));
    }, 50);
  }
  return next();
});

var server = udp.createServer(app.build());
server[IOPA.PUBSUB.Publish] = app[IOPA.PUBSUB.Publish];

if (!process.env.PORT)
  process.env.PORT = iopa.constants.IOPA.PORTS.COAP;

server.listen(process.env.PORT, process.env.IP)
  .then(function () {
    app.log.info("[DEMO] Server is on port " + server.port);
    return server.connect("coap://127.0.0.1", "CLIENTID-1", false);
  })
  .then(function (client) {
    app.log.info("[DEMO] Client is on port " + client["server.LocalPort"]);
    client[IOPA.PUBSUB.Subscribe]('/projector', function (pubsub) {
      pubsub.log.info("[DEMO] DEVICES /projector RESPONSE " + pubsub["iopa.Body"].toString());
    });
    setTimeout(function () {
      server[IOPA.PUBSUB.Publish]("/projector", new Buffer("Hello World 2"));
    }, 1000);
    setTimeout(function () {
      server.close().then(function () { app.log.info("[DEMO] DEVICES DEMO Closed"); })
    }, 5000);
  });
    