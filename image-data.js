
var _			= require("underscore");
var path		= require("path");
var fs			= require("fs");
var pstack		= require("pstack");
var png			= require("pngjs2").PNG;
var jpg			= require('pixel-jpg');
var jpgExport	= require('jpeg-js');
var gif			= require('pixel-gif');

var imageData	= function() {
	this.options	= {
		width:	800,
		height:	600
	};
}

/*
	                     _                                                                 _
	  ___ _ __ ___  __ _| |_ ___      ___  _ __   ___ _ __       _____  ___ __   ___  _ __| |_
	 / __| '__/ _ \/ _` | __/ _ \    / _ \| '_ \ / _ \ '_ \     / _ \ \/ / '_ \ / _ \| '__| __|
	| (__| | |  __/ (_| | ||  __/_  | (_) | |_) |  __/ | | |_  |  __/>  <| |_) | (_) | |  | |_
	 \___|_|  \___|\__,_|\__\___( )  \___/| .__/ \___|_| |_( )  \___/_/\_\ .__/ \___/|_|   \__|
	                            |/        |_|              |/            |_|
*/
imageData.prototype.create = function(options) {
	this.options	= _.extend(this.options, options);
	this.pixels		= new Uint32Array(this.options.width*this.options.height);
	return this;
}
imageData.prototype.open = function(filename, callback) {
	var scope	= this;
	var ext		= path.extname(filename).toLowerCase();
	switch (ext) {
		case ".png":
			console.log("PNG Image",filename);
			var metas	= false;
			
			fs.createReadStream(filename).pipe(new png({
				filterType: 4
			})).on('metadata', function(metadatas) {
				metas	= metadatas;
			}).on('parsed', function() {
				console.log("parsed");
				
				if (!metas) {
					callback(false);
				} else {
					
					scope.options	= _.extend(scope.options, metas);
					scope.pixels	= new Uint32Array(scope.options.width*scope.options.height);
					
					for (var y = 0; y < scope.options.height; y++) {
						for (var x = 0; x < scope.options.width; x++) {
							var idx = (scope.options.width * y + x) << 2;
							
							scope.pixels[scope.index(x, y, scope.options.width)] = scope.rgba_encode({
								r:	this.data[idx],
								g:	this.data[idx+1],
								b:	this.data[idx+2],
								a:	this.data[idx+3]
							});
						}
					}
					
					callback(true);
				}
				
			});
		break;
		case ".jpg":
		case ".jpeg":
			console.log("JPEG Image",filename);
			jpg.parse(filename).then(function(images) {
				
				var image	= images[0];
				
				scope.options	= _.extend(scope.options, {
					width:	image.width,
					height:	image.height
				});
				scope.pixels	= new Uint32Array(scope.options.width*scope.options.height);
				
				for (var y = 0; y < scope.options.height; y++) {
					for (var x = 0; x < scope.options.width; x++) {
						var idx = (scope.options.width * y + x) << 2;
						
						scope.pixels[scope.index(x, y, scope.options.width)] = scope.rgba_encode({
							r:	image.data[idx],
							g:	image.data[idx+1],
							b:	image.data[idx+2],
							a:	image.data[idx+3]
						});
					}
				}
				
				callback(true);
			});
		break;
		case ".gif":
			console.log("GIF Image",filename);
			gif.parse(filename).then(function(images) {
				
				var image	= images[0];
				
				scope.options	= _.extend(scope.options, {
					width:	image.width,
					height:	image.height
				});
				scope.pixels	= new Uint32Array(scope.options.width*scope.options.height);
				
				for (var y = 0; y < scope.options.height; y++) {
					for (var x = 0; x < scope.options.width; x++) {
						var idx = (scope.options.width * y + x) << 2;
						
						scope.pixels[scope.index(x, y, scope.options.width)] = scope.rgba_encode({
							r:	image.data[idx],
							g:	image.data[idx+1],
							b:	image.data[idx+2],
							a:	image.data[idx+3]
						});
					}
				}
				
				callback(true);
			});
		break;
		default:
			console.log("Ext not supported:",ext);
		break;
	}
	return this;
}

imageData.prototype.export = function(filename, callback) {
	var scope = this;
	
	switch (path.extname(filename).toLowerCase()) {
		case ".png":
			var image = new png({
				width:	this.options.width,
				height:	this.options.height
			});
			
			// Now we convert the data
			var x,y,idx,idxpix;
			for (y = 0; y < this.options.height; y++) {
				for (x = 0; x < this.options.width; x++) {
					idx					= (this.options.width * y + x) << 2;
					idxpix				= this.index(x,y);
					color				= this.rgba_decode(this.pixels[idxpix]);
					image.data[idx]		= color.r;
					image.data[idx+1]	= color.g;
					image.data[idx+2]	= color.b;
					image.data[idx+3]	= color.a;
				}
			}
			
			var writeStream = fs.createWriteStream(filename);
			image.pack().pipe(writeStream);
			writeStream.on('finish', function() {
				callback(filename);
			});
			writeStream.on('error', function (err) {
				console.log("Error - export(png)", err);
			});
		break;
		case '.jpg':
		case '.jpeg':
			var rawImageData = {
				data:	new Buffer(this.options.width*this.options.height*4),
				width:	this.options.width,
				height:	this.options.height
			};
			
			// Now we convert the data
			var x,y,idx,idxpix;
			for (y = 0; y < this.options.height; y++) {
				for (x = 0; x < this.options.width; x++) {
					idx					= (this.options.width * y + x) << 2;
					idxpix				= this.index(x,y);
					color				= this.rgba_decode(this.pixels[idxpix]);
					rawImageData.data[idx]		= color.r;
					rawImageData.data[idx+1]	= color.g;
					rawImageData.data[idx+2]	= color.b;
					rawImageData.data[idx+3]	= color.a;
				}
			}
			
			var encoded = jpgExport.encode(rawImageData, 50);
			
			// Write the buffer to a file
			fs.open(filename, 'w', function(err, fd) {
				if (err) {
					console.log("Unable to write file "+filename);
					callback(false);
					return false;
				}
			
				fs.write(fd, encoded.data, 0, encoded.data.length, null, function(err) {
					if (err) {
						console.log("Error writing file "+filename);
						callback(false);
						return false;
					}
					fs.close(fd, function() {
						callback(filename);
					})
				});
			});
			
			
		break;
	}
	
	return this;
}


/*
	 _          _
	| |__   ___| |_ __   ___ _ __ ___
	| '_ \ / _ \ | '_ \ / _ \ '__/ __|
	| | | |  __/ | |_) |  __/ |  \__ \
	|_| |_|\___|_| .__/ \___|_|  |___/
	             |_|
*/

// Encode an rgba color into an int
imageData.prototype.rgba_encode = function(color) {
	// We encode into a int a 255 buffer, probability, position and direction
	return (color.r<<24|color.g<<16|color.b<<8|color.a);
}

// Decode an int into an rgba color
imageData.prototype.rgba_decode = function(pixel) {
	return {
		r:		0xFF & (pixel >> 24),
		g:		0xFF & (pixel >> 16),
		b:		0xFF & (pixel >> 8),
		a:		0xFF & pixel
	};
}

imageData.prototype.index = function(x, y, w) {
	if (!w) {
		w = this.options.width;
	}
	return y * w + x;
}

imageData.prototype.inv_index = function(i, w) {
	/*
		y	= (i/w)^0
		x	= i-(y*w)
	*/
	if (!w) {
		w = this.options.width;
	}
	var y	= (i/w)^0;
	var x	= i-(y*w);
	return {
		x:	x,
		y:	y
	}
}

module.exports = imageData;
