/**
 * Created by user on 2020/3/6.
 */
const BoundingRectangle = Cesium.BoundingRectangle;
const Cartesian2 = Cesium.Cartesian2;
const Color = Cesium.Color;
const defined = Cesium.defined;
const destroyObject = Cesium.destroyObject;
const BlendOption = Cesium.BlendOption;
const HeightReference = Cesium.HeightReference;
const HorizontalOrigin = Cesium.HorizontalOrigin;
const LabelStyle = Cesium.LabelStyle;
const SDFSettings = Cesium.SDFSettings;
const TextureAtlas = Cesium.TextureAtlas;
const VerticalOrigin = Cesium.VerticalOrigin;


const LabelCollection = Cesium.LabelCollection;
import BillboardCollection from '../ext/BillboardCollection.js';
import GraphemeSplitter from 'grapheme-splitter';


// var SDFSettings = {
//     /**
//      * The font size in pixels
//      *
//      * @type {Number}
//      * @constant
//      */
//     FONT_SIZE: 24.0,
//
//     /**
//      * Whitespace padding around glyphs.
//      *
//      * @type {Number}
//      * @constant
//      */
//     PADDING: 0.0,
//
//     /**
//      * How many pixels around the glyph shape to use for encoding distance
//      *
//      * @type {Number}
//      * @constant
//      */
//     RADIUS: 8.0,
//
//     /**
//      * How much of the radius (relative) is used for the inside part the glyph.
//      *
//      * @type {Number}
//      * @constant
//      */
//     CUTOFF: 0.25
// };

function Glyph() {
    this.textureInfo = undefined;
    this.dimensions = undefined;
    this.billboard = undefined;
}

// GlyphTextureInfo represents a single character, drawn in a particular style,
// shared and reference counted across all labels.  It may or may not have an
// index into the label collection's texture atlas, depending on whether the character
// has both width and height, but it always has a valid dimensions object.
function GlyphTextureInfo(labelCollection, index, dimensions) {
    this.labelCollection = labelCollection;
    this.index = index;
    this.dimensions = dimensions;
}


// Traditionally, leading is %20 of the font size.
const defaultLineSpacingPercent = 1.2;
const whitePixelCanvasId = "ID_WHITE_PIXEL";
const whitePixelSize = new Cartesian2(4, 4);
const whitePixelBoundingRegion = new BoundingRectangle(1, 1, 1, 1);


function addWhitePixelCanvas(textureAtlas) {
    const canvas = document.createElement("canvas");
    canvas.width = whitePixelSize.x;
    canvas.height = whitePixelSize.y;

    const context2D = canvas.getContext("2d");
    context2D.fillStyle = "#fff";
    context2D.fillRect(0, 0, canvas.width, canvas.height);

    // Canvas operations take a frame to draw. Use the asynchronous add function which resolves a promise and allows the draw to complete,
    // but there's no need to wait on the promise before operation can continue
    textureAtlas.addImage(whitePixelCanvasId, canvas);
}

function drawRoundRect(ctx, x, y, width, height, radius){
    ctx.beginPath();
    // y = y -1;
    ctx.arc((x + radius), (y + radius), radius, Math.PI, Math.PI * 3 / 2);
    ctx.lineTo((width - radius + x), y);
    ctx.arc((width - radius + x), (radius + y), radius, Math.PI * 3 / 2, Math.PI * 2);
    ctx.lineTo((width + x), (height + y - radius));
    ctx.arc((width - radius + x), (height - radius + y), radius, 0, Math.PI * 1 / 2);
    ctx.lineTo((radius + x), (height +y));
    ctx.arc((radius + x), (height - radius + y), radius, Math.PI * 1 / 2, Math.PI);
    ctx.closePath();
}

