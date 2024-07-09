/**
 * 坐标系 枚举
 *  @enum {String}
 */
const CRS = {
    /**
     * Web墨卡托投影坐标系
     */
    EPSG3857: "EPSG:3857",
    /**
     * WGS84地理坐标系
     */
    EPSG4326: "EPSG:4326",
    /**
     * 中国大地2000 （CGCS2000）地理坐标系
     */
    EPSG4490: "EPSG:4490",
    /**
     * CGCS2000 Gauss-Kruger Zone 平面投影，3度分带，横坐标前加带号。
     * 范围：EPSG:4513 到 EPSG:4533
     */
    CGCS2000_GK_Zone_3: "CGCS2000_GK_Zone_3",

    /**
     * CGCS2000 Gauss-Kruger Zone 平面投影，6度分带，横坐标前加带号。
     * 范围：EPSG:4491 到 EPSG:4501
     */
    CGCS2000_GK_Zone_6: "CGCS2000_GK_Zone_6",
    /**
     * CGCS2000 Gauss-Kruger CM 平面投影，3度分带，横坐标前不加带号。
     * 范围：EPSG:4534 到 EPSG:4554
     */
    CGCS2000_GK_CM_3: "CGCS2000_GK_CM_3",
    /**
     * CGCS2000 Gauss-Kruger CM 平面投影，6度分带，横坐标前不加带号。
     * 范围：EPSG:4502 到 EPSG:4512
     */
    CGCS2000_GK_CM_6: "CGCS2000_GK_CM_6",
};
export default  CRS ;
