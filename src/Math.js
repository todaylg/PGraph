import arcToBezier from 'svg-arc-to-cubic-bezier';

/**
 * Cacular Third Bezier Curve's Mid pos 
 * Basic on arcToBezier
 * @param {Object} tempSourcePos {x,y}
 * @param {Object} tempTargetPos {x,y} 
 * @return {Object} {x,y}
 */
function CacBezierCurveMidPos(tempSourcePos, tempTargetPos) {
    let dx = tempSourcePos.x - tempTargetPos.x,
        dy = tempSourcePos.y - tempTargetPos.y,
        dr = Math.sqrt(dx * dx + dy * dy);

    const curve = {
        type: 'arc',
        rx: dr,
        ry: dr,
        largeArcFlag: 0,
        sweepFlag: 1,
        xAxisRotation: 0,
    }

    const curves = arcToBezier({
        px: tempSourcePos.x,
        py: tempSourcePos.y,
        cx: tempTargetPos.x,
        cy: tempTargetPos.y,
        rx: curve.rx,
        ry: curve.ry,
        xAxisRotation: curve.xAxisRotation,
        largeArcFlag: curve.largeArcFlag,
        sweepFlag: curve.sweepFlag,
    });

    return curves[0];
}

/**
 * Cacular Second Bezier Curve's Mid pos
 * Basic on arcToBezier
 * @param {Object} tempSourcePos
 * @param {Object} tempTargetPos
 * @param {Number} h means the vertical distance above two point attachment
 * @return {Object}
 */
function CacQuadraticCurveMidPos(tempSourcePos, tempTargetPos, h = 100) {
    let x2 = (tempSourcePos.x - tempTargetPos.x) * (tempSourcePos.x - tempTargetPos.x);
    let y2 = (tempSourcePos.y - tempTargetPos.y) * (tempSourcePos.y - tempTargetPos.y);
    let sqrt = Math.sqrt(x2 + y2);
    let resX = (tempSourcePos.y - tempTargetPos.y) * (2 - h) / sqrt;
    let resY = (tempSourcePos.x - tempTargetPos.x) * (2 - h) / sqrt;
    return {
        x: resX,
        y: resY
    };
}

//Myself test cacular method
function myStupiedCacQuadraticCurveMidPos(tempSourcePos, tempTargetPos, height = 100) {
    let disX = Math.abs(tempTargetPos.x - tempSourcePos.x), disY = Math.abs(tempTargetPos.y - tempSourcePos.y);
    let angle = Math.atan(disY / disX);
    let halfLen = Math.sqrt(disX * disX + disY * disY) / 2;
    let angle1 = Math.atan(height / halfLen);
    let angleTotal = angle + angle1;
    if (angleTotal - Math.PI / 2 > 0) {//两角相加为一个钝角了
        let angleBeats = Math.PI - (angle + angle1);
        let edge = 100 / Math.sin(angle1);
        let xLen = edge * Math.cos(angleBeats);
        let yLen = edge * Math.sin(angleBeats);
        let minX = tempSourcePos.x - tempTargetPos.x >= 0 ? tempTargetPos.x : tempSourcePos.x;
        let minY = tempSourcePos.y - tempTargetPos.y >= 0 ? tempSourcePos.y : tempTargetPos.y;
        return {
            x: minX - xLen,
            y: minY - yLen
        }
    } else {//两角相加为一个锐角了
        let edgeLen = height / Math.sin(angle1);
        let xLen = edgeLen * Math.sin(angleTotal);
        let yLen = edgeLen * Math.cos(angleTotal);
        let maxX = tempSourcePos.x - tempTargetPos.x >= 0 ? tempSourcePos.x : tempTargetPos.x;
        let minY = tempSourcePos.y - tempTargetPos.y >= 0 ? tempSourcePos.y : tempTargetPos.y;
        return {
            x: maxX - xLen,
            y: minY + yLen
        }
    }
}

export {
    CacBezierCurveMidPos,
    CacQuadraticCurveMidPos,
    myStupiedCacQuadraticCurveMidPos
} 
