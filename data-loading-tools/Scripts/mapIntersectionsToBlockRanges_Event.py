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

# Name: mapIntersectionsToBlockRanges_Event
# Description: Map intersection to the event

# Import system modules
import arcpy
from arcpy import env
import xml.etree.ElementTree as ET
import os.path
import metadataUtils as metadataUtils
import mapIntersectionsUtils as mapIntersectionsUtils

try:
    # Set the progressor
    arcpy.SetProgressor("default", "Reading the LRS metadata...")

    # Set input variables
    eventLayer = arcpy.GetParameter(0)

    if eventLayer.workspacePath != "":
        lrsWorkspace = eventLayer.workspacePath
        arcpy.env.workspace = lrsWorkspace
    else:
        raise Exception("Could not access the workspace path of event layer")

    intersectionLayer = arcpy.GetParameter(1)
##    #clear selection for intersection layer
##    arcpy.SelectLayerByAttribute_management(intersectionLayer, "CLEAR_SELECTION")

##    arcpy.MakeTableView_management( intersectionLayer, "intersectionTableView")
##    count = int(arcpy.GetCount_management("intersectionTableView").getOutput(0))
##    if count == 0:
##        raise Exception("Intersection class do not have any records. Please generate the intersections and try again.")

    overwriteExistingReferentInfoParam = arcpy.GetParameterAsText(2)  # domain for LRSI_Intersections in dReferentMethod
    if overwriteExistingReferentInfoParam.lower() == "true":
        existingReferentBehavior = "OVERWRITE"
    else:
        existingReferentBehavior = "DO_NOT_OVERWRITE"

    validateUnmappedEventParam = arcpy.GetParameterAsText(3)  # domain for LRSI_Intersections in dReferentMethod
    if validateUnmappedEventParam.lower() == "true":
        validateUnmappedEvent = "VALIDATE"
    else:
        validateUnmappedEvent = "DO_NOT_VALIDATE"

    # read the metedata
    metadata = metadataUtils.getMetadata(lrsWorkspace, eventLayer)

    # read the table or featureclass names from metadata
    schemaVersion = metadata.get('SchemaVersion')  # TOD check schema version for 10.4

    # Read the various field names from metadata for the event
    eventLayerMetadata = metadataUtils.getLayerMetadata(eventLayer, metadata)

    eventObjectIdFieldName = arcpy.Describe(eventLayer).OIDFieldName
