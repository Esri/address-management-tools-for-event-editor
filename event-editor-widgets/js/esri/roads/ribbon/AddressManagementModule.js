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
    "dojo/_base/lang",
    "dojo/_base/window",
    "dojo/_base/Deferred", 
    "dojo/_base/xhr",
    "dojo/DeferredList",
    "dojo/dom-construct",
    "dojo/dom-style",
    "dijit/MenuItem",
    "dojox/widget/Standby",
    "esri/toolbars/draw",
    "esri/tasks/QueryTask", 
    "esri/layers/FeatureLayer", 
    "esri/urlUtils", 
    "roads/ribbon/RibbonModule",
    "roads/addressManagement/Fishbone",
    "roads/addressManagement/tasks/AddressManagementTask",
    "roads/tasks/ConflictTask",
    "roads/tasks/serviceInfoCache",
    "roads/utils",
    "roads/util/layer",
    "roads/util/version",
    "roads/map",
    "dojo/i18n!roads/ribbon/nls/res_AddressManagementModule",
    "dojo/i18n!roads/addressManagement/nls/res_AddressConflictTask"
], function(
    array, connect, declare, lang, win,Deferred, xhr, DeferredList, domConstruct, domStyle, MenuItem, Standby, Draw, QueryTask, FeatureLayer, 
    urlUtils, RibbonModule, Fishbone, AddressManagementTask, ConflictTask, serviceInfoCache, utils, layerUtils, versionUtils, mapUtils, bundle, bundle1
) {

    /*
     * Ribbon module for address management tools.
     */

    (function() {
        layerUtils.getFeatureServerUrl = function(serviceUrl, params) {
            var folderServiceName = layerUtils.getFolderServiceName(serviceUrl, params);
            return serviceUrl.substring(0, params.start + layerUtils.REST_SERVICES.length) + folderServiceName + 'FeatureServer/';
        };
    })();

    (function() {
        mapUtils.extend({

            // The different kind of services a layer can come from and we should apply the gdb version to
            serviceTypes : {
                LRS : "LRS",
                REDLINE : "REDLINE",
                MASTERSTREETTABLE : "MASTERSTREETTABLE",
                SITEADDRESSPOINT : "SITEADDRESSPOINT"
            },

            _setTaskGDBVersion : function(taskClass, config) {
                var mapManager = this;
                var oldPostscript = taskClass.prototype.postscript;
                taskClass.extend({
                    postscript : function(url, options) {
                        // Call the overridden function
                        lang.isFunction(oldPostscript) ? oldPostscript.apply(this, arguments) : this.inherited("postscript", arguments);
                        // Check if the URL is for the LRS map/feature service (or sublayer)
                        if (mapManager._matchesLrsServiceUrl(url) || mapManager._matchesRedlineServiceUrl(url) || mapManager._matchesMasterStreetTableAddressServiceUrl(url) || mapManager._matchesSiteAddressPointAddressServiceUrl(url)) {
                            // Only set the GDB version if no other version is specified
                            if (!options || options.gdbVersion == null) {
                                // Only set the GDB version if the version parameter is
                                // not the same as the version in the MXD that's published.
                                // Workaround for core bug; still waiting for NIM# from core.
                                var layerGdbVersion;
                                var serviceType;
                                if (taskClass === QueryTask) {
                                    var layerId;
                                    if (mapManager._matchesLrsServiceUrl(url)) {
                                        var urlPath = urlUtils.urlToObject(url).path;
                                        layerId = urlPath.substring(urlPath.lastIndexOf("/") + 1);
                                        serviceType = mapManager.serviceTypes.LRS;
                                    } else if (mapManager._matchesRedlineServiceUrl(url)) {
                                        // Documented that the redline layer (if published in a separate service from the other LRS layers) should be published using the same GDB version as the LRS map service. (TFS 48200)
                                        serviceType = mapManager.serviceTypes.REDLINE;
                                    } else if (mapManager._matchesMasterStreetTableAddressServiceUrl(url)) {
                                        serviceType = mapManager.serviceTypes.MASTERSTREETTABLE;
                                    } else {
                                        serviceType = mapManager.serviceTypes.SITEADDRESSPOINT;
                                    }
                                    layerGdbVersion = mapManager._getLayerVersion(layerId, serviceType);
                                }
                                if (taskClass !== QueryTask || (layerGdbVersion && layerGdbVersion != config.gdbVersion)) {
                                    this.gdbVersion = config.gdbVersion;
                                }
                            }
                        }
                    }
                });
            },

            /*
             * Applies a GDB version to all existing feature layers in the map that
             * are part of the LRS map/feature services.
             */
            _setExistingFeatureLayersGDBVersion : function(version) {
                var layerIds = this.map.graphicsLayerIds;
                var serviceTypes = this.serviceTypes;
                array.forEach(layerIds, function(graphicsLayerId) {
                    var layer = this.map.getLayer(graphicsLayerId);
                    if ( layer instanceof FeatureLayer && (this._matchesLrsServiceUrl(layer.url) || this._matchesRedlineServiceUrl(layer.url) || this._matchesMasterStreetTableAddressServiceUrl(layer.url) || this._matchesSiteAddressPointAddressServiceUrl(layer.url)) && layer.setGDBVersion) {
                        // Only set the GDB version if the version parameter is
                        // not the same as the version in the MXD that's published.
                        // Workaround for core bug; still waiting for NIM# from core.
                        var layerId;
                        var serviceType;
                        if (this._matchesLrsServiceUrl(layer.url)) {
                            var urlPath = urlUtils.urlToObject(layer.url).path;
                            layerId = urlPath.substring(urlPath.lastIndexOf("/") + 1);
                            serviceType = serviceTypes.LRS;
                        } else if (this._matchesRedlineServiceUrl(layer.url)) {
                            // Documented that the redline layer (if published in a separate service from the other LRS layers) should be published using the same GDB version as the LRS map service. (TFS 48200)
                            serviceType = serviceTypes.REDLINE;
                        } else if (this._matchesMasterStreetTableAddressServiceUrl(layer.url)) {
                            serviceType = serviceTypes.MASTERSTREETTABLE;
                        } else {
                            serviceType = serviceTypes.SITEADDRESSPOINT;
                        }
                        layerGdbVersion = this._getLayerVersion(layerId, serviceType);
                        if (layerGdbVersion && layerGdbVersion != version) {
                            layer.setGDBVersion(version);
                        } else {
                            layer.setGDBVersion(null);
                        }
                    }
                }, this);
            },

            /*
             * Applies a GDB version to all future instances of a given feature layer class
             * that are based on the active LRS map/feature services.
             * This method relies on the mechanics of dojo.declare to intercede in
             * the construction of all class instances.
             */
            _setFeatureLayerGDBVersion : function(featureLayerClass, config) {
                var mapManager = this;
                var oldPostscript = featureLayerClass.prototype.postscript;
                featureLayerClass.extend({
                    postscript : function(url, options) {
                        // Call the overridden function
                        lang.isFunction(oldPostscript) ? oldPostscript.apply(this, arguments) : this.inherited("postscript", arguments);
                        // Check if the URL is for the LRS map/feature service (or sublayer)
                        if (mapManager._matchesLrsServiceUrl(url) || mapManager._matchesRedlineServiceUrl(url) || mapManager._matchesMasterStreetTableAddressServiceUrl(url) || mapManager._matchesSiteAddressPointAddressServiceUrl(url)) {
                            // Only set the GDB version if no other version is specified
                            if (!options || options.gdbVersion == null) {
                                // Only set the GDB version if the version parameter is
                                // not the same as the version in the MXD that's published.
                                // Workaround for core bug; still waiting for NIM# from core.
                                var layerId;
                                var serviceType;
                                if (mapManager._matchesLrsServiceUrl(url)) {
                                    var urlPath = urlUtils.urlToObject(url).path;
                                    layerId = urlPath.substring(urlPath.lastIndexOf("/") + 1);
                                    serviceType = mapManager.serviceTypes.LRS;
                                } else if (mapManager._matchesRedlineServiceUrl(url)) {
                                    // Documented that the redline layer (if published in a separate service from the other LRS layers) should be published using the same GDB version as the LRS map service. (TFS 48200)
                                    serviceType = mapManager.serviceTypes.REDLINE;
                                } else if (mapManager._matchesMasterStreetTableAddressServiceUrl(url)) {
                                    serviceType = mapManager.serviceTypes.MASTERSTREETTABLE;
                                } else {
                                    serviceType = mapManager.serviceTypes.SITEADDRESSPOINT;
                                }
                                layerGdbVersion = mapManager._getLayerVersion(layerId, serviceType);
                                if (layerGdbVersion && layerGdbVersion != config.gdbVersion) {
                                    this.setGDBVersion(config.gdbVersion);
                                }
                            }
                        }
                    }
                });
            },

            /*
             * Returns the published GDB version name of a layer given a layer ID.
             * Returns null if the layer ID is not found or the layer data is not versioned.
             */
            _getLayerVersion : function(layerId, serviceType) {

                var matchingLayer = null;
                if (serviceType == this.serviceTypes.MASTERSTREETTABLE) {
                    matchingLayer = this.addressInfo.masterStreetNameInfo.featureLayer;
                    return matchingLayer && matchingLayer.isDataVersioned ? versionUtils.getCommonVersionName(this.lrsServiceConfig) : null;
                } else if (serviceType == this.serviceTypes.SITEADDRESSPOINT) {
                    matchingLayer = this.addressInfo.siteAddressPointsInfo.featureLayer;
                    return matchingLayer && matchingLayer.isDataVersioned ? versionUtils.getCommonVersionName(this.lrsServiceConfig) : null;
                } else if (serviceType == this.serviceTypes.REDLINE) {
                    if (this.lrsServiceConfig.redlineInfos && this.lrsServiceConfig.redlineInfos.length > 0) {
                        matchingLayer = this.lrsServiceConfig.redlineInfos[0];
                    }
                } else {
                    matchingLayer = utils.first(this.lrsServiceConfig.allLayers.concat(this.lrsServiceConfig.nonLRSLayers), function(layer) {
                        return layer.id == layerId;
                    }, this);
                }
                return matchingLayer && matchingLayer.isDataVersioned ? matchingLayer.versionName : null;
            },

            /*
             * Determines if the specified URL is based on Addressing map or feature service.
             */
            _matchesMasterStreetTableAddressServiceUrl : function(url) {
                if (!this.addressInfo.masterStreetNameInfo.serviceLayer) {
                    return false;
                }
                var masterStreetNameMapServiceUrl = urlUtils.urlToObject(this.addressInfo.masterStreetNameInfo.serviceLayer.url).path;
                return this._matchesUrlAndLayerId(url, masterStreetNameMapServiceUrl, this.addressInfo.masterStreetNameInfo.layerId);
            },

            _matchesSiteAddressPointAddressServiceUrl : function(url) {
                if (!this.addressInfo.siteAddressPointsInfo.serviceLayer) {
                    return false;
                }
                var siteAddressPointMapServiceUrl = urlUtils.urlToObject(this.addressInfo.siteAddressPointsInfo.serviceLayer.url).path;
                return this._matchesUrlAndLayerId(url, siteAddressPointMapServiceUrl, this.addressInfo.siteAddressPointsInfo.layerId);
            },

            /*
             * Determines if the specified URL is based on the active Redline map or feature service.
             */
            _matchesRedlineServiceUrl : function(url) {
                if ((!this.redlineInfo) || !this.redlineInfo.serviceLayer) {
                    return false;
                }
                var redlineMapServiceUrl = urlUtils.urlToObject(this.redlineInfo.serviceLayer.url).path;
                return this._matchesUrlAndLayerId(url, redlineMapServiceUrl, this.redlineInfo.layerId);
            },

            /*
             * Compares the urlToTest to the compareUrl (for featureserver and mapserver)
             * If the urlToTest matches and has no layerID in it then return true
             * If the urlToTest matches and has a layerId in it then only return true if the layerId matches compareLayerId
             */
            _matchesUrlAndLayerId : function(urlToTest, compareUrl, compareLayerId) {
                urlToTest = urlToTest ? urlToTest.toUpperCase() : "";
                compareUrl = compareUrl ? compareUrl.toUpperCase() : "";

                // Check if it matches mapserver
                var matchesUrl = urlToTest.indexOf(compareUrl) === 0;
                if (!matchesUrl) {
                    // Check if it matches featureserver
                    compareUrl = compareUrl.replace(/\/MAPSERVER$/i, "/FEATURESERVER");
                    matchesUrl = urlToTest.indexOf(compareUrl) === 0;
                }

                // If there is a layer ID to compare to check that. If not assume it matches.
                var matchesLayerId = true;
                if (matchesUrl && compareLayerId != null) {
                    var urlSplit = urlToTest.split(compareUrl);
                    if (urlSplit && urlSplit.length > 1) {
                        var layerIdSplit = urlSplit[1].split("/");
                        // if the url contains a layer ID then compare it
                        if (layerIdSplit && layerIdSplit.length > 1) {
                            matchesLayerId = compareLayerId == layerIdSplit[1];
                        }
                    }
                }

                return matchesUrl && matchesLayerId;
            },
        });
    })();

    return declare("roads.ribbon.AddressManagementModule", [RibbonModule], {
        _blockRangeLayer : null,
        configPath : "address_management.json",
        _addressTask : null,
        _masterStreetNameTable : null,
        _standby : null,
        _layerDetected : true,
        _fishboneWidget : null,
        blockRangeLayer : null,

        onMapReady : function() {
            // Load the app configuration
            this._loadConfig(this.configPath).then(lang.hitch(this, function(config) {
                var ribbon = this.ribbon, mgr = ribbon.mapManager;

                mgr.addressConflictTask = new ConflictTask({
                    mapManager : this.ribbon.mapManager,
                    config : this.ribbon.config,
                    bundle : bundle1
                });
                ribbon.config = utils.deepMixin(this.ribbon.config, config);
                mgr.addressInfo.config = config;
                var task = new AddressManagementTask({
                    mapManager : mgr
                });
                this._fishboneWidget = new Fishbone({
                    config : ribbon.config,
                    mapManager : mgr,
                    standby : null
                });
                this._fishboneWidget.postCreate();
                this._addressTask = task;
                domStyle.set(this.ribbon._addressManagementDiv, {
                    visibility : "visible",
                    display : ""
                });
                this._displayMessage(bundle.loading);
                blockRangeLayer = this.getFeatureLayerByName(config.blockRangeLayer.layerName);
                if (!blockRangeLayer) {

                    domStyle.set(this.ribbon._blockRangeButton, {
                        visibility : "visible",
                        display : "block"
                    });
                    domStyle.set(this.ribbon._blockRangeButton, {
                        opacity : "0.5",
                        "pointer-events" : "none"
                    });

                    domStyle.set(this.ribbon._siteAddressButton, {
                        visibility : "visible",
                        display : ""
                    });
                    domStyle.set(this.ribbon._siteAddressButton, {
                        opacity : "0.5",
                        "pointer-events" : "none"
                    });
                    domStyle.set(this.ribbon._streetNameButton, {
                        visibility : "visible",
                        display : ""
                    });
                    domStyle.set(this.ribbon._streetNameButton, {
                        opacity : "0.5",
                        "pointer-events" : "none"
                    });
                    if (this._standby) {
                        this._standby.hide();
                    }
                    console.log("Unable to load the feature layer for Site Address");
                    this.showMessage(bundle.loadFeatureLayer);
                } else {
                    var eventLayerMetadata = this.ribbon.mapManager.lrsServiceConfig.eventLayers, selectEventLayer;
                    if (eventLayerMetadata.length > 0) {
                        selectedEventLayer = array.filter(eventLayerMetadata, function(lyr){
                        return (lyr.name == this.ribbon.config.blockRangeLayer.layerName);
                        }, this)[0];
                    }
                    this.ribbon.mapManager.addressInfo.blockRangeInfo = {
                        eventLayerInfo : selectedEventLayer,
                        serviceLayer : this.ribbon.mapManager.lrsMapLayer,
                        layerId : blockRangeLayer.id
                    };
                    domStyle.set(this.ribbon._blockRangeButton, {
                        visibility : "visible",
                        display : "block"
                    });
                    this._isSiteAddressLayerConfigured(config.siteAddressPoints.layerName).then(lang.hitch(this, function(result) {
                        if (result.isConfigured) {
                            this._addressTask.detectFeatureServer(result.serviceUrl, result.layerId).then(lang.hitch(this, function(result) {
                                if (result.detected) {
                                    domStyle.set(this.ribbon._siteAddressButton, {
                                        visibility : "visible",
                                        display : ""
                                    });
                                    domStyle.set(this.ribbon._selectBlockRangeFishbone, {
                                        visibility : "visible",
                                        display : ""
                                    });
                                    domStyle.set(this.ribbon._clearBlockRangeFishbone, {
                                        visibility : "visible",
                                        display : ""
                                    });
                                } else {
                                    this._layerDetected = false;
                                    domStyle.set(this.ribbon._siteAddressButton, {
                                        visibility : "visible",
                                        display : ""
                                    });
                                    domStyle.set(this.ribbon._siteAddressButton, {
                                        opacity : "0.5",
                                        "pointer-events" : "none"
                                    });
                                    domStyle.set(this.ribbon._selectBlockRangeFishbone, {
                                        visibility : "visible",
                                        display : ""
                                    });
                                    domStyle.set(this.ribbon._selectBlockRangeFishbone, {
                                        opacity : "0.5",
                                        "pointer-events" : "none"
                                    });
                                    domStyle.set(this.ribbon._clearBlockRangeFishbone, {
                                        visibility : "visible",
                                        display : ""
                                    });
                                    domStyle.set(this.ribbon._clearBlockRangeFishbone, {
                                        opacity : "0.5",
                                        "pointer-events" : "none"
                                    });
                                }
                            }), lang.hitch(this, function(err) {
                                this._layerDetected = false;
                                domStyle.set(this.ribbon._siteAddressButton, {
                                    visibility : "visible",
                                    display : ""
                                });
                                domStyle.set(this.ribbon._siteAddressButton, {
                                    opacity : "0.5",
                                    "pointer-events" : "none"
                                });

                                domStyle.set(this.ribbon._selectBlockRangeFishbone, {
                                    visibility : "visible",
                                    display : ""
                                });
                                domStyle.set(this.ribbon._selectBlockRangeFishbone, {
                                    opacity : "0.5",
                                    "pointer-events" : "none"
                                });
                                domStyle.set(this.ribbon._clearBlockRangeFishbone, {
                                    visibility : "visible",
                                    display : ""
                                });
                                domStyle.set(this.ribbon._clearBlockRangeFishbone, {
                                    opacity : "0.5",
                                    "pointer-events" : "none"
                                });
                            }));
                        } else {
                            this._layerDetected = false;
                            domStyle.set(this.ribbon._siteAddressButton, {
                                visibility : "visible",
                                display : ""
                            });
                            domStyle.set(this.ribbon._siteAddressButton, {
                                opacity : "0.5",
                                "pointer-events" : "none"
                            });

                            domStyle.set(this.ribbon._selectBlockRangeFishbone, {
                                visibility : "visible",
                                display : ""
                            });
                            domStyle.set(this.ribbon._selectBlockRangeFishbone, {
                                opacity : "0.5",
                                "pointer-events" : "none"
                            });
                            domStyle.set(this.ribbon._clearBlockRangeFishbone, {
                                visibility : "visible",
                                display : ""
                            });
                            domStyle.set(this.ribbon._clearBlockRangeFishbone, {
                                opacity : "0.5",
                                "pointer-events" : "none"
                            });
                        }
                        this._isMasterStreetTableConfigured(config.masterStreetNameTable.tableName).then(lang.hitch(this, function(result) {

                            if (result.isConfigured) {
                                this._masterStreetNameTable = result.table;
                                var masterStreetNameInfo = this.ribbon.mapManager.addressInfo.masterStreetNameInfo;
                                this._addressTask.detectFeatureServer(masterStreetNameInfo.serviceLayer.url, masterStreetNameInfo.layerId).then(lang.hitch(this, function(result) {
                                    if (this._standby) {
                                        this._standby.hide();
                                    }

                                    if (result.detected) {
                                        domStyle.set(this.ribbon._streetNameButton, {
                                            visibility : "visible",
                                            display : ""
                                        });
                                        this._masterStreetNameTable = result.layer;
                                    } else {
                                        this._layerDetected = false;
                                        domStyle.set(this.ribbon._streetNameButton, {
                                            visibility : "visible",
                                            display : ""
                                        });
                                        domStyle.set(this.ribbon._streetNameButton, {
                                            opacity : "0.5",
                                            "pointer-events" : "none"
                                        });
                                    }
                                }), lang.hitch(this, function(err) {
                                    if (this._standby) {
                                        this._standby.hide();
                                    }
                                    this._layerDetected = false;
                                    domStyle.set(this.ribbon._streetNameButton, {
                                        visibility : "visible",
                                        display : ""
                                    });
                                    domStyle.set(this.ribbon._streetNameButton, {
                                        opacity : "0.5",
                                        "pointer-events" : "none"
                                    });
                                }));
                            } else {
                                if (this._standby) {
                                    this._standby.hide();
                                }
                                this._layerDetected = false;
                                domStyle.set(this.ribbon._streetNameButton, {
                                    visibility : "visible",
                                    display : ""
                                });
                                domStyle.set(this.ribbon._streetNameButton, {
                                    opacity : "0.5",
                                    "pointer-events" : "none"
                                });

                            }
                            if (!this._layerDetected) {
                                if (this._standby) {
                                    this._standby.hide();
                                }
                                console.log("Unable to load the feature layer for Site Address");
                                this.showMessage(bundle.loadFeatureLayer);

                            }
                        }));
                    }));
                }
            }), lang.hitch(this, function(err) {
                if (err.status && err.status == 404) {
                    domStyle.set(this.ribbon._addressManagementDiv, {
                        visibility : "hidden",
                        display : "none"
                    });
                } else {
                    domStyle.set(this.ribbon._addressManagementDiv, {
                        visibility : "hidden",
                        display : "none"
                    });
                    console.log("Unable to load the application configuration. " + (err || ""));
                    this.showMessage(bundle.loadConfig);
                }
            }));
        },

        _isMasterStreetTableConfigured : function(tableName) {
            var defd = new Deferred(), siteAddressLayer = this.getFeatureLayerByName(tableName);
            var url = this.ribbon.mapManager.lrsMapLayerConfig.url;
            this._addressTask.getTableInformation(url, tableName).then(lang.hitch(this, function(result) {
                if (result.hasStreetNameTable) {
                    this.ribbon.mapManager.addressInfo.masterStreetNameInfo = {
                        serviceLayer : this.ribbon.mapManager.lrsMapLayer,
                        layerId : result.table.id
                    };
                    defd.callback({
                        isConfigured : true,
                        table : result.table
                    });
                } else {
                    // Look through other operational layers
                    var defds = [], nonLrsOperationalLayers = [];
                    array.forEach(this.ribbon.mapManager.webMapData.operationalLayers, function(operationalLayer, index) {
                        if (operationalLayer.url != this.ribbon.mapManager.lrsMapLayerConfig.url) {
                            var url = utils.appendUrlPath(operationalLayer.url, "/layers");
                            nonLrsOperationalLayers.push(operationalLayer);
                            defds.push(serviceInfoCache.get(url.replace(/\/MapServer$/i, "/FeatureServer")));
                        }
                    }, this);
                    if (defds.length === 0) {
                        defd.callback({
                            isConfigured : false
                        });
                        return defd;
                    }
                    new DeferredList(defds).then(lang.hitch(this, function(results) {
                        var found = array.some(results, function(result, resultIndex) {
                            if (result[0]) {
                                return array.some(result[1].tables, function(tableDetails) {
                                    if (tableDetails.name == tableName) {
                                        this.ribbon.mapManager.addressInfo.masterStreetNameInfo = {
                                            serviceLayer : nonLrsOperationalLayers[resultIndex].layerObject,
                                            layerId : tableDetails.id,
                                            featureLayer : tableDetails
                                        };
                                        defd.callback({
                                            isConfigured : true,
                                            table : tableDetails
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
            }));
            return defd;
        },

        _isSiteAddressLayerConfigured : function(layerName) {
            var defd = new Deferred(), siteAddressLayer = this.getFeatureLayerByName(layerName);
            if (siteAddressLayer) {
                this.ribbon.mapManager.addressInfo.siteAddressPointsInfo = {
                    serviceLayer : this.ribbon.mapManager.lrsMapLayer,
                    layerId : siteAddressLayer.id
                };
                defd.callback({
                    isConfigured : true,
                    serviceUrl : this.ribbon.mapManager.lrsMapLayerConfig.url,
                    layerId : siteAddressLayer.id
                });
            } else {
                // Look through other operational layers
                var defds = [], nonLrsOperationalLayers = [];
                array.forEach(this.ribbon.mapManager.webMapData.operationalLayers, function(operationalLayer, index) {
                    if (operationalLayer.url != this.ribbon.mapManager.lrsMapLayerConfig.url) {
                        var url = utils.appendUrlPath(operationalLayer.url, "/layers");
                        nonLrsOperationalLayers.push(operationalLayer);
                        defds.push(serviceInfoCache.get(url.replace(/\/MapServer$/i, "/FeatureServer")));
                    }
                }, this);
                if (defds.length === 0) {
                    defd.callback({
                        isConfigured : false
                    });
                    return defd;
                }
                new DeferredList(defds).then(lang.hitch(this, function(results) {
                    var found = array.some(results, function(result, resultIndex) {
                        if (result[0]) {
                            return array.some(result[1].layers, function(layerDetails) {
                                if (layerDetails.name.indexOf(layerName) > -1) {
                                    this.ribbon.mapManager.addressInfo.siteAddressPointsInfo = {
                                        serviceLayer : nonLrsOperationalLayers[resultIndex].layerObject,
                                        layerId : layerDetails.id,
                                        featureLayer : layerDetails
                                    };
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
            return defd;
        },

        /*
         * Loads the app config JSON file.
         * Returns Deferred.
         */
        _loadConfig : function(path) {
            var deferred = new Deferred();
            // Append a timestamp to prevent browser caching
            path += (path.indexOf("?") == -1 ? "?" : "&") + "_ts=" + (new Date().getTime());
            xhr.get({
                url : path,
                handleAs : "json",
                load : function(json) {
                    var config = json || {};
                    deferred.callback(config);
                },
                error : function(err) {
                    console.log("Unable to load the application configuration. " + (err || ""));
                    deferred.errback(err);
                }
            });
            return deferred;
        },

        _drawEnd : function(geometry) {
            this._fishboneWidget.getFishboneAtPoint(geometry);
        },

        _drawFishboneGraphics : function() {
            if (this.ribbon.mapManager.selectionManager._activeTool) {
                this.ribbon._setVisualState(this.ribbon._selectBlockRangeFishbone, false, false);
            } else {
                this.ribbon._setVisualState(this.ribbon._selectBlockRangeFishbone, true, false);
            }
            var drawEndHandler = lang.hitch(this, "_drawEnd");
            var toolInfo = {
                button : this.ribbon._selectBlockRangeFishbone,
                drawType : Draw.POINT,
                drawCallback : drawEndHandler,
                isRibbonTool : true
            };
            connect.publish("/esri/roads/ribbon/button", [toolInfo]);
        },

        _clearFishboneGraphics : function() {
            this._fishboneWidget.clearFishboneLayer();
        },

        /*Returns feature layer id*/
        getFeatureLayerByName : function(layerName) {
            var layerInfos = this.ribbon.mapManager.lrsMapLayer.layerInfos;
            var layer = array.filter(layerInfos, function(lyr){
            return (lyr.name ==layerName);
            }, this)[0];
            return layer;
        },

        /*
         * Displays message using Standby. Sets color to empty string for
         * transparent background.
         */
        _displayMessage : function(text, color) {
            var standby = this._standby;
            if (!standby) {
                standby = new Standby({
                    target : this.ribbon._addressManagementDiv,
                    centerIndicator : "text"
                }, domConstruct.create("div", null, win.body()));
                this._standby = standby;
                standby.startup();
            }
            standby.set("color", color || "");
            standby.set("text", text);
            standby.show();
        },

        destroy : function() {
            var ribbon = this.ribbon;
            this._fishboneWidget = null;
        },

        _showAddBlockRangeWidget : function() {
            var addressRangeStringFields = this._checkAddressRangeFields();
            if (addressRangeStringFields && addressRangeStringFields.length > 0) {
                alert(bundle.addressRangeFieldsError + "\n" + addressRangeStringFields.join("\n"));

            } else {
                this.ribbon.launchWidget("roads.addressManagement.AddBlockRange", {
                    addressConfig : this.ribbon.config,
                    masterStreetNameTable : this._masterStreetNameTable
                });
            }
        },

        _showAddSiteAddressWidget : function() {
            var addressRangeStringFields = this._checkAddressRangeFields();
            if (addressRangeStringFields && addressRangeStringFields.length > 0) {
                alert(bundle.addressRangeFieldsError + "\n" + addressRangeStringFields.join("\n"));

            } else {
                this.ribbon.launchWidget("roads.addressManagement.AddSiteAddresses", {
                    addressConfig : this.ribbon.config,
                    masterStreetNameTable : this._masterStreetNameTable
                });
            }
        },

        _showAddStreetNamesWidget : function() {
            this.ribbon.launchWidget("roads.addressManagement.AddStreetNames", {
                addressConfig : this.ribbon.config,
                masterStreetNameTable : this._masterStreetNameTable
            });
        },

        _checkAddressRangeFields : function() {
            var addressRangeStringFields = [], selectedEventLayer = this.ribbon.mapManager.addressInfo.blockRangeInfo.eventLayerInfo;
            if (selectedEventLayer) {
                array.forEach(selectedEventLayer.fields, function(field) {
                    if (field.name == this.ribbon.config.blockRangeLayer.leftFromAddressField || field.name == this.ribbon.config.blockRangeLayer.rightFromAddressField || field.name == this.ribbon.config.blockRangeLayer.leftToAddressField || field.name == this.ribbon.config.blockRangeLayer.rightToAddressField) {
                        var isStringField = utils.isStringField([field], field.name);
                        if (isStringField) {
                            addressRangeStringFields.push(field.name);
                        }
                    }
                }, this);
            }
            return addressRangeStringFields;
        }
    });
    // end declare

});  // end define
