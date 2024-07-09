const defined = Cesium.defined;
const DeveloperError = Cesium.DeveloperError;
const defaultValue = Cesium.defaultValue;
const Resource = Cesium.Resource;
import GXYZUtil from '../GXYZUtil';
/**
 * Created by kongjian on 2017/6/30.
 */
class WmtsSubImageryProvider{
    constructor(options){
        if (!defined(options.url)) {
            throw new DeveloperError('options.url is required.');
        }

        //父wmtsProvider对象
        this.parentProvider = null;
        this.url = options.url;
        this._resource = Resource.createIfNeeded(options.url);

        let defalutMatrixLabels = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17"];
        this._tileMatrixLabels =  defaultValue(options.tileMatrixLabels, defalutMatrixLabels);

        this._subdomains = options.subdomains;
        if (Array.isArray(this._subdomains)) {
            this._subdomains = this._subdomains.slice();
        } else if (defined(this._subdomains) && this._subdomains.length > 0) {
            this._subdomains = this._subdomains.split('');
        } else {
            this._subdomains = ['a', 'b', 'c'];
        }
    }


    /**
     * 生成url
     */
    buildUrl(col, row, level, request){
        let resource;
        var labels = this._tileMatrixLabels;
        var tileMatrix = defined(labels) ? labels[level] : level.toString();
        var templateValues = {
            TileMatrix: tileMatrix,
            TileRow: row.toString(),
            TileCol: col.toString(),
            s: this._subdomains[(col + row + level) % this._subdomains.length]
        };

        resource = this._resource.getDerivedResource({
            request: request
        });
        resource.setTemplateValues(templateValues);
        return resource.url;
    }

}
export default WmtsSubImageryProvider;