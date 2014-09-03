var http = require("http");
var ProtoBuf = require("protobufjs");
var dotenv = require('dotenv');
var express = require('express');
var Converter = require('csvtojson').core.Converter;
var fs = require("fs");
var app = express();

dotenv.load();
var MTA_KEY     = process.env.MTA_KEY;
var MTA_FEED_ID = process.env.MTA_FEED_ID || 2;
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

//L Train line taken from stop_times.txt
ltrainmapS = [null,"L01","L02","L03","L05","L06","L08","L10","L11","L12","L13","L14","L15","L16","L17","L19","L20","L21","L22","L24","L25","L26","L27","L28","L29"];

//Northbound L is reverse of Southbound L, but null has to be in 0th position
ltrainmapN = ltrainmapS;
ltrainmapN.shift();
ltrainmapN.reverse();
ltrainmapN.unshift(null);

//modify the JSON we get from parsing GTFS to include only what we need / reformat some data
function squishjson(msg) {
	var entities = msg.entity;
  var returnarray = [];
  for (var i=0; i<entities.length; i++) {
    if (entities[i].vehicle != null){
      var tempdate = new Date(entities[i].vehicle.timestamp.low * 1000);
      entities[i].vehicle.datetime = tempdate.toISOString();
      entities[i].vehicle.current_status_text = current_status_enum[entities[i].vehicle.current_status];
      if (entities[i].vehicle.stop_id){
        entities[i].vehicle.stop_details = stopLookup[entities[i].vehicle.stop_id];
      }
      else
      {
        var seqnum = entities[i].vehicle.current_stop_sequence;
        var actualstop = "blah";
        //console.log(entities[i].vehicle.trip.trip_id);
        if(entities[i].vehicle.trip.trip_id.slice(-1) == "N")
          actualstop = ltrainmapN[seqnum];
        else
          actualstop = ltrainmapS[seqnum];
        //console.log(actualstop);
        entities[i].vehicle.stop_id = actualstop;
        entities[i].vehicle.stop_details = stopLookup[actualstop];
      }
      returnarray.push(entities[i].vehicle);
    }
  }
	return returnarray; //.slice(0,4);
}

app.get('/', function(req, out) {
  if (req.query.feed > 0) {
    MTA_FEED_ID = req.query.feed;
  }
  else
  {
    MTA_FEED_ID = 1;
  }

  var URL = "http://datamine.mta.info/mta_esi.php?key=" + MTA_KEY + "&feed_id=" + MTA_FEED_ID;

  return http.get(URL, function(res) {
    var data;
    data = [];
    res.on("data", function(chunk) {
      return data.push(chunk);
    });
    return res.on("end", function() {
      var msg;
      data = Buffer.concat(data);
      try { 
        msg = decoder.decode(data);
        msg = squishjson(msg);
        console.log("proxying request for " + req.ip);
        return out.send(msg);
      }
      catch(error) {
        console.log("Failed to retrieve train data. Will retry on next request.");
      }
    });
  });
});

server = app.listen(PORT, function() {
  console.log("mta2json - Listening on port " + server.address().port + "...");
});
