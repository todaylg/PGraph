/**
 * Created by todaylg.
 */

import * as PIXI from "pixi.js";
import * as d3 from "d3-force";
import defaultValue from './DefaultValue';
import StaticLayoutTest from './StaticLayoutTest';
import { Graph, Dijkstra } from './FindPath';
import { getRandomColor, isEmptyObject } from './Utils';
import { CacBezierCurveMidPos, CacQuadraticCurveMidPos } from './Math';
import { DrawTriangleArrow, DrawCircleArrow } from './ArrowShape';

//Aliases
let Container = PIXI.Container,
    Application = PIXI.Application,
    Sprite = PIXI.Sprite,
    Text = PIXI.Text,
    Filters = PIXI.filters,
    Graphics = PIXI.Graphics;

//用于耗时测试
let startTime, endTime;

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

class Group {
    constructor(color, member = []) {
        this.color = color;
        this.member = member;
    }
}

class PGraph {
    constructor(opts) {
        this.opts = Object.assign({}, defaultValue.global, opts);
        this.opts.width = this.opts.canvasWidth - this.opts.offsetX;
        this.opts.height = this.opts.canvasHeight - this.opts.offsetY;
        this.renderer = new Application(this.opts.width, this.opts.height, {
            antialias: true,
            // forceFXAA: true,//For WebGLRender AA
            forceCanvas:true,//=>PIXI的WebGLRenderer渲染图形反而没有CanvasRenderer流畅
            backgroundColor: this.opts.canvasBGColor
        });
        this.canvas = this.renderer.view;
        this.stage = this.renderer.stage;
        this.edgeContainer = new Container();
        this.arrowContainer = new Container();
        this.nodeContainer = new Container();//Node above edge
        this.textContainer = new Container();//Text above node
        this.imageContainer = new Container();
        this.dragContainer = new Container();//Hightest level

        this.nodeList = {};//Cache node
        this.nodeArr = [];//Cache node.info
        this.edgeList = {};//Cache edge
        this.edgeArr = [];//Cache edge.info
        this.groupList = {};//Cache group member
        this.selectorArr = [];//Cache select member
        this.commandKey = false;//Command/ctrl keycode input flag
        this.nodeFlag = false;//Native event and pixi event flag
        if (opts.layout === "d3-force") this.simulation = null;//D3-force layout simulation
        this.graph = new Graph();//FindPath graph data structure
        this.loader = new PIXI.loaders.Loader();//Load node's image

        let root = opts.rootId ? document.getElementById(opts.rootId) : document.body;
        root.appendChild(this.canvas);
        //层级顺序
        this.stage.addChild(this.edgeContainer);
        this.stage.addChild(this.arrowContainer);
        this.stage.addChild(this.nodeContainer);
        this.stage.addChild(this.textContainer);
        this.stage.addChild(this.imageContainer);
        this.stage.addChild(this.dragContainer);

        this.init(this.opts.elements);
    }

    /**
     * Init is the entry method for init nodes/edges
     * @param {Obj} extract nodes/edges from user input
     */
    init({ nodes, edges }) {
        startTime = new Date().getTime();
        console.log("Use layout: " + this.opts.layout);

        if (this.opts.layout === "d3-force") {
            this.initializeSimulation(nodes, edges);
        }
        //Init node
        this.initializeNodes(nodes);
        //Init edge
        this.initializeEdges(edges);
        //Init layout 
        this.initializeLayout(nodes, edges);
        //Init canvas event
        this.initEvent(this.canvas, this.stage);
    }

    /**
     * D3-force layout need init simulation frist
     * Generate position info、replace edge's source and target
     * @param {Array} nodes
     * @param {Array} edges
     */
    initializeSimulation(nodes, edges) {
        let width = this.opts.width / 2,
            height = this.opts.height / 2;
        this.simulation = d3.forceSimulation(nodes)
            .force('charge', d3.forceManyBody().strength(-30))
            .force('link', d3.forceLink(edges).id((d) => d.id))//节点的查找方式为其id值
            .force('center', d3.forceCenter(width, height))
            .force("collide", d3.forceCollide().radius(function(d) { return d.width+30; }).strength(0.7).iterations(2))
    }

