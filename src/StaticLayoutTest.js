function StaticLayoutTest(nodes, edges) {
    let initialRadius = window.innerHeight / 6;
    let initialAngle = Math.PI * (3 - Math.sqrt(5));
    let center = {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2
    }

    for (let i = 0, n = nodes.length, node; i < n; i++) {
        node = nodes[i], node.index = i;
        if (isNaN(node.x) || isNaN(node.y)) {
            var radius = initialRadius * Math.sqrt(i), angle = (Math.random() * 30) * i * initialAngle;
            node.x = radius * Math.cos(angle) + center.x;
            node.y = radius * Math.sin(angle) + center.y;
        }
    }
}

export default StaticLayoutTest;