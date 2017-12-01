import * as PIXI from "pixi.js";
import * as d3 from "d3-force";
import { CacBezierCurveMidPos, CacQuadraticCurveMidPos } from './Math';
import { DrawTriangleArrow, DrawCircleArrow } from './ArrowShape';
import defaultValue from './DefaultValue';
//import Dracula from 'graphdracula';

//Aliases
let Container = PIXI.Container,
    Application = PIXI.Application,
    Sprite = PIXI.Sprite,
    Text = PIXI.Text,
    Filters = PIXI.filters,
    Graphics = PIXI.Graphics;

class Node {
    constructor(nodeInfo, shape) {
        this.id = nodeInfo.id;
        this.info = nodeInfo;
        this.shape = shape;
        this.textShape = null;
        this.imageShape = null;
        this.maskShape = null;
    }
}

class Edge {
    constructor(edgeInfo, shape) {
        this.id = edgeInfo.id;
        this.info = edgeInfo;
        this.shape = shape;
        this.sourceArrowShape = null;
        this.targetArrowShape = null;
        this.textShape = null;
    }
}

class PGraph {
    constructor(opts) {
        this.opts = Object.assign({}, defaultValue, opts);
        this.opts.width = this.opts.canvasWidth - this.opts.offsetX;
        this.opts.height = this.opts.canvasHeight - this.opts.offsetY;
        this.renderer = new Application(this.opts.width, this.opts.height, {
            antialias: true,
            forceFXAA: true,//For WebglRender AA
            backgroundColor: this.opts.canvasBGColor
        });
        this.canvas = this.renderer.view;
        this.stage = this.renderer.stage;
        this.edgeContainer = new Container();
        this.arrowContainer = new Container();
        this.nodeContainer = new Container();//Node above edge
        this.textContainer = new Container();//Text above node
        this.imageContainer = new Container(),
        this.dragContainer = new Container();//Hightest level

        //Canvas(defalut is Webgl) Use for Render test
        // this.renderer = new PIXI.CanvasRenderer(this.opts.width, this.opts.height, {
        //     backgroundColor: 0x1099bb
        // })

        this.nodeList = {};//Cache node
        this.edgeList = {};//Cache edge
        this.nodeFlag = false;
        this.simulation;
        this.medNodeList = {};

        document.body.appendChild(this.canvas);
        //层级顺序
        this.stage.addChild(this.edgeContainer);
        this.stage.addChild(this.arrowContainer);
        this.stage.addChild(this.nodeContainer);
        this.stage.addChild(this.textContainer);
        this.stage.addChild(this.imageContainer);
        this.stage.addChild(this.dragContainer);

        this.init(this.opts.elements);
    }

    init({ nodes, edges }) {
        //Init intermediate node
        let tempLinks = this.initIntermediateNode(nodes, edges);
        //Init simulation 
        this.initializeSimulation(nodes, tempLinks);
        console.log(this.medNodeList);
        console.log(tempLinks);
        debugger;
        //Init node =>D3这个layout的耦合比较重，因为在给节点绑定事件的时候涉及到了Simulation（拖拽的时候也是需要力的效果的）
        this.initializeNodes(nodes);
        //Init edge
        this.initializeEdges(edges);
        //Init layout 
        this.initializeLayout(nodes, edges);
        console.log(nodes);
        console.log(edges);
        debugger;
        // Init event
        this.initEvent(this.canvas, this.stage);
    }

    initIntermediateNode(nodes,edges) {
        let tempLinks = [],tempNodes = [];
        edges.forEach((edge)=>{
            let i={};//intermediate node
            nodes.push(i);
            tempLinks.push({source: edge.source, target: i}, {source: i, target: edge.target});
            this.medNodeList[edge.id] = i;
        })
        return tempLinks;
    }

    /**
     * InitializeNodes method use for init nodes/text/image
     * @param {Array} nodes
     */
    initializeNodes(nodes) {
        let opts = this.opts,
            nodeList = this.nodeList,
            nodeContainer = this.nodeContainer;
        //Init node、node's text、node's image
        for (let i = 0, node; i < nodes.length; i++) {
            //Draw node
            node = nodes[i];
            if(!node.id) return;
            let circle = new Graphics();
            node.color = node.color ? node.color : opts.node.color;
            circle.beginFill(node.color);

            node.width = node.width ? node.width : opts.node.width;
            circle.drawCircle(0, 0, node.width);
            circle.endFill();
            circle.filters = [new Filters.BlurFilter(2)];//效果拔群！！

            circle = this.setNode(circle, node.id, opts.pinEffectFlag);

            //Move the graph to its designated position
            circle.x = 0;
            circle.y = 0;
            //cache
            circle.cacheAsBitmap = true;

            node = new Node(nodes[i], circle);
            //Init node text
            if (node.info.text) this.drawText(node, 0, 0);
            if (node.info.imageSrc) this.drawImage(node, 0, 0);

            nodeList[node.id] = node;
            nodeContainer.addChild(circle);
        }
    }