##    mapIntersectionsUtils.logMessage(eventObjectIdFieldName)
    eventRouteIdFieldName = eventLayerMetadata.get("RouteIdFieldName")
    eventEventIdFieldName = eventLayerMetadata.get("EventIdFieldName")
    eventFeatureClassName = eventLayerMetadata.get("FeatureClassName")
    eventFromReferentMethodFieldName = eventLayerMetadata.get("FromReferentMethodFieldName")
    eventFromReferentLocationFieldName = eventLayerMetadata.get("FromReferentLocationFieldName")
    eventFromReferentOffsetFieldName = eventLayerMetadata.get("FromReferentOffsetFieldName")
    eventToReferentMethodFieldName = eventLayerMetadata.get("ToReferentMethodFieldName")
    eventToReferentLocationFieldName = eventLayerMetadata.get("ToReferentLocationFieldName")
    eventToReferentOffsetFieldName = eventLayerMetadata.get("ToReferentOffsetFieldName")


    if eventFromReferentMethodFieldName == '' or eventFromReferentLocationFieldName == '' or eventFromReferentOffsetFieldName == '' \
            or eventToReferentMethodFieldName == '' or eventToReferentLocationFieldName == '' or eventToReferentOffsetFieldName == '':
        raise Exception("One or more Referent fields are not configured for the event layer")

    # Find the parent network layer metadata
    networkLayerMetadata = metadataUtils.getParentNetworkMetadata(eventFeatureClassName, metadata)

    networkFeatureClassName = networkLayerMetadata.get("PersistedFeatureClassName")
    networkRouteIdFieldName = networkLayerMetadata.get("PersistedFeatureClassRouteIdFieldName")

    # Read the various field names from metadata for the intersection
    intersectionLayerMetadata = metadataUtils.getLayerMetadata(intersectionLayer, metadata)

    intersectionRouteIdFieldName = intersectionLayerMetadata.get("RouteIdFieldName")
    intersectionIdFieldName = intersectionLayerMetadata.get("IntersectionIdFieldName")
    intersectionFeatureClassName = intersectionLayerMetadata.get("FeatureClassName")
    intersectionNameFieldName = intersectionLayerMetadata.get("IntersectionNameFieldName")
    intersectionMeasureFieldName = intersectionLayerMetadata.get("MeasureFieldName")
    intersectingFeatureClassNameFieldName = intersectionLayerMetadata.get("IntersectingFeatureClassNameFieldName")

    eventStartPointsFC = arcpy.CreateScratchName("StartPoint", data_type="FeatureClass", workspace=arcpy.env.scratchGDB)
    eventEndPointsFC = arcpy.CreateScratchName("EndPoint", data_type="FeatureClass", workspace=arcpy.env.scratchGDB)
    startPointIntersectionTable = arcpy.CreateScratchName("StartPointsIntersections", workspace=arcpy.env.scratchGDB)
    endPointIntersectionTable = arcpy.CreateScratchName("EndPointsIntersections", workspace=arcpy.env.scratchGDB)
    if validateUnmappedEvent == "VALIDATE":
        startPointRouteIntersectionTable = arcpy.CreateScratchName("startPointRouteIntersection",
                                                                   workspace=arcpy.env.scratchGDB)
        endPointRouteIntersectionTable = arcpy.CreateScratchName("endPointRouteIntersection",
                                                                 workspace=arcpy.env.scratchGDB)

    dataBasePrefix = metadataUtils.getPrefix(eventLayer)

    # read the code for intersections from dReferentMethod domain
    domainFromDReferentMethod = mapIntersectionsUtils.getCodeFromDomain(lrsWorkspace, "dReferentMethod",
                                                                        intersectionFeatureClassName)

    # Extract the start and end section of event polyline
    arcpy.SetProgressorLabel("Extracting the start and end points of event...")
    arcpy.FeatureVerticesToPoints_management(eventLayer.name, eventStartPointsFC, "START")
    arcpy.FeatureVerticesToPoints_management(eventLayer.name, eventEndPointsFC, "END")

    # Make an intersection layer to ignore any selection and use only intersections which are intersected same network
    arcpy.MakeFeatureLayer_management(dataBasePrefix + intersectionFeatureClassName, "intersectionTempLayer", intersectingFeatureClassNameFieldName + " = '" + networkFeatureClassName + "'")

    arcpy.MakeTableView_management( "intersectionTempLayer", "intersectionTableView")
    count = int(arcpy.GetCount_management("intersectionTableView").getOutput(0))
    mapIntersectionsUtils.logMessage("*Number of intersections belong to same network are " + str(count))
    if count == 0:
        raise Exception("Intersection class do not have any records OR do not have nay records for route network " + networkFeatureClassName + ". This tool require intersections from same route network")

    # Intersect start and end point with the Intersection fc
    arcpy.SetProgressorLabel("Intersecting start and end point of events with the Intersection class...")
    arcpy.Intersect_analysis(["intersectionTempLayer", eventStartPointsFC], startPointIntersectionTable)
    arcpy.Intersect_analysis(["intersectionTempLayer", eventEndPointsFC], endPointIntersectionTable)

    # Filter intersect output to remove, to keep the records which have same RouteId for end points and intersections
    arcpy.SetProgressorLabel("Filtering intersect output...")
    with arcpy.da.UpdateCursor(startPointIntersectionTable,
                               [intersectionRouteIdFieldName, eventRouteIdFieldName]) as cursor:
        for row in cursor:
            if row[0] != row[1]:
                cursor.deleteRow()

    with arcpy.da.UpdateCursor(endPointIntersectionTable,
                               [intersectionRouteIdFieldName, eventRouteIdFieldName]) as cursor:
        for row in cursor:
            if row[0] != row[1]:
                cursor.deleteRow()

    arcpy.SetProgressorLabel("Mapping the intersections to the event...")

    # Start an edit session.
    edit = arcpy.da.Editor(env.workspace)
    edit.startEditing(False, True)
    edit.startOperation()

    numberOfEventsWithBlankEventID = 0
    listOfEventsToValidate = []

    # TODO make sure eventId in not blank

    with arcpy.da.UpdateCursor(eventLayer.name,
                               [eventRouteIdFieldName, eventEventIdFieldName, eventFromReferentMethodFieldName,
                                eventFromReferentLocationFieldName, eventFromReferentOffsetFieldName,
                                eventToReferentMethodFieldName, eventToReferentLocationFieldName,
                                eventToReferentOffsetFieldName, "OID@"]) as cursor:

        for row in cursor:
            intersectionMappedForStart = False
            intersectionMappedForEnd = False
            if (row[2] is None or row[3] is None or row[4] is None) or existingReferentBehavior == "OVERWRITE":
                with arcpy.da.SearchCursor(startPointIntersectionTable,
                                           [eventRouteIdFieldName, eventEventIdFieldName, intersectionIdFieldName],
                                           eventRouteIdFieldName + " = '" + row[0] + "'") as cursor1:
                    for row1 in cursor1:
                        if row1[0] == row[0] and row1[1] == row[1]:
                            row[2] = domainFromDReferentMethod
                            row[3] = row1[2]
                            row[4] = "0"
                            intersectionMappedForStart = True
                            break
            else:
                mapIntersectionsUtils.logMessage("Referent info present for start of event " + row[1])

            if (row[5] is None or row[6] is None or row[7] is None) or existingReferentBehavior == "OVERWRITE":
                with arcpy.da.SearchCursor(endPointIntersectionTable,
                                           [eventRouteIdFieldName, eventEventIdFieldName, intersectionIdFieldName],
                                           eventRouteIdFieldName + " = '" + row[0] + "'") as cursor2:
                    for row2 in cursor2:
                        if row2[0] == row[0] and row2[1] == row[1]:
                            row[5] = domainFromDReferentMethod
                            row[6] = row2[2]
                            row[7] = "0"
                            intersectionMappedForEnd = True
                            break
            else:
                mapIntersectionsUtils.logMessage("Referent info present for end of event " + row[1])

            if (not intersectionMappedForStart) or (not intersectionMappedForEnd): # one of them is not mapped
                listOfEventsToValidate.append(row[8])  # listing object id since event is might not be unique

            if intersectionMappedForStart or intersectionMappedForEnd: # one of them is mapped
                if validateUnmappedEvent == "VALIDATE" and row[3] == row[6]:  # The from and to referent are same
                    mapIntersectionsUtils.logWarning(
                        "For Event ID " + str(row[1]) + ", From and To referent location are same")
                cursor.updateRow(row)

        # Delete cursor and row objects to remove locks on the data
        del row, cursor

    # Stop the edit operation.
    edit.stopOperation()
    try:
        # Stop the edit session and save the changes
        edit.stopEditing(True)
    except Exception as e:  # When edit session is active in ArcMap, script can not stop the edit session, so ignore error raised.
        if e.message == "start edit session":
            pass

    mapIntersectionsUtils.logMessage("* Events which not have mapped are :" + str(listOfEventsToValidate))

    if validateUnmappedEvent == "VALIDATE":
        # validate where could not map the intersection where route and route intersection is expected
        arcpy.SetProgressorLabel(
            "Validating the unmapped the intersections to see if route intersection are present there... ")

        # Make an event layer to use only event records which are listed for validation
        strListOfEventsToValidate = str(listOfEventsToValidate[:])
        mapIntersectionsUtils.logMessage(strListOfEventsToValidate)

        replacements = {'[':'', ']':''}
        strListOfEventsToValidate = mapIntersectionsUtils.replaceAll(strListOfEventsToValidate, replacements)
        mapIntersectionsUtils.logMessage(strListOfEventsToValidate)



        arcpy.MakeFeatureLayer_management(dataBasePrefix + eventFeatureClassName, "eventTempLayer", eventObjectIdFieldName + " IN (" + strListOfEventsToValidate  + ")")
        count2 = int(arcpy.GetCount_management("eventTempLayer").getOutput(0))
        mapIntersectionsUtils.logMessage("*Number of event being verified (selected) are " + str(count2))

##        subsetSelectionExpression = eventFromReferentMethodFieldName + " IS NULL OR " + eventToReferentMethodFieldName + " IS NULL"
##        arcpy.SelectLayerByAttribute_management(eventLayer, "SUBSET_SELECTION", subsetSelectionExpression)

        arcpy.Intersect_analysis(["eventTempLayer", dataBasePrefix + networkFeatureClassName, eventStartPointsFC],
                                 startPointRouteIntersectionTable)
        arcpy.Intersect_analysis(["eventTempLayer", dataBasePrefix + networkFeatureClassName, eventEndPointsFC],
                                 endPointRouteIntersectionTable)

##        arcpy.MakeTableView_management(eventLayer, "eventTableView")
##        count = int(arcpy.GetCount_management("eventTableView").getOutput(0))
        count = len(listOfEventsToValidate)

        mapIntersectionsUtils.logMessage("Number of events being validated are : " + str(count))

        if count > 0:

            # find field name due to intersections
            if eventRouteIdFieldName == networkRouteIdFieldName: # During intersect if the field names are same it will add _1 to the second occurrence of field
                networkRouteIdFieldName += "_1"

            endPointsEventIdFieldName = eventEventIdFieldName + "_1"

            with arcpy.da.SearchCursor("eventTempLayer",
                                       [eventEventIdFieldName, eventRouteIdFieldName, eventFromReferentMethodFieldName,
                                        eventToReferentMethodFieldName]) as cursor:

                for row in cursor:
                    if row[2] is None:  # From ReferentMethod id null i.e. validate the start of event
                        with arcpy.da.SearchCursor(startPointRouteIntersectionTable,
                                                   [eventEventIdFieldName, eventRouteIdFieldName,
                                                    networkRouteIdFieldName],
                                                    endPointsEventIdFieldName + " = '" + str(row[0]) + "'") as cursor1:
                            for row1 in cursor1:
                                if row[1] != row1[2]:  # Error is only when intersection with another Route is present
                                    mapIntersectionsUtils.logError("For Event Id " + str(row[
                                        0]) + ", could not map the intersection at start of event")
                                    break

                    if row[3] is None:  # From ReferentMethod id null i.e. validate the start of event
                        with arcpy.da.SearchCursor(endPointRouteIntersectionTable,
                                                   [eventEventIdFieldName, eventRouteIdFieldName,
                                                    networkRouteIdFieldName],
                                                    endPointsEventIdFieldName + " = '" + str(row[0]) + "'") as cursor2:
                            for row2 in cursor2:
                                if row[1] != row2[2]:  # Error is only when intersection with another Route is present
                                    mapIntersectionsUtils.logError(
                                        "For Event Id " + str(row[0]) + ", could not map the intersection at end of event")
                                    break

        else:
            mapIntersectionsUtils.logMessage("All the events have the referent information populated")

    mapIntersectionsUtils.logMessage("Script completed")


except Exception as e:
    import traceback
    import sys

    if e.message != "start edit session":  # When edit session is active in ArcMap, script can not stop the edit session, so ignore error raised.
        tb = sys.exc_info()[2]
        mapIntersectionsUtils.logError("Line {0}".format(tb.tb_lineno))
        stackTrace = traceback.format_exc()

        if (e.message.find("cannot open") != -1 ):
            mapIntersectionsUtils.logError("Check if you have write access to the database. \n" + e.message)

        elif (e.message.find("lock") != -1 ):
            mapIntersectionsUtils.logError("Check if there are no other locks to the database. \n" + e.message)
        elif (e.message.find("invalid SQL") != -1 ):
            mapIntersectionsUtils.logError("Check if eventID field is string or guid type. \n")
            mapIntersectionsUtils.logError(stackTrace)
        else:
            mapIntersectionsUtils.logError(e.message)
            #mapIntersectionsUtils.logError(stackTrace)

finally:  # delete temp tables from scratch workspace
    try:
        arcpy.SetProgressorLabel("Cleaning the scratch workspace... ")
        arcpy.Delete_management(eventStartPointsFC)
        arcpy.Delete_management(eventEndPointsFC)
        arcpy.Delete_management(startPointIntersectionTable)
        arcpy.Delete_management(endPointIntersectionTable)
        if validateUnmappedEvent == "VALIDATE":
            arcpy.Delete_management(startPointRouteIntersectionTable)
            arcpy.Delete_management(endPointRouteIntersectionTable)
    except Exception as e:
        mapIntersectionsUtils.logWarning(e.message)
    arcpy.SetProgressorLabel("Script completed..")
    arcpy.ResetProgressor()
