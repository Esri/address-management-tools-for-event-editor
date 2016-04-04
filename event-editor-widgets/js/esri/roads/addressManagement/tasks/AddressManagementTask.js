/*
 Copyright 2016 Esri

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
define([
"dojo/_base/array", 
"dojo/_base/connect", 
"dojo/_base/declare", 
"dojo/_base/Deferred",
"dojo/DeferredList",
"dojo/_base/lang", 
"esri/request", 
"esri/tasks/query", 
"esri/tasks/QueryTask",
"esri/tasks/BufferParameters",
"esri/tasks/GeometryService",
"esri/geometry/scaleUtils", 
"esri/geometry/mathUtils", 
"roads/utils", 
"roads/maputils",
"roads/tasks/serviceInfoCache"
], function(array, connect, declare, Deferred, DeferredList, lang, esriRequest, Query, QueryTask, BufferParameters, GeometryService, scaleUtils, geometryMathUtils, utils, maputils, serviceInfoCache){
    return declare("roads.addressManagement.tasks.AddressManagementTask", null, {
    
        _mapManager: null,

        _operationalLayerInfos: null,

        constructor: function(config) {
            this._mapManager = config.mapManager;
        },

        /*
         * Returns the URL of feature service and other parameters for security token.
         */ getFeatureServerUrlAndUrlParams: function(serviceUrl) {
            var restServicesPart = "/rest/services/", mapServerPart = "/mapserver", start = serviceUrl.toLowerCase().indexOf(restServicesPart), end = serviceUrl.toLowerCase().indexOf(mapServerPart, start), name = serviceUrl.substring(start + restServicesPart.length, end), featureServerUrl = serviceUrl.substring(0, start + restServicesPart.length) + name + '/FeatureServer/';
            // include any security token
            var urlParams = serviceUrl.substring(end + mapServerPart.length);
            urlParams = (urlParams.charAt(0) === "?") ? urlParams : "";

            return {
                url : featureServerUrl,
                params : urlParams
            };
        },

        /*
         * Detects whether feature server for redline is configured.
         */ detectFeatureServer: function(serviceUrl, layerId) {
            var urlAndParams = this.getFeatureServerUrlAndUrlParams(serviceUrl), def = new Deferred();

            var url = urlAndParams.url + layerId + urlAndParams.params, request = esriRequest({
                url : url,
                content : {
                    f : "json"
                },
                handleAs : "json",
                callbackParamName : "callback"
            });

            request.then(function(response) {
                def.callback({
                    detected : true,
                    layer : response
                });
            }, function(err) {
                console.log('detectFeatureServer: err=' + err);
                def.callback({
                    detected : false
                });
            });
            return def;
        }, getTableInformation: function(url, tableName) {
            var def = new Deferred();
            request = esriRequest({
                url : utils.appendUrlPath(url, "/layers"),
                content : {
                    "f" : "json"
                },
                callbackParamName : "callback"
            });
            request.then(lang.hitch(this, function(json) {
                var table = this._findTableByName(json.tables, tableName);
                if (table) {
                    def.callback({
                        hasStreetNameTable : true,
                        table : table
                    });
                } else {
                    def.callback({
                        hasStreetNameTable : false
                    });
                }
            }), function(err) {
                console.log('getTableInformation: err=' + err);
                def.callback({
                    hasStreetNameTable : false
                });
            });
            return def;
        }, queryBlockRangesAtPoint: function(mapClickPoint) {
            var mapTolerance = (this._mapManager.map.extent.getWidth() / this._mapManager.map.width) * this._mapManager.selectionManager.tolerancePixels;
            var extent = maputils.pointToExtent(mapClickPoint, mapTolerance);
            var defd = new Deferred();
            var map = this._mapManager.map, query = new Query();
            query.outFields = ["*"];
            query.outSpatialReference = map.spatialReference;
            query.returnGeometry = true;
            query.returnM = true;
            query.geometry = extent;
            var queryUrl = utils.appendUrlPath(this._mapManager.addressInfo.blockRangeInfo.serviceLayer.url, "/" + this._mapManager.addressInfo.blockRangeInfo.layerId), queryTask = new QueryTask(queryUrl);
            queryTask.showBusyCursor = true;
            queryTask.execute(query).then(lang.hitch(this, function(featureSet) {
                defd.callback(featureSet);
            }), lang.hitch(this, function(err) {
                console.log("queryBlockRangesAtPoint: Unable to query for block range layer. ", err);
                defd.errback(err);
            }));
            return defd;
        }, _querySiteAddresses: function(blockRangeFeature) {
            var defd = new Deferred(), map = this._mapManager.map, query = new Query(), addressConfig = this._mapManager.addressInfo.config, min = Math.min(blockRangeFeature.attributes[addressConfig.blockRangeLayer.leftFromAddressField], blockRangeFeature.attributes[addressConfig.blockRangeLayer.rightFromAddressField]), max = Math.max(blockRangeFeature.attributes[addressConfig.blockRangeLayer.leftToAddressField], blockRangeFeature.attributes[addressConfig.blockRangeLayer.rightToAddressField]), streetName = blockRangeFeature.attributes[addressConfig.blockRangeLayer.fullStreetNameField];
            if (min > max) {
                var temp = min;
                min = max;
                max = temp;
            }
            /*streetNameParts = streetName.split(" "),
             splitStreetName;
             streetNameParts.splice(streetNameParts.length-1,1);
             splitStreetName = streetNameParts.join(" ");*/
            var params = this._createBufferParameters(blockRangeFeature.geometry);

            try {
                esriConfig.defaults.geometryService.buffer(params).then(lang.hitch(this, function(geometries) {
                    if (geometries && geometries.length > 0) {
                        query.outFields = ["*"];
                        query.outSpatialReference = map.spatialReference;
                        query.geometry = geometries[0];
                        query.returnGeometry = true;
                        query.returnM = true;

                        query.where = "UPPER(" + addressConfig.siteAddressPoints.streetNameField + ") LIKE '%" + streetName.toUpperCase() + "%'";
                        var queryUrl = utils.appendUrlPath(this._mapManager.addressInfo.siteAddressPointsInfo.serviceLayer.url, "/" + this._mapManager.addressInfo.siteAddressPointsInfo.layerId), queryTask = new QueryTask(queryUrl);
                        queryTask.showBusyCursor = true;
                        queryTask.execute(query).then(lang.hitch(this, function(featureSet) {
                            if (featureSet.features.length > 0) {
                                var features = featureSet.features;
                                var filteredFeatures = array.filter(features, function(feat) {
                                    var addressNumber = feat.attributes[addressConfig.siteAddressPoints.addressNumberField];
                                    if ( typeof addressNumber === "string") {
                                        var addrNumber = addressNumber.match(/\d+/)[0];
                                        if (addrNumber >= min && addrNumber <= max) {
                                            return true;
                                        } else {
                                            return false;
                                        }
                                    } else {
                                        if (addressNumber >= min && addressNumber <= max) {
                                            return true;
                                        } else {
                                            return false;
                                        }
                                    }
                                });
                                featureSet.features = filteredFeatures;
                            }
                            defd.callback(featureSet);
                        }), lang.hitch(this, function(err) {
                            console.log("querySiteAddresses: Unable to query Site Address. ", err);
                            defd.errback(err);
                        }));
                    }
                }), lang.hitch(this, function(err) {
                    console.log("querySiteAddresses: Cannot buffer polyline. ", err);
                    defd.errback(err);
                }));
            } catch (ex) {
                console.log("querySiteAddresses: Cannot buffer polyline. ", err);
                defd.errback(err);
            }

            return defd;
        }, _createBufferParameters: function(geometry) {
            var params = new BufferParameters();
            params.geometries = [geometry];
            params.distances = [200];
            params.unit = GeometryService.UNIT_METERS;
            params.bufferSpatialReference = geometry.spatialReference;
            params.outSpatialReference = this._mapManager.map.spatialReference;
            return params;
        }, _calculateSiteAddressMeasureValue:function(blockRangeFeature,siteAddresses) {
            var totalMeasureLength = blockRangeFeature.attributes[this._mapManager.addressInfo.blockRangeInfo.eventLayerInfo.toMeasureFieldName] - blockRangeFeature.attributes[this._mapManager.addressInfo.blockRangeInfo.eventLayerInfo.fromMeasureFieldName], addressConfig = this._mapManager.addressInfo.config, min = Math.min(blockRangeFeature.attributes[addressConfig.blockRangeLayer.leftFromAddressField], blockRangeFeature.attributes[addressConfig.blockRangeLayer.rightFromAddressField]), max = Math.max(blockRangeFeature.attributes[addressConfig.blockRangeLayer.leftToAddressField], blockRangeFeature.attributes[addressConfig.blockRangeLayer.rightToAddressField]), segmentMeasureLength = totalMeasureLength / (max - min);
            array.forEach(siteAddresses, function(siteAddress) {
                var addressNumber = siteAddress.attributes[addressConfig.siteAddressPoints.addressNumberField], calculatedMeasureValue = blockRangeFeature.attributes[this._mapManager.addressInfo.blockRangeInfo.eventLayerInfo.fromMeasureFieldName] + ((addressNumber - min) * segmentMeasureLength);
                siteAddress.measure = calculatedMeasureValue;
            }, this);
            return siteAddresses;
        }, getBlockRangeSiteAddressFeatures:function(blockRangeFeature) {
            var defd = new Deferred();
            this._querySiteAddresses(blockRangeFeature).then(lang.hitch(this, function(fSet) {
                var siteAddresses = fSet.features;
                siteAddresses = this._calculateSiteAddressMeasureValue(blockRangeFeature, siteAddresses);
                defd.callback(siteAddresses);
            }));
            return defd;
        }, _findTableByName: function(tables, tableName) {
            return utils.first(tables, function(table) {
                return table.name == tableName;
            });
        }, populateAttributesFromPolygonLayer: function(targetLayer, feature) {
          
            var addressConfig = this._mapManager.addressInfo.config, outFields = [], targetFields = [], defd = new Deferred(), allLayers = [], firstDefds = [], defds = [];
            var attributes = {}, targetFieldMapping =[];
            array.forEach(addressConfig.polygonLayers, function(polygonLayer) {
                this._getLayerByName(polygonLayer.layerName).then(lang.hitch(this, function(result) {
                    if (result.isConfigured) {
                        firstDefds.push(serviceInfoCache.get(utils.appendUrlPath(result.serviceUrl, "/" + result.layerId)));
                        polygonLayer.layerUrl = utils.appendUrlPath(result.serviceUrl, "/" + result.layerId);
                        allLayers.push(polygonLayer);
                    } else {
                        console.warn(polygonLayer.layerName + " layer not found");
                    }
                }));
            }, this);
            array.forEach(addressConfig.polygonServices, function(polygonLayer) {
               
                firstDefds.push(serviceInfoCache.get(polygonLayer.layerUrl));
                allLayers.push(polygonLayer);
            }, this);

            return new DeferredList(firstDefds).then(lang.hitch(this, function(results) {
                array.forEach(results, function(result, resultIndex) {
                    var polygonLayer = allLayers[resultIndex];
                     var outFields = [], targetFields = [], targetFieldMapping=[];
                    if (result[0]) {
                        var layerInfo = result[1];
                        var layerFields = layerInfo.fields;
                        for (var sourceField in polygonLayer.attributeMapping) {
                            var srcField = array.filter(layerFields, function(fld){
                            return (fld.name == sourceField);
                            })[0];
                            var fields = polygonLayer.attributeMapping[sourceField];
                            var fieldMapping = array.filter(fields, function(field) {
                                return (field.indexOf(targetLayer.name) >= 0);
                            });
                            if (fieldMapping && fieldMapping.length > 0) {
                                fieldMapping = array.map(fieldMapping, function(field) {
                                    return field.replace(targetLayer.name + ".", "");
                                });
                                 targetFieldMapping= array.filter(targetLayer.fields, function(field){
                                        return fieldMapping.indexOf(field.name)!=-1;
                                });
                                outFields.push(srcField);
                                targetFields.push(targetFieldMapping);
                            }
                        }
                        if (targetFields.length > 0) {
                            var queryParams = {
                                url : polygonLayer.layerUrl,
                                outFields : outFields,
                                targetFields : targetFields
                            };
                            defds.push(this._queryPolygonLayers(queryParams, feature));
                        }
                    } else {
                        console.warn("Not able to query " + polygonLayer.layerName);
                    }
                }, this);
            })).then(lang.hitch(this, function() {
                return new DeferredList(defds).then(lang.hitch(this, function(results) {
                    array.forEach(results, function(result, resultIndex) {
                        if (result[0]) {
                            if (result[1].attributes) {
                                lang.mixin(attributes, result[1].attributes);
                            }
                        }

                    }, this);
                    defd.callback({
                        attributes : attributes
                    });
                    return defd;
                }));
            }));

        }, _queryPolygonLayers:function(queryParams, feature) {
            var defd = new Deferred(), map = this._mapManager.map, query = new Query(), attributes = {};
            var outFields = array.map(queryParams.outFields, function(field) {
                return field.name;
            });
            query.outFields = outFields;
            query.outSpatialReference = map.spatialReference;
            query.geometry = feature.geometry;
            query.returnGeometry = false;
            var queryUrl = queryParams.url;
            new QueryTask(queryUrl).execute(query).then(lang.hitch(this, function(featureSet) {
                var features = featureSet.features;
                if (features.length == 1) {
                    array.forEach(queryParams.outFields, function(field, index) {
                        var targetFieldNames = queryParams.targetFields[index];
                        var value = features[0].attributes[field.name];
                        if (field.domain) {
                            array.some(field.domain.codedValues, function(codedValue) {
                                if (value == codedValue.name) {
                                    value = codedValue.code;
                                    return true;
                                }
                                return false;
                            }, this);
                        }
                        array.forEach(targetFieldNames, function(targetFieldName, index) {
                            if (targetFieldName.domain) {
                                var codeValue = null;
                                array.some(targetFieldName.domain.codedValues, function(codedValue) {
                                    if (value == codedValue.code) {
                                        codeValue = codedValue.name;
                                        return true;
                                    }
                                    return false;
                                }, this);
                                attributes[targetFieldName.name] = codeValue;
                            } else {
                                attributes[targetFieldName.name] = value;
                            }
                        }, this);
                    }, this);
                    defd.callback({
                        attributes : attributes
                    });
                } else if (features.length > 1) {
                    console.warn("More than one feature found on the layer " + queryParams.url);
                     array.forEach(queryParams.outFields, function(field, index) {
                        var targetFieldNames = queryParams.targetFields[index];
                        array.forEach(targetFieldNames, function(targetFieldName, index) {
                            attributes[targetFieldName.name] = null;
                        }, this);
                    }, this);
                    
                    defd.callback({
                        attributes : attributes
                    });
                } else {
                    console.warn("No feature found on the layer " + queryParams.url);
                    array.forEach(queryParams.outFields, function(field, index) {
                        var targetFieldNames = queryParams.targetFields[index];
                        array.forEach(targetFieldNames, function(targetFieldName, index) {
                            attributes[targetFieldName.name] = null;
                        }, this);
                    }, this);
                    
                    defd.callback({
                        attributes : attributes
                    });
                }
            }), lang.hitch(this, function(err) {
                console.warn("Unable to query polygon layer. ", err);
                array.forEach(queryParams.outFields, function(field, index) {
                        var targetFieldNames = queryParams.targetFields[index];
                        array.forEach(targetFieldNames, function(targetFieldName, index) {
                            attributes[targetFieldName.name] = null;
                        }, this);
                    }, this);
                    
                    defd.callback({
                        attributes : attributes
                    });
            }));
            return defd;
        }, _getLayerByName: function(layerName) {
            var defd = new Deferred(), layerInfos = this._mapManager.lrsMapLayer.layerInfos;
            var layer = array.filter(layerInfos, function(lyr){
            return (lyr.name == layerName);
            })[0];
            if (layer) {
                defd.callback({
                    isConfigured : true,
                    serviceUrl : this._mapManager.lrsMapLayerConfig.url,
                    layerId : layer.id
                });
            } else {
                if (this._operationalLayerInfos) {
                    var found = array.some(this._operationalLayerInfos, function(result, resultIndex) {
                        if (result[0]) {
                            return array.some(result[1].layerInfos, function(layerDetails) {
                                if (layerDetails.name.indexOf(layerName) > -1) {
                                    defd.callback({
                                        isConfigured : true,
                                        serviceUrl : result[0].url,
                                        layerId : layerDetails.id
                                    });
                                    return true;
                                }
                                return false;
                            }, this);
                        }
                        return false;
                    }, this);
                    if (!found) {
                        defd.callback({
                            isConfigured : false
                        });
                    }
                } else {
                    var defds = [], nonLrsOperationalLayers = [];
                    this._operationalLayerInfos = [];
                    array.forEach(this._mapManager.webMapData.operationalLayers, function(operationalLayer, index) {
                        if (operationalLayer.url != this._mapManager.lrsMapLayerConfig.url) {
                            var url = utils.appendUrlPath(operationalLayer.url, "/layers");
                            nonLrsOperationalLayers.push(operationalLayer);
                            defds.push(serviceInfoCache.get(url));
                        }
                    }, this);
                    if (defds.length === 0) {
                        defd.callback({
                            isConfigured : false
                        });
                        return defd;
                    }
                    new DeferredList(defds).then(lang.hitch(this, function(results) {
                        array.forEach(results, function(result, resultIndex) {
                            if (result[0]) {
                                this._operationalLayerInfos.push([nonLrsOperationalLayers[resultIndex], {
                                    layerInfos : result[1].layers
                                }]);
                            }
                        }, this);
                        var found = array.some(results, function(result, resultIndex) {
                            if (result[0]) {
                                return array.some(result[1].layers, function(layerDetails) {
                                    if (layerDetails.name.indexOf(layerName) > -1) {
                                        defd.callback({
                                            isConfigured : true,
                                            serviceUrl : nonLrsOperationalLayers[resultIndex].url,
                                            layerId : layerDetails.id
                                        });
                                        return true;
                                    }
                                    return false;
                                }, this);
                            }
                            return false;
                        }, this);
                        if (!found) {
                            defd.callback({
                                isConfigured : false
                            });
                        }
                    }));
                }
            }
            return defd;
        }, populateAttributesFromMasterStreetTable: function(targetLayer, value) {
            var addressConfig = this._mapManager.addressInfo.config, targetFields = [], defd = new Deferred(), defds = [], masterStreetNameInfo = this._mapManager.addressInfo.masterStreetNameInfo, queryUrl = utils.appendUrlPath(masterStreetNameInfo.serviceLayer.url, "/" + masterStreetNameInfo.layerId);
            var outFields = [], targetFields = [], targetFieldMapping=[], attributes = {};
            serviceInfoCache.get(queryUrl).then(lang.hitch(this, function(layerInfo) {
                var layerFields = layerInfo.fields;
                for (var sourceField in addressConfig.masterStreetNameTable.attributeMapping) {
                    var srcField = array.filter(layerFields, function(fld){
                    return (fld.name == sourceField);
                    })[0];

                    var fields = addressConfig.masterStreetNameTable.attributeMapping[sourceField];
                    var fieldMapping = array.filter(fields, function(field) {
                        return (field.indexOf(targetLayer.name) >= 0);
                    });
                    if (fieldMapping && fieldMapping.length > 0) {
                        fieldMapping = array.map(fieldMapping, function(field) {
                            return field.replace(targetLayer.name + ".", "");
                        });
                        targetFieldMapping = array.filter(targetLayer.fields, function(field) {
                            return fieldMapping.indexOf(field.name) != -1;
                        });
                        outFields.push(srcField);
                        targetFields.push(targetFieldMapping); 
                    }
                }
                if (targetFields.length > 0) {
                    var queryParams = {
                        url : queryUrl,
                        outFields : outFields,
                        targetFields : targetFields
                    };
                    this._queryMasterStreetTable(queryParams, value).then(lang.hitch(this, function(results) {
                        defd.callback({
                            attributes : results.attributes
                        });
                    }));
                }
            }), lang.hitch(this, function(err) {
                console.warn("Not able to query " + polygonLayer.layerUrl);
            }));
            return defd;
        }, _queryMasterStreetTable: function(queryParams, value) {
            var masterStreetNameInfo = this._mapManager.addressInfo.masterStreetNameInfo, defd = new Deferred(), map = this._mapManager.map, query = new Query(), attributes = {}, addressConfig = this._mapManager.addressInfo.config;
            var outFields = array.map(queryParams.outFields, function(field) {
                return field.name;
            });
            query.outFields = outFields;
            query.outSpatialReference = map.spatialReference;
            query.where = "UPPER( " + addressConfig.masterStreetNameTable.fullStreetNameField + " ) = '" + value.toUpperCase() + "'";
            query.returnGeometry = false;
            var queryUrl = queryParams.url;
            new QueryTask(queryUrl).execute(query).then(lang.hitch(this, function(featureSet) {
                var features = featureSet.features;
                if (features.length == 1) {
                    array.forEach(queryParams.outFields, function(field, index) {
                        var targetFieldNames = queryParams.targetFields[index];
                        var value = features[0].attributes[field.name];
                        if (field.domain) {
                            array.some(field.domain.codedValues, function(codedValue) {
                                if (value == codedValue.name) {
                                    value = codedValue.code;
                                    return true;
                                }
                                return false;
                            }, this);
                        }
                        array.forEach(targetFieldNames, function(targetFieldName, index) {
                            if (targetFieldName.domain) {
                                var codeValue = null;
                                array.some(targetFieldName.domain.codedValues, function(codedValue) {
                                    if (value == codedValue.code) {
                                        codeValue = codedValue.name;
                                        return true;
                                    }
                                    return false;
                                }, this);
                                attributes[targetFieldName.name] = codeValue;
                            } else {
                                attributes[targetFieldName.name] = value;
                            }
                        }, this);
                    }, this);
                    defd.callback({
                        attributes : attributes
                    });
                } else if (features.length > 1) {
                    console.warn("More than one feature found on the layer " + queryParams.url);
                     array.forEach(queryParams.outFields, function(field, index) {
                        var targetFieldNames = queryParams.targetFields[index];
                        array.forEach(targetFieldNames, function(targetFieldName, index) {
                            attributes[targetFieldName.name] = null;
                        }, this);
                    }, this);
                    
                    defd.callback({
                        attributes : attributes
                    });
                } else {
                    console.warn("No feature found on the layer " + queryParams.url);
                     array.forEach(queryParams.outFields, function(field, index) {
                        var targetFieldNames = queryParams.targetFields[index];
                        array.forEach(targetFieldNames, function(targetFieldName, index) {
                            attributes[targetFieldName.name] = null;
                        }, this);
                    }, this);
                    
                    defd.callback({
                        attributes : attributes
                    });
                }
            }), lang.hitch(this, function(err) {
                console.warn("Unable to query polygon layer. ", err);
                 array.forEach(queryParams.outFields, function(field, index) {
                        var targetFieldNames = queryParams.targetFields[index];
                        array.forEach(targetFieldNames, function(targetFieldName, index) {
                            attributes[targetFieldName.name] = null;
                        }, this);
                    }, this);
                    
                    defd.callback({
                        attributes : attributes
                    });
            }));

            return defd;
        }

        }); // end declare
}); // end define