    initializeEdges(edges) {
        let opts = this.opts,
            edgeList = this.edgeList,
            edgeContainer = this.edgeContainer,
            tempLinks = [];
        //init Edge
        edges.forEach((edge)=>{
            let line = new Graphics();
            line.lineStyle(
                edge.width ? edge.width : opts.edge.width,
                edge.color ? edge.color : opts.edge.color,
                edge.alpha ? edge.alpha : opts.edge.alpha
            );
            edge = new Edge(edge, line);
            //Init edge text
            if (edge.info.text) this.drawText(edge, 0, 0);

            edgeList[edge.id] = edge;
            edgeContainer.addChild(line);
        })
    }

    initializeSimulation(nodes, edges) {
        let width = this.opts.width / 2,
            height = this.opts.height / 2;
        this.simulation = d3.forceSimulation(nodes)
            .force('charge', d3.forceManyBody().strength(-30).distanceMin(30))
            .force('link', d3.forceLink(edges).id((d) => d.id).distance(330))//节点的查找方式为其id值
            .force('center', d3.forceCenter(width, height))
            //.force("collide", d3.forceCollide().radius(function(d) { return d.width; }).strength(0.7).iterations(1))
            .force("x", d3.forceX().strength(0.1))
            .force("y", d3.forceY().strength(0.1))
    }

    /**
     * initializeLayout method use for layout
     * @param {Array} nodes
     * @param {Array} edges
     */
    initializeLayout(nodes, edges) {
        //D3-force Layout
        let opts = this.opts,
            nodeList = this.nodeList,
            that = this;

        let ticked = function () {
            nodes.forEach(drawNode);
            edges.forEach(drawEdge);
        }
        let drawNode = function (node) {
            //只需要移动位置
            if(!node.id) return;
            nodeList[node.id].shape.x = node.x;
            nodeList[node.id].shape.y = node.y;
            if (nodeList[node.id].info.text) that.updateText(node.id, { x: node.x, y: node.y }, true);
            if (nodeList[node.id].info.imageSrc) that.updateImage(node.id, { x: node.x, y: node.y });
        }

        let drawEdge = function (edge) {
            that.drawArrowAndEdge(edge, edge.source, edge.target);
        }

        this.simulation.on('tick', ticked);
    }

    /**
     * DrawText method use for init text for node/edge
     * @param {Object} obj Node/Edge instance 
     */
    drawText(obj, x, y) {
        let textContainer = this.textContainer;
        if (obj.textShape) textContainer.removeChild(obj.textShape);
        let text = new Text(obj.info.text, obj.info.textOpts);
        text.x = x - text.width / 2 + (obj.info.textDisX || 0);
        text.y = y - text.height / 2 + (obj.info.textDisY || 0);

        //cache
        text.cacheAsBitmap = true;

        obj.textShape = text;
        textContainer.addChild(text);
    }

    /**
     * UpdateText method use for update text when node/edge position change
     * @param {String} id
     * @param {Object} newPos
     */
    updateText(id, newPos, flag) {
        let obj, that = this;
        if (flag) {//node text
            obj = that.nodeList[id];
        } else {//edge text
            obj = that.edgeList[id];
        }
        obj.textShape.x = newPos.x - obj.textShape.width / 2 + (obj.info.textDisX || 0);
        obj.textShape.y = newPos.y - obj.textShape.height / 2 + (obj.info.textDisY || 0);
    }

