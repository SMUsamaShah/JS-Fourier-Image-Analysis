/******************\
|   Fourier Image  |
| @author Anthony  |
| @version 0.1     |
| @date 2014/06/14 |
| @edit 2014/06/14 |
\******************/

/**********
 * config */
var dims = [54, 54];
var imageLoc = 'small.png'; //must have 'dims' dimensions

/*************
 * constants */

/*********************
 * working variables */
var canvases;
var ctxs;
var h;
var $h; //h hat
var h_; //h prime, the reconstructed h values

/******************
 * work functions */
function initFourierImage() {
    //event listeners
    $s('#draw-btn').addEventListener('click', function() {
        disableButtons(function() {
            //draw the initial image
            var img = new Image();
            img.addEventListener('load', function() {
                ctxs[0].drawImage(img, 0, 0, img.width, img.height);

                //grab the pixels
                var imageData = ctxs[0].getImageData(0, 0, dims[0], dims[1]);
                var h_es = []; //the h values
                for (var ai = 0; ai < imageData.data.length; ai+=4) {
                    //greyscale, so you only need every 4th value
                    h_es.push(imageData.data[ai]);
                }

                //initialize the h values
                h = function(n, m) {
                    var idx = n*dims[0] + m;
                    return h_es[idx];
                }; //create it in function form to make the code match the math

                enableButtons();
            });

            //THE IMAGE DIMENSIONS MUST MATCH dims FOR THIS TO WORK!!!
            img.src = imageLoc;
        });
    });

    $s('#transform-btn').addEventListener('click', function() {
        //placed in a callback so the UI has a chance to update
        disableButtons(function() {
            //compute the h hat values
            var h_hats = [];
            var maxMagnitude = 0;
            for (var k = 0; k < dims[1]; k++) {
                for (var l = 0; l < dims[0]; l++) {
                    var accum = new Complex(0, 0);
                    var wk = 2*Math.PI*(k/dims[1]);
                    var wl = 2*Math.PI*(l/dims[0]);
                    for (var n = 0; n < dims[1]; n++) {
                        for (var m = 0; m < dims[0]; m++) {
                            var val = cisExp(-(wk*n + wl*m)).times(h(n, m));
                            accum = accum.plus(val);
                        }
                    }
                    var mag = accum.magnitude();
                    if (mag > maxMagnitude) maxMagnitude = mag;
                    h_hats.push(accum);
                }
            }

            //store them in a nice function to match the math
            $h = function(k, l) {
                var idx = k*dims[0] + l;
                return h_hats[idx];
            };

            //draw the pixels
            var currImageData = ctxs[1].getImageData(0, 0, dims[0], dims[1]);
            var logOfMaxMag = Math.log(maxMagnitude+1);
            for (var k = 0; k < dims[1]; k++) {
                for (var l = 0; l < dims[0]; l++) {
                    var idxInPixels = 4*(dims[0]*k + l);
                    currImageData.data[idxInPixels+3] = 255; //full alpha

                    var color = Math.log($h(k, l).magnitude() + 1);
                    color = Math.round(255*(color/logOfMaxMag));
                    for (var c = 0; c < 3; c++) { //RGB are the same, lol c++
                        currImageData.data[idxInPixels+c] = color;
                    }
                }
            }
            ctxs[1].putImageData(currImageData, 0, 0);

            enableButtons();
        });
    });

    $s('#reconstruct-btn').addEventListener('click', function() {
        disableButtons(function() {
            //compute the h prime values
            var h_primes = [];
            var NM = dims[1]*dims[0];
            for (var n = 0; n < dims[1]; n++) {
                for (var m = 0; m < dims[0]; m++) {
                    var accum = new Complex(0, 0);
                    for (var k = 0; k < dims[1]; k++) {
                        for (var l = 0; l < dims[0]; l++) {
                            var wk = 2*Math.PI*(k/dims[1]);
                            var wl = 2*Math.PI*(l/dims[0]);
                            var val = cisExp(wk*n + wl*m).times($h(k, l));
                            accum = accum.plus(val);
                        }
                    }
                    h_primes.push(Math.round(accum.times(1/NM).real));
                }
            }

            //store them in a nice function to match the math
            h_ = function(n, m) {
                var idx = n*dims[0] + m;
                return h_primes[idx];
            };

            //draw the pixels
            var currImageData = ctxs[2].getImageData(0, 0, dims[0], dims[1]);
            for (var n = 0; n < dims[1]; n++) {
                for (var m = 0; m < dims[0]; m++) {
                    var idxInPixels = 4*(dims[0]*n + m);
                    currImageData.data[idxInPixels+3] = 255; //full alpha
                    for (var c = 0; c < 3; c++) { //RGB are the same, lol c++
                        currImageData.data[idxInPixels+c] = h_(n, m);
                    }
                }
            }
            ctxs[2].putImageData(currImageData, 0, 0);

            enableButtons();
        });
    });

    $s('#difference-btn').addEventListener('click', function() {
        disableButtons(function() {
            //draw the pixels
            var currImageData = ctxs[3].getImageData(0, 0, dims[0], dims[1]);
            for (var n = 0; n < dims[1]; n++) {
                for (var m = 0; m < dims[0]; m++) {
                    var idxInPixels = 4*(dims[0]*n + m); //idx in the pixels array
                    for (var c = 0; c < 3; c++) {
                        currImageData.data[idxInPixels+c] = 0;
                    }
                    var error = Math.ceil(Math.abs(h_(n, m) - h(n, m)));
                    currImageData.data[idxInPixels+3] = error; //alpha		
                }
            }
            ctxs[3].putImageData(currImageData, 0, 0);

            enableButtons();
        });
    });

    //initialize the working variables
    canvases = [], ctxs = [];
    for (var ai = 0; ai < 4; ai++) {
        canvases[ai] = $s('#canvas'+ai);
        canvases[ai].width = dims[0], canvases[ai].height = dims[1];
        ctxs[ai] = canvases[ai].getContext('2d');
    }
    h = $h = h_ = function() { return 0; };
}

