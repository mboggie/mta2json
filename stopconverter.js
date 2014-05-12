var http = require("http");
var dotenv = require('dotenv');
var express = require('express');
var Converter = require('csvtojson').core.Converter;
var app = express();

var stopjson;

dotenv.load();
var PORT        = process.env.PORT || 3000;

var STOPFILE    = "./stops.txt";

//build a lookup array of objects for the station lookups
var csvconverter = new Converter();
var stopLookup = {};
csvconverter.on("end_parsed", function(jsonobj){
  stopjson = jsonobj;
  ray = jsonobj.csvRows;
  for (var i = ray.length - 1; i >= 0; i--) {
    stopLookup[ray[i].stop_id] = {id:ray[i].stop_id, name:ray[i].stop_name, lat:ray[i].stop_lat, lon:ray[i].stop_lon};
  };

});

csvconverter.from(STOPFILE);


//modify the JSON we get from parsing GTFS to include only what we need / reformat some data
function squishjson(msg) {
	var entities = msg.entity;
  var returnarray = [];
  for (var i=0; i<entities.length; i++) {
    if (entities[i].vehicle != null){
      var tempdate = new Date(entities[i].vehicle.timestamp.low * 1000);
      entities[i].vehicle.datetime = tempdate.toISOString();
      entities[i].vehicle.current_status_text = current_status_enum[entities[i].vehicle.current_status];
      entities[i].vehicle.stop_details = stopLookup[entities[i].vehicle.stop_id];
      returnarray.push(entities[i].vehicle);
    }
  }
	return returnarray; //.slice(0,4);
}

app.get('/', function(req, out) {
  return out.send(stopjson);
});

server = app.listen(PORT, function() {
  console.log("mta2json - Listening on port " + server.address().port + "...");
});