    /**
     * DrawImage method use for init node's image
     * @param {Object} node
     * imageSrc=>node image's url 
     * id=> use for set image id
     * imageOpts => image style
     * @param x => image position X
     * @param y => image position y
     */
    drawImage(node, x, y) {
        let imageContainer = this.imageContainer,
            src = node.info.imageSrc,
            width = node.info.width || this.opts.nodeWidth,
            that = this;
        if (!src) return;
        //if (node.imageShape) imageContainer.removeChild(node.imageShape);
        // let image = new Image();
        // image.src = src;
        const loader = new PIXI.loaders.Loader();
        loader.add(node.id, src).load(onload);
        function onload(loader, resources) {
            let image = resources[node.id];
            //Calculate scale
            let scale = width / image.texture.width * 2;//*2是分辨率的问题？
            // create a new Sprite from an image path
            let sprite = new Sprite(image.texture);
            //sprite.filters = [new Filters.BlurFilter(1)];

            sprite.anchor.set(0.5);
            sprite.scale.x = scale;
            sprite.scale.y = scale;

            let mask = new Graphics();
            mask.beginFill("0xFFF", 0.01);

            if (node.info.width) width = node.info.width;
            mask.drawCircle(x, y, width - 2);
            mask.endFill();

            sprite.mask = mask;
            //cache
            sprite.cacheAsBitmap = true;//缓存一开大小对不上了是什么情况？？？？
            //cache
            mask.cacheAsBitmap = true;

            node.imageShape = sprite;
            node.maskShape = mask;
            imageContainer.addChild(mask);
            imageContainer.addChild(sprite);
        }
    }

    /**
     * updateImage method use for update node image position 
     * @param {String} id
     * @param {Object} newPos
     */
    updateImage(id, newPos) {
        let image = this.nodeList[id].imageShape,
            mask = this.nodeList[id].maskShape;
        if (image && mask) {
            image.x = newPos.x;
            image.y = newPos.y;

            mask.x = newPos.x;
            mask.y = newPos.y;
        }
    }

    /**
     * SetNode method use for init node's event when dragging node
     * @param {Shape} graph
     * @param {String} id
     * @return {Shape}
     */
    setNode(graph, id, pinFlag) {
        let onDragEnd,
            that = this,
            simulation = that.simulation;
        graph._clickCount = 0;
        if (pinFlag) {
            onDragEnd = function (event) {
                simulation.alphaTarget(0);
                this.dragging = false;
                // set the interaction data to null
                this.data = null;
                that.dragContainer.removeChild(this);
                that.dragContainer.removeChild(that.nodeList[id].textShape);
                that.dragContainer.removeChild(that.nodeList[id].imageShape);
                that.nodeContainer.addChild(this);
                that.textContainer.addChild(that.nodeList[id].textShape);
                that.imageContainer.addChild(that.nodeList[id].imageShape);
                that.nodeFlag = false;
            }
        } else {
            onDragEnd = function (event) {
                simulation.alphaTarget(0);
                //Sticky or not
                that.nodeList[id].info.fx = null;
                that.nodeList[id].info.fy = null;
                let target = event.target;
                this.dragging = false;
                // set the interaction data to null
                this.data = null;
                that.dragContainer.removeChild(this);
                that.dragContainer.removeChild(that.nodeList[id].textShape);
                that.dragContainer.removeChild(that.nodeList[id].imageShape);
                that.nodeContainer.addChild(this);
                that.textContainer.addChild(that.nodeList[id].textShape);
                that.imageContainer.addChild(that.nodeList[id].imageShape);
                that.nodeFlag = false;
            }
        }

        let onDragStart = function (event) {
            simulation.alphaTarget(0.3).restart();
            event.stopPropagation();
            this.data = event.data;
            this.dragging = true;
            that.nodeFlag = true;
        }

        let onDragMove = function (event) {
            if (this.dragging) {
                let newPosition = this.data.getLocalPosition(this.parent);
                this.x = newPosition.x;
                this.y = newPosition.y;
                updateNode(id, newPosition);
                that.updateText(id, newPosition, true);//防止字和节点脱节
                that.updateImage(id, newPosition);//防止图和节点脱节
                //that.updateImage(id, { x: node.x, y: node.y })
                that.nodeContainer.removeChild(this);
                that.textContainer.removeChild(that.nodeList[id].textShape);
                that.imageContainer.removeChild(that.nodeList[id].imageShape);
                that.dragContainer.addChild(this);
                that.dragContainer.addChild(that.nodeList[id].textShape);
                that.dragContainer.addChild(that.nodeList[id].imageShape);
            }
        }

        //图钉效果 pixi因为跨平台兼容性的原因放弃了dblclick
        let onDbClick = function () {
            this._clickCount++;
            if (this._clickCount === 1) {
                let that = this;
                this._dblClickTimer = setTimeout(function () {
                    that._clickCount = 0;
                }, 300);
            }
            else {
                clearTimeout(this._dblClickTimer);
                this._clickCount = 0;
                console.log("DBCLICK");
                that.nodeList[id].info.fx = null;
                that.nodeList[id].info.fy = null;
            }
        }

        let updateNode = function (id, newPos) {
            let node = that.nodeList[id].info;
            node.x = newPos.x;
            node.y = newPos.y;
            node.fx = newPos.x;
            node.fy = newPos.y;
        }

        graph.interactive = true;
        // this button mode will mean the hand cursor appears when you roll over the bunny with your mouse
        graph.buttonMode = true;
        graph
            .on('pointerdown', onDragStart)
            .on('pointerup', onDragEnd)
            .on('pointerupoutside', onDragEnd)
            .on('pointermove', onDragMove);
        if (pinFlag) {
            graph.on('click', onDbClick);
        }

        return graph;
    }

