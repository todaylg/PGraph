import PGraph from './PGraph.js';

/**
* Add Node and Edge Automatic(For test)
* @param {Number} node Number
*/
function autoGenera(nodeNum){
    let resObj = {},nodes = [],edges = [];
    for(let i=0;i<nodeNum;i++){
        let data = {};
        //Ascii => A => 65
        data.id = String.fromCharCode(65+i);
        data.width = (Math.random()*30)+20;
        data.text = data.id; 
        data.textDisY = data.width+20;
        data.textOpts = {fill:'0xFFF'}
        // data.textOpts = {
        //     fontFamily: 'Arial',
        //     fontSize: 100,
        //     fontStyle: 'italic',
        //     fontWeight: 'bold',
        //     fill: ['#ffffff', '#00ff99'], // gradient
        //     stroke: '#4a1850',
        //     strokeThickness: 5,
        //     wordWrap: true,
        //     wordWrapWidth: 440
        // };
        //if(i%2===0)data.color="0x66CCFF";//优先级最高
        if(i%2===0){
            data.group = "饼藏"
        }else{
            data.group = "玉子"
        }
        if(i%2===0){
            data.imageSrc = "./assets/bz.jpeg"
        }else{
            data.imageSrc = "./assets/yz.png"
        }
        nodes.push(data);
    }
    for(let i=0;i<nodeNum-1;i++){
        let data = {};
        data.id = String.fromCharCode(65+nodeNum+i);
        data.source = nodes[Math.floor(Math.sqrt(i))].id;
        data.target = nodes[i + 1].id;
        // let num1 = (Math.random()*99)|0;
        // let num2 = (Math.random()*99)|0;
        // data.source = nodes[num1].id;
        // data.target = nodes[num2].id;
        data.text = data.id;
        data.textDisY = 20;
        data.textOpts = {fill:'0xFFF'};
        if(i%2==0)data.curveStyle = 'bezier';
        // if(i%2==0){
            data.targetShape='triangle';
           //data.sourceShape='circle';
        // }else{
        //     data.targetShape='circle';
        //     data.sourceShape='triangle';
        // }
        edges.push(data);
    }
    resObj.nodes = nodes;
    resObj.edges = edges;
    return resObj;
}

new PGraph({
    layout: "d3-force",
    //layout: "staticLayoutTest",
    elements: autoGenera(100)
})