var http = require("http");
var ProtoBuf = require("protobufjs");
var dotenv = require('dotenv');
var express = require('express');
var Converter = require('csvtojson').core.Converter;
var fs = require("fs");
var app = express();

dotenv.load();
var MTA_KEY     = process.env.MTA_KEY;
var MTA_FEED_ID = process.env.MTA_FEED_ID || 1;
var PORT        = process.env.PORT || 3000;
var URL         = "http://datamine.mta.info/mta_esi.php?key=" + MTA_KEY
                + "&feed_id=" + MTA_FEED_ID;
var STOPFILE    = "./stops.txt";

var builder = ProtoBuf.loadProtoFile("lib/protos/nyct-subway.proto");
var decoder = builder.build("transit_realtime").FeedMessage;

var current_status_enum = ["INCOMING AT", "STOPPED AT", "IN TRANSIT TO"];

//build a lookup array of objects for the station lookups

var fileStream = fs.createReadStream(STOPFILE);
var csvconverter = new Converter({constructResult:true});
var stopLookup = {};
csvconverter.on("end_parsed", function(jsonobj){
  var ray = jsonobj; //was jsonobj.csvRows;
  for (var i = ray.length - 1; i >= 0; i--) {
    stopLookup[ray[i].stop_id] = {id:ray[i].stop_id, name:ray[i].stop_name, lat:ray[i].stop_lat, lon:ray[i].stop_lon};
  };

});

// csvconverter.from(STOPFILE);
fileStream.pipe(csvconverter);

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
  return http.get(URL, function(res) {
    var data;
    data = [];
    res.on("data", function(chunk) {
      return data.push(chunk);
    });
    return res.on("end", function() {
      var msg;
      data = Buffer.concat(data);
      msg = decoder.decode(data);
      msg = squishjson(msg);
      console.log("proxying request for " + req.ip);
      return out.send(msg);
    });
  });
});

server = app.listen(PORT, function() {
  console.log("mta2json - Listening on port " + server.address().port + "...");
});