    /**
     * Init nodes、node's text、node's image
     * @param {Array} nodes
     */
    initializeNodes(nodes) {
        let opts = this.opts,
            nodeList = this.nodeList,
            nodeContainer = this.nodeContainer;

        for (let i = 0, node; i < nodes.length; i++) {
            node = nodes[i];
            node.width = node.width ? node.width : opts.node.width;
            node.links = [];
            //Group
            if (node.group) {
                if (!this.groupList[node.group]) {
                    let color = getRandomColor();
                    let member = [node.id];
                    this.groupList[node.group] = new Group(color, member);
                } else {
                    let group = this.groupList[node.group];
                    node.color = node.color ? node.color : '0x' + group.color;
                    group.member.push(node.id);
                }
            }
            //Draw node
            let circle = new Graphics();
            node.color = node.color ? node.color : getRandomColor();
            circle.beginFill(node.color);

            circle.drawCircle(0, 0, node.width);
            circle.endFill();
            //Add filters for aniti-aliasing 太耗性能了
            //circle.filters = [new Filters.BlurFilter(2)];
            circle = this.setNode(circle, node.id, opts.pinEffectFlag);

            //cache
            //circle.cacheAsBitmap = true;
            
            node = new Node(nodes[i], circle);

            //Init node's text
            if (node.info.text) this.drawText(node);
            let src = node.info.imageSrc;

            //Init node's image
            if (src) {
                if (!this.loader.resources[src]) {
                    this.loader.add(src);
                }
            }
            //FindPath
            //this.graph.addVertex(node.id);
            nodeList[node.id] = node;
            this.nodeArr.push(node.info);
            nodeContainer.addChild(circle);
        }
         //根据loader绘制节点上的图像
         if (!isEmptyObject(this.loader.resources)) {
            this.loader.load((loader, resources) => {
                this.drawImage.call(this, loader, resources)
            })
        }
        endTime = new Date().getTime();
        console.log("初始化节点时间: ");
        console.log(endTime - startTime + "ms");
    }

    /**
     * InitializeNodes method use for init edges/edges's text
     * @param {Array} edges
     */
    initializeEdges(edges) {
        let opts = this.opts,
            edgeList = this.edgeList,
            edgeContainer = this.edgeContainer;
        //init Edge
        for (let i = 0, edge; i < edges.length; i++) {
            edge = edges[i];
            //this.graph.addEdge(edge.source, edge.target);
            if (opts.layout !== 'd3-force') {//d3-force自己会修改结构
                //修改结构
                let sourceNode = edge.source = this.nodeList[edge.source].info;
                let targetNode = edge.target = this.nodeList[edge.target].info;
                //Init node's links
                
                sourceNode.links = sourceNode.links ? sourceNode.links : [];
                sourceNode.links.push(edge);
                targetNode.links = targetNode.links ? targetNode.links : [];
                targetNode.links.push(edge);
            }
            //Draw edge
            let line = new Graphics();
            edge.width = edge.width ? edge.width : opts.edge.width;
            edge.color = edge.color ? edge.color : '0x' + getRandomColor();
            edge.alpha = edge.alpha ? edge.alpha : opts.edge.alpha;
            line.lineStyle(edge.width, edge.color, edge.alpha);
            edge = new Edge(edges[i], line);
            //Init edge text
            if (edge.info.text) this.drawText(edge);

            this.edgeArr.push(edge.info);
            edgeList[edge.id] = edge;
        }
        endTime = new Date().getTime();
        console.log("初始化边时间: ");
        console.log(endTime - startTime + "ms");
    }

