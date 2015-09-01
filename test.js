
var path		= require("path");
var imageData	= require("./image-data");


var ext		= "jpg";
var extOut	= "png";

var image	= new imageData();
image.open(path.normalize(__dirname+"/test."+ext), function(err) {
	if (err) {
		console.log("ERROR");
		return false;
	}
	image.scale({
		width:		200,
		height:		100,
		display:	'fit'
	});
	image.export(path.normalize(__dirname+"/"+(new Date().getTime())+'.'+extOut), function(filename) {
		console.log("Exported: ", filename);
	});
});