function unbindGlyph(labelCollection, glyph) {
    glyph.textureInfo = undefined;
    glyph.dimensions = undefined;

    const billboard = glyph.billboard;
    if (defined(billboard)) {
        billboard.show = false;
        billboard.image = undefined;
        if (defined(billboard._removeCallbackFunc)) {
            billboard._removeCallbackFunc();
            billboard._removeCallbackFunc = undefined;
        }
        labelCollection._spareBillboards.push(billboard);
        glyph.billboard = undefined;
    }
}

function addGlyphToTextureAtlas(textureAtlas, id, canvas, glyphTextureInfo) {
    glyphTextureInfo.index = textureAtlas.addImageSync(id, canvas);
}

const splitter = new GraphemeSplitter();

function rebindAllGlyphs(labelCollection, label,mapboxGlyphs) {
    const text = label._renderedText;
    if(text.length == 0){
        return;
    }
    const graphemes = splitter.splitGraphemes(text);
    const textLength = graphemes.length;
    const glyphs = label._glyphs;
    const glyphsLength = glyphs.length;

    let glyph;
    let glyphIndex;
    let textIndex;

    // Compute a font size scale relative to the sdf font generated size.
    // label._relativeSize = label._fontSize / SDFSettings.FONT_SIZE;
    label._relativeSize = label._fontSize / 24;

    // if we have more glyphs than needed, unbind the extras.
    if (textLength < glyphsLength) {
        for (glyphIndex = textLength; glyphIndex < glyphsLength; ++glyphIndex) {
            unbindGlyph(labelCollection, glyphs[glyphIndex]);
        }
    }

    // presize glyphs to match the new text length
    glyphs.length = textLength;

    const showBackground =
        label._showBackground && text.split("\n").join("").length > 0;
    let backgroundBillboard = label._backgroundBillboard;
    const backgroundBillboardCollection =
        labelCollection._backgroundBillboardCollection;
    if (!showBackground) {
        if (defined(backgroundBillboard)) {
            backgroundBillboardCollection.remove(backgroundBillboard);
            label._backgroundBillboard = backgroundBillboard = undefined;
        }
    } else {
        if (!defined(backgroundBillboard)) {
            backgroundBillboard = backgroundBillboardCollection.add({
                collection: labelCollection,
                image: whitePixelCanvasId,
                imageSubRegion: whitePixelBoundingRegion,
            });
            label._backgroundBillboard = backgroundBillboard;
        }

        backgroundBillboard.color = label._backgroundColor;
        backgroundBillboard.show = label._show;
        backgroundBillboard.position = label._position;
        backgroundBillboard.eyeOffset = label._eyeOffset;
        backgroundBillboard.pixelOffset = label._pixelOffset;
        backgroundBillboard.horizontalOrigin = HorizontalOrigin.LEFT;
        backgroundBillboard.verticalOrigin = label._verticalOrigin;
        backgroundBillboard.heightReference = label._heightReference;
        backgroundBillboard.scale = label.totalScale;
        backgroundBillboard.pickPrimitive = label;
        backgroundBillboard.id = label._id;
        backgroundBillboard.translucencyByDistance = label._translucencyByDistance;
        backgroundBillboard.pixelOffsetScaleByDistance = label._pixelOffsetScaleByDistance;
        backgroundBillboard.scaleByDistance = label._scaleByDistance;
        backgroundBillboard.distanceDisplayCondition = label._distanceDisplayCondition;
        backgroundBillboard.disableDepthTestDistance = label._disableDepthTestDistance;
    }

    const glyphTextureCache = labelCollection._glyphTextureCache;

    // walk the text looking for new characters (creating new glyphs for each)
    // or changed characters (rebinding existing glyphs)
    for (textIndex = 0; textIndex < textLength; ++textIndex) {
        const character = graphemes[textIndex];
        const verticalOrigin = label._verticalOrigin;

        const id = JSON.stringify([
            character,
            label._fontFamily,
            label._fontStyle,
            label._fontWeight,
            +verticalOrigin
        ]);

        let glyphTextureInfo = glyphTextureCache[id];
        if (!defined(glyphTextureInfo)) {
            var chartCode = character.charCodeAt(0);
            var fontName = '微软雅黑';
            var mapboxGlyph = mapboxGlyphs[fontName][chartCode];

            if(!mapboxGlyph){
                //没找到的生僻字用？号代替
                mapboxGlyph = mapboxGlyphs[fontName][63];
            }

            if(!mapboxGlyph.hasOwnProperty('dimensions')){
                mapboxGlyph.dimensions = {width:mapboxGlyph.width -3,height:24,
                    descent:0,minx:0,miny:0,maxx:0,maxy:0
                };
            }


            glyphTextureInfo = new GlyphTextureInfo(labelCollection, -1, mapboxGlyph.dimensions);
            glyphTextureCache[id] = glyphTextureInfo;

            if (mapboxGlyph.width > 0 && mapboxGlyph.height > 0) {
                if (character !== ' ') {
                    addGlyphToTextureAtlas(labelCollection._textureAtlas, id, mapboxGlyph, glyphTextureInfo);
                }
            }
        }

        glyph = glyphs[textIndex];

        if (defined(glyph)) {
            // clean up leftover information from the previous glyph
            if (glyphTextureInfo.index === -1) {
                // no texture, and therefore no billboard, for this glyph.
                // so, completely unbind glyph.
                unbindGlyph(labelCollection, glyph);
            } else if (defined(glyph.textureInfo)) {
                // we have a texture and billboard.  If we had one before, release
                // our reference to that texture info, but reuse the billboard.
                glyph.textureInfo = undefined;
            }
        } else {
            // create a glyph object
            glyph = new Glyph();
            glyphs[textIndex] = glyph;
        }

        glyph.textureInfo = glyphTextureInfo;
        glyph.dimensions = glyphTextureInfo.dimensions;
        // console.timeEnd('jsonid');
        // console.time('other');
        // if we have a texture, configure the existing billboard, or obtain one
        if (glyphTextureInfo.index !== -1) {
            let billboard = glyph.billboard;
            const spareBillboards = labelCollection._spareBillboards;
            if (!defined(billboard)) {
                if (spareBillboards.length > 0) {
                    billboard = spareBillboards.pop();
                } else {
                    billboard = labelCollection._billboardCollection.add({
                        collection : labelCollection
                    });
                    billboard._labelDimensions = new Cartesian2();
                    billboard._labelTranslate = new Cartesian2();
                }
                glyph.billboard = billboard;
            }

            billboard.show = label._show;
            billboard.position = label._position;
            billboard.eyeOffset = label._eyeOffset;
            billboard.pixelOffset = label._pixelOffset;
            billboard.horizontalOrigin = HorizontalOrigin.LEFT;
            billboard.verticalOrigin = label._verticalOrigin;
            billboard.heightReference = label._heightReference;
            billboard.scale = label.totalScale;
            billboard.pickPrimitive = label;
            billboard.id = label._id;
            billboard.image = id;
            billboard.translucencyByDistance = label._translucencyByDistance;
            billboard.pixelOffsetScaleByDistance = label._pixelOffsetScaleByDistance;
            billboard.scaleByDistance = label._scaleByDistance;
            billboard.distanceDisplayCondition = label._distanceDisplayCondition;
            billboard.disableDepthTestDistance = label._disableDepthTestDistance;
            billboard._batchIndex = label._batchIndex;
            billboard.outlineColor = label.outlineColor;
            if (label.style === LabelStyle.FILL_AND_OUTLINE) {
                billboard.color = label._fillColor;
                billboard.outlineWidth = label.outlineWidth;
            } else if (label.style === LabelStyle.FILL) {
                billboard.color = label._fillColor;
                billboard.outlineWidth = 0.0;
            } else if (label.style === LabelStyle.OUTLINE) {
                billboard.color = Color.TRANSPARENT;
                billboard.outlineWidth = label.outlineWidth;
            }

            /*************新增开始**************/
            billboard.rotation  = label._rotation;
            /*************新增结束**************/
        }
    }
    // changing glyphs will cause the position of the
    // glyphs to change, since different characters have different widths
    label._repositionAllGlyphs = true;
}

function calculateWidthOffset(lineWidth, horizontalOrigin, backgroundPadding) {
    if (horizontalOrigin === HorizontalOrigin.CENTER) {
        return -lineWidth / 2;
    } else if (horizontalOrigin === HorizontalOrigin.RIGHT) {
        return -(lineWidth + backgroundPadding.x);
    }
    return backgroundPadding.x;
}

// reusable Cartesian2 instances
const glyphPixelOffset = new Cartesian2();
const scratchBackgroundPadding = new Cartesian2();

function repositionAllGlyphs(label) {
    const glyphs = label._glyphs;
    const text = label._renderedText;
    let glyph;
    let dimensions;
    let lastLineWidth = 0;
    let maxLineWidth = 0;
    const lineWidths = [];
    let maxGlyphDescent = Number.NEGATIVE_INFINITY;
    let maxGlyphY = 0;
    let numberOfLines = 1;
    let glyphIndex;
    const glyphLength = glyphs.length;

    const backgroundBillboard = label._backgroundBillboard;
    const backgroundPadding = Cartesian2.clone(
        defined(backgroundBillboard) ? label._backgroundPadding : Cartesian2.ZERO,
        scratchBackgroundPadding
    );

    // We need to scale the background padding, which is specified in pixels by the inverse of the relative size so it is scaled properly.
    backgroundPadding.x /= label._relativeSize;
    backgroundPadding.y /= label._relativeSize;

    for (glyphIndex = 0; glyphIndex < glyphLength; ++glyphIndex) {
        if (text.charAt(glyphIndex) === "\n") {
            lineWidths.push(lastLineWidth);
            ++numberOfLines;
            lastLineWidth = 0;
        } else {
            glyph = glyphs[glyphIndex];
            dimensions = glyph.dimensions;
            maxGlyphY = Math.max(maxGlyphY, dimensions.height - dimensions.descent);
            maxGlyphDescent = Math.max(maxGlyphDescent, dimensions.descent);

            //Computing the line width must also account for the kerning that occurs between letters.
            lastLineWidth += dimensions.width - dimensions.minx;
            if (glyphIndex < glyphLength - 1) {
                lastLineWidth += glyphs[glyphIndex + 1].dimensions.minx;
            }
            maxLineWidth = Math.max(maxLineWidth, lastLineWidth);
        }
    }
    lineWidths.push(lastLineWidth);
    const maxLineHeight = maxGlyphY + maxGlyphDescent;

    const scale = label.totalScale;
    const horizontalOrigin = label._horizontalOrigin;
    const verticalOrigin = label._verticalOrigin;
    let lineIndex = 0;
    let lineWidth = lineWidths[lineIndex];
    let widthOffset = calculateWidthOffset(
        lineWidth,
        horizontalOrigin,
        backgroundPadding
    );
    const lineSpacing =
        (defined(label._lineHeight)
            ? label._lineHeight
            : defaultLineSpacingPercent * label._fontSize) / label._relativeSize;
    const otherLinesHeight = lineSpacing * (numberOfLines - 1);
    let totalLineWidth = maxLineWidth;
    let totalLineHeight = maxLineHeight + otherLinesHeight;

    glyphPixelOffset.x = widthOffset * scale;
    glyphPixelOffset.y = 0;

    let firstCharOfLine = true;

    let lineOffsetY = 0;
    for (glyphIndex = 0; glyphIndex < glyphLength; ++glyphIndex) {
        if (text.charAt(glyphIndex) === ' ') {
            ++lineIndex;
            lineOffsetY += lineSpacing;
            lineWidth = lineWidths[lineIndex];
            widthOffset = calculateWidthOffset(
                lineWidth,
                horizontalOrigin,
                backgroundPadding
            );
            glyphPixelOffset.x = widthOffset * scale;
            firstCharOfLine = true;
        } else {
            glyph = glyphs[glyphIndex];
            dimensions = glyph.dimensions;
            if (verticalOrigin === VerticalOrigin.TOP) {
                glyphPixelOffset.y = dimensions.height - maxGlyphY - backgroundPadding.y;
                glyphPixelOffset.y += SDFSettings.PADDING;
            } else if (verticalOrigin === VerticalOrigin.CENTER) {
                glyphPixelOffset.y = (otherLinesHeight + dimensions.height - maxGlyphY) / 2;
            } else if (verticalOrigin === VerticalOrigin.BASELINE) {
                glyphPixelOffset.y = otherLinesHeight;
                glyphPixelOffset.y -= SDFSettings.PADDING;
            } else {
                // VerticalOrigin.BOTTOM
                glyphPixelOffset.y = otherLinesHeight + maxGlyphDescent + backgroundPadding.y;
                glyphPixelOffset.y -= SDFSettings.PADDING;
            }
            glyphPixelOffset.y = (glyphPixelOffset.y - dimensions.descent - lineOffsetY) * scale;

            // Handle any offsets for the first character of the line since the bounds might not be right on the bottom left pixel.
            if (firstCharOfLine)
            {
                glyphPixelOffset.x -= SDFSettings.PADDING * scale;
                firstCharOfLine = false;
            }

            if (defined(glyph.billboard)) {
                glyph.billboard._setTranslate(glyphPixelOffset);
                glyph.billboard._labelDimensions.x = totalLineWidth;
                glyph.billboard._labelDimensions.y = totalLineHeight;
                glyph.billboard._labelHorizontalOrigin = horizontalOrigin;
            }

            //Compute the next x offset taking into account the kerning performed
            //on both the current letter as well as the next letter to be drawn
            //as well as any applied scale.
            if (glyphIndex < glyphLength - 1) {
                const nextGlyph = glyphs[glyphIndex + 1];
                glyphPixelOffset.x +=
                    (dimensions.width - dimensions.minx + nextGlyph.dimensions.minx) *
                    scale;
            }
        }
    }

    if (defined(backgroundBillboard) && (text.split(' ').join('').length > 0)) {
        if (horizontalOrigin === HorizontalOrigin.CENTER) {
            widthOffset = -maxLineWidth / 2 - backgroundPadding.x;
        } else if (horizontalOrigin === HorizontalOrigin.RIGHT) {
            widthOffset = -(maxLineWidth + backgroundPadding.x * 2);
        } else {
            widthOffset = 0;
        }
        glyphPixelOffset.x = widthOffset * scale;

        if (verticalOrigin === VerticalOrigin.TOP) {
            glyphPixelOffset.y = maxLineHeight - maxGlyphY - maxGlyphDescent;
        } else if (verticalOrigin === VerticalOrigin.CENTER) {
            glyphPixelOffset.y = (maxLineHeight - maxGlyphY) / 2 - maxGlyphDescent;
        } else if (verticalOrigin === VerticalOrigin.BASELINE) {
            glyphPixelOffset.y = -backgroundPadding.y - maxGlyphDescent;
        } else {
            // VerticalOrigin.BOTTOM
            glyphPixelOffset.y = 0;
        }
        glyphPixelOffset.y = glyphPixelOffset.y * scale;

        backgroundBillboard.width = totalLineWidth;
        backgroundBillboard.height = totalLineHeight;
        backgroundBillboard._setTranslate(glyphPixelOffset);
        backgroundBillboard._labelTranslate = Cartesian2.clone(
            glyphPixelOffset,
            backgroundBillboard._labelTranslate
        );
    }

    //存起来用于计算避让box
    label.totalWidth = totalLineWidth*scale;
    label.totalHeight = totalLineHeight*scale;

    if (label.heightReference === HeightReference.CLAMP_TO_GROUND) {
        for (glyphIndex = 0; glyphIndex < glyphLength; ++glyphIndex) {
            glyph = glyphs[glyphIndex];
            const billboard = glyph.billboard;
            if (defined(billboard)) {
                billboard._labelTranslate = Cartesian2.clone(
                    glyphPixelOffset,
                    billboard._labelTranslate
                );
            }
        }
    }
}