    /**
     * DrawArrowAndEdge method use for update the arrow and edge from node source and target position
     * @param {Object} data
     * @param {Object} source 
     * @param {Object} target 
     */
    drawArrowAndEdge(data, source, target) {
        source = this.nodeList[source].info;
        target = this.nodeList[target].info;
        // Remove old edge (drawArrowShape will remove old arrow)
        let edgeList = this.edgeList,
            edgeContainer = this.edgeContainer,
            that = this,
            edge = edgeList[data.id];//对象引用

        if (edge.shape) edgeContainer.removeChild(edge.shape);

        // Draw Arrow
        let newSourcePos, newTargetPos;
        // TODO: auto change from line/curve
        // if (data.targetShape) {
        //     if (data.curveStyle) {
        //         switch (data.curveStyle) {
        //             case "bezier":
        //                 // CacBezierCurve
        //                 let bMidPos = CacBezierCurveMidPos(source, target);
        //                 let pos2 = { x: bMidPos.x2, y: bMidPos.y2 }
        //                 if (data.text) that.updateText(data.id, { x: (bMidPos.x1 + bMidPos.x2) / 2, y: (bMidPos.y1 + bMidPos.y2) / 2 }, false);
        //                 newTargetPos = that.drawArrowShape(data.id, data.targetShape, pos2, target, source, target, true);
        //                 break;
        //             case "quadraticCurve":
        //                 // QuadraticCurve
        //                 let cMidPos = CacQuadraticCurveMidPos(source, target, 100);
        //                 newTargetPos = that.drawArrowShape(data.id, data.targetShape, cMidPos, target, source, target, true);
        //                 break;
        //             default: break;
        //         }
        //     } else {
        //         if (data.text) that.updateText(data.id, { x: (source.x + target.x) / 2, y: (source.y + target.y) / 2 }, false);
        //         newTargetPos = that.drawArrowShape(data.id, data.targetShape, source, target, source, target, true);
        //     }

        // }
        // if (data.sourceShape) {
        //     if (data.curveStyle) {
        //         switch (data.curveStyle) {
        //             case "bezier":
        //                 // Cacular Third Bezier Curve's Mid pos
        //                 let bMidPos = CacBezierCurveMidPos(source, target);
        //                 let pos1 = { x: bMidPos.x1, y: bMidPos.y1 }

        //                 if (data.text) that.updateText(data.id, { x: (bMidPos.x1 + bMidPos.x2) / 2, y: (bMidPos.y1 + bMidPos.y2) / 2 }, false);
        //                 newSourcePos = that.drawArrowShape(data.id, data.sourceShape, source, pos1, source, target, false);
        //                 break;
        //             case "quadraticCurve":
        //                 // Cacular Second Bezier Curve's Mid pos
        //                 let cMidPos = CacQuadraticCurveMidPos(source, target, 100);
        //                 newSourcePos = that.drawArrowShape(data.id, data.sourceShape, source, cMidPos, source, target, false);
        //                 break;
        //             default: break;
        //         }
        //     } else {
        //         if (data.text) that.updateText(data.id, { x: (source.x + target.x) / 2, y: (source.y + target.y) / 2 }, false);
        //         newSourcePos = that.drawArrowShape(data.id, data.sourceShape, source, target, source, target, false);
        //     }

        // }

        let tempSourcePos = newSourcePos ? newSourcePos : source;
        let tempTargetPos = newTargetPos ? newTargetPos : target;

        //Draw edge(线和节点不一样，线是要重画的)
        let line = new Graphics();
        //Todo => dash
        line.lineStyle(4, 0xFFFFFF, 1);
        line.moveTo(tempSourcePos.x, tempSourcePos.y);
        line.quadraticCurveTo(that.medNodeList[data.id].x, that.medNodeList[data.id].y, tempTargetPos.x, tempTargetPos.y);
        // if (data.curveStyle) {
        //     switch (data.curveStyle) {
        //         case "bezier":
        //             // Cacular Third Bezier Curve's Mid pos
        //             let cPos = CacBezierCurveMidPos(tempSourcePos, tempTargetPos, 100);
        //             line.bezierCurveTo(cPos.x1, cPos.y1, cPos.x2, cPos.y2, cPos.x, cPos.y);
        //             break;
        //         case "quadraticCurve":
        //             // Cacular Second Bezier Curve's Mid pos
        //             let bPos = CacQuadraticCurveMidPos(tempSourcePos, tempTargetPos, 100);
        //             line.quadraticCurveTo(bPos.x, bPos.y, tempTargetPos.x, tempTargetPos.y);
        //             break;
        //     }
        // } else {
            // line.lineTo(tempTargetPos.x, tempTargetPos.y);
        // }

        edge.shape = line;
        edgeContainer.addChild(line);
    }

