/**
 * Created by EDZ on 2020/10/13.
 */
function serialize(input, transferables) {
    if (input === null ||
        input === undefined ||
        typeof input === 'boolean' ||
        typeof input === 'number' ||
        typeof input === 'string' ||
        input instanceof Boolean ||
        input instanceof Number ||
        input instanceof String ||
        input instanceof Date ||
        input instanceof RegExp) {
        return input;
    }

    if (isArrayBuffer(input) || isImageBitmap(input)) {
        if (transferables) {
            transferables.push(input);
        }
        return input;
    }

    if (ArrayBuffer.isView(input)) {
        const view = input;
        if (transferables) {
            transferables.push(view.buffer);
        }
        return view;
    }

    if (input instanceof ImageData) {
        if (transferables) {
            transferables.push(input.data.buffer);
        }
        return input;
    }

    if (Array.isArray(input)) {
        const serialized = [];
        for (const item of input) {
            serialized.push(serialize(item, transferables));
        }
        return serialized;
    }

    if (typeof input === 'object') {
        const klass = input.constructor;
        const name = klass._classRegistryKey;
        if (!name) {
            throw new Error(`can't serialize object of unregistered class`);
        }

        const properties = klass.serialize ?
            // (Temporary workaround) allow a class to provide static
            // `serialize()` and `deserialize()` methods to bypass the generic
            // approach.
            // This temporary workaround lets us use the generic serialization
            // approach for objects whose members include instances of dynamic
            // StructArray types. Once we refactor StructArray to be static,
            // we can remove this complexity.
            klass.serialize(input, transferables) : {};

        if (!klass.serialize) {
            for (const key in input) {
                // any cast due to https://github.com/facebook/flow/issues/5393
                if (!input.hasOwnProperty(key)) continue;
                if (registry[name].omit.indexOf(key) >= 0) continue;
                const property = input[key];
                properties[key] = serialize(property, transferables);
            }
            if (input instanceof Error) {
                properties.message = input.message;
            }
        } else {
            // make sure statically serialized object survives transfer of $name property
            console.log(!transferables || properties !== transferables[transferables.length - 1]);
        }

        if (properties.$name) {
            throw new Error('$name property is reserved for worker serialization logic.');
        }
        if (name !== 'Object') {
            properties.$name = name;
        }

        return properties;
    }

    throw new Error(`can't serialize object of type ${typeof input}`);
}

function deserialize(input) {
    if (input === null ||
        input === undefined ||
        typeof input === 'boolean' ||
        typeof input === 'number' ||
        typeof input === 'string' ||
        input instanceof Boolean ||
        input instanceof Number ||
        input instanceof String ||
        input instanceof Date ||
        input instanceof RegExp ||
        isArrayBuffer(input) ||
        isImageBitmap(input) ||
        ArrayBuffer.isView(input) ||
        input instanceof ImageData) {
        return input;
    }

    if (Array.isArray(input)) {
        return input.map(deserialize);
    }

    if (typeof input === 'object') {
        const name = input.$name || 'Object';

        if (klass.deserialize) {
            return (klass.deserialize)(input);
        }

        const result = Object.create(klass.prototype);

        for (const key of Object.keys(input)) {
            if (key === '$name') continue;
            const value = input[key];
            result[key] =  deserialize(value);
        }

        return result;
    }

    throw new Error(`can't deserialize object of type ${typeof input}`);
}

export default {serialize,deserialize};