/********************
 * helper functions */
function cisExp(x) { //e^ix = cos x + i*sin x
    return new Complex(Math.cos(x), Math.sin(x));
}

//returns array of pixel colors in the image
function getPixelsFromImage(location, callback) {
	var startedGettingPixels = new Date().getTime();
	var img = new Image(); //make a new image
	img.onload = function() { //when it is finished loading
		var canvas = document.createElement('canvas'); //make a canvas element
		canvas.width = img.width; //with this width
        //and this height (keep it the same as the image)
		canvas.height = img.height;
		canvas.style.display = 'none'; //hide it from the user
		document.body.appendChild(canvas); //then add it to the body
		var ctx = canvas.getContext('2d'); //now get the context
        //so that you can draw the image
		ctx.drawImage(img, 0, 0, img.width, img.height);
        //and grab its pixels
		var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
		document.body.removeChild(canvas); //all done, so get rid of it
		
		//...all so you can send the pixels, width, and the time taken to get
        //   them back through the callback
		var ret = [];
		for (var ai = 0; ai < imageData.data.length; ai++) {
            //annoying copy so the array can be edited
            ret.push(imageData.data[ai]);
        }
		callback(ret, img.width, new Date().getTime() - startedGettingPixels);
	};

	img.src = location; //load the image
}

function disableButtons(callback) {
    $s('#draw-btn').disabled = true;
    $s('#transform-btn').disabled = true;
    $s('#reconstruct-btn').disabled = true;
    $s('#difference-btn').disabled = true;

    setTimeout(callback, 6); //6ms for the UI to update
}

function enableButtons() {
    $s('#draw-btn').disabled = false;
    $s('#transform-btn').disabled = false;
    $s('#reconstruct-btn').disabled = false;
    $s('#difference-btn').disabled = false;
}

function $s(id) { //for convenience
    if (id.charAt(0) !== '#') return false;
    return document.getElementById(id.substring(1));
}

function getRandInt(low, high) { //output is in [low, high)
    return Math.floor(low + Math.random()*(high-low));
}

function round(n, places) {
    var mult = Math.pow(10, places);
    return Math.round(mult*n)/mult;
}

/***********
 * objects */
function Complex(re, im) {
    this.real = re;
    this.imag = im;
}
Complex.prototype.magnitude2 = function() {
    return this.real*this.real + this.imag*this.imag;
};
Complex.prototype.magnitude = function() {
    return Math.sqrt(this.magnitude2());
};
Complex.prototype.plus = function(z) {
    return new Complex(this.real+z.real, this.imag+z.imag);
};
Complex.prototype.times = function(z) {
    if (typeof z === 'object') { //complex multiplication
        var rePart = this.real*z.real - this.imag*z.imag;
        var imPart = this.real*z.imag + this.imag*z.real;
        return new Complex(rePart, imPart);
    } else { //scalar multiplication
        return new Complex(z*this.real, z*this.imag);
    }
};

window.addEventListener('load', initFourierImage);