    /**
     * DrawArrowShape method use for draw the arrow from node source and target position 
     * @param {String} id arrow's id
     * @param {String} shape arrow's shape
     * @param {Object} sourcePos {x,y} node source pos
     * @param {Object} targetPos {x,y} node target pos
     * @param {Object} source arrow source 
     * @param {Object} target arrow target 
     * @param {Bool} targetFlag  draw source or target arrow
     */
    drawArrowShape(id, shape, sourcePos, targetPos, source, target, targetFlag) {
        let that = this,
            width = that.nodeWidth;

        if (!targetFlag && sourcePos.width) width = sourcePos.width;
        if (targetFlag && targetPos.width) width = targetPos.width;

        //Boundary determination => hide it if stick together
        if ((Math.abs(source.y - target.y) < width * 1.5) &&
            (Math.abs(source.x - target.x) < width * 1.5)) {
            width = 0;
        }
        switch (shape) {
            case 'circle':
                let cPos = DrawCircleArrow(width, sourcePos, targetPos, source, target, targetFlag);
                //Draw circle(也可以不重新画，但是就需要重新计算角度,数学不好只能重新画😂)
                let circle = new Graphics();
                circle.beginFill(0x66CCFF);

                circle.drawCircle(0, 0, width / 2);
                circle.endFill();

                circle.x = cPos.x;
                circle.y = cPos.y;

                that.updateArrow(id, circle, targetFlag);

                return {
                    x: cPos.x,
                    y: cPos.y
                }
            case 'triangle':
                let tPos = DrawTriangleArrow(width, sourcePos, targetPos, source, target, targetFlag);
                //Draw triangle
                let triangle = new Graphics();

                triangle.beginFill(0x66CCFF);
                triangle.lineStyle(0, 0x66CCFF, 1);
                triangle.moveTo(tPos.beginPosX, tPos.beginPosY);
                triangle.lineTo(tPos.pos1X, tPos.pos1Y);
                triangle.lineTo(tPos.pos2X, tPos.pos2Y);
                triangle.endFill();

                that.updateArrow(id, triangle, targetFlag);

                return {
                    x: tPos.centerX,
                    y: tPos.centerY
                }
        }
    }

    updateArrow(id, shape, targetFlag) {
        let edge = this.edgeList[id],
            arrowContainer = this.arrowContainer;

        if (!targetFlag) {//Source arrow
            if (edge.sourceArrowShape) arrowContainer.removeChild(edge.sourceArrowShape);
            //save newArrow
            edge.sourceArrowShape = shape;
        } else {//Target arrow
            if (edge.targetArrowShape) arrowContainer.removeChild(edge.targetArrowShape);
            //save newArrow
            edge.targetArrowShape = shape;
        }
        arrowContainer.addChild(shape);
    }

    /** 
     * InitEvent method use for init canvas's zoom and drag event
     * @param canvas canvas to init
     * @param stage stage to init  
     */
    initEvent(canvas, stage) {
        let scaleMax = this.opts.scaleMax,
            scaleMin = this.opts.scaleMin,
            that = this;

        canvas.addEventListener('wheel', function (e) {
            if (e.deltaY < 0) {
                zooming(true, e.pageX, e.pageY);
            } else {
                zooming(false, e.pageX, e.pageY);
            }
        });

        function zooming(zoomFlag, x, y) {
            //Current scale    
            let scale = stage.scale.x;
            let point = toLocalPos(x, y);
            //Zooming    
            if (zoomFlag) {
                if (scale < scaleMax) {
                    scale += 0.1;
                    //moving      
                    stage.position.set(stage.x - (point.x * 0.1), stage.y - (point.y * 0.1))
                }
            } else {
                if (scale > scaleMin) {
                    scale -= 0.1;
                    //moving
                    stage.position.set(stage.x - (point.x * -0.1), stage.y - (point.y * -0.1))
                }
            }
            stage.scale.set(scale, scale);
        }

        // Drag/Move
        let point = {},//Todo 这里以后指针的形状也可以自定义
            startMousePos = {},
            movePosBegin = {},
            canvasDragging = false,
            dragContainer = that.dragContainer;

        canvas.addEventListener('mousedown', stagePointerDown);
        canvas.addEventListener('mouseup', stagePointerUp);
        canvas.addEventListener('mouseout', stagePointerUp);
        canvas.addEventListener('mousemove', stagePointerMove);
        canvas.addEventListener('contextmenu', onContextMenu);

        let menu = document.querySelector('.menu');
        let pinEffectButton = document.querySelector('#pin');
        pinEffectButton.addEventListener('click', pinEffect);

        function pinEffect() {
            that.pinEffectFlag = !that.pinEffectFlag;
            resetNodes();
            hideMenu();
        }

        function resetNodes() {
            for (let node in that.nodeList) {
                that.nodeList[node].shape.removeAllListeners();
                that.setNode(that.nodeList[node].shape, node, that.pinEffectFlag);
            }
        }

        function onContextMenu(e) {
            e.preventDefault();
            e.stopPropagation();
            showMenu(e.pageX - that.opts.offsetX, e.pageY - that.opts.offsetY);
            canvas.addEventListener('mousedown', onMouseDown);
            if (that.pinEffectFlag) {
                document.querySelector('#pin span').innerText = '关闭图钉效果';
            } else {
                document.querySelector('#pin span').innerText = '启用图钉效果';
            }
        }

        function onMouseDown(e) {
            hideMenu();
            document.removeEventListener('mousedown', onMouseDown);
        }

        function showMenu(x, y) {
            menu.style.left = x + 'px';
            menu.style.top = y + 'px';
            menu.classList.add('show-menu');
        }

        function hideMenu() {
            menu.classList.remove('show-menu');
        }

        function stagePointerDown(event) {
            if (!that.nodeFlag) {
                canvasDragging = true;

                movePosBegin.x = stage.x;
                movePosBegin.y = stage.y;

                startMousePos.x = event.pageX;
                startMousePos.y = event.pageY;
                //Draw circle
                let r = 30 / stage.scale.x;
                drawCircle(startMousePos.x, startMousePos.y, r);
            }

        }

        function stagePointerUp(event) {
            canvasDragging = false;
            //Remove  circle
            if (point.circle) dragContainer.removeChild(point.circle);
        }

        function stagePointerMove(event) {
            if (canvasDragging && !that.nodeFlag && event.which === 1) {
                //Move  circle
                let x = event.pageX;
                let y = event.pageY;

                //Remove  circle first
                if (point.circle) dragContainer.removeChild(point.circle);
                //Redraw circle
                //Current scale    
                let scale = stage.scale.x;
                let r = 30 / scale;
                drawCircle(x, y, r);

                let offsetX = x - startMousePos.x,//差值
                    offsetY = y - startMousePos.y;

                stage.x = movePosBegin.x + offsetX;
                stage.y = movePosBegin.y + offsetY;//修正差值
            }
        }

        function toLocalPos(x, y) {
            let mouse = new PIXI.Point(x, y);
            let localPos = stage.toLocal(mouse);
            return localPos;
        }

        function drawCircle(x, y, r = 30) {
            var circle = new Graphics();
            circle.beginFill("0x000000", 0.2);

            circle.drawCircle(0, 0, r);
            circle.endFill();
            let localPos = toLocalPos(x, y);
            circle.x = localPos.x;
            circle.y = localPos.y;
            point.circle = circle;
            dragContainer.addChild(circle);
        }
    }
}

export default PGraph;