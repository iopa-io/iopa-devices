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

// CoAP parameters
var QOS = {
    ackTimeout: 2 // seconds
  , ackRandomFactor: 1.5
  , maxRetransmit: 4
  , nstart: 1
  , defaultLeisure: 5
  , probingRate: 1 // byte/seconds

  // MAX_LATENCY is the maximum time a datagram is expected to take
  // from the start of its transmission to the completion of its
  // reception.
  , maxLatency: 100 // seconds
  , maxTransmitSpan: null
  ,maxTransmitWait: null
  , processingDelay: null
  , maxRTT: null 
  , exchangeLifetime: null
}

// MAX_TRANSMIT_SPAN is the maximum time from the first transmission
// of a Confirmable message to its last retransmission.
QOS.maxTransmitSpan = QOS.ackTimeout * ((Math.pow(2, QOS.maxRetransmit)) - 1) * QOS.ackRandomFactor

// MAX_TRANSMIT_WAIT is the maximum time from the first transmission
// of a Confirmable message to the time when the sender gives up on
// receiving an acknowledgement or reset.
QOS.maxTransmitWait = QOS.ackTimeout * (Math.pow(2, QOS.maxRetransmit + 1) - 1) * QOS.ackRandomFactor


// PROCESSING_DELAY is the time a node takes to turn around a
// Confirmable message into an acknowledgement.
QOS.processingDelay = QOS.ackTimeout

// MAX_RTT is the maximum round-trip time
QOS.maxRTT = 2 * QOS.maxLatency + QOS.processingDelay

//  EXCHANGE_LIFETIME is the time from starting to send a Confirmable
//  message to the time when an acknowledgement is no longer expected,
//  i.e.  message layer information about the message exchange can be
//  purged
QOS.exchangeLifetime = QOS.maxTransmitSpan + QOS.maxRTT

exports.QOS = QOS;

exports.COAPSESSION = {
  ClientId: "coapSession.ClientId",
  Subscriptions: "coapSession.Subscriptions",
  Clean: "coapSession.Clean",
  PendingMessages: "coapSession.PendingMessages",
  Session: "coapSession.Session",
  ObservationSeq: "CoapSession.ObservationSeq"
}

exports.COAPMIDDLEWARE = {CAPABILITY: "urn:io.iopa:coap", PROTOCOLVERSION: "RFC 7252"}
   