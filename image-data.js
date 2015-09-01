var domain		= require('domain');
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
	this.pixels		= new Uint32Array(this.options.width*this.options.height);
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
	
	// Create a domain to catch the "Unhandled 'error' event" that happens if a file header is unexpected for example (wrong extention)
	var d = domain.create()
	d.on('error', function() {
		callback(true);
	})
	d.run(function () {
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
						callback(true);
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
						
						callback(false);
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
					
					callback(false);
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
					
					callback(false);
				});
			break;
			default:
				console.log("Ext not supported:",ext);
			break;
		}
	});
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


imageData.prototype.scale = function(options) {
	
	options	= _.extend({
		display:	'crop',	// crop, fit
		scaleUp:	false,
		ratio:		.5,
		width:		false,
		height:		false
	},options);
	
	
	
	var src	= {
		width:	this.options.width,
		height:	this.options.height,
		ratio:	this.options.width/this.options.height	// >1: Landscape. <1: Portrait. 1: Square.
	}
	var dest	= {
		width:	options.width,
		height:	options.height,
		ratio:	options.width/options.height			// >1: Landscape. <1: Portrait. 1: Square.
	};
	var resized	= {
		width:	0,
		height:	0
	};
	
	switch (options.display) {
		default:
		case "crop":
			// Calculate the new image size
			
			if (dest.width > src.width) {
				// zoom in
				resized.width	= dest.width;
				resized.height	= Math.round(resized.width/src.ratio);
			} else {
				// zoom out
				resized.width	= dest.width;
				resized.height	= Math.round(resized.width/src.ratio);
			}
			if (resized.height < dest.height) {
				resized.height 	= dest.height;
				resized.width	= Math.round(resized.height*src.ratio);
			}
			
			// Calculate the alignment
			resized.x	= Math.round((dest.width-resized.width)/2);
			resized.y	= Math.round((dest.height-resized.height)/2);
			
			
			console.log("src",JSON.stringify(src, null, 4));
			console.log("dest",JSON.stringify(dest, null, 4));
			console.log("resized",JSON.stringify(resized, null, 4));
			
			// Resize the image
			resized.pixels	= this.resize({
				width:		resized.width,
				height:		resized.height,
				overwrite:	true
			}).pixels;
			
			var offset	= {
				x:	0,
				y:	0
			};
			
			if (resized.x<0) {
				offset.x	= resized.x*-1;
			}
			if (resized.y<0) {
				offset.y	= resized.y*-1;
			}
			
			console.log("offset",JSON.stringify(offset, null, 4));
			
			
			// Resize the array
			this.options.width	= dest.width;
			this.options.height	= dest.height;
			this.pixels			= new Uint32Array(this.options.width*this.options.height);
			
			// Copy the pixels
			for (y=0;y<this.options.height;y++) {
				for (x=0;x<this.options.width;x++) {
					indexSrc	= ((y+offset.y) * resized.width) + x+offset.x;
					indexDest	= y * this.options.width + x;
					this.pixels[indexDest]	= resized.pixels[indexSrc];
				}
			}
			
		break;
		case "fit":
			
			if (dest.ratio>src.ratio) {
				// zoom out
				resized.height 	= dest.height;
				resized.width	= Math.round(resized.height*src.ratio);
			} else {
				// zoom in
				resized.width	= dest.width;
				resized.height	= Math.round(resized.width/src.ratio);
			}
			
			// Calculate the alignment
			resized.x	= Math.round((dest.width-resized.width)/2);
			resized.y	= Math.round((dest.height-resized.height)/2);
			
			
			console.log("src",JSON.stringify(src, null, 4));
			console.log("dest",JSON.stringify(dest, null, 4));
			console.log("resized",JSON.stringify(resized, null, 4));
			
			// Resize the image
			resized.pixels	= this.resize({
				width:		resized.width,
				height:		resized.height,
				overwrite:	true
			}).pixels;
			
			
			console.log("offset",JSON.stringify(offset, null, 4));
			
			
			// Resize the array
			this.options.width	= dest.width;
			this.options.height	= dest.height;
			this.pixels			= new Uint32Array(this.options.width*this.options.height);
			
			// Copy the pixels
			for (y=0;y<resized.height;y++) {
				for (x=0;x<resized.width;x++) {
					indexSrc	= y * resized.width + x;
					indexDest	= ((y+resized.y) * this.options.width) + x+resized.x;
					this.pixels[indexDest]	= resized.pixels[indexSrc];
				}
			}
		break;
	}
	
	
	
	return this;
}


imageData.prototype.resize = function(options) {
	/* Original code: http://stackoverflow.com/a/19223362/690236 */
	
	options	= _.extend({
		ratio:		.5,
		width:		false,
		height:		false,
		overwrite:	true
	},options);
	
	
	if (!options.width || !options.height) {
		outputWidth		= this.options.width*options.ratio;
		outputHeight	= this.options.height*options.ratio;
	} else {
		outputWidth		= options.width;
		outputHeight	= options.height;
	}
	
	
	
	// Prepare the output pixels
	var output			= new Uint32Array(outputWidth*outputHeight);
	
	var W				= this.options.width;
	var H				= this.options.height;
	var time1			= Date.now();
	outputWidth			= Math.round(outputWidth);
	outputHeight		= Math.round(outputHeight);
	var ratio_w			= W / outputWidth;
	var ratio_h			= H / outputHeight;
	var ratio_w_half	= Math.ceil(ratio_w/2);
	var ratio_h_half	= Math.ceil(ratio_h/2);
	var color;
	
	for(var j = 0; j < outputHeight; j++){
		for(var i = 0; i < outputWidth; i++){
			var weight = 0;
			var weights = 0;
			var weights_alpha = 0;
			var gx_r = gx_g = gx_b = gx_a = 0;
			var center_y = (j + 0.5) * ratio_h;
			for(var yy = Math.floor(j * ratio_h); yy < (j + 1) * ratio_h; yy++){
				var dy = Math.abs(center_y - (yy + 0.5)) / ratio_h_half;
				var center_x = (i + 0.5) * ratio_w;
				var w0 = dy*dy //pre-calc part of w
				for(var xx = Math.floor(i * ratio_w); xx < (i + 1) * ratio_w; xx++){
					var dx = Math.abs(center_x - (xx + 0.5)) / ratio_w_half;
					var w = Math.sqrt(w0 + dx*dx);
					if(w >= -1 && w <= 1){
						//hermite filter
						weight = 2 * w*w*w - 3*w*w + 1;
						if(weight > 0) {
							dx = (xx + yy*W);
							// Get the color
							color	= this.rgba_decode(this.pixels[dx]);
							//alpha
							gx_a += weight * color.a;
							weights_alpha += weight;
							//colors
							if(color.a < 255)
							weight = weight * color.a / 250;
							gx_r += weight * color.r;
							gx_g += weight * color.g;
							gx_b += weight * color.b;
							weights += weight;
						}
					}
				}
			}
			var x2 = (i + j*outputWidth);
			output[x2]		= this.rgba_encode({
				r:	gx_r / weights,
				g:	gx_g / weights,
				b:	gx_b / weights,
				a:	gx_a / weights_alpha
			});
		}
	}
	//console.log("hermite = "+(Math.round(Date.now() - time1)/1000)+" s");
	
	if (options.overwrite===true) {
		// Overwrite the original pixels
		this.options.width	= outputWidth;
		this.options.height	= outputHeight;
		this.pixels			= output;
		return this;
	} else {
		return {
			width:	outputWidth,
			height:	outputHeight,
			pixels:	output
		};
	}
	
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