    /**
     * Layout init => generate node/edge's position info
     * @param {Array} nodes
     * @param {Array} edges
     */
    initializeLayout(nodes, edges) {
        let opts = this.opts,
            nodeList = this.nodeList,
            that = this;
        //D3-force Layout
        if (opts.layout === 'd3-force') {
            let ticked = function () {
                nodes.forEach(drawNode);
                edges.forEach(drawEdge);
            }
            let drawNode = function (node) {
                //只需要移动位置
                nodeList[node.id].shape.x = node.x;
                nodeList[node.id].shape.y = node.y;
                if (nodeList[node.id].info.text) that.updateText(node.id, { x: node.x, y: node.y }, true);
                if (nodeList[node.id].info.imageSrc) that.updateImage(node.id, { x: node.x, y: node.y });
            }

            let drawEdge = function (edge) {
                that.drawArrowAndEdge(edge, edge.source.id, edge.target.id);
            }

            this.simulation.on('tick', ticked);
        }
        //Radial Layout
        else if (opts.layout === 'staticLayoutTest') {
            new StaticLayoutTest(that.nodeArr);
            //根据布局位置进行初始化
            for (let id in that.nodeList) {
                let node = that.nodeList[id];
                node.shape.x = node.info.x;
                node.shape.y = node.info.y;

                if (node.info.text) that.updateText(node.id, { x: node.shape.x, y: node.shape.y }, true);
            }
            //静态布局需要在一开始就初始化边
            for (let edge in that.edgeList) {
                edge = that.edgeList[edge];
                that.drawArrowAndEdge(edge.info, edge.info.source.id, edge.info.target.id);
            }
        }
    }

    /**
     * DrawText method use for init text shape for node/edge
     * @param {Object} obj Node/Edge instance 
     */
    drawText(obj) {
        let textContainer = this.textContainer;
        if (obj.textShape) textContainer.removeChild(obj.textShape);
        let text = new Text(obj.info.text, obj.info.textOpts);
        //cache
        text.cacheAsBitmap = true;//文字应该不常变吧

        obj.textShape = text;
        textContainer.addChild(text);
    }

    /**
     * UpdateText method use for update text's position when node/edge position change
     * @param {String} id
     * @param {Object} newPos
     * @param {Boolean} update edge's text or node's text
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
     * Init shape of node's image/mask when image onload
     * @param {Object} PIXI.Loader
     */
    drawImage(loader, resources) {
        let imageContainer = this.imageContainer,
            that = this;
        for (let id in that.nodeList) {
            let node = that.nodeList[id],
                src = node.info.imageSrc,
                x = node.info.x,
                y = node.info.y,
                width = node.info.width || this.opts.nodeWidth;
            if (!src) continue;
            if (node.imageShape) imageContainer.removeChild(node.imageShape);
            // let image = new Image(); 原生方法cacheAsBitmap不行
            let image = resources[src];
            //Calculate scale
            let scale = width / image.texture.width * 2;//resolut默认为1
            // create a new Sprite from an image path
            let sprite = new Sprite(image.texture);
            //sprite.filters = [new Filters.BlurFilter(1)]; //太耗性能了

            sprite.anchor.set(0.5);
            sprite.scale.x = scale;
            sprite.scale.y = scale;
            sprite.x = x;
            sprite.y = y;

            let mask = new Graphics();
            mask.beginFill("0xFFF", 0.01);

            if (node.info.width) width = node.info.width;
            mask.drawCircle(0, 0, width - 2);
            mask.endFill();

            mask.x = x;
            mask.y = y;

            sprite.mask = mask;

            //cache
            //sprite.cacheAsBitmap = true;
            //cache
            //mask.cacheAsBitmap = true;

            node.imageShape = sprite;
            node.maskShape = mask;
            imageContainer.addChild(mask);
            imageContainer.addChild(sprite);
        }
    }

