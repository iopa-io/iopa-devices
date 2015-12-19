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

exports.WIRE =
{ 
    // Platform Model
    ModelManufacturer: "man",    // e.g., "Domabo"
    ModelManufacturerUrl: "murl",   // e.g., "http://domabo.com"
    ModelName: "mn",  // e.g., "HomeKit Stick"
    ModelNumber: "mno",  // e.g., "HK100"
    ModelUrl: "murl",  // e.g., "http://domabo.com/support/HK100"
   
    // Physical Instance
    PlatformId: "pi",
    PlatformName: "pn",   // e.g., "HomeKit Stick Primary"
    PlatformFirmware: "pfv",   // e.g., "1.3.5"
    PlatformOS: "pos",  // e.g., "14.10.1"
    PlatformHardware: "hw",  // e.g. "1.0B"
    PlatformDate: "dom",  // e.g., 2016-12-23
    
    // IOPA Logical Device (can be >1 per physical platform)
    Id: "uuid",   // e.g., "23424-22423-63653-2424-26262"
    Type: "t", // e.g., "thing.Device"
    Version: "v",  // e.g., "1.3.5"
    Location: "loc",   // e.g., {37.7833, 122.4167}
    LocationName: "locn", // e.g., "The Bellevue"
    Currency: "cur", // e.g., "USD"
    Region: "reg",  // e.g., "Home"
    SystemTime: "stim",
    Policy: "pol",
    Schemes: "s", //e.g, {"coap", "mqtt"}
  
    // Resource 
    ResourceTypeName: "rtn",   // e.g., "Smart Home Bridge Device""
    ResourceType: "rt",   // e.g., "iopa.d.b"   Smart Home Bridge Device
    InterfaceType: "if",   // e.g., "iopa.if.r"
    
    // Device or Resource Common Properties 
    Uri: "href",   // e.g., "oic.if.r"
    Name: "n",
    Properties: "p",
    Value: "v",   // e.g., "OK"
    Parent: "par", // e.g., link to device from resource
    Links: "links",  // e.g., links to each device in homekit network
  
    TYPES: {
        Device: "d",
        Resource: "r",
        Interface: "i",
        Scene: "s",
        Workflow: "w",
        Batch: "g",
    },

    POLICY: {
        Observable: "O",
        Discoverable: "D",
        Access: "A"
    },

    MAINTENANCE: {
        FactoryReset: "fr",
        Reboot: "boot",
        StartStats: "stats"
    },

    WELLKNOWN: {
        PathBase: "/iopa",

        Configure: "/con",
        Device: "/d",
        Interfaces: "/i",
        Maintenance: "/mnt",
        Monitoring: "/mon",
        Platform: "/p",
        Ping: "/ping",
        Resources: "/r",
        ResourceTypes: "/rt",
    },

    COLLECTIONS: {
        Devices: "d",
        ResourceTypes: "rt",
        Resources: "r",
        Interfaces: "i",
    }
};

exports.WIREMIDDLEWARE = {CAPABILITY: "urn:io.iopa:devices:wire", PROTOCOLVERSION: "1.0"}
   