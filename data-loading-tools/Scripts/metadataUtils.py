# Copyright 2016 Esri
#
#   Licensed under the Apache License, Version 2.0 (the "License");
#   you may not use this file except in compliance with the License.
#   You may obtain a copy of the License at
#
#       http://www.apache.org/licenses/LICENSE-2.0
#
#   Unless required by applicable law or agreed to in writing, software
#   distributed under the License is distributed on an "AS IS" BASIS,
#   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#   See the License for the specific language governing permissions and
#   limitations under the License.

import arcpy
import os
import xml.etree.ElementTree as ET


# get the LRS metadata
def getMetadata(lrsWorkspace, eventLayer):
    prefix = getPrefix(eventLayer)
    metadataPath = prefix + "LRS_Metadata"
    metadataPath = os.path.join(lrsWorkspace, metadataPath)
    metadata = None
    if arcpy.Exists(metadataPath):
        with arcpy.da.SearchCursor(metadataPath, ["metadata"]) as cursor:
            for row in cursor:
                metadata = ET.fromstring((row[0].tobytes()))
                layerMetadata = getLayerMetadata(eventLayer, metadata, False)
                if (layerMetadata is not None):
                    break
        return metadata
    else:
        #return {"error": True, "message": "Could not access the LRS_Metadata table from " + metadataPath}
        raise Exception("Could not access the LRS_Metadata table from " + metadataPath)


# get the prefix
def getPrefix(eventLayer):
    prefix = eventLayer.datasetName.rsplit(".", 1)[0]
    if prefix == eventLayer.datasetName:  # For FGDB there is no prefix
        prefix = ""
    else:
        prefix += "."
    return prefix


# get the metadata for a specific layer
def getLayerMetadata(layer, metadata, networkLayer=False):
    layerMetadata = None
    externalLayer = False
    if (metadata is not None and layer is not None):
        if (networkLayer):
            layers = metadata.findall(".//Network")
            datasetNameField = "PersistedFeatureClassName"
            # remove database info from datasetName
            datasetName = layer.datasetName.rsplit(".", 1)[-1]
        else:
            layers = metadata.findall(".//EventTable")
            layers.extend(metadata.findall(".//IntersectionClass"))
            datasetNameField = "FeatureClassName"
            # remove database info from datasetName
            datasetName = layer.datasetName.rsplit(".", 1)[-1]
        for candidate in layers:
            if (candidate.get(datasetNameField, "") == datasetName):
                layerMetadata = candidate
                break
    return layerMetadata


# get parent network layer metadata of event layer
def getParentNetworkMetadata(eventLayerFeatureclassName, metadata):
    networkMetadata = None
    if (metadata is not None and eventLayerFeatureclassName is not None):
        networklayers = metadata.findall(".//Network")
        for network in networklayers:
            eventlayers = network.findall(".//EventTable")
            for candidate in eventlayers:
                if (candidate.get("FeatureClassName", "") == eventLayerFeatureclassName):
                    networkMetadata = network
                    break
    return networkMetadata


# get route ID field from network layer metadata
def getNetworkRouteIdField(networkLayer, metadata):
    layerMetadata = getLayerMetadata(networkLayer, metadata, True)
    routeIdField = None
    if (layerMetadata):
        routeIdField = layerMetadata.get("PersistedFeatureClassRouteIdFieldName", None)
    else:
        return {"error": True, "message": "Could not get metadata for " + networkLayer.name}
    if (routeIdField is None):
        return {"error": True, "message": "Could not get route ID field name for " + networkLayer.name}
    return routeIdField

