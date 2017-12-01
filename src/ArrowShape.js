function DrawCircleArrow(nodeWidth, sourcePos, targetPos, source, target, targetFlag) {
    let c_nodeRadius = nodeWidth;
    let srcPos = targetFlag ? targetPos : sourcePos;
    let tgtPos = targetFlag ? sourcePos : targetPos;

    let c_angle = Math.atan(Math.abs(srcPos.y - tgtPos.y) / Math.abs(srcPos.x - tgtPos.x))
    let circleWidth = c_nodeRadius / 2;
    // posX and posY is the circle's final position
    let posX = (c_nodeRadius + circleWidth) * Math.cos(c_angle),
        posY = (c_nodeRadius + circleWidth) * Math.sin(c_angle);

    // Discusses the relative position of target and source
    if (srcPos.x > tgtPos.x) {// Source node is right
        posX = srcPos.x - posX;
    } else {
        posX = srcPos.x + posX;
    }
    if (srcPos.y > tgtPos.y) {// Source node is Up
        posY = srcPos.y - posY;
    } else {
        posY = srcPos.y + posY;
    }

    return {
        x: posX,
        y: posY
    }
}

function DrawTriangleArrow(nodeWidth, sourcePos, targetPos, source, target, targetFlag) {
    //这个三角形默认按顶角为50°，两个底角为65°来算，两边长先按一半nodeWidth来算吧
    let t_nodeRadius = nodeWidth;
    let t_srcPos = targetFlag ? sourcePos : targetPos;
    let t_tgtPos = targetFlag ? targetPos : sourcePos;

    let topAngle = Math.PI / 180 * 50,//角度转弧度，注意Math的那些方法的单位是弧度
        sideEdge = t_nodeRadius,//瞅着合适，先凑合
        halfBottomEdge = Math.sin(topAngle / 2) * sideEdge,
        centerEdge = Math.cos(topAngle / 2) * sideEdge;

    //angle是一样的，先按node中心算，arrow中心算之后再说，先todo(直线版看出不这个问题，曲线就崩了)
    let angle = Math.atan(Math.abs(t_srcPos.y - t_tgtPos.y) / Math.abs(t_srcPos.x - t_tgtPos.x));
    let beginPosX = t_nodeRadius * Math.cos(angle),
        beginPosY = t_nodeRadius * Math.sin(angle),
        pos1X, pos1Y, pos2X, pos2Y,
        centerX = (t_nodeRadius + centerEdge) * Math.cos(angle),
        centerY = (t_nodeRadius + centerEdge) * Math.sin(angle);

    pos1X = pos2X = Math.sin(angle) * halfBottomEdge;
    pos1Y = pos2Y = Math.cos(angle) * halfBottomEdge;//简单的几何知识(手动抽搐😖)

    //还需要分类讨论target和source的左右位置的各种情况
    //1234代表target相对source所在象限
    if (t_srcPos.x > t_tgtPos.x) {//source节点在右
        if (t_srcPos.y > t_tgtPos.y) {//下 ----> 1
            beginPosX = t_tgtPos.x + beginPosX;
            beginPosY = t_tgtPos.y + beginPosY;

            centerX = t_tgtPos.x + centerX;
            centerY = t_tgtPos.y + centerY;

            pos1X = centerX + pos1X;
            pos1Y = centerY - pos1Y;//+ -

            pos2X = centerX - pos2X;
            pos2Y = centerY + pos2Y;//- +
        } else {//上 ----> 4
            beginPosX = t_tgtPos.x + beginPosX;
            beginPosY = t_tgtPos.y - beginPosY;

            centerX = t_tgtPos.x + centerX;
            centerY = t_tgtPos.y - centerY;

            pos1X = centerX + pos1X;
            pos1Y = centerY + pos1Y;//+ +

            pos2X = centerX - pos2X;
            pos2Y = centerY - pos2Y;//- -
        }

    } else {//source节点在左
        if (t_srcPos.y > t_tgtPos.y) {//下 ----> 2
            beginPosX = t_tgtPos.x - beginPosX;
            beginPosY = t_tgtPos.y + beginPosY;

            centerX = t_tgtPos.x - centerX;
            centerY = t_tgtPos.y + centerY;

            pos1X = centerX - pos1X;
            pos1Y = centerY - pos1Y;//- -

            pos2X = centerX + pos2X;
            pos2Y = centerY + pos2Y;//+ +
        } else {//上 ----> 3
            beginPosX = t_tgtPos.x - beginPosX;
            beginPosY = t_tgtPos.y - beginPosY;

            centerX = t_tgtPos.x - centerX;
            centerY = t_tgtPos.y - centerY;

            pos1X = centerX - pos1X;
            pos1Y = centerY + pos1Y;//- +

            pos2X = centerX + pos2X;
            pos2Y = centerY - pos2Y;//+ -
        }
    }

    return {
        beginPosX:beginPosX,
        beginPosY:beginPosY,
        pos1X:pos1X,
        pos1Y:pos1Y,
        pos2X:pos2X,
        pos2Y:pos2Y,
        centerX: centerX,
        centerY: centerY
    }
}


export {
    DrawTriangleArrow,DrawCircleArrow
} 