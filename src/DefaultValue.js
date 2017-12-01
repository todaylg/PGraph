export default {
    global:{
        scaleMax: 40,
        scaleMin: 0.15,// For scale limmit
        canvasHeight: window.innerHeight,
        canvasWidth: window.innerWidth,
        pinEffectFlag: false,
        canvasBGColor: 0x1099bb,
        offsetX: 0,
        offsetY: 0,// Fix canvas position offset
        layout: "d3-force",
        //layout: "drucula",
        node: {
            width: 30,// Defalut node radius,Node shape default is circle => todo other shape
            // color: "0x000", //默认为random
        },
        edge: {
            width: 4,
            // color: "0xFFF", //默认为random
            alpha: 1,
        },
    },
    //You can put other option here
};