    /**
     * updateImage method use for update node image/mask position 
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
     * @param {Boolean} pinFlag => Sticky or not
     * @return {Shape}
     */
    setNode(graph, id, pinFlag) {
        let onDragEnd,
            that = this,
            simulation = that.simulation;
        if (!simulation) pinFlag = false;//非力布局没有图钉效果
        graph._clickCount = 0;//Deal with dbclick
        if (pinFlag) {
            onDragEnd = function (event) {
                if (simulation) simulation.alphaTarget(0);
                this.dragging = false;
                // set the interaction data to null
                this.data = null;
                that.dragContainer.removeChild(this);
                if (that.nodeList[id].info.text) that.dragContainer.removeChild(that.nodeList[id].textShape);
                if (that.nodeList[id].info.imageSrc) that.dragContainer.removeChild(that.nodeList[id].imageShape);
                that.nodeContainer.addChild(this);
                if (that.nodeList[id].info.text) that.textContainer.addChild(that.nodeList[id].textShape);
                if (that.nodeList[id].info.imageSrc) that.imageContainer.addChild(that.nodeList[id].imageShape);
                that.nodeFlag = false;

                that.nodeList[id].info.locked = false;
                that.nodeList[id].info.userLock = false;
            }
        } else {
            onDragEnd = function (event) {
                if (simulation) simulation.alphaTarget(0);
                //Sticky or not
                that.nodeList[id].info.fx = null;
                that.nodeList[id].info.fy = null;
                let target = event.target;
                this.dragging = false;
                // set the interaction data to null
                this.data = null;
                that.dragContainer.removeChild(this);
                if (that.nodeList[id].info.text) that.dragContainer.removeChild(that.nodeList[id].textShape);
                if (that.nodeList[id].info.imageSrc) that.dragContainer.removeChild(that.nodeList[id].imageShape);
                that.nodeContainer.addChild(this);
                if (that.nodeList[id].info.text) that.textContainer.addChild(that.nodeList[id].textShape);
                if (that.nodeList[id].info.imageSrc) that.imageContainer.addChild(that.nodeList[id].imageShape);
                that.nodeFlag = false;

                that.nodeList[id].info.locked = false;
                that.nodeList[id].info.userLock = false;
            }
        }

        let onDragStart = function (event) {
            if (simulation) simulation.alphaTarget(0.3).restart();
            event.stopPropagation();
            this.data = event.data;
            this.dragging = true;
            that.nodeFlag = true;
            if (that.commandKey) {
                let len = that.selectorArr.length;
                if(len===0){
                    that.selectorArr.push(id);
                }else{
                    for(let i=0;i<len;i++){
                        if(id===that.selectorArr[i]) return;
                    }
                    that.selectorArr.push(id);
                }
                console.log(that.selectorArr);
            }
        }

        let onDragMove = function (event) {
            if (this.dragging) {
                let newPosition = this.data.getLocalPosition(this.parent);
                this.x = newPosition.x;
                this.y = newPosition.y;
                that.updateNode(id, newPosition);
                if (that.opts.layout != "d3-force") that.updateEdge(id, newPosition);//d3-force是每次tick都全部重画
                if (that.nodeList[id].info.text) that.updateText(id, newPosition, true);
                if (that.nodeList[id].info.imageSrc) that.updateImage(id, newPosition);
                that.nodeContainer.removeChild(this);
                if (that.nodeList[id].info.text) that.textContainer.removeChild(that.nodeList[id].textShape);
                if (that.nodeList[id].info.imageSrc) that.imageContainer.removeChild(that.nodeList[id].imageShape);
                that.dragContainer.addChild(this);
                if (that.nodeList[id].info.text) that.dragContainer.addChild(that.nodeList[id].textShape);
                if (that.nodeList[id].info.imageSrc) that.dragContainer.addChild(that.nodeList[id].imageShape);
            }
        }

        //图钉效果事件 pixi因为跨平台兼容性的原因放弃了dblclick
        //300毫秒间隔+单击事件=>双击事件
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

    updateNode(id, newPos) {
        let node = this.nodeList[id].info;
        node.x = newPos.x;
        node.y = newPos.y;
        node.fx = newPos.x;
        node.fy = newPos.y;
    }

    updateEdge(id, newPos) {
        //取得node的links从而得到要重画的边
        let links = this.nodeList[id].info.links;
        for (let i = 0, edge; i < links.length; i++) {//一点多线
            edge = links[i];
            if (edge.target.id === id) {
                this.drawNewEdge(this.edgeList[edge.id], true, newPos);
            } else if (edge.source.id === id) {
                this.drawNewEdge(this.edgeList[edge.id], false, newPos);
            }
        };
    }

    drawNewEdge(edge, targetFlag, newPos) {
        let source = this.nodeList[edge.info.source.id].info,//起点（node坐标）
            target = this.nodeList[edge.info.target.id].info;//终点（node坐标）

        if (targetFlag) {
            target.x = newPos.x;
            target.y = newPos.y;
        } else {
            source.x = newPos.x;
            source.y = newPos.y;
        }

        //Redraw
        this.drawArrowAndEdge(edge.info, source.id, target.id);
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
        if (data.targetShape) {
            if (data.curveStyle) {
                switch (data.curveStyle) {
                    case "bezier":
                        // CacBezierCurve
                        let bMidPos = CacBezierCurveMidPos(source, target);
                        let pos2 = { x: bMidPos.x2, y: bMidPos.y2 }
                        if (data.text) that.updateText(data.id, { x: (bMidPos.x1 + bMidPos.x2) / 2, y: (bMidPos.y1 + bMidPos.y2) / 2 }, false);
                        newTargetPos = that.drawArrowShape(data.id, data.targetShape, pos2, target, source, target, true);
                        break;
                    case "quadraticCurve":
                        // QuadraticCurve
                        let cMidPos = CacQuadraticCurveMidPos(source, target, 100);
                        newTargetPos = that.drawArrowShape(data.id, data.targetShape, cMidPos, target, source, target, true);
                        break;
                    default: break;
                }
            } else {
                if (data.text) that.updateText(data.id, { x: (source.x + target.x) / 2, y: (source.y + target.y) / 2 }, false);
                newTargetPos = that.drawArrowShape(data.id, data.targetShape, source, target, source, target, true);
            }

        }
        if (data.sourceShape) {
            if (data.curveStyle) {
                switch (data.curveStyle) {
                    case "bezier":
                        // Cacular Third Bezier Curve's Mid pos
                        let bMidPos = CacBezierCurveMidPos(source, target);
                        let pos1 = { x: bMidPos.x1, y: bMidPos.y1 }

                        if (data.text) that.updateText(data.id, { x: (bMidPos.x1 + bMidPos.x2) / 2, y: (bMidPos.y1 + bMidPos.y2) / 2 }, false);
                        newSourcePos = that.drawArrowShape(data.id, data.sourceShape, source, pos1, source, target, false);
                        break;
                    case "quadraticCurve":
                        // Cacular Second Bezier Curve's Mid pos
                        let cMidPos = CacQuadraticCurveMidPos(source, target, 100);
                        newSourcePos = that.drawArrowShape(data.id, data.sourceShape, source, cMidPos, source, target, false);
                        break;
                    default: break;
                }
            } else {
                if (data.text) that.updateText(data.id, { x: (source.x + target.x) / 2, y: (source.y + target.y) / 2 }, false);
                newSourcePos = that.drawArrowShape(data.id, data.sourceShape, source, target, source, target, false);
            }

        }

        let tempSourcePos = newSourcePos ? newSourcePos : source;
        let tempTargetPos = newTargetPos ? newTargetPos : target;

        //Draw edge(线和节点不一样，线是要重画的)
        let line = new Graphics();
        //Todo => dash
        line.lineStyle(edge.info.width, edge.info.color, edge.info.alpha);
        line.moveTo(tempSourcePos.x, tempSourcePos.y);

        if (data.curveStyle) {
            switch (data.curveStyle) {
                case "bezier":
                    // Cacular Third Bezier Curve's Mid pos
                    let cPos = CacBezierCurveMidPos(tempSourcePos, tempTargetPos, 100);
                    line.bezierCurveTo(cPos.x1, cPos.y1, cPos.x2, cPos.y2, cPos.x, cPos.y);
                    break;
                case "quadraticCurve":
                    // Cacular Second Bezier Curve's Mid pos
                    let bPos = CacQuadraticCurveMidPos(tempSourcePos, tempTargetPos, 100);
                    line.quadraticCurveTo(bPos.x, bPos.y, tempTargetPos.x, tempTargetPos.y);
                    break;
            }
        } else {
            line.lineTo(tempTargetPos.x, tempTargetPos.y);
        }

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
     * Init canvas's zoom and drag event
     * right click menu event
     * Group change event
     * findPath event
     * @param canvas canvas to init
     * @param stage stage to init  
     */
    initEvent(canvas, stage) {
        //stage.scale.set(0.08, 0.08);
        let that = this;
        if (!isEmptyObject(this.groupList)) {
            createGroupMenu(this.groupList);
        }

        function createGroupMenu(groupList) {
            let ul = document.createElement('ul');
            for (let group in groupList) {
                let li = document.createElement('li');
                li.innerText = group;
                li.style.backgroundColor = '#' + groupList[group].color;
                ul.appendChild(li);
            }
            ul.addEventListener('click', function (e) {
                let group = e.target.innerText;
                if (group) {
                    let member = that.groupList[group].member;
                    let color = getRandomColor();
                    e.target.style.backgroundColor = '#' + color;
                    for (let i = 0; i < member.length; i++) {
                        that.nodeList[member[i]].info.color = '0x' + color;
                        that.nodeList[member[i]].shape.tint = '0x' + color;
                    }
                }
            })
            document.getElementById("groupMenu").appendChild(ul);
        }

        let scaleMax = this.opts.scaleMax,
            scaleMin = this.opts.scaleMin;

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
            let point = toLocalPos(x,y);
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
            x = x-that.opts.offsetX; 
            y = y-that.opts.offsetY;
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
            circle.x = localPos.x ;
            circle.y = localPos.y ;
            point.circle = circle;
            dragContainer.addChild(circle);
        }

        window.addEventListener('keydown', onKeydown);
        window.addEventListener('keyup', onKeyup);
        function onKeydown(e) {
            if (e.metaKey || e.ctrlKey) {//control或者command
                that.commandKey = true;
            }
        }
        //Test for findPath
        function onKeyup(e) {
            that.commandKey = false;
            let len = that.selectorArr.length;
            if(len === 2){
                // console.log(that.graph.adjList);
                // let start = that.selectorArr[0],end = that.selectorArr[1];
                // //bfs 数量多的时候快
                // that.graph.bfs(start);
                // let paths = that.graph.shortestPath(start, end);
                // while (paths.length > 0) {//将路径循环找出  
                //     let id = paths.pop();
                    // that.nodeList[id].info.width = 75;
                    // that.nodeList[id].shape.height = 150;
                    // that.nodeList[id].shape.width = 150;
                // }
                //dijkstra 数量少的时候快debugger
                // let dijkstra = new Dijkstra(that.graph.adjList);
                // dijkstra.findShortestPath(start, end);
            }else{
                for (let i=0;i<len;i++) {
                    that.nodeList[that.selectorArr[i]].info.width = 40;
                    that.nodeList[that.selectorArr[i]].shape.height = 80;
                    that.nodeList[that.selectorArr[i]].shape.width = 80;
                }
            }
            that.selectorArr = [];
        }
    }
}

export default PGraph;