# PGraph

Graph visualisation with Pixi.js

### [Demo](http://112.74.47.128:8088/)


## Example
```js
new PGraph({
    scaleMax: 40,
    scaleMin: 0.15,  //scale limmit
    canvasHeight: window.innerHeight,
    canvasWidth: window.innerWidth,
    offsetX: 0,
    offsetY: 0,  //fix canvas position offset
    pinEffectFlag: false,
    canvasBGColor: 0x1099bb,
    layout: "d3-force",  //represent dynamic layout(you can change other)
    //layout: "drucula",//represent static layout(you must change other)
    elements:{
    	nodes:[
    		{
	    		id:"A",
	    		width:30,
	    		text:"饼藏",
	    		textDisY:50,
	    		textOpts:{fill:'0xFFF'},//You can use Pixijs text option here
	    		group:"饼藏",
	    		imageSrc:"http://todaylg.com:8088/assets/bz.jpeg"
	    	},
	    	{
		    	id:"B",
	    		width:30,
	    		text:"玉子",
	    		textDisY:50,
	    		textOpts:{fill:'0xFFF'},//You can use Pixijs text option here
	    		group:"玉子",
	    		imageSrc:"http://todaylg.com:8088/assets/yz.png"
	    	}   	
    	],
    	edges:[
	    	{
	    		id:"C",
	    		source:"A",
	    		target:"B",
	    		text:"Love",
	    		textDisY:20,
	    		textOpts:{fill:'0xFFF'},
	    		curveStyle:'bezier',
	    		targetShape:'triangle',//Arrow Shape
	    		sourceShape:'circle'
	    	}
    	]
    }
})
```

## Devlopment

```
$ yarn 
or
$ npm install
```
then

```
$ npm run dev
```

