import UndisplayablePluginCell from './UndisplayablePluginCell.js';
import FocusPluginCell from './FocusPluginCell.js';

const PLUGIN_MAP = new Map();
PLUGIN_MAP.set('undisplayable',UndisplayablePluginCell);
PLUGIN_MAP.set('focusable',FocusPluginCell);


Float32Array.prototype.equals = function (array) {
    if (!array)
        return false;

    // compare lengths - can save a lot of time
    if (this.length != array.length)
        return false;

    for (var i = 0, l = this.length; i < l; i++) {
        // Check if we have nested arrays
        if (this[i] instanceof Array && array[i] instanceof Array) {
            // recurse into the nested arrays
            if (!this[i].equals(array[i]))
                return false;
        }
        else if (this[i] != array[i]) {
            // Warning - two different object instances will never be equal: {x:20} != {x:20}
            return false;
        }
    }
    return true;
}



class PrimitivePlugin{
    constructor(primitive){
        this.primitive = primitive;
        this.cells = {};
    }
    addPlugin(cellName){
        let pluginCell = PLUGIN_MAP.get(cellName)
        if(pluginCell == null){
            throw "can not find plugin named :" + cellName;
        }
        let pluginCellInstance = new pluginCell(this);
        this.cells[cellName] = pluginCellInstance;
        this._extraAttributeMap = null;
        this._needAttributeMap = null;
    }
    build(){
        this._extraAttributeMap = this._mergeExtraAttribute();
        this._needAttributeMap = {};
    }
    _mergeExtraAttribute(){
        let extraAttributeMapInPlugin = {};
        for(let cellName in this.cells){
            let cell = this.cells[cellName];
            let cellExtraAttributeMap = cell.getExtraAttributeMap();
            this._processPerCellExtraAttributes(extraAttributeMapInPlugin,cellExtraAttributeMap);
        }
        return extraAttributeMapInPlugin;
    }
    _processPerCellExtraAttributes(extraAttributeMapInPlugin,cellExtraAttributeMap){
        for(let attributeName in cellExtraAttributeMap) {
            let cellExtraAttribute = cellExtraAttributeMap[attributeName];
            let extraAttributeInPlugin = extraAttributeMapInPlugin[attributeName];
            if (extraAttributeInPlugin == null) {
                extraAttributeMapInPlugin[attributeName] = cellExtraAttributeMap[attributeName];
            } else {
                this._equalAttribute(cellExtraAttribute,extraAttributeInPlugin,attributeName);
            }
        }
    }
    _equalAttribute(attribute1,attribute2,attributeName){
        if(attribute1.componentDatatype != attribute2.componentDatatype){
            throw "extra attribute in plugin named " + attributeName + ": componentDatatype is not equal";
        }
        if(attribute1.componentsPerAttribute != attribute2.componentsPerAttribute){
            throw "extra attribute in plugin named " + attributeName + ": componentsPerAttribute is not equal";
        }
        if(attribute1.normalize != attribute2.normalize){
            throw "extra attribute in plugin named " + attributeName + ": normalize is not equal";
        }
        if(attribute1.value.equals(attribute2.value)){
            throw "extra attribute in plugin named " + attributeName + ": value is not equal";
        }

    }
    _equalAttributeWithoutValue(attribute1,attribute2,attributeName){
        if(attribute1.componentDatatype != attribute2.componentDatatype){
            throw "extra attribute in plugin named " + attributeName + ": componentDatatype is not equal";
        }
        if(attribute1.componentsPerAttribute != attribute2.componentsPerAttribute){
            throw "extra attribute in plugin named " + attributeName + ": componentsPerAttribute is not equal";
        }
        if(attribute1.normalize != attribute2.normalize){
            throw "extra attribute in plugin named " + attributeName + ": normalize is not equal";
        }
    }


    getExtraAttributeMap(){
        if(this._extraAttributeMap == null){
            throw "plugin need build";
        }
        return this._extraAttributeMap;
    }
    getNeedAttributeMap(){
        if(this._needAttributeMap == null){
            throw "plugin need build";
        }
        return this._needAttributeMap;
    }

    /**
     * 往geometryInstances中增加需要的Plugin中默认的属性类型,并且检查是否是否含有Plugin中的属性
     * @param geometryInstances
     */
    checkAndAddAttributeIntoGeometryInstances(geometryInstances){
        let length = geometryInstances.length;
        let extraAttributeMap = this.getExtraAttributeMap();
        let pluginNeedAttributeMap = this.getNeedAttributeMap();
        for(let i = 0 ; i < length ; i++){
            let geometry = geometryInstances[i];
            if(geometry.attributes == null){
                geometry.attributes = {};
            }
            let geometryAttributeMap = geometry.attributes;
            for(let attributeName in extraAttributeMap){
                let geometryAttribute = geometryAttributeMap[attributeName];
                let extraAttribute = extraAttributeMap[attributeName];
                if(geometryAttribute == null){
                    //如果没有则需要加上这个属性
                    geometryAttributeMap[attributeName] = extraAttribute;
                }else{
                    //如果有则需要比对
                    this._equalAttributeWithoutValue(geometryAttribute,extraAttribute,attributeName);
                }
            }
        }
    }
    _addAttributesToGeometry(addAttributes,geometry){
        let geometryAttributeMap = geometry.attribute;

        for(let attributeName in addAttributes){

        }
    }
    addFSPart(fs){
        for(let cellName in this.cells){
            let cell = this.cells[cellName];
            fs = cell.addFSPart(fs);
        }
        return fs;
    }

}

export default PrimitivePlugin;

