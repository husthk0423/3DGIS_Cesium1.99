const createStructArrayType = Cesium.StructArray;
const RasterBoundsArray = createStructArrayType({
    members: [
        { name: 'a_pos', type: 'Float32', components: 2 },
        { name: 'a_texture_pos', type: 'Int16', components: 2 },
        { name: 'a_data',  components: 2, type: 'Int16'}
    ]
});

export default RasterBoundsArray;
