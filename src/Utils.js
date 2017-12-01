function getRandomColor(){
    return ("00000"+((Math.random()*16777215+0.5)>>0).toString(16)).slice(-6); 
}

function isEmptyObject(e) {  
    var t;  
    for (t in e)  
        return !1;  
    return !0  
}  
export {
    getRandomColor,
    isEmptyObject
}