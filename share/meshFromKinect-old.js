/**
 * generates a three.js mesh from kinect depth data ( Uint8Array )
 * @class meshFromKinect
 * @constructor
 * @param {Object} [config] A config object, requires you pass at least a threejs 'scene' object, a 'vertexShaderID' and 'fragmentShaderID' or 'vertexShader' and 'fragementShader' file paths. 
 * optional parameters include 'polycount' for mesh resolution, 'type' which can be either 'mesh' or 'point', 'pointsize' ( when type=='point') 
 * 'wireframe' ( boolean value, when type=="mesh"), as well as 'wireframeLinewidth' ( when wireframe==true ),  
 * 'initDepth' ( initial Uint8Array, for when using .tweenCanvasData() instead of .updateCanvasData() )
 *  and 'uniforms' array of custom uniform objects ( ex: { name:"time", type: "f", value: 1.0 }, see <a href="http://threejs.org/docs/index.html#Reference/Materials/ShaderMaterial.uniforms" target="_blank">threejs ShaderMaterial</a> for more info )
 */

/*
	
	//-----------------------
	// example vertex shader
	//-----------------------

	uniform sampler2D map;
	uniform float pointsize;
	
	varying float vDepth;

	float zoffset = 2048.0/4.0; // redefine "center"

	void main() {
		
		vec4 depth = texture2D( map, uv );
		float d = ( depth.r + depth.g ) / 2.0;
		vDepth = d; // pass to fragment shader
		float cd = clamp( d, 0.6471, 1.0 );
		float z = (1.0-cd) * 2048.0; 

		vec4 pos = vec4( position.x, position.y, -z+zoffset, 1.0 );
		gl_PointSize = pointsize;
		gl_Position = projectionMatrix * modelViewMatrix * pos;
	}

	//-------------------------
	// example fragment shader
	//-------------------------

	varying float vDepth;

	void main() {
		
		float d = (vDepth - 0.6471) / 0.3529; // scale it
		gl_FragColor = vec4( d, d, d, 1.0 );
		//gl_FragColor = vec4( 1.0, 1.0, 1.0, 1.0 );
	}

*/
function meshFromKinect( config ){

	if(typeof THREE === 'undefined') throw new Error('meshFromKinect: depends on three.js library');

	this.config = config;

	this.loaded = false;

	// make sure there's a threejs scene to reference ~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~
	if( config.scene.type === "Scene" ) this.scene = config.scene;
	else throw new Error('meshFromKinect: expecting a threejs scene object');

	// make canvas/texture used to pass depth data to shader ~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.
	this.canvas = document.createElement('canvas');
	this.canvas.width = 640;		
	this.canvas.height = 480;
	this.texture = new THREE.Texture( this.canvas );
	this.texture.minFilter = THREE.NearestFilter; // bugs out otherwise if this.canvas.width/height isn't a power of 2
	this.ctx = this.canvas.getContext('2d');
	this.imageData = this.ctx.createImageData(640,480);
	
	// load shaders ~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.

	if( typeof config.vertexShader == 'string' ) this._loadFile( "vertex-shader", config.vertexShader );
	else if(typeof config.vertexShaderID == 'string') this.vertexShader 	= document.getElementById( config.vertexShaderID ).textContent;
	else throw new Error('meshFromKinect: missing vertext shader, expecting either vertexShaderID or vertexShader');
	// ---
	if( typeof config.fragmentShader == 'string' ) this._loadFile( "fragment-shader", config.fragmentShader );
	else if(typeof config.fragmentShaderID == 'string') this.fragmentShader = document.getElementById( config.fragmentShaderID ).textContent;
	else throw new Error('meshFromKinect: missing vertext shader, expecting either fragmentShaderID or fragmentShader');
	

	// deetz ~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.
	
	this.wireframe = (typeof config.wireframe!=='undefined') ? config.wireframe : false;
	this.wireframeLinewidth = (typeof config.wireframeLinewidth!=='undefined') ? config.wireframeLinewidth : 1;
	this.pointsize = (typeof config.pointsize!=='undefined') ? config.pointsize : 1;
	this.polycount = (typeof config.polycount!=='undefined') ? config.polycount : 10;

	if( typeof config.uniforms !== "undefined" && !(config.uniforms instanceof Array) ){
		throw new Error('meshFromKinect: uniforms should be an Array of objects: {name:"string",type:"string",value:in_type}');
	} else {
		this.uniforms = config.uniforms;
	}

	// create mesh ~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.
	
	this._createMesh();

	// for microsite tweening ~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.
	this.prevCanvasData = null;
	this.newCanvasData = (typeof config.initDepth !=="undefined") ? config.initDepth : null;
	this.fadeCnt = 0;
	if(typeof config.initDepth !=="undefined") this.tweenCanvasData( this.newCanvasData );
	
}

meshFromKinect.prototype._createMesh = function() {
	var self = this;
	config = this.config;

	if( typeof this.fragmentShader !== "undefined" && typeof this.vertexShader !== "undefined" ) {

		var type;
		if(typeof config.type !=='undefined'){
			if(config.type=='point') 		type = 'point';
			else if(config.type=='mesh') 	type = 'mesh';
			else throw new Error('meshFromKinect: config.type expecting either "point" or "mesh"');
		} else { type = 'point' } // default

		var geometry = this._geometry( this.canvas.width, this.canvas.height );
		var material = this._material( this.canvas.width, this.canvas.height );
		
		if( type == 'point' ){
			this.mesh = new THREE.Points( geometry, material );
		}
		else if(type == 'mesh'){
			this.mesh = new THREE.Mesh( geometry, material );
		}

		this.scene.add( this.mesh );
		this.loaded = true;

	} else {

		setTimeout(function(){  self._createMesh();  }, 100);
	}
};


meshFromKinect.prototype._geometry = function( width, height ) {

	// based on: https://github.com/mrdoob/three.js/blob/master/src/extras/geometries/PlaneBufferGeometry.js 
	// but w/ added 'color' for vertexColors ( additions noted in comments below )
	
	var geo = new THREE.BufferGeometry();

	var widthSegments	= this.polycount;
	var heightSegments	= this.polycount;
	
	var width_half = width / 2;
	var height_half = height / 2;

	var gridX = Math.floor( widthSegments ) || 1;
	var gridY = Math.floor( heightSegments ) || 1;

	var gridX1 = gridX + 1;
	var gridY1 = gridY + 1;

	var segment_width = width / gridX;
	var segment_height = height / gridY;

	var vertices 	= new Float32Array( gridX1 * gridY1 * 3 );
	var colors 		= new Float32Array( gridX1 * gridY1 * 3 ); // ADDITION ../n!ck
	var normals 	= new Float32Array( gridX1 * gridY1 * 3 );
	var uvs 		= new Float32Array( gridX1 * gridY1 * 2 );

	var offset = 0;
	var offset2 = 0;

	for ( var iy = 0; iy < gridY1; iy ++ ) {

		var y = iy * segment_height - height_half;

		for ( var ix = 0; ix < gridX1; ix ++ ) {

			var x = ix * segment_width - width_half;

			vertices[ offset ] = x;
			vertices[ offset + 1 ] = - y;
			
			// ---------------------- vertex colors -------------------------- // ADDITION ../n!ck
			// colors[ offset ] 		= Math.random(); 
			// colors[ offset + 1 ] 	= Math.random(); 
			// colors[ offset + 2 ] 	= Math.random(); 
			
			// var color = new BB.Color();
			// 	color.tint( Math.random()*0.5 );
			// colors[ offset ] 		= color.r/255; 
			// colors[ offset + 1 ] 	= color.g/255; 
			// colors[ offset + 2 ] 	= color.b/255; 	
			// --------------------------------------------------------------- // ADDITION ../n!ck

			normals[ offset + 2 ] = 1;

			uvs[ offset2 ] = ix / gridX;
			uvs[ offset2 + 1 ] = 1 - ( iy / gridY );

			offset += 3;
			offset2 += 2;
		}

	}

	offset = 0;
	offset2 = 0; // ../n!ck

	var indices = new ( ( vertices.length / 3 ) > 65535 ? Uint32Array : Uint16Array )( gridX * gridY * 6 );

	for ( var iy = 0; iy < gridY; iy ++ ) {

		for ( var ix = 0; ix < gridX; ix ++ ) {

			var a = ix + gridX1 * iy;
			var b = ix + gridX1 * ( iy + 1 );
			var c = ( ix + 1 ) + gridX1 * ( iy + 1 );
			var d = ( ix + 1 ) + gridX1 * iy;

			indices[ offset ] = a;
			indices[ offset + 1 ] = b;
			indices[ offset + 2 ] = d;

			indices[ offset + 3 ] = b;
			indices[ offset + 4 ] = c;
			indices[ offset + 5 ] = d;

			// ---------------------- vertex colors -------------------------- // ADDITION ../n!ck
				var color = new BB.Color(
					Math.floor(Math.random()*255),
					Math.floor(Math.random()*255),
					Math.floor(Math.random()*255)
				);
				colors[ offset2     ] = color.r/255;
				colors[ offset2 + 1 ] = color.g/255;
				colors[ offset2 + 2 ] = color.b/255;

				colors[ offset2 + 3 ] = color.r/255;
				colors[ offset2 + 4 ] = color.g/255;
				colors[ offset2 + 5 ] = color.b/255;

				colors[ offset2 + 6 ] = color.r/255;
				colors[ offset2 + 7 ] = color.g/255;
				colors[ offset2 + 8 ] = color.b/255;

				colors[ offset2 + 9 ] = color.r/255;
				colors[ offset2 + 10 ] = color.g/255;
				colors[ offset2 + 11 ] = color.b/255;

			// --------------------------------------------------------------- // ADDITION ../n!ck

			offset += 6;
			offset2 += 12;

		}

	}

	geo.setIndex( new THREE.BufferAttribute( indices, 1 ) );
	geo.addAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
	geo.addAttribute( 'normal', new THREE.BufferAttribute( normals, 3 ) );
	geo.addAttribute( 'uv', new THREE.BufferAttribute( uvs, 2 ) );
	geo.addAttribute( 'color', new THREE.BufferAttribute( colors, 3 ) ); // ADDITION ../n!ck

	return geo;
};

meshFromKinect.prototype._material = function( width, height ) {
	
	var self = this;

	var unis = {
			// "leapx": 		{ type: "f", value: 0.0 },
			// "leapy": 		{ type: "f", value: 0.0 },
			// "clrbox": 		{ type: "t", value: clrBox },
			// "time": 		{ type: "f", value: 1.0 }
			"map": 			{ type: "t", value: this.texture },
			"width": 		{ type: "f", value: width },
			"height": 		{ type: "f", value: height },
			"pointsize": 	{ type: "f", value: this.pointsize },	
	}

	if( typeof this.uniforms !== "undefined"){
		for (var i = 0; i < this.uniforms.length; i++) {
			if( typeof this.uniforms[i].name !== "undefined" &&
				typeof this.uniforms[i].type !== "undefined" &&
				typeof this.uniforms[i].value !== "undefined"
			  ){

				unis[ this.uniforms[i].name  ] = {
					type: this.uniforms[i].type,
					value: this.uniforms[i].value
				}

			} else {
				throw new Error('meshFromKinect: uniforms should be an Array of objects: {name:"string",type:"string",value:in_type}');
			}
		};	
	}


	// using ShaderMaterial ( rather than RawShaderMaterial ) to prepend built-in attributes/uniforms form WebGLProgram
	// see ShaderMatrial doc: http://threejs.org/docs/index.html#Reference/Materials/ShaderMaterial  
	// see WebGLProgram  doc: http://threejs.org/docs/index.html#Reference/Renderers.WebGL/WebGLProgram
	var mat = new THREE.ShaderMaterial( {

		// uniforms: {
		// 	"time": 		{ type: "f", value: 1.0 },
		// 	"leapx": 		{ type: "f", value: 0.0 },
		// 	"leapy": 		{ type: "f", value: 0.0 },
		
		// 	// "clrbox": 		{ type: "t", value: clrBox },
		// 	"map": 			{ type: "t", value: this.texture },
			
		// 	"width": 		{ type: "f", value: width },
		// 	"height": 		{ type: "f", value: height },
		// 	"pointsize": 	{ type: "f", value: this.pointsize },
		// },
		// 
		uniforms: unis,
		
		vertexShader: self.vertexShader,
		fragmentShader: self.fragmentShader,
		
		blending: THREE.AdditiveBlending,
		shading: THREE.FlatShading,

		depthTest: false, 	// Whether to have depth test enabled when rendering this material. Default is true. 
		depthWrite: false, 	// Whether rendering this material has any effect on the depth buffer. Default is true.
							// When drawing 2D overlays it can be useful to disable the depth writing in order to layer several things together without creating z-index artifacts. 
		wireframe: self.wireframe,
		wireframeLinewidth: self.wireframeLinewidth,
		transparent: true, // BUG: seems to only work on black clear bg???
		side: THREE.DoubleSide,
		// ............................... a few of the defaults at work in ShaderMaterial
		// ............................... see Material doc for other defaults: http://threejs.org/docs/index.html#Reference/Materials/Material
		//
		vertexColors: THREE.VertexColors,//THREE.NoColors, 
		//skinning: false,
		//morphTargets: false

	});

	return mat;
};


meshFromKinect.prototype._loadFile = function( type, path) {
	var self = this;
	var req = new XMLHttpRequest();
	req.open("GET", path, true);
	req.addEventListener("load", function() {
		
		if(type=="fragment-shader")		self.fragmentShader = req.responseText;
		else if(type=="vertex-shader") 	self.vertexShader = req.responseText;
	});
	req.send(null);
};






// ~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~.~`~._.~`~._.~`~.
// ~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~.~`~._.~`~._.~`~.
// ~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~. public methods ~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~.
// ~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~.~`~._.~`~._.~`~.
// ~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~._.~`~.~`~._.~`~._.~`~.


/**
 * updates internal canvas data via depth data being sent from kinect 
 * @method updateCanvasData
 * @param {Array} Uint8Array containing 16bit values ( integers, 0 - 2048 )
 */
meshFromKinect.prototype.updateCanvasData = function(depth) {
	
	var data = this.imageData.data;
	var j = 0;
	var val1, val2;

	for (var i = 0; i < depth.length; i += 2) {

		var total = depth[i+1] << 8 | depth[i]; // YEA!!! IT WORX :D BITSHIFTER!!!

		if( total > 1024 ){
			val1 = 0; 
			val2 = BB.MathUtils.map( (2048-total), 0, 1024, 255, 0);
		
		} else {
			val1 = BB.MathUtils.map( total, 0, 1024, 255, 0);
			val2 = 255;
		}

		data[j] = val1;
		data[j + 1] = val2;
		data[j + 2] = val2;
		data[j + 3] = 255;

		j += 4;
	}

	this.ctx.putImageData(this.imageData, 0, 0);

	this.texture.needsUpdate = true;
	
};


/**
 * fades new canvas image from old canvas image ( via depth data being sent from kinect ) 
 * @method tweenCanvasData
 * @param {Array} Uint8Array containing 16bit values ( integers, 0 - 2048 )
 */
meshFromKinect.prototype.tweenCanvasData = function(depth) {
	var self = this;
	var steps = 25;

	if( this.newCanvasData === null ){

		this.newCanvasData = depth;
		this.tweenCanvasData( this.newCanvasData );

	} else {

		if( this.fadeCnt === 0 ) {
			this.prevCanvasData = this.newCanvasData;
			this.newCanvasData = depth;
		}

	    var data = this.imageData.data;
		var j = 0;
		var prev1, prev2, new1, new2;
		var newFade = this.fadeCnt / steps;
		var prevFade = (1 - this.fadeCnt / steps);

		for (var i = 0; i < this.prevCanvasData.length; i += 2) {

			var prevTotal = this.prevCanvasData[i+1] << 8 | this.prevCanvasData[i];
			if( prevTotal > 1024 ){
				prev1 = 0; 
				prev2 = BB.MathUtils.map( (2048-prevTotal), 0, 1024, 255, 0);
			
			} else {
				prev1 = BB.MathUtils.map( prevTotal, 0, 1024, 255, 0);
				prev2 = 255;
			}

			var newTotal = this.newCanvasData[i+1] << 8 | this.newCanvasData[i];
			if( newTotal > 1024 ){
				new1 = 0; 
				new2 = BB.MathUtils.map( (2048-newTotal), 0, 1024, 255, 0);
			
			} else {
				new1 = BB.MathUtils.map( newTotal, 0, 1024, 255, 0);
				new2 = 255;
			}



			data[j] 	= (prev1*prevFade) + (new1*newFade);
			data[j + 1] = (prev2*prevFade) + (new2*newFade);
			data[j + 2] = (prev2*prevFade) + (new2*newFade);
			data[j + 3] = 255;

			j += 4;
		}

		this.ctx.putImageData(this.imageData, 0, 0);


		this.texture.needsUpdate = true;
		this.fadeCnt++;

		if (this.fadeCnt > steps) {
			this.fadeCnt = 0;
	        return;
	    } else {
	    	requestAnimationFrame(function(){
	    		self.tweenCanvasData();
	    	});
	    }


	}

};