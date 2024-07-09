'use strict';
const Custom = module.exports = {};

//扩展cesium类
Custom.LabelCollectionExt = require('./ext/LabelCollectionExt');
Custom.BillboardCollection = require('./ext/BillboardCollection');
Custom.CesiumTerrainProvider = require('./ext/CesiumTerrainProvider');
Custom.createWorldTerrain = require('./ext/createWorldTerrain');
Custom.MapPosition = require('./ext/MapPosition');


//发光效果
Custom.LineGlow = require('./gloweffect/LineGlow');
Custom.TowerGlow = require('./gloweffect/TowerGlow');
Custom.RidingLanternGlow = require('./gloweffect/RidingLanternGlow');
Custom.PolygonDiffuseGlow = require('./gloweffect/PolygonDiffuseGlow');

Custom.RidingLanternGlowPrimitive = require('./gloweffect/RidingLanternGlowPrimitive');

//光源效果
Custom.PointLight = require('./lighteffect/PointLight');
Custom.RadarLight = require('./lighteffect/RadarLight');
Custom.WaveLight = require('./lighteffect/WaveLight');
Custom.UpDownScanLight = require('./lighteffect/UpDownScanLight');
Custom.Wave3dTileLight = require('./lighteffect/Wave3dTileLight');
Custom.Radar3dTileLight = require('./lighteffect/Radar3dTileLight');
Custom.ModelShaderFactory = require('./lighteffect/ModelShaderFactory');
Custom.ModelCollectionShaderFactory = require('./lighteffect/ModelCollectionShaderFactory');

Custom.LabelCollectionExt = require('./ext/LabelCollectionExt');
Custom.VectorTileServiceImageryProvider = require('./layer/vector/VectorTileServiceImageryProvider');
Custom.LabelTileServiceImageryProvider = require('./layer/label/LabelTileServiceImageryProvider');
Custom.HouseTileServiceImageryProvider = require('./layer/house/HouseTileServiceImageryProvider');
Custom.HillShaderTileServiceImageryProvider = require('./layer/hillshader/HillShaderTileServiceImageryProvider');
Custom.WebMapTileServiceImageryProvider = require('./layer/wmts/WebMapTileServiceImageryProvider');
Custom.Quadtree3DTilesProvider = require('./layer/3dtiles/Quadtree3DTilesProvider');

Custom.DataSource = require('./layer/datasource/DataSource');
Custom.URLDataSource = require('./layer/datasource/URLDataSource');
Custom.LocalDataSource = require('./layer/datasource/LocalDataSource');
Custom.Filter = require('./filter/Filter');
Custom.FilterLayer = require('./filter/FilterLayer');
Custom.GlyphSource = require('./layer/label/glyph/GlyphSource');
//气泡
Custom.Overlay = require('./overlay/Overlay');

//工具类
Custom.BeziterLine = require('./utils/BeziterLine');

Custom.Wkt = require('./utils/Wkt');
Custom.Geojson = require('./utils/Geojson');

Custom.RGBWorldTerrainProvider = require('./layer/terrain/RGBWorldTerrainProvider');


Custom.Drag = require('./utils/Drag');
Custom.DragModel = require('./utils/DragModel');

Custom.TerrainClip = require('./terrain/TerrainClip');
Custom.ElevationAnalysis = require('./analysis/ElevationAnalysis');
Custom.AspectAnalysis = require('./analysis/AspectAnalysis');
Custom.SlopeAnalysis = require('./analysis/SlopeAnalysis');
Custom.ViewShedAnalysis = require('./analysis/ViewShedAnalysis');
Custom.TilesetClip = require('./tileset/TilesetClip');
Custom.TilesetFlat = require('./tileset/TilesetFlat');



