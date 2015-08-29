
var path		= require("path");
var imageData	= require("./image-data");

var image	= new imageData();
image.create({
	width:	200,
	height:	100
});

var ext		= "png";
var extOut	= "jpg";

image.open(path.normalize(__dirname+"/test."+ext), function() {
	console.log("Options: ",image.options);
	image.export(path.normalize(__dirname+"/"+(new Date().getTime())+'.'+extOut), function(filename) {
		console.log("Exported: ", filename);
	});
});