function destroyLabel(labelCollection, label) {
    const glyphs = label._glyphs;
    for (let i = 0, len = glyphs.length; i < len; ++i) {
        unbindGlyph(labelCollection, glyphs[i]);
    }
    if (defined(label._backgroundBillboard)) {
        labelCollection._backgroundBillboardCollection.remove(
            label._backgroundBillboard
        );
        label._backgroundBillboard = undefined;
    }
    label._labelCollection = undefined;

    if (defined(label._removeCallbackFunc)) {
        label._removeCallbackFunc();
    }

    destroyObject(label);
}


class LabelCollectionExt extends LabelCollection{
    constructor(options) {
        super(options);

        this._backgroundBillboardCollection = new BillboardCollection({
            scene : this._scene
        });
        this._backgroundBillboardCollection.destroyTextureAtlas = false;

        this._billboardCollection = new BillboardCollection({
            scene : this._scene,
            batchTable : this._batchTable,
            enuEnabled :options.enuEnabled
        });
        this._billboardCollection.destroyTextureAtlas = false;
        this._billboardCollection._sdf = true;
    }

    setGlyphs(mapboxGlyphs){
        this.mapboxGlyphs = mapboxGlyphs;
    }

    update(frameState){
        if(!this.mapboxGlyphs){
            return;
        }

        if (!this.show) {
            return;
        }

        const billboardCollection = this._billboardCollection;
        const backgroundBillboardCollection = this._backgroundBillboardCollection;

        billboardCollection.modelMatrix = this.modelMatrix;
        billboardCollection.debugShowBoundingVolume = this.debugShowBoundingVolume;
        backgroundBillboardCollection.modelMatrix = this.modelMatrix;
        backgroundBillboardCollection.debugShowBoundingVolume = this.debugShowBoundingVolume;

        const context = frameState.context;

        if (!defined(this._textureAtlas)) {
            this._textureAtlas = new TextureAtlas({
                context: context,
            });
            billboardCollection.textureAtlas = this._textureAtlas;
        }

        if (!defined(this._backgroundTextureAtlas)) {
            this._backgroundTextureAtlas = new TextureAtlas({
                context: context,
                initialSize: whitePixelSize,
            });
            backgroundBillboardCollection.textureAtlas = this._backgroundTextureAtlas;
            addWhitePixelCanvas(this._backgroundTextureAtlas);
        }

        const len = this._labelsToUpdate.length;
        for (let i = 0; i < len; ++i) {
            const label = this._labelsToUpdate[i];
            if (label.isDestroyed()) {
                continue;
            }

            const preUpdateGlyphCount = label._glyphs.length;

            if (label._rebindAllGlyphs) {
                rebindAllGlyphs(this, label,this.mapboxGlyphs);
                label._rebindAllGlyphs = false;
            }

            if (label._repositionAllGlyphs) {
                repositionAllGlyphs(label);
                label._repositionAllGlyphs = false;
            }

            const glyphCountDifference = label._glyphs.length - preUpdateGlyphCount;
            this._totalGlyphCount += glyphCountDifference;
        }

        const blendOption =
            backgroundBillboardCollection.length > 0
                ? BlendOption.TRANSLUCENT
                : this.blendOption;
        billboardCollection.blendOption = blendOption;
        backgroundBillboardCollection.blendOption = blendOption;

        billboardCollection._highlightColor = this._highlightColor;
        backgroundBillboardCollection._highlightColor = this._highlightColor;

        this._labelsToUpdate.length = 0;
        backgroundBillboardCollection.update(frameState);
        billboardCollection.update(frameState);
    }
}

export default LabelCollectionExt;