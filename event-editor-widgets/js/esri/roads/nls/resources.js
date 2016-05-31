define({root:{
    build: "[BUILD]",
    version: "10.4.1",
    app: {
        title: "Event Editor",
        helpUrl: "http://resources.arcgis.com/en/help/main/10.2/index.html#/Overview_of_the_Roadway_Characteristics_Editor_user_guide/02230000004v000000/"
    },
    login: {
        title: "Event Editor",
        subtitle: "",
        username: "User name:",
        password: "Password:",
        login: "Sign In",
        loginBusy: "Signing In"
    },
    banner: {
        title: "v${0}",
        titlePrefix: "Event Editor",
        user: "${0}",
        logout: "Sign Out",
        helpTooltip: "Help"
    },
    ribbon: {
        map: {
            label: "Map",
            navigate: {
                label: "Navigate",
                pan: "Explore",
                panTooltip: "Explore the Map",
                zoomInitialTooltip: "Zoom to Initial Extent",
                zoomPreviousTooltip: "Zoom to Previous Extent",
                zoomNextTooltip: "Zoom to Next Extent",
                zoomInTooltip: "Zoom In",
                zoomOutTooltip: "Zoom Out",
                mapScaleItem: "1 : ${0}",
                mapScaleTooltip: "Set the Map Scale"
            },
            find: {
                label: "Find",
                findRoute: "Find Route",
                findAddress: "Find Address",
                findRouteLabel: "Find<br>Route",
                findAddressLabel: "Find<br>Address",
                advancedFindRouteTooltip: "Advanced Find Route",
                route: "Route",
                event: "Event",
                address: "Address",
                place: "Place",
                network: "Network (LRM):",
                routePrompt: "Route ID",
                eventPrompt: "Event ID",
                addressPrompt: "Address",
                placePrompt: "Place name"
            },
            contents: {
                label: "Contents",
                layers: "Layers",
                layersTooltip: "View Map Contents and Legend",
                basemap: "Basemap",
                basemapTooltip: "Change Basemap",
                addData: "Add Data",
                addDataTooltip: "Add Data Layers to the Map",
                addDataDGN: "DGN",
                addDataDWG: "DWG",
                addDataShapefile: "Shapefile",
                addDataCSV: "CSV / Excel File",
                addDataService: "Service URL",
                addDataSearch: "Search",
                viewDate: "View Date:",
                viewDateLabel: "View Date: ${0}",
                timeSlider: "Time Slider"
            },
            identify: {
                label: "Identify",
                identify: "Identify",
                identifyTooltip: "Identify Features on the Map",
                advancedIdentifyTooltip: "Advanced Identify",
                identifyRouteLocationsTooltip: "Identify Route Locations"
            }
        },
        edit: {
            label: "Edit",
            versioning: {
                label: "Versioning",
                reconcileAndPost: "Reconcile<br>& Post",
                version: "Version:",
                versionNotSpecified: "n/a",
                createVersionTooltip: "Create New Version",
                deleteVersionTooltip: "Delete Selected Version"
            },
            selection: {
                label: "Selection",
                select: "Select",
                selectByRoute: "Select by Route",
                selectByAttribute: "Select by Attributes",
                selectByProximity: "Select by Proximity",
                selectByGeometry: "Select by Geometry",
                point: "Point",
                circle: "Circle",
                line: "Polyline",
                polyline: "Select by Polyline",
                polygon: "Polygon",
                rectangle: "Rectangle",
                currentExtent: "Map Extent",
                selectionLayer: "Layer:",
                returnAttributeSet: "Return attribute set",
                loading: "Loading...",
                clearHighlightsTooltip: "Clear Map Highlights",
                highlightAllTooltip: "Highlight All",
                zoomToHighlightedTooltip: "Zoom To Highlighted Features",
                zoomToSelectedTooltip: "Zoom To Selected Features",
                selectionMethodTooltip: "Selection Method: ${0}",
                newSelection: "Create New Selection",
                addToSelection: "Add to Current Selection",
                removeFromSelection: "Remove from Current Selection"
            },
            editEvents: {
                label: "Edit Events",
                pointEvents: "Point<br>Events",
                pointEventsTooltip: "Add Point Events",
                lineEvents: "Line<br>Events",
                lineEventsTooltip: "Add Linear Events",
                attributeSet: "Attribute Set:",
                enableSnappingTooltip: "Enable Snapping",
                disableSnappingTooltip: "Disable Snapping",
                zoomInToEnableSnapping: "Zoom in to enable snapping",
                splitEventsTooltip: "Split Linear Events",
                mergeEventsTooltip: "Merge Linear Events",
                snappingOptionsTooltip: "Snapping Options",
                editAttributeSetsTooltip: "Modify Attribute Sets"
            },
            addressManagement:{
              label: "Edit Addresses",
              addBlockRange: "Block<br>Range",
              addBlockRangeTooltip: "Block Range",
              addSiteAddresses: "Site<br>Addresses",
              addSiteAddressesTooltip: "Site Addresses",
              addStreetNamesTooltip: "Add Street Names",
              displayFishbone: "Display Fishbone Diagram",
              clearFishbone: "Clear Fishbone Diagram"
            }
        },
        review: {
            label: "Review",
            qc: {
                label: "QC",
                checkEventsOnRoute: "Check<br>Events"
            },
            conflictPrevention: {
                label: "Conflict Prevention",
                editLocks: "Locks",
                editLocksTooltip: "Show Locks Table"
            },
            markup: {
                label: "Markup",
                point: "Pin",
                line: "Line",
                polygon: "Area",
                textLabel: "Label",
                drawPointTooltip: "Click to add a pin",
                drawLabelTooltip: "Click to add a label",
                changeSymbol: "Change Symbol",
                defaultLabelText: "Text"
            },
            dataReviewer: {
                label: "Data Reviewer",
                showTable: "Reviewer<br />Table",
                showTableTooltip: "Show Data Reviewer Table",
                runCheck: "Run Check",
                runCheckTooltip: "Run Data Reviewer Batch Job"
            },
            inquiry: {
            	label: "Inquiry",
            	measureTool: "Measure",
            	measureToolTooltip: "Find the distance between points"
            },
            redlineRoutes: {
                label: "Redline Routes"
            }
        }
    },
    map: {
        loading: "Loading the map...",
        identify: {
            featureByPointTooltip: "Click to identify feature by a point",
            routeByPointTooltip: "Click to identify route by a point"
        },
        selection: {
            selectByPointTooltip: "Click to select by a point",
            resumeSelectTooltip: "Click to continue selecting",
            startSelectTooltip: "Click to start selecting"
        },
        draw: {
            addPointTooltip: "Click to add a point",
            resumeDrawTooltip: "Click to continue drawing",
            startDrawTooltip: "Click to start drawing"
        }
    },
    widgets: {
        closeTooltip: "Close",
        collapseTooltip: "Hide",
        expandTooltip: "Show"
    },
    units: {
        unknownUnits: "Unknown Units",
        esriUnknownUnits: "Unknown Units",
        points: "Points",
        esriPoints: "Points",
        inches: "Inches",
        esriInches: "Inches",
        feet: "Feet",
        esriFeet: "Feet",
        yards: "Yards",
        esriYards: "Yards",
        miles: "Miles",
        esriMiles: "Miles",
        nauticalMiles: "Nautical Miles",
        esriNauticalMiles: "Nautical Miles",
        millimeters: "Millimeters",
        esriMillimeters: "Millimeters",
        centimeters: "Centimeters",
        esriCentimeters: "Centimeters",
        decimeters: "Decimeters",
        esriDecimeters: "Decimeters",
        meters: "Meters",
        esriMeters: "Meters",
        kilometers: "Kilometers",
        esriKilometers: "Kilometers",
        decimalDegrees: "Decimal Degrees",
        esriDecimalDegrees: "Decimal Degrees"
    },
    redline: {
        createRoute: "Create Route",
        reassignRoute: "Reassign Route",
        reverseRoute: "Reverse Route"
    },
    routeName: {
        fromRouteNameFieldAlias: "From Route Name",
        toRouteNameFieldAlias: "To Route Name",
        routeNameFieldAlias: "Route Name"
    },
    warning: {
        leavePage: "This page is asking you to confirm that you want to leave - data you have entered may not be saved."
    },
    error: {
        invalidLogin: "The user name or password is incorrect.",
        unableToLogin: "Unable to sign in.",
        loadConfig: "Unable to load the application configuration.<br/>Please notify the application administrator.",
        loadMap: "Unable to load the map.",
        loadMapDescription: "Unable to load the map description.",
        ribbonDisabled: "Please wait for the map to finish loading before using the ribbon bar.",
        missingTokenServerConfig: "No token server URL is configured in the application configuration.<br/>Please notify the application administrator.",
        missingWebMapConfig: "No web map is configured in the application configuration.<br/>Please notify the application administrator.",
        noAuthorizedLrsServiceDetected: "You are not authorized to access the linear referencing map service.<br/>Please notify the application administrator.",
        notAuthorizedToAuxillaryService: "You are not authorized to access the auxillary map service.",
        noLrsServiceDetected: "No linear referencing service was detected in the map description.<br/>Please notify the application administrator.",
        tokenServiceNotAvailable: "No token service is available on the specified token server.<br/>Please notify the application administrator.",
        tooManyLrsServicesDetected: "More than one linear referencing service was detected in the map description.<br/>This application supports only one linear referencing service in the map.<br/>Please republish appropriate map service to not have linear referencing capability.",
        tooManyEditWorkspacesDetected: "More than one editing workspace was detected in the linear referencing service.<br/>This application supports only one editing workspace for all event layers in the map.",
        invalidGDBVersion: "The geodatabase version '${0}' does not exist or is not defined for all map layers.<br/><br/>The map will use its original version.",
        noAshxSupport: "Unable to access proxy test page. Make sure all the .NET / ASP.NET features are enabled and installed for IIS. Please see the deployment guide to find out how this can be done.",

        /* Select by Geometry: Buffer Errors*/
        unableToSelectByGeometryBufferError: "Unable to select events by geometry. Error returned from the buffer operation.",
        unableToSelectByGeometryBufferException: "Unable to select events by geometry. Error returned from the buffer operation.",
        unableToSelectByGeometryInvalidBufferResult: "Unable to select events by geometry. Invalid result returned from the buffer operation.",

        /* Select by Geometry: Query Errors */
        unableToSelectByGeometryQueryError: "Unable to select events by geometry. Error returned from the query operation.",
        unableToSelectByGeometryQueryException: "Unable to select events by geometry. Exception caught from the query operation.",
        unableToSelectByGeometryInvalidQueryResult: "Unable to select events by geometry. Invalid result returned from the query operation.",

        /* urlOptions Errors */
           invalidRouteId: "The route ID is invalid.",
           invalidNetworkId: "The network ID is invalid.",
           invalidTab: "The requested tab does not exist.",
           invalidExtent: "The extent is invalid.",
           invalidMeasures: "The measures are invalid.",
           invalidWidget: "The widget is invalid.",

        errorDetailLabel: "Detail: ${0}"
    }
}});
