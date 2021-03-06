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
   
=======
const iopa = require('iopa'),
 constants = iopa.constants,
 DEVICE = constants.DEVICE,
 RESOURCE = constants.RESOURCE;

var WIRE = {};

WIRE[DEVICE.ModelManufacturer] = "modelManufacturer";
WIRE[DEVICE.ModelManufacturerUrl] = "modelManufacturerUrl";
WIRE[DEVICE.ModelName] = "modelName";
WIRE[DEVICE.ModelNumber] = "modelNumber";
WIRE[DEVICE.ModelUrl] = "modelUrl";

WIRE[DEVICE.PlatformId] = "platformId";
WIRE[DEVICE.PlatformName] = "platformName";
WIRE[DEVICE.PlatformFirmware] = "platformFirmware";
WIRE[DEVICE.PlatformOS] = "platformOS";
WIRE[DEVICE.PlatformHardware] = "platformHardware";
WIRE[DEVICE.PlatformDate] = "platformDate";

WIRE[DEVICE.Id] = "id";
WIRE[DEVICE.Type] = "type";
WIRE[DEVICE.Version] = "version";
WIRE[DEVICE.Location] = "location";
WIRE[DEVICE.LocationName] = "locationName";
WIRE[DEVICE.Currency] = "currency";
WIRE[DEVICE.Region] = "region";
WIRE[DEVICE.SystemTime] = "systemTime";
WIRE[DEVICE.Resources] = "resources";
WIRE[DEVICE.Schemes] = "schemes";

WIRE[RESOURCE.TypeName] = "resourceTypeName";
WIRE[RESOURCE.Type] = "resourceType";
WIRE[RESOURCE.Interface] = "interface";
WIRE[RESOURCE.PathName] = "href";
WIRE[RESOURCE.Name] = "resourceName";
WIRE[RESOURCE.Properties] = "props";
WIRE[RESOURCE.Value] = "value";
WIRE[RESOURCE.Parent] = "parent";
WIRE[RESOURCE.Links] = "links";
WIRE[RESOURCE.Policy] = "policy";

WIRE.TYPE = {};
WIRE.TYPE[DEVICE.TYPE.Platform] = "platform";
WIRE.TYPE[DEVICE.TYPE.Device] = "device";
WIRE.TYPE[DEVICE.TYPE.Resource] = "resource";
WIRE.TYPE[DEVICE.TYPE.Property] = "property";
WIRE.TYPE[DEVICE.TYPE.Interface] = "interface";
WIRE.TYPE[DEVICE.TYPE.Scene] = "scene";
WIRE.TYPE[DEVICE.TYPE.Workflow] = "workflow";
WIRE.TYPE[DEVICE.TYPE.WorkflowItem] = "workflowItem";
WIRE.TYPE[DEVICE.TYPE.Group] = "group";

WIRE.POLICY = {};
WIRE.POLICY[DEVICE.POLICY.Observable] = "observable";
WIRE.POLICY[DEVICE.POLICY.Discoverable] = "discoverable";
WIRE.POLICY[DEVICE.POLICY.Access] = "access";

WIRE.MAINTENANCE = {};
WIRE.MAINTENANCE[DEVICE.MAINTENANCE.FactoryReset] = "factoryReset";
WIRE.MAINTENANCE[DEVICE.MAINTENANCE.Reboot] = "reboot";
WIRE.MAINTENANCE[DEVICE.MAINTENANCE.StartStats] = "StartStats";

WIRE.WELLKNOWN = {};
WIRE.WELLKNOWN[DEVICE.WELLKNOWN.PathBase] = "/.iopa";
WIRE.WELLKNOWN[DEVICE.WELLKNOWN.Configure] = "/configure";
WIRE.WELLKNOWN[DEVICE.WELLKNOWN.Device] = "/device";
WIRE.WELLKNOWN[DEVICE.WELLKNOWN.Interfaces] = "/interfaces";
WIRE.WELLKNOWN[DEVICE.WELLKNOWN.Maintenance] = "/maintenance";
WIRE.WELLKNOWN[DEVICE.WELLKNOWN.Monitoring] = "/monitoring";
WIRE.WELLKNOWN[DEVICE.WELLKNOWN.Platform] = "/platform";
WIRE.WELLKNOWN[DEVICE.WELLKNOWN.Ping] = "/ping";
WIRE.WELLKNOWN[DEVICE.WELLKNOWN.Resources] = "/resources";
WIRE.WELLKNOWN[DEVICE.WELLKNOWN.ResourceTypes] = "/resourcetypes";

exports.WIRE = WIRE;
exports.FROMWIRE = invertKeyValues(WIRE);

exports.WIRECAPABILITY = {CAPABILITY: "urn:io.iopa:device:wire", PROTOCOLVERSION: "1.0W"}

exports.DEVICESMIDDLEWARE = {CAPABILITY: "urn:io.iopa:devices", PROTOCOLVERSION: "1.0"}


/* ****
 * Helper Methods
 * */

function invertKeyValues(source) {

  var target = {};

  for (var prop in source) {
    if(source.hasOwnProperty(prop)) {
      target[source[prop]] = prop;
    }
  }

  return target;
};
