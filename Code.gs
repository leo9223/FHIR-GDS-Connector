var DiagnosticReport = "DiagnosticReport";
var Observation = "Observation";
var id = "id";
var report_type = "report_type";
var issued_date = "issued_date";
var conclusion = "conclusion";
var observation_type = "observation_type";
var value = "value";
var unit = "unit";


var cc = DataStudioApp.createCommunityConnector();


function getAuthType() {
  var AuthTypes = cc.AuthType;
  return cc
  .newAuthTypeResponse()
  .setAuthType(AuthTypes.NONE)
  .build();
}



function getConfig() {
  var config = cc.getConfig();
  
  config
  .newTextInput()
  .setId('url')
  .setName(
    'FHIR Url'
  )
  .setHelpText('e.g. http://www.example.com/fhir')
  .setAllowOverride(true);
  
  
  var DiagnosticReportOption = config.newOptionBuilder()
  .setLabel(DiagnosticReport)
  .setValue(DiagnosticReport);
  
  var ObservationOption = config.newOptionBuilder()
  .setLabel(Observation)
  .setValue(Observation);
  
  config
  .newSelectSingle()
  .setId('resource')
  .addOption(DiagnosticReportOption)
  .addOption(ObservationOption)
  .setName(
    'Select Resource'
  )
  .setHelpText('Select a resource on which you want to search.')
  .setAllowOverride(true);
  
  
  config
  .newTextInput()
  .setId('payload')
  .setName(
    'POST Payload'
  )
  .setHelpText('e.g. value1=one&value2=two, for date placeholders you can put like issued=ge#START_DATE#&issued=le#END_DATE#, date format is YYYY-MM-DD')
  .setAllowOverride(true);
  
  
  config
  .newTextInput()
  .setId('headers')
  .setName(
    'Request Headers'
  )
  .setHelpText('e.g. "{"Accept:*/*", "Authorization: Bearer xxxxx"}"')
  .setAllowOverride(true);
  
  config.setDateRangeRequired(true);
  
  return config.build();
}



function getFields(resource) {
  var fields = cc.getFields();
  var types = cc.FieldType;
  
  
  fields
  .newDimension()
  .setId(id)
  .setName('Id')
  .setType(types.TEXT);
  
  
  
  if(resource == DiagnosticReport){
    
    fields
    .newDimension()
    .setId(report_type)
    .setName('Report Type')
    .setType(types.TEXT);
    
    fields
    .newDimension()
    .setId(issued_date)
    .setName('Issued Date')
    .setType(types.TEXT);
    
    fields
    .newDimension()
    .setId(conclusion)
    .setName('Conclusion')
    .setType(types.TEXT);
  }
  else if (resource == Observation){
    fields
    .newDimension()
    .setId(observation_type)
    .setName('Observation Type')
    .setType(types.TEXT);
    
    fields
    .newDimension()
    .setId(value)
    .setName('Value')
    .setType(types.TEXT);
    
    fields
    .newDimension()
    .setId(unit)
    .setName('Unit')
    .setType(types.TEXT);
  }
  
  
  return fields;
}



function getSchema(request) {
  var schema = {schema: getFields(request.configParams.resource).build()};
  return schema;
}


function isAdminUser(){
  return false;
}


function getData(request) {
  
  try {
    var apiResponse = fetchDataFromApi(request);
    var objResponse = JSON.parse(apiResponse);
    var rows = [];
    var schema = [];
    var entries = objResponse.hasOwnProperty("entry")? objResponse["entry"] : [];
    
    
    prepareForDiagnosticReport(request, entries, schema, rows);

    
    console.log(rows);
    
    var result = {
      schema: schema,
      rows: rows
    };
    
    return result;
} 
catch (e) {
  cc.newUserError()
  .setDebugText('Error fetching data from API. Exception details: ' + e)
  .setText(
    'The connector has encountered an unrecoverable error. Please try again later, or file an issue if this error persists.'
  )
  .throwException();
}
}


function prepareForDiagnosticReport(request, entries, schema, rows){
  var defaultSchema = getSchema(request).schema;
  
  request.fields.forEach(field => {
   schema.push(getItemFromDefaultSchema(defaultSchema, request, field.name));
  });
  
  
  var values;
  entries.forEach(entry => {
    values = [];
    schema.forEach(item => {
     includeRowItem(entry, item.name, values);
    });
    rows.push({values: values});
   });

}


function includeRowItem(entry, name, values){
  switch(name){
   case id:
    values.push(entry.resource.id);
   break;
   case report_type:
    values.push(entry.resource.code.text);
   break;
   case issued_date:
    values.push(entry.resource.issued);
   break;
   case conclusion:
    values.push(entry.resource.conclusion);
   break;
//   case observation_type:
//    values.push(entry.resource.code.text);
//   break;
   case value:
    if(entry.resource.hasOwnProperty("valueQuantity")){
      values.push(entry.resource.valueQuantity.value.toString());
    }
    else if(entry.resource.hasOwnProperty("valueString")){
      values.push(entry.resource.valueString);
    }
   break;
   case unit:
    if(entry.resource.hasOwnProperty("valueQuantity")){
      values.push(entry.resource.valueQuantity.unit);
    }
    else if(entry.resource.hasOwnProperty("valueString")){
      values.push("N/A");
    }
   break;
  }
}


function getItemFromDefaultSchema(defaultSchema, request, name){
  return defaultSchema.find(item => item.name == name);
}

function fetchDataFromApi(request) {
  // Make a POST request with a JSON payload
  var payload = request.configParams.payload.replace("#START_DATE#", request.dateRange.startDate);
  payload = payload.replace("#END_DATE#", request.dateRange.endDate);
  var data = payload;
  
  
  var options = {
    'method' : 'POST',
    'headers': JSON.parse(request.configParams.headers),
    'payload' : data
  };
  
  var response = UrlFetchApp.fetch(request.configParams.url + '/' + request.configParams.resource + '/_search', options);
  
  return response;
}

