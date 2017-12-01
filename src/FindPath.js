class Graph {
    constructor() {
        this.vertices = []; //存储图中所有的顶点名字
        this.adjList = {}; //顶点邻接表
        this.marked = {};//顶点遍历标识位
        this.inStack = {};
        this.wayNumber = 0;
        this.edgeTo = [];//存放从一个顶点到下一个顶点的所有边  
    }

    addVertex(v) { //添加顶点
        this.vertices.push(v);
        this.marked[v] = false;
        this.inStack[v] = false;
        if (!this.adjList[v]) this.adjList[v] = {};
    }

    addEdge(v, w, n = 1) { //添加边
        this.adjList[v][w] = n; //基于有向图
        //this.adjList[w][v] = n; //基于无向图
    }

    bfs(s) {
        let queue = [];
        this.marked[s] = true;
        queue.push(s);//非数字也是可以push的
        while (queue.length > 0) {
            let v = queue.shift();
            // if (v != undefined) {
            //     console.log("访问节点：" + v);debugger;
            // }
            for (let node in this.adjList[v]) {
                if (!this.marked[node]) {
                    this.edgeTo[node] = v;//将对应节点存入边数组  
                    this.marked[node] = true;//依次访问其相邻子列表
                    queue.push(node);//将子列表推送入队列  
                }
            }
        }
    }

    dfs(s){
        this.marked[s] = true;
        this.inStack[s] = true;
        console.log(s);
        for (let node in this.adjList[s]) {
            if (!this.marked[node]) {
                this.dfs(node);
            }else if(this.inStack[node]){
                console.log("有环！！")
                return false;
            }
        }
        this.inStack[s] = false;
    }

    //需要先通过dfs判断有没有环
    //node === e成立时，将此时调用栈中的剩下节点排出即为路径 =
    findPath(s,e){
        this.inStack[s] = true;
        for (let node in this.adjList[s]) {
            if(node === e){
                this.wayNumber++;
                for(let res in this.inStack){
                    if(this.inStack[res]){
                        console.log(res);
                    }
                }
                console.log(node);//res
                this.inStack[s] = false;
                return;
            }
            this.findPath(node,e);
        }
        this.inStack[s] = false;
    }

    shortestPath(source, target) {
        let path = [];
        for (let i = target; i != source; i = this.edgeTo[i]) {//在相邻边数组中寻找  
            path.push(i);
        }
        path.push(source);//将起始节点加进最短路径数组  
        //console.log(path);
        return path;
    }
}


class Dijkstra {
    constructor(map) {
        this.map = map;
    }

    findShortestPath(start, end, map = this.map) {
        let costs = {},
            tempList = { '0': [start] },
            predecessors = {},
            nodes = [],
            tempEnd = end,
            mapArr = [],
            ListArr = [];
        for (let key in map) {
            mapArr.push(key);
        }
        costs[start] = 0;
        //console.log('起始节点： ' + start)
        while (tempList) {
            let keys = [],
                List = '';
            for (let key in tempList) {
                Object.prototype.hasOwnProperty.call(tempList, key) && keys.push(key);
                List += (' ' + tempList[key] + '(消耗为' + key + ')');
            }
            if (List != '')
                //console.log('List中现有：' + List);
                if (!keys.length) break;
            keys.sort((a, b) => a - b);//每次都取最小的

            let first = keys[0],
                bucket = tempList[first],
                node = bucket.shift(),
                currentCost = parseFloat(first),
                adjacentNodes = map[node] || {};
            if (ListArr.indexOf(node) != -1) continue;//如果是已经添加的节点就直接跳过
            //console.log('找到其中消耗最小的节点：' + node)
            ListArr.push(node);

            if (ListArr.length == mapArr.length) break;//判断所有节点都被加入来作为结束条件
            if (!bucket.length) delete tempList[first];
            // for (let key in tempList) {
            //     console.log('List中还剩： ' + tempList[key] + '(消耗为' + key + ')');
            // }
            //console.log(node + '节点到其他节点的关系为： ')
            for (let vertex in adjacentNodes) {
                if (Object.prototype.hasOwnProperty.call(adjacentNodes, vertex)) {
                    var cost = adjacentNodes[vertex],
                        totalCost = cost + currentCost,
                        vertexCost = costs[vertex];//取得当前节点之前保存的最小消耗

                    if ((vertexCost === undefined) || (vertexCost > totalCost)) {//需要更新
                        //console.log('到' + vertex + '节点的最小消耗更新为' + totalCost);
                        costs[vertex] = totalCost;
                        if (!tempList['' + totalCost]) tempList['' + totalCost] = [];
                        tempList['' + totalCost].push(vertex);//
                        predecessors[vertex] = node;//记录前一个节点
                    } else {
                        //console.log('从' + node + '到' + vertex + '的最小总消耗为' + totalCost + '。比之前保存的最短路径值' + vertexCost + '大，所以不用更改')
                    }
                }
            }
        }
        //console.log('从' + start + '开始,到各点的最短距离为：');
        //console.log(costs);
        while (tempEnd !== undefined) {
            nodes.push(tempEnd);
            tempEnd = predecessors[tempEnd];
        }
        nodes.reverse();//得到路径
        console.log('从' + start + '开始到' + end + '的最短路径为' + nodes.join('=>'));

    }

}

class Floyd {
    constructor(map) {
        this.map = map;
    }
    
    findShortestPath(start, end, map = this.map) {
        let inf = 99;
        for (let k in map) {
            for (let i in map) {
                for (let j in map) {
                    if(map[i][j]===undefined)map[i][j] = inf;
                    if (map[i][k] != undefined && map[k][j] != undefined && map[i][j] > map[i][k] + map[k][j]){
                        map[i][j] = map[i][k] + map[k][j];
                    }
                }
            }
        }
        console.log(map[start][end]);
    }
}
export { Graph, Dijkstra, Floyd }