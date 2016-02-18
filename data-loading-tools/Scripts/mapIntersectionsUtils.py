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
from arcpy import env


def getCodeFromDomain(lrsWorkspace, domainName, intersectionFeatureClassName):
    domains = arcpy.da.ListDomains(env.workspace)
    isdReferentMethodDomainFound = False
    for domain in domains:
        if domain.name == 'dReferentMethod':
            isdReferentMethodDomainFound = True
            coded_values = domain.codedValues
            for val, desc in coded_values.iteritems():
                if desc == intersectionFeatureClassName:
                    return val
                    break
            break
    else:
        return {"error": True,
                "message": "Could not found the dReferentMethod domain for the database : {0}. The dReferentMethod domain is required to populate Referent offset ID column.".format(
                    env.workspace)}

def replaceAll(text, dic):
    for i, j in dic.iteritems():
        text = text.replace(i, j)
    return text

def logError(message):
    arcpy.AddError(message)
    print(message)


def logWarning(message):
    arcpy.AddWarning(message)
    print(message)


def logMessage(message):
    arcpy.AddMessage(message)
    print(message)

