import createTaskProcessorWorker from './createTaskProcessorWorker.js';
var moment = function ()
{

    var hookCallback;

    function hooks () {
        return hookCallback.apply(null, arguments);
    }

    // This is done to register the method called with moment()
    // without creating circular dependencies.
    function setHookCallback (callback) {
        hookCallback = callback;
    }

    function isArray(input) {
        return input instanceof Array || Object.prototype.toString.call(input) === '[object Array]';
    }

    function isObject(input) {
        // IE8 will treat undefined and null as object if it wasn't for
        // input != null
        return input != null && Object.prototype.toString.call(input) === '[object Object]';
    }

    function isObjectEmpty(obj) {
        if (Object.getOwnPropertyNames) {
            return (Object.getOwnPropertyNames(obj).length === 0);
        } else {
            var k;
            for (k in obj) {
                if (obj.hasOwnProperty(k)) {
                    return false;
                }
            }
            return true;
        }
    }

    function isUndefined(input) {
        return input === void 0;
    }

    function isNumber(input) {
        return typeof input === 'number' || Object.prototype.toString.call(input) === '[object Number]';
    }

    function isDate(input) {
        return input instanceof Date || Object.prototype.toString.call(input) === '[object Date]';
    }

    function map(arr, fn) {
        var res = [], i;
        for (i = 0; i < arr.length; ++i) {
            res.push(fn(arr[i], i));
        }
        return res;
    }

    function hasOwnProp(a, b) {
        return Object.prototype.hasOwnProperty.call(a, b);
    }

    function extend(a, b) {
        for (var i in b) {
            if (hasOwnProp(b, i)) {
                a[i] = b[i];
            }
        }

        if (hasOwnProp(b, 'toString')) {
            a.toString = b.toString;
        }

        if (hasOwnProp(b, 'valueOf')) {
            a.valueOf = b.valueOf;
        }

        return a;
    }

    function createUTC (input, format, locale, strict) {
        return createLocalOrUTC(input, format, locale, strict, true).utc();
    }

    function defaultParsingFlags() {
        // We need to deep clone this object.
        return {
            empty           : false,
            unusedTokens    : [],
            unusedInput     : [],
            overflow        : -2,
            charsLeftOver   : 0,
            nullInput       : false,
            invalidMonth    : null,
            invalidFormat   : false,
            userInvalidated : false,
            iso             : false,
            parsedDateParts : [],
            meridiem        : null,
            rfc2822         : false,
            weekdayMismatch : false
        };
    }

    function getParsingFlags(m) {
        if (m._pf == null) {
            m._pf = defaultParsingFlags();
        }
        return m._pf;
    }

    var some;
    if (Array.prototype.some) {
        some = Array.prototype.some;
    } else {
        some = function (fun) {
            var t = Object(this);
            var len = t.length >>> 0;

            for (var i = 0; i < len; i++) {
                if (i in t && fun.call(this, t[i], i, t)) {
                    return true;
                }
            }

            return false;
        };
    }

    function isValid(m) {
        if (m._isValid == null) {
            var flags = getParsingFlags(m);
            var parsedParts = some.call(flags.parsedDateParts, function (i) {
                return i != null;
            });
            var isNowValid = !isNaN(m._d.getTime()) &&
                flags.overflow < 0 &&
                !flags.empty &&
                !flags.invalidMonth &&
                !flags.invalidWeekday &&
                !flags.weekdayMismatch &&
                !flags.nullInput &&
                !flags.invalidFormat &&
                !flags.userInvalidated &&
                (!flags.meridiem || (flags.meridiem && parsedParts));

            if (m._strict) {
                isNowValid = isNowValid &&
                    flags.charsLeftOver === 0 &&
                    flags.unusedTokens.length === 0 &&
                    flags.bigHour === undefined;
            }

            if (Object.isFrozen == null || !Object.isFrozen(m)) {
                m._isValid = isNowValid;
            }
            else {
                return isNowValid;
            }
        }
        return m._isValid;
    }

    function createInvalid (flags) {
        var m = createUTC(NaN);
        if (flags != null) {
            extend(getParsingFlags(m), flags);
        }
        else {
            getParsingFlags(m).userInvalidated = true;
        }

        return m;
    }

    // Plugins that add properties should also add the key here (null value),
    // so we can properly clone ourselves.
    var momentProperties = hooks.momentProperties = [];

    function copyConfig(to, from) {
        var i, prop, val;

        if (!isUndefined(from._isAMomentObject)) {
            to._isAMomentObject = from._isAMomentObject;
        }
        if (!isUndefined(from._i)) {
            to._i = from._i;
        }
        if (!isUndefined(from._f)) {
            to._f = from._f;
        }
        if (!isUndefined(from._l)) {
            to._l = from._l;
        }
        if (!isUndefined(from._strict)) {
            to._strict = from._strict;
        }
        if (!isUndefined(from._tzm)) {
            to._tzm = from._tzm;
        }
        if (!isUndefined(from._isUTC)) {
            to._isUTC = from._isUTC;
        }
        if (!isUndefined(from._offset)) {
            to._offset = from._offset;
        }
        if (!isUndefined(from._pf)) {
            to._pf = getParsingFlags(from);
        }
        if (!isUndefined(from._locale)) {
            to._locale = from._locale;
        }

        if (momentProperties.length > 0) {
            for (i = 0; i < momentProperties.length; i++) {
                prop = momentProperties[i];
                val = from[prop];
                if (!isUndefined(val)) {
                    to[prop] = val;
                }
            }
        }

        return to;
    }

    var updateInProgress = false;

    // Moment prototype object
    function Moment(config) {
        copyConfig(this, config);
        this._d = new Date(config._d != null ? config._d.getTime() : NaN);
        if (!this.isValid()) {
            this._d = new Date(NaN);
        }
        // Prevent infinite loop in case updateOffset creates new moment
        // objects.
        if (updateInProgress === false) {
            updateInProgress = true;
            hooks.updateOffset(this);
            updateInProgress = false;
        }
    }

    function isMoment (obj) {
        return obj instanceof Moment || (obj != null && obj._isAMomentObject != null);
    }

    function absFloor (number) {
        if (number < 0) {
            // -0 -> 0
            return Math.ceil(number) || 0;
        } else {
            return Math.floor(number);
        }
    }

    function toInt(argumentForCoercion) {
        var coercedNumber = +argumentForCoercion,
            value = 0;

        if (coercedNumber !== 0 && isFinite(coercedNumber)) {
            value = absFloor(coercedNumber);
        }

        return value;
    }

    // compare two arrays, return the number of differences
    function compareArrays(array1, array2, dontConvert) {
        var len = Math.min(array1.length, array2.length),
            lengthDiff = Math.abs(array1.length - array2.length),
            diffs = 0,
            i;
        for (i = 0; i < len; i++) {
            if ((dontConvert && array1[i] !== array2[i]) ||
                (!dontConvert && toInt(array1[i]) !== toInt(array2[i]))) {
                diffs++;
            }
        }
        return diffs + lengthDiff;
    }

    function warn(msg) {
        if (hooks.suppressDeprecationWarnings === false &&
            (typeof console !==  'undefined') && console.warn) {
            console.warn('Deprecation warning: ' + msg);
        }
    }

    function deprecate(msg, fn) {
        var firstTime = true;

        return extend(function () {
            if (hooks.deprecationHandler != null) {
                hooks.deprecationHandler(null, msg);
            }
            if (firstTime) {
                var args = [];
                var arg;
                for (var i = 0; i < arguments.length; i++) {
                    arg = '';
                    if (typeof arguments[i] === 'object') {
                        arg += '\n[' + i + '] ';
                        for (var key in arguments[0]) {
                            arg += key + ': ' + arguments[0][key] + ', ';
                        }
                        arg = arg.slice(0, -2); // Remove trailing comma and space
                    } else {
                        arg = arguments[i];
                    }
                    args.push(arg);
                }
                warn(msg + '\nArguments: ' + Array.prototype.slice.call(args).join('') + '\n' + (new Error()).stack);
                firstTime = false;
            }
            return fn.apply(this, arguments);
        }, fn);
    }

    var deprecations = {};

    function deprecateSimple(name, msg) {
        if (hooks.deprecationHandler != null) {
            hooks.deprecationHandler(name, msg);
        }
        if (!deprecations[name]) {
            warn(msg);
            deprecations[name] = true;
        }
    }

    hooks.suppressDeprecationWarnings = false;
    hooks.deprecationHandler = null;

    function isFunction(input) {
        return input instanceof Function || Object.prototype.toString.call(input) === '[object Function]';
    }

    function set (config) {
        var prop, i;
        for (i in config) {
            prop = config[i];
            if (isFunction(prop)) {
                this[i] = prop;
            } else {
                this['_' + i] = prop;
            }
        }
        this._config = config;
        // Lenient ordinal parsing accepts just a number in addition to
        // number + (possibly) stuff coming from _dayOfMonthOrdinalParse.
        // TODO: Remove "ordinalParse" fallback in next major release.
        this._dayOfMonthOrdinalParseLenient = new RegExp(
            (this._dayOfMonthOrdinalParse.source || this._ordinalParse.source) +
            '|' + (/\d{1,2}/).source);
    }

    function mergeConfigs(parentConfig, childConfig) {
        var res = extend({}, parentConfig), prop;
        for (prop in childConfig) {
            if (hasOwnProp(childConfig, prop)) {
                if (isObject(parentConfig[prop]) && isObject(childConfig[prop])) {
                    res[prop] = {};
                    extend(res[prop], parentConfig[prop]);
                    extend(res[prop], childConfig[prop]);
                } else if (childConfig[prop] != null) {
                    res[prop] = childConfig[prop];
                } else {
                    delete res[prop];
                }
            }
        }
        for (prop in parentConfig) {
            if (hasOwnProp(parentConfig, prop) &&
                !hasOwnProp(childConfig, prop) &&
                isObject(parentConfig[prop])) {
                // make sure changes to properties don't modify parent config
                res[prop] = extend({}, res[prop]);
            }
        }
        return res;
    }

    function Locale(config) {
        if (config != null) {
            this.set(config);
        }
    }

    var keys;

    if (Object.keys) {
        keys = Object.keys;
    } else {
        keys = function (obj) {
            var i, res = [];
            for (i in obj) {
                if (hasOwnProp(obj, i)) {
                    res.push(i);
                }
            }
            return res;
        };
    }

    var defaultCalendar = {
        sameDay : '[Today at] LT',
        nextDay : '[Tomorrow at] LT',
        nextWeek : 'dddd [at] LT',
        lastDay : '[Yesterday at] LT',
        lastWeek : '[Last] dddd [at] LT',
        sameElse : 'L'
    };

    function calendar (key, mom, now) {
        var output = this._calendar[key] || this._calendar['sameElse'];
        return isFunction(output) ? output.call(mom, now) : output;
    }

    var defaultLongDateFormat = {
        LTS  : 'h:mm:ss A',
        LT   : 'h:mm A',
        L    : 'MM/DD/YYYY',
        LL   : 'MMMM D, YYYY',
        LLL  : 'MMMM D, YYYY h:mm A',
        LLLL : 'dddd, MMMM D, YYYY h:mm A'
    };

    function longDateFormat (key) {
        var format = this._longDateFormat[key],
            formatUpper = this._longDateFormat[key.toUpperCase()];

        if (format || !formatUpper) {
            return format;
        }

        this._longDateFormat[key] = formatUpper.replace(/MMMM|MM|DD|dddd/g, function (val) {
            return val.slice(1);
        });

        return this._longDateFormat[key];
    }

    var defaultInvalidDate = 'Invalid date';

    function invalidDate () {
        return this._invalidDate;
    }

    var defaultOrdinal = '%d';
    var defaultDayOfMonthOrdinalParse = /\d{1,2}/;

    function ordinal (number) {
        return this._ordinal.replace('%d', number);
    }

    var defaultRelativeTime = {
        future : 'in %s',
        past   : '%s ago',
        s  : 'a few seconds',
        ss : '%d seconds',
        m  : 'a minute',
        mm : '%d minutes',
        h  : 'an hour',
        hh : '%d hours',
        d  : 'a day',
        dd : '%d days',
        M  : 'a month',
        MM : '%d months',
        y  : 'a year',
        yy : '%d years'
    };

    function relativeTime (number, withoutSuffix, string, isFuture) {
        var output = this._relativeTime[string];
        return (isFunction(output)) ?
            output(number, withoutSuffix, string, isFuture) :
            output.replace(/%d/i, number);
    }

    function pastFuture (diff, output) {
        var format = this._relativeTime[diff > 0 ? 'future' : 'past'];
        return isFunction(format) ? format(output) : format.replace(/%s/i, output);
    }

    var aliases = {};

    function addUnitAlias (unit, shorthand) {
        var lowerCase = unit.toLowerCase();
        aliases[lowerCase] = aliases[lowerCase + 's'] = aliases[shorthand] = unit;
    }

    function normalizeUnits(units) {
        return typeof units === 'string' ? aliases[units] || aliases[units.toLowerCase()] : undefined;
    }

    function normalizeObjectUnits(inputObject) {
        var normalizedInput = {},
            normalizedProp,
            prop;

        for (prop in inputObject) {
            if (hasOwnProp(inputObject, prop)) {
                normalizedProp = normalizeUnits(prop);
                if (normalizedProp) {
                    normalizedInput[normalizedProp] = inputObject[prop];
                }
            }
        }

        return normalizedInput;
    }

    var priorities = {};

    function addUnitPriority(unit, priority) {
        priorities[unit] = priority;
    }

    function getPrioritizedUnits(unitsObj) {
        var units = [];
        for (var u in unitsObj) {
            units.push({unit: u, priority: priorities[u]});
        }
        units.sort(function (a, b) {
            return a.priority - b.priority;
        });
        return units;
    }

    function zeroFill(number, targetLength, forceSign) {
        var absNumber = '' + Math.abs(number),
            zerosToFill = targetLength - absNumber.length,
            sign = number >= 0;
        return (sign ? (forceSign ? '+' : '') : '-') +
            Math.pow(10, Math.max(0, zerosToFill)).toString().substr(1) + absNumber;
    }

    var formattingTokens = /(\[[^\[]*\])|(\\)?([Hh]mm(ss)?|Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Qo?|YYYYYY|YYYYY|YYYY|YY|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|kk?|mm?|ss?|S{1,9}|x|X|zz?|ZZ?|.)/g;

    var localFormattingTokens = /(\[[^\[]*\])|(\\)?(LTS|LT|LL?L?L?|l{1,4})/g;

    var formatFunctions = {};

    var formatTokenFunctions = {};

    // token:    'M'
    // padded:   ['MM', 2]
    // ordinal:  'Mo'
    // callback: function () { this.month() + 1 }
    function addFormatToken (token, padded, ordinal, callback) {
        var func = callback;
        if (typeof callback === 'string') {
            func = function () {
                return this[callback]();
            };
        }
        if (token) {
            formatTokenFunctions[token] = func;
        }
        if (padded) {
            formatTokenFunctions[padded[0]] = function () {
                return zeroFill(func.apply(this, arguments), padded[1], padded[2]);
            };
        }
        if (ordinal) {
            formatTokenFunctions[ordinal] = function () {
                return this.localeData().ordinal(func.apply(this, arguments), token);
            };
        }
    }

    function removeFormattingTokens(input) {
        if (input.match(/\[[\s\S]/)) {
            return input.replace(/^\[|\]$/g, '');
        }
        return input.replace(/\\/g, '');
    }

    function makeFormatFunction(format) {
        var array = format.match(formattingTokens), i, length;

        for (i = 0, length = array.length; i < length; i++) {
            if (formatTokenFunctions[array[i]]) {
                array[i] = formatTokenFunctions[array[i]];
            } else {
                array[i] = removeFormattingTokens(array[i]);
            }
        }

        return function (mom) {
            var output = '', i;
            for (i = 0; i < length; i++) {
                output += isFunction(array[i]) ? array[i].call(mom, format) : array[i];
            }
            return output;
        };
    }

    // format date using native date object
    function formatMoment(m, format) {
        if (!m.isValid()) {
            return m.localeData().invalidDate();
        }

        format = expandFormat(format, m.localeData());
        formatFunctions[format] = formatFunctions[format] || makeFormatFunction(format);

        return formatFunctions[format](m);
    }

    function expandFormat(format, locale) {
        var i = 5;

        function replaceLongDateFormatTokens(input) {
            return locale.longDateFormat(input) || input;
        }

        localFormattingTokens.lastIndex = 0;
        while (i >= 0 && localFormattingTokens.test(format)) {
            format = format.replace(localFormattingTokens, replaceLongDateFormatTokens);
            localFormattingTokens.lastIndex = 0;
            i -= 1;
        }

        return format;
    }

    var match1         = /\d/;            //       0 - 9
    var match2         = /\d\d/;          //      00 - 99
    var match3         = /\d{3}/;         //     000 - 999
    var match4         = /\d{4}/;         //    0000 - 9999
    var match6         = /[+-]?\d{6}/;    // -999999 - 999999
    var match1to2      = /\d\d?/;         //       0 - 99
    var match3to4      = /\d\d\d\d?/;     //     999 - 9999
    var match5to6      = /\d\d\d\d\d\d?/; //   99999 - 999999
    var match1to3      = /\d{1,3}/;       //       0 - 999
    var match1to4      = /\d{1,4}/;       //       0 - 9999
    var match1to6      = /[+-]?\d{1,6}/;  // -999999 - 999999

    var matchUnsigned  = /\d+/;           //       0 - inf
    var matchSigned    = /[+-]?\d+/;      //    -inf - inf

    var matchOffset    = /Z|[+-]\d\d:?\d\d/gi; // +00:00 -00:00 +0000 -0000 or Z
    var matchShortOffset = /Z|[+-]\d\d(?::?\d\d)?/gi; // +00 -00 +00:00 -00:00 +0000 -0000 or Z

    var matchTimestamp = /[+-]?\d+(\.\d{1,3})?/; // 123456789 123456789.123

    // any word (or two) characters or numbers including two/three word month in arabic.
    // includes scottish gaelic two word and hyphenated months
    var matchWord = /[0-9]{0,256}['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFF07\uFF10-\uFFEF]{1,256}|[\u0600-\u06FF\/]{1,256}(\s*?[\u0600-\u06FF]{1,256}){1,2}/i;

    var regexes = {};

    function addRegexToken (token, regex, strictRegex) {
        regexes[token] = isFunction(regex) ? regex : function (isStrict, localeData) {
            return (isStrict && strictRegex) ? strictRegex : regex;
        };
    }

    function getParseRegexForToken (token, config) {
        if (!hasOwnProp(regexes, token)) {
            return new RegExp(unescapeFormat(token));
        }

        return regexes[token](config._strict, config._locale);
    }

    // Code from http://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript
    function unescapeFormat(s) {
        return regexEscape(s.replace('\\', '').replace(/\\(\[)|\\(\])|\[([^\]\[]*)\]|\\(.)/g, function (matched, p1, p2, p3, p4) {
            return p1 || p2 || p3 || p4;
        }));
    }

    function regexEscape(s) {
        return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    }

    var tokens = {};

    function addParseToken (token, callback) {
        var i, func = callback;
        if (typeof token === 'string') {
            token = [token];
        }
        if (isNumber(callback)) {
            func = function (input, array) {
                array[callback] = toInt(input);
            };
        }
        for (i = 0; i < token.length; i++) {
            tokens[token[i]] = func;
        }
    }

    function addWeekParseToken (token, callback) {
        addParseToken(token, function (input, array, config, token) {
            config._w = config._w || {};
            callback(input, config._w, config, token);
        });
    }

    function addTimeToArrayFromToken(token, input, config) {
        if (input != null && hasOwnProp(tokens, token)) {
            tokens[token](input, config._a, config, token);
        }
    }

    var YEAR = 0;
    var MONTH = 1;
    var DATE = 2;
    var HOUR = 3;
    var MINUTE = 4;
    var SECOND = 5;
    var MILLISECOND = 6;
    var WEEK = 7;
    var WEEKDAY = 8;

    // FORMATTING

    addFormatToken('Y', 0, 0, function () {
        var y = this.year();
        return y <= 9999 ? '' + y : '+' + y;
    });

    addFormatToken(0, ['YY', 2], 0, function () {
        return this.year() % 100;
    });

    addFormatToken(0, ['YYYY',   4],       0, 'year');
    addFormatToken(0, ['YYYYY',  5],       0, 'year');
    addFormatToken(0, ['YYYYYY', 6, true], 0, 'year');

    // ALIASES

    addUnitAlias('year', 'y');

    // PRIORITIES

    addUnitPriority('year', 1);

    // PARSING

    addRegexToken('Y',      matchSigned);
    addRegexToken('YY',     match1to2, match2);
    addRegexToken('YYYY',   match1to4, match4);
    addRegexToken('YYYYY',  match1to6, match6);
    addRegexToken('YYYYYY', match1to6, match6);

    addParseToken(['YYYYY', 'YYYYYY'], YEAR);
    addParseToken('YYYY', function (input, array) {
        array[YEAR] = input.length === 2 ? hooks.parseTwoDigitYear(input) : toInt(input);
    });
    addParseToken('YY', function (input, array) {
        array[YEAR] = hooks.parseTwoDigitYear(input);
    });
    addParseToken('Y', function (input, array) {
        array[YEAR] = parseInt(input, 10);
    });

    // HELPERS

    function daysInYear(year) {
        return isLeapYear(year) ? 366 : 365;
    }

    function isLeapYear(year) {
        return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    }

    // HOOKS

    hooks.parseTwoDigitYear = function (input) {
        return toInt(input) + (toInt(input) > 68 ? 1900 : 2000);
    };

    // MOMENTS

    var getSetYear = makeGetSet('FullYear', true);

    function getIsLeapYear () {
        return isLeapYear(this.year());
    }

    function makeGetSet (unit, keepTime) {
        return function (value) {
            if (value != null) {
                set$1(this, unit, value);
                hooks.updateOffset(this, keepTime);
                return this;
            } else {
                return get(this, unit);
            }
        };
    }

    function get (mom, unit) {
        return mom.isValid() ?
            mom._d['get' + (mom._isUTC ? 'UTC' : '') + unit]() : NaN;
    }

    function set$1 (mom, unit, value) {
        if (mom.isValid() && !isNaN(value)) {
            if (unit === 'FullYear' && isLeapYear(mom.year()) && mom.month() === 1 && mom.date() === 29) {
                mom._d['set' + (mom._isUTC ? 'UTC' : '') + unit](value, mom.month(), daysInMonth(value, mom.month()));
            }
            else {
                mom._d['set' + (mom._isUTC ? 'UTC' : '') + unit](value);
            }
        }
    }

    // MOMENTS

    function stringGet (units) {
        units = normalizeUnits(units);
        if (isFunction(this[units])) {
            return this[units]();
        }
        return this;
    }


    function stringSet (units, value) {
        if (typeof units === 'object') {
            units = normalizeObjectUnits(units);
            var prioritized = getPrioritizedUnits(units);
            for (var i = 0; i < prioritized.length; i++) {
                this[prioritized[i].unit](units[prioritized[i].unit]);
            }
        } else {
            units = normalizeUnits(units);
            if (isFunction(this[units])) {
                return this[units](value);
            }
        }
        return this;
    }

    function mod(n, x) {
        return ((n % x) + x) % x;
    }

    var indexOf;

    if (Array.prototype.indexOf) {
        indexOf = Array.prototype.indexOf;
    } else {
        indexOf = function (o) {
            // I know
            var i;
            for (i = 0; i < this.length; ++i) {
                if (this[i] === o) {
                    return i;
                }
            }
            return -1;
        };
    }

    function daysInMonth(year, month) {
        if (isNaN(year) || isNaN(month)) {
            return NaN;
        }
        var modMonth = mod(month, 12);
        year += (month - modMonth) / 12;
        return modMonth === 1 ? (isLeapYear(year) ? 29 : 28) : (31 - modMonth % 7 % 2);
    }

    // FORMATTING

    addFormatToken('M', ['MM', 2], 'Mo', function () {
        return this.month() + 1;
    });

    addFormatToken('MMM', 0, 0, function (format) {
        return this.localeData().monthsShort(this, format);
    });

    addFormatToken('MMMM', 0, 0, function (format) {
        return this.localeData().months(this, format);
    });

    // ALIASES

    addUnitAlias('month', 'M');

    // PRIORITY

    addUnitPriority('month', 8);

    // PARSING

    addRegexToken('M',    match1to2);
    addRegexToken('MM',   match1to2, match2);
    addRegexToken('MMM',  function (isStrict, locale) {
        return locale.monthsShortRegex(isStrict);
    });
    addRegexToken('MMMM', function (isStrict, locale) {
        return locale.monthsRegex(isStrict);
    });

    addParseToken(['M', 'MM'], function (input, array) {
        array[MONTH] = toInt(input) - 1;
    });

    addParseToken(['MMM', 'MMMM'], function (input, array, config, token) {
        var month = config._locale.monthsParse(input, token, config._strict);
        // if we didn't find a month name, mark the date as invalid.
        if (month != null) {
            array[MONTH] = month;
        } else {
            getParsingFlags(config).invalidMonth = input;
        }
    });

    // LOCALES

    var MONTHS_IN_FORMAT = /D[oD]?(\[[^\[\]]*\]|\s)+MMMM?/;
    var defaultLocaleMonths = 'January_February_March_April_May_June_July_August_September_October_November_December'.split('_');
    function localeMonths (m, format) {
        if (!m) {
            return isArray(this._months) ? this._months :
                this._months['standalone'];
        }
        return isArray(this._months) ? this._months[m.month()] :
            this._months[(this._months.isFormat || MONTHS_IN_FORMAT).test(format) ? 'format' : 'standalone'][m.month()];
    }

    var defaultLocaleMonthsShort = 'Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec'.split('_');
    function localeMonthsShort (m, format) {
        if (!m) {
            return isArray(this._monthsShort) ? this._monthsShort :
                this._monthsShort['standalone'];
        }
        return isArray(this._monthsShort) ? this._monthsShort[m.month()] :
            this._monthsShort[MONTHS_IN_FORMAT.test(format) ? 'format' : 'standalone'][m.month()];
    }

    function handleStrictParse(monthName, format, strict) {
        var i, ii, mom, llc = monthName.toLocaleLowerCase();
        if (!this._monthsParse) {
            // this is not used
            this._monthsParse = [];
            this._longMonthsParse = [];
            this._shortMonthsParse = [];
            for (i = 0; i < 12; ++i) {
                mom = createUTC([2000, i]);
                this._shortMonthsParse[i] = this.monthsShort(mom, '').toLocaleLowerCase();
                this._longMonthsParse[i] = this.months(mom, '').toLocaleLowerCase();
            }
        }

        if (strict) {
            if (format === 'MMM') {
                ii = indexOf.call(this._shortMonthsParse, llc);
                return ii !== -1 ? ii : null;
            } else {
                ii = indexOf.call(this._longMonthsParse, llc);
                return ii !== -1 ? ii : null;
            }
        } else {
            if (format === 'MMM') {
                ii = indexOf.call(this._shortMonthsParse, llc);
                if (ii !== -1) {
                    return ii;
                }
                ii = indexOf.call(this._longMonthsParse, llc);
                return ii !== -1 ? ii : null;
            } else {
                ii = indexOf.call(this._longMonthsParse, llc);
                if (ii !== -1) {
                    return ii;
                }
                ii = indexOf.call(this._shortMonthsParse, llc);
                return ii !== -1 ? ii : null;
            }
        }
    }

    function localeMonthsParse (monthName, format, strict) {
        var i, mom, regex;

        if (this._monthsParseExact) {
            return handleStrictParse.call(this, monthName, format, strict);
        }

        if (!this._monthsParse) {
            this._monthsParse = [];
            this._longMonthsParse = [];
            this._shortMonthsParse = [];
        }

        // TODO: add sorting
        // Sorting makes sure if one month (or abbr) is a prefix of another
        // see sorting in computeMonthsParse
        for (i = 0; i < 12; i++) {
            // make the regex if we don't have it already
            mom = createUTC([2000, i]);
            if (strict && !this._longMonthsParse[i]) {
                this._longMonthsParse[i] = new RegExp('^' + this.months(mom, '').replace('.', '') + '$', 'i');
                this._shortMonthsParse[i] = new RegExp('^' + this.monthsShort(mom, '').replace('.', '') + '$', 'i');
            }
            if (!strict && !this._monthsParse[i]) {
                regex = '^' + this.months(mom, '') + '|^' + this.monthsShort(mom, '');
                this._monthsParse[i] = new RegExp(regex.replace('.', ''), 'i');
            }
            // test the regex
            if (strict && format === 'MMMM' && this._longMonthsParse[i].test(monthName)) {
                return i;
            } else if (strict && format === 'MMM' && this._shortMonthsParse[i].test(monthName)) {
                return i;
            } else if (!strict && this._monthsParse[i].test(monthName)) {
                return i;
            }
        }
    }

    // MOMENTS

    function setMonth (mom, value) {
        var dayOfMonth;

        if (!mom.isValid()) {
            // No op
            return mom;
        }

        if (typeof value === 'string') {
            if (/^\d+$/.test(value)) {
                value = toInt(value);
            } else {
                value = mom.localeData().monthsParse(value);
                // TODO: Another silent failure?
                if (!isNumber(value)) {
                    return mom;
                }
            }
        }

        dayOfMonth = Math.min(mom.date(), daysInMonth(mom.year(), value));
        mom._d['set' + (mom._isUTC ? 'UTC' : '') + 'Month'](value, dayOfMonth);
        return mom;
    }

    function getSetMonth (value) {
        if (value != null) {
            setMonth(this, value);
            hooks.updateOffset(this, true);
            return this;
        } else {
            return get(this, 'Month');
        }
    }

    function getDaysInMonth () {
        return daysInMonth(this.year(), this.month());
    }

    var defaultMonthsShortRegex = matchWord;
    function monthsShortRegex (isStrict) {
        if (this._monthsParseExact) {
            if (!hasOwnProp(this, '_monthsRegex')) {
                computeMonthsParse.call(this);
            }
            if (isStrict) {
                return this._monthsShortStrictRegex;
            } else {
                return this._monthsShortRegex;
            }
        } else {
            if (!hasOwnProp(this, '_monthsShortRegex')) {
                this._monthsShortRegex = defaultMonthsShortRegex;
            }
            return this._monthsShortStrictRegex && isStrict ?
                this._monthsShortStrictRegex : this._monthsShortRegex;
        }
    }

    var defaultMonthsRegex = matchWord;
    function monthsRegex (isStrict) {
        if (this._monthsParseExact) {
            if (!hasOwnProp(this, '_monthsRegex')) {
                computeMonthsParse.call(this);
            }
            if (isStrict) {
                return this._monthsStrictRegex;
            } else {
                return this._monthsRegex;
            }
        } else {
            if (!hasOwnProp(this, '_monthsRegex')) {
                this._monthsRegex = defaultMonthsRegex;
            }
            return this._monthsStrictRegex && isStrict ?
                this._monthsStrictRegex : this._monthsRegex;
        }
    }

    function computeMonthsParse () {
        function cmpLenRev(a, b) {
            return b.length - a.length;
        }

        var shortPieces = [], longPieces = [], mixedPieces = [],
            i, mom;
        for (i = 0; i < 12; i++) {
            // make the regex if we don't have it already
            mom = createUTC([2000, i]);
            shortPieces.push(this.monthsShort(mom, ''));
            longPieces.push(this.months(mom, ''));
            mixedPieces.push(this.months(mom, ''));
            mixedPieces.push(this.monthsShort(mom, ''));
        }
        // Sorting makes sure if one month (or abbr) is a prefix of another it
        // will match the longer piece.
        shortPieces.sort(cmpLenRev);
        longPieces.sort(cmpLenRev);
        mixedPieces.sort(cmpLenRev);
        for (i = 0; i < 12; i++) {
            shortPieces[i] = regexEscape(shortPieces[i]);
            longPieces[i] = regexEscape(longPieces[i]);
        }
        for (i = 0; i < 24; i++) {
            mixedPieces[i] = regexEscape(mixedPieces[i]);
        }

        this._monthsRegex = new RegExp('^(' + mixedPieces.join('|') + ')', 'i');
        this._monthsShortRegex = this._monthsRegex;
        this._monthsStrictRegex = new RegExp('^(' + longPieces.join('|') + ')', 'i');
        this._monthsShortStrictRegex = new RegExp('^(' + shortPieces.join('|') + ')', 'i');
    }

    function createDate (y, m, d, h, M, s, ms) {
        // can't just apply() to create a date:
        // https://stackoverflow.com/q/181348
        var date;
        // the date constructor remaps years 0-99 to 1900-1999
        if (y < 100 && y >= 0) {
            // preserve leap years using a full 400 year cycle, then reset
            date = new Date(y + 400, m, d, h, M, s, ms);
            if (isFinite(date.getFullYear())) {
                date.setFullYear(y);
            }
        } else {
            date = new Date(y, m, d, h, M, s, ms);
        }

        return date;
    }

    function createUTCDate (y) {
        var date;
        // the Date.UTC function remaps years 0-99 to 1900-1999
        if (y < 100 && y >= 0) {
            var args = Array.prototype.slice.call(arguments);
            // preserve leap years using a full 400 year cycle, then reset
            args[0] = y + 400;
            date = new Date(Date.UTC.apply(null, args));
            if (isFinite(date.getUTCFullYear())) {
                date.setUTCFullYear(y);
            }
        } else {
            date = new Date(Date.UTC.apply(null, arguments));
        }

        return date;
    }

    // start-of-first-week - start-of-year
    function firstWeekOffset(year, dow, doy) {
        var // first-week day -- which january is always in the first week (4 for iso, 1 for other)
            fwd = 7 + dow - doy,
            // first-week day local weekday -- which local weekday is fwd
            fwdlw = (7 + createUTCDate(year, 0, fwd).getUTCDay() - dow) % 7;

        return -fwdlw + fwd - 1;
    }

    // https://en.wikipedia.org/wiki/ISO_week_date#Calculating_a_date_given_the_year.2C_week_number_and_weekday
    function dayOfYearFromWeeks(year, week, weekday, dow, doy) {
        var localWeekday = (7 + weekday - dow) % 7,
            weekOffset = firstWeekOffset(year, dow, doy),
            dayOfYear = 1 + 7 * (week - 1) + localWeekday + weekOffset,
            resYear, resDayOfYear;

        if (dayOfYear <= 0) {
            resYear = year - 1;
            resDayOfYear = daysInYear(resYear) + dayOfYear;
        } else if (dayOfYear > daysInYear(year)) {
            resYear = year + 1;
            resDayOfYear = dayOfYear - daysInYear(year);
        } else {
            resYear = year;
            resDayOfYear = dayOfYear;
        }

        return {
            year: resYear,
            dayOfYear: resDayOfYear
        };
    }

    function weekOfYear(mom, dow, doy) {
        var weekOffset = firstWeekOffset(mom.year(), dow, doy),
            week = Math.floor((mom.dayOfYear() - weekOffset - 1) / 7) + 1,
            resWeek, resYear;

        if (week < 1) {
            resYear = mom.year() - 1;
            resWeek = week + weeksInYear(resYear, dow, doy);
        } else if (week > weeksInYear(mom.year(), dow, doy)) {
            resWeek = week - weeksInYear(mom.year(), dow, doy);
            resYear = mom.year() + 1;
        } else {
            resYear = mom.year();
            resWeek = week;
        }

        return {
            week: resWeek,
            year: resYear
        };
    }

    function weeksInYear(year, dow, doy) {
        var weekOffset = firstWeekOffset(year, dow, doy),
            weekOffsetNext = firstWeekOffset(year + 1, dow, doy);
        return (daysInYear(year) - weekOffset + weekOffsetNext) / 7;
    }

    // FORMATTING

    addFormatToken('w', ['ww', 2], 'wo', 'week');
    addFormatToken('W', ['WW', 2], 'Wo', 'isoWeek');

    // ALIASES

    addUnitAlias('week', 'w');
    addUnitAlias('isoWeek', 'W');

    // PRIORITIES

    addUnitPriority('week', 5);
    addUnitPriority('isoWeek', 5);

    // PARSING

    addRegexToken('w',  match1to2);
    addRegexToken('ww', match1to2, match2);
    addRegexToken('W',  match1to2);
    addRegexToken('WW', match1to2, match2);

    addWeekParseToken(['w', 'ww', 'W', 'WW'], function (input, week, config, token) {
        week[token.substr(0, 1)] = toInt(input);
    });

    // HELPERS

    // LOCALES

    function localeWeek (mom) {
        return weekOfYear(mom, this._week.dow, this._week.doy).week;
    }

    var defaultLocaleWeek = {
        dow : 0, // Sunday is the first day of the week.
        doy : 6  // The week that contains Jan 6th is the first week of the year.
    };

    function localeFirstDayOfWeek () {
        return this._week.dow;
    }

    function localeFirstDayOfYear () {
        return this._week.doy;
    }

    // MOMENTS

    function getSetWeek (input) {
        var week = this.localeData().week(this);
        return input == null ? week : this.add((input - week) * 7, 'd');
    }

    function getSetISOWeek (input) {
        var week = weekOfYear(this, 1, 4).week;
        return input == null ? week : this.add((input - week) * 7, 'd');
    }

    // FORMATTING

    addFormatToken('d', 0, 'do', 'day');

    addFormatToken('dd', 0, 0, function (format) {
        return this.localeData().weekdaysMin(this, format);
    });

    addFormatToken('ddd', 0, 0, function (format) {
        return this.localeData().weekdaysShort(this, format);
    });

    addFormatToken('dddd', 0, 0, function (format) {
        return this.localeData().weekdays(this, format);
    });

    addFormatToken('e', 0, 0, 'weekday');
    addFormatToken('E', 0, 0, 'isoWeekday');

    // ALIASES

    addUnitAlias('day', 'd');
    addUnitAlias('weekday', 'e');
    addUnitAlias('isoWeekday', 'E');

    // PRIORITY
    addUnitPriority('day', 11);
    addUnitPriority('weekday', 11);
    addUnitPriority('isoWeekday', 11);

    // PARSING

    addRegexToken('d',    match1to2);
    addRegexToken('e',    match1to2);
    addRegexToken('E',    match1to2);
    addRegexToken('dd',   function (isStrict, locale) {
        return locale.weekdaysMinRegex(isStrict);
    });
    addRegexToken('ddd',   function (isStrict, locale) {
        return locale.weekdaysShortRegex(isStrict);
    });
    addRegexToken('dddd',   function (isStrict, locale) {
        return locale.weekdaysRegex(isStrict);
    });

    addWeekParseToken(['dd', 'ddd', 'dddd'], function (input, week, config, token) {
        var weekday = config._locale.weekdaysParse(input, token, config._strict);
        // if we didn't get a weekday name, mark the date as invalid
        if (weekday != null) {
            week.d = weekday;
        } else {
            getParsingFlags(config).invalidWeekday = input;
        }
    });

    addWeekParseToken(['d', 'e', 'E'], function (input, week, config, token) {
        week[token] = toInt(input);
    });

    // HELPERS

    function parseWeekday(input, locale) {
        if (typeof input !== 'string') {
            return input;
        }

        if (!isNaN(input)) {
            return parseInt(input, 10);
        }

        input = locale.weekdaysParse(input);
        if (typeof input === 'number') {
            return input;
        }

        return null;
    }

    function parseIsoWeekday(input, locale) {
        if (typeof input === 'string') {
            return locale.weekdaysParse(input) % 7 || 7;
        }
        return isNaN(input) ? null : input;
    }

    // LOCALES
    function shiftWeekdays (ws, n) {
        return ws.slice(n, 7).concat(ws.slice(0, n));
    }

    var defaultLocaleWeekdays = 'Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday'.split('_');
    function localeWeekdays (m, format) {
        var weekdays = isArray(this._weekdays) ? this._weekdays :
            this._weekdays[(m && m !== true && this._weekdays.isFormat.test(format)) ? 'format' : 'standalone'];
        return (m === true) ? shiftWeekdays(weekdays, this._week.dow)
            : (m) ? weekdays[m.day()] : weekdays;
    }

    var defaultLocaleWeekdaysShort = 'Sun_Mon_Tue_Wed_Thu_Fri_Sat'.split('_');
    function localeWeekdaysShort (m) {
        return (m === true) ? shiftWeekdays(this._weekdaysShort, this._week.dow)
            : (m) ? this._weekdaysShort[m.day()] : this._weekdaysShort;
    }

    var defaultLocaleWeekdaysMin = 'Su_Mo_Tu_We_Th_Fr_Sa'.split('_');
    function localeWeekdaysMin (m) {
        return (m === true) ? shiftWeekdays(this._weekdaysMin, this._week.dow)
            : (m) ? this._weekdaysMin[m.day()] : this._weekdaysMin;
    }

    function handleStrictParse$1(weekdayName, format, strict) {
        var i, ii, mom, llc = weekdayName.toLocaleLowerCase();
        if (!this._weekdaysParse) {
            this._weekdaysParse = [];
            this._shortWeekdaysParse = [];
            this._minWeekdaysParse = [];

            for (i = 0; i < 7; ++i) {
                mom = createUTC([2000, 1]).day(i);
                this._minWeekdaysParse[i] = this.weekdaysMin(mom, '').toLocaleLowerCase();
                this._shortWeekdaysParse[i] = this.weekdaysShort(mom, '').toLocaleLowerCase();
                this._weekdaysParse[i] = this.weekdays(mom, '').toLocaleLowerCase();
            }
        }

        if (strict) {
            if (format === 'dddd') {
                ii = indexOf.call(this._weekdaysParse, llc);
                return ii !== -1 ? ii : null;
            } else if (format === 'ddd') {
                ii = indexOf.call(this._shortWeekdaysParse, llc);
                return ii !== -1 ? ii : null;
            } else {
                ii = indexOf.call(this._minWeekdaysParse, llc);
                return ii !== -1 ? ii : null;
            }
        } else {
            if (format === 'dddd') {
                ii = indexOf.call(this._weekdaysParse, llc);
                if (ii !== -1) {
                    return ii;
                }
                ii = indexOf.call(this._shortWeekdaysParse, llc);
                if (ii !== -1) {
                    return ii;
                }
                ii = indexOf.call(this._minWeekdaysParse, llc);
                return ii !== -1 ? ii : null;
            } else if (format === 'ddd') {
                ii = indexOf.call(this._shortWeekdaysParse, llc);
                if (ii !== -1) {
                    return ii;
                }
                ii = indexOf.call(this._weekdaysParse, llc);
                if (ii !== -1) {
                    return ii;
                }
                ii = indexOf.call(this._minWeekdaysParse, llc);
                return ii !== -1 ? ii : null;
            } else {
                ii = indexOf.call(this._minWeekdaysParse, llc);
                if (ii !== -1) {
                    return ii;
                }
                ii = indexOf.call(this._weekdaysParse, llc);
                if (ii !== -1) {
                    return ii;
                }
                ii = indexOf.call(this._shortWeekdaysParse, llc);
                return ii !== -1 ? ii : null;
            }
        }
    }

    function localeWeekdaysParse (weekdayName, format, strict) {
        var i, mom, regex;

        if (this._weekdaysParseExact) {
            return handleStrictParse$1.call(this, weekdayName, format, strict);
        }

        if (!this._weekdaysParse) {
            this._weekdaysParse = [];
            this._minWeekdaysParse = [];
            this._shortWeekdaysParse = [];
            this._fullWeekdaysParse = [];
        }

        for (i = 0; i < 7; i++) {
            // make the regex if we don't have it already

            mom = createUTC([2000, 1]).day(i);
            if (strict && !this._fullWeekdaysParse[i]) {
                this._fullWeekdaysParse[i] = new RegExp('^' + this.weekdays(mom, '').replace('.', '\\.?') + '$', 'i');
                this._shortWeekdaysParse[i] = new RegExp('^' + this.weekdaysShort(mom, '').replace('.', '\\.?') + '$', 'i');
                this._minWeekdaysParse[i] = new RegExp('^' + this.weekdaysMin(mom, '').replace('.', '\\.?') + '$', 'i');
            }
            if (!this._weekdaysParse[i]) {
                regex = '^' + this.weekdays(mom, '') + '|^' + this.weekdaysShort(mom, '') + '|^' + this.weekdaysMin(mom, '');
                this._weekdaysParse[i] = new RegExp(regex.replace('.', ''), 'i');
            }
            // test the regex
            if (strict && format === 'dddd' && this._fullWeekdaysParse[i].test(weekdayName)) {
                return i;
            } else if (strict && format === 'ddd' && this._shortWeekdaysParse[i].test(weekdayName)) {
                return i;
            } else if (strict && format === 'dd' && this._minWeekdaysParse[i].test(weekdayName)) {
                return i;
            } else if (!strict && this._weekdaysParse[i].test(weekdayName)) {
                return i;
            }
        }
    }

    // MOMENTS

    function getSetDayOfWeek (input) {
        if (!this.isValid()) {
            return input != null ? this : NaN;
        }
        var day = this._isUTC ? this._d.getUTCDay() : this._d.getDay();
        if (input != null) {
            input = parseWeekday(input, this.localeData());
            return this.add(input - day, 'd');
        } else {
            return day;
        }
    }

    function getSetLocaleDayOfWeek (input) {
        if (!this.isValid()) {
            return input != null ? this : NaN;
        }
        var weekday = (this.day() + 7 - this.localeData()._week.dow) % 7;
        return input == null ? weekday : this.add(input - weekday, 'd');
    }

    function getSetISODayOfWeek (input) {
        if (!this.isValid()) {
            return input != null ? this : NaN;
        }

        // behaves the same as moment#day except
        // as a getter, returns 7 instead of 0 (1-7 range instead of 0-6)
        // as a setter, sunday should belong to the previous week.

        if (input != null) {
            var weekday = parseIsoWeekday(input, this.localeData());
            return this.day(this.day() % 7 ? weekday : weekday - 7);
        } else {
            return this.day() || 7;
        }
    }

    var defaultWeekdaysRegex = matchWord;
    function weekdaysRegex (isStrict) {
        if (this._weekdaysParseExact) {
            if (!hasOwnProp(this, '_weekdaysRegex')) {
                computeWeekdaysParse.call(this);
            }
            if (isStrict) {
                return this._weekdaysStrictRegex;
            } else {
                return this._weekdaysRegex;
            }
        } else {
            if (!hasOwnProp(this, '_weekdaysRegex')) {
                this._weekdaysRegex = defaultWeekdaysRegex;
            }
            return this._weekdaysStrictRegex && isStrict ?
                this._weekdaysStrictRegex : this._weekdaysRegex;
        }
    }

    var defaultWeekdaysShortRegex = matchWord;
    function weekdaysShortRegex (isStrict) {
        if (this._weekdaysParseExact) {
            if (!hasOwnProp(this, '_weekdaysRegex')) {
                computeWeekdaysParse.call(this);
            }
            if (isStrict) {
                return this._weekdaysShortStrictRegex;
            } else {
                return this._weekdaysShortRegex;
            }
        } else {
            if (!hasOwnProp(this, '_weekdaysShortRegex')) {
                this._weekdaysShortRegex = defaultWeekdaysShortRegex;
            }
            return this._weekdaysShortStrictRegex && isStrict ?
                this._weekdaysShortStrictRegex : this._weekdaysShortRegex;
        }
    }

    var defaultWeekdaysMinRegex = matchWord;
    function weekdaysMinRegex (isStrict) {
        if (this._weekdaysParseExact) {
            if (!hasOwnProp(this, '_weekdaysRegex')) {
                computeWeekdaysParse.call(this);
            }
            if (isStrict) {
                return this._weekdaysMinStrictRegex;
            } else {
                return this._weekdaysMinRegex;
            }
        } else {
            if (!hasOwnProp(this, '_weekdaysMinRegex')) {
                this._weekdaysMinRegex = defaultWeekdaysMinRegex;
            }
            return this._weekdaysMinStrictRegex && isStrict ?
                this._weekdaysMinStrictRegex : this._weekdaysMinRegex;
        }
    }


    function computeWeekdaysParse () {
        function cmpLenRev(a, b) {
            return b.length - a.length;
        }

        var minPieces = [], shortPieces = [], longPieces = [], mixedPieces = [],
            i, mom, minp, shortp, longp;
        for (i = 0; i < 7; i++) {
            // make the regex if we don't have it already
            mom = createUTC([2000, 1]).day(i);
            minp = this.weekdaysMin(mom, '');
            shortp = this.weekdaysShort(mom, '');
            longp = this.weekdays(mom, '');
            minPieces.push(minp);
            shortPieces.push(shortp);
            longPieces.push(longp);
            mixedPieces.push(minp);
            mixedPieces.push(shortp);
            mixedPieces.push(longp);
        }
        // Sorting makes sure if one weekday (or abbr) is a prefix of another it
        // will match the longer piece.
        minPieces.sort(cmpLenRev);
        shortPieces.sort(cmpLenRev);
        longPieces.sort(cmpLenRev);
        mixedPieces.sort(cmpLenRev);
        for (i = 0; i < 7; i++) {
            shortPieces[i] = regexEscape(shortPieces[i]);
            longPieces[i] = regexEscape(longPieces[i]);
            mixedPieces[i] = regexEscape(mixedPieces[i]);
        }

        this._weekdaysRegex = new RegExp('^(' + mixedPieces.join('|') + ')', 'i');
        this._weekdaysShortRegex = this._weekdaysRegex;
        this._weekdaysMinRegex = this._weekdaysRegex;

        this._weekdaysStrictRegex = new RegExp('^(' + longPieces.join('|') + ')', 'i');
        this._weekdaysShortStrictRegex = new RegExp('^(' + shortPieces.join('|') + ')', 'i');
        this._weekdaysMinStrictRegex = new RegExp('^(' + minPieces.join('|') + ')', 'i');
    }

    // FORMATTING

    function hFormat() {
        return this.hours() % 12 || 12;
    }

    function kFormat() {
        return this.hours() || 24;
    }

    addFormatToken('H', ['HH', 2], 0, 'hour');
    addFormatToken('h', ['hh', 2], 0, hFormat);
    addFormatToken('k', ['kk', 2], 0, kFormat);

    addFormatToken('hmm', 0, 0, function () {
        return '' + hFormat.apply(this) + zeroFill(this.minutes(), 2);
    });

    addFormatToken('hmmss', 0, 0, function () {
        return '' + hFormat.apply(this) + zeroFill(this.minutes(), 2) +
            zeroFill(this.seconds(), 2);
    });

    addFormatToken('Hmm', 0, 0, function () {
        return '' + this.hours() + zeroFill(this.minutes(), 2);
    });

    addFormatToken('Hmmss', 0, 0, function () {
        return '' + this.hours() + zeroFill(this.minutes(), 2) +
            zeroFill(this.seconds(), 2);
    });

    function meridiem (token, lowercase) {
        addFormatToken(token, 0, 0, function () {
            return this.localeData().meridiem(this.hours(), this.minutes(), lowercase);
        });
    }

    meridiem('a', true);
    meridiem('A', false);

    // ALIASES

    addUnitAlias('hour', 'h');

    // PRIORITY
    addUnitPriority('hour', 13);

    // PARSING

    function matchMeridiem (isStrict, locale) {
        return locale._meridiemParse;
    }

    addRegexToken('a',  matchMeridiem);
    addRegexToken('A',  matchMeridiem);
    addRegexToken('H',  match1to2);
    addRegexToken('h',  match1to2);
    addRegexToken('k',  match1to2);
    addRegexToken('HH', match1to2, match2);
    addRegexToken('hh', match1to2, match2);
    addRegexToken('kk', match1to2, match2);

    addRegexToken('hmm', match3to4);
    addRegexToken('hmmss', match5to6);
    addRegexToken('Hmm', match3to4);
    addRegexToken('Hmmss', match5to6);

    addParseToken(['H', 'HH'], HOUR);
    addParseToken(['k', 'kk'], function (input, array, config) {
        var kInput = toInt(input);
        array[HOUR] = kInput === 24 ? 0 : kInput;
    });
    addParseToken(['a', 'A'], function (input, array, config) {
        config._isPm = config._locale.isPM(input);
        config._meridiem = input;
    });
    addParseToken(['h', 'hh'], function (input, array, config) {
        array[HOUR] = toInt(input);
        getParsingFlags(config).bigHour = true;
    });
    addParseToken('hmm', function (input, array, config) {
        var pos = input.length - 2;
        array[HOUR] = toInt(input.substr(0, pos));
        array[MINUTE] = toInt(input.substr(pos));
        getParsingFlags(config).bigHour = true;
    });
    addParseToken('hmmss', function (input, array, config) {
        var pos1 = input.length - 4;
        var pos2 = input.length - 2;
        array[HOUR] = toInt(input.substr(0, pos1));
        array[MINUTE] = toInt(input.substr(pos1, 2));
        array[SECOND] = toInt(input.substr(pos2));
        getParsingFlags(config).bigHour = true;
    });
    addParseToken('Hmm', function (input, array, config) {
        var pos = input.length - 2;
        array[HOUR] = toInt(input.substr(0, pos));
        array[MINUTE] = toInt(input.substr(pos));
    });
    addParseToken('Hmmss', function (input, array, config) {
        var pos1 = input.length - 4;
        var pos2 = input.length - 2;
        array[HOUR] = toInt(input.substr(0, pos1));
        array[MINUTE] = toInt(input.substr(pos1, 2));
        array[SECOND] = toInt(input.substr(pos2));
    });

    // LOCALES

    function localeIsPM (input) {
        // IE8 Quirks Mode & IE7 Standards Mode do not allow accessing strings like arrays
        // Using charAt should be more compatible.
        return ((input + '').toLowerCase().charAt(0) === 'p');
    }

    var defaultLocaleMeridiemParse = /[ap]\.?m?\.?/i;
    function localeMeridiem (hours, minutes, isLower) {
        if (hours > 11) {
            return isLower ? 'pm' : 'PM';
        } else {
            return isLower ? 'am' : 'AM';
        }
    }


    // MOMENTS

    // Setting the hour should keep the time, because the user explicitly
    // specified which hour they want. So trying to maintain the same hour (in
    // a new timezone) makes sense. Adding/subtracting hours does not follow
    // this rule.
    var getSetHour = makeGetSet('Hours', true);

    var baseConfig = {
        calendar: defaultCalendar,
        longDateFormat: defaultLongDateFormat,
        invalidDate: defaultInvalidDate,
        ordinal: defaultOrdinal,
        dayOfMonthOrdinalParse: defaultDayOfMonthOrdinalParse,
        relativeTime: defaultRelativeTime,

        months: defaultLocaleMonths,
        monthsShort: defaultLocaleMonthsShort,

        week: defaultLocaleWeek,

        weekdays: defaultLocaleWeekdays,
        weekdaysMin: defaultLocaleWeekdaysMin,
        weekdaysShort: defaultLocaleWeekdaysShort,

        meridiemParse: defaultLocaleMeridiemParse
    };

    // internal storage for locale config files
    var locales = {};
    var localeFamilies = {};
    var globalLocale;

    function normalizeLocale(key) {
        return key ? key.toLowerCase().replace('_', '-') : key;
    }

    // pick the locale from the array
    // try ['en-au', 'en-gb'] as 'en-au', 'en-gb', 'en', as in move through the list trying each
    // substring from most specific to least, but move to the next array item if it's a more specific variant than the current root
    function chooseLocale(names) {
        var i = 0, j, next, locale, split;

        while (i < names.length) {
            split = normalizeLocale(names[i]).split('-');
            j = split.length;
            next = normalizeLocale(names[i + 1]);
            next = next ? next.split('-') : null;
            while (j > 0) {
                locale = loadLocale(split.slice(0, j).join('-'));
                if (locale) {
                    return locale;
                }
                if (next && next.length >= j && compareArrays(split, next, true) >= j - 1) {
                    //the next array item is better than a shallower substring of this one
                    break;
                }
                j--;
            }
            i++;
        }
        return globalLocale;
    }

    function loadLocale(name) {
        var oldLocale = null;
        // TODO: Find a better way to register and load all the locales in Node
        if (!locales[name] && (typeof module !== 'undefined') &&
            module && module.exports) {
            try {
                oldLocale = globalLocale._abbr;
                var aliasedRequire = require;
                aliasedRequire('./locale/' + name);
                getSetGlobalLocale(oldLocale);
            } catch (e) {}
        }
        return locales[name];
    }

    // This function will load locale and then set the global locale.  If
    // no arguments are passed in, it will simply return the current global
    // locale key.
    function getSetGlobalLocale (key, values) {
        var data;
        if (key) {
            if (isUndefined(values)) {
                data = getLocale(key);
            }
            else {
                data = defineLocale(key, values);
            }

            if (data) {
                // moment.duration._locale = moment._locale = data;
                globalLocale = data;
            }
            else {
                if ((typeof console !==  'undefined') && console.warn) {
                    //warn user if arguments are passed but the locale could not be set
                    console.warn('Locale ' + key +  ' not found. Did you forget to load it?');
                }
            }
        }

        return globalLocale._abbr;
    }

    function defineLocale (name, config) {
        if (config !== null) {
            var locale, parentConfig = baseConfig;
            config.abbr = name;
            if (locales[name] != null) {
                deprecateSimple('defineLocaleOverride',
                    'use moment.updateLocale(localeName, config) to change ' +
                    'an existing locale. moment.defineLocale(localeName, ' +
                    'config) should only be used for creating a new locale ' +
                    'See http://momentjs.com/guides/#/warnings/define-locale/ for more info.');
                parentConfig = locales[name]._config;
            } else if (config.parentLocale != null) {
                if (locales[config.parentLocale] != null) {
                    parentConfig = locales[config.parentLocale]._config;
                } else {
                    locale = loadLocale(config.parentLocale);
                    if (locale != null) {
                        parentConfig = locale._config;
                    } else {
                        if (!localeFamilies[config.parentLocale]) {
                            localeFamilies[config.parentLocale] = [];
                        }
                        localeFamilies[config.parentLocale].push({
                            name: name,
                            config: config
                        });
                        return null;
                    }
                }
            }
            locales[name] = new Locale(mergeConfigs(parentConfig, config));

            if (localeFamilies[name]) {
                localeFamilies[name].forEach(function (x) {
                    defineLocale(x.name, x.config);
                });
            }

            // backwards compat for now: also set the locale
            // make sure we set the locale AFTER all child locales have been
            // created, so we won't end up with the child locale set.
            getSetGlobalLocale(name);


            return locales[name];
        } else {
            // useful for testing
            delete locales[name];
            return null;
        }
    }

    function updateLocale(name, config) {
        if (config != null) {
            var locale, tmpLocale, parentConfig = baseConfig;
            // MERGE
            tmpLocale = loadLocale(name);
            if (tmpLocale != null) {
                parentConfig = tmpLocale._config;
            }
            config = mergeConfigs(parentConfig, config);
            locale = new Locale(config);
            locale.parentLocale = locales[name];
            locales[name] = locale;

            // backwards compat for now: also set the locale
            getSetGlobalLocale(name);
        } else {
            // pass null for config to unupdate, useful for tests
            if (locales[name] != null) {
                if (locales[name].parentLocale != null) {
                    locales[name] = locales[name].parentLocale;
                } else if (locales[name] != null) {
                    delete locales[name];
                }
            }
        }
        return locales[name];
    }

    // returns locale data
    function getLocale (key) {
        var locale;

        if (key && key._locale && key._locale._abbr) {
            key = key._locale._abbr;
        }

        if (!key) {
            return globalLocale;
        }

        if (!isArray(key)) {
            //short-circuit everything else
            locale = loadLocale(key);
            if (locale) {
                return locale;
            }
            key = [key];
        }

        return chooseLocale(key);
    }

    function listLocales() {
        return keys(locales);
    }

    function checkOverflow (m) {
        var overflow;
        var a = m._a;

        if (a && getParsingFlags(m).overflow === -2) {
            overflow =
                a[MONTH]       < 0 || a[MONTH]       > 11  ? MONTH :
                    a[DATE]        < 1 || a[DATE]        > daysInMonth(a[YEAR], a[MONTH]) ? DATE :
                        a[HOUR]        < 0 || a[HOUR]        > 24 || (a[HOUR] === 24 && (a[MINUTE] !== 0 || a[SECOND] !== 0 || a[MILLISECOND] !== 0)) ? HOUR :
                            a[MINUTE]      < 0 || a[MINUTE]      > 59  ? MINUTE :
                                a[SECOND]      < 0 || a[SECOND]      > 59  ? SECOND :
                                    a[MILLISECOND] < 0 || a[MILLISECOND] > 999 ? MILLISECOND :
                                        -1;

            if (getParsingFlags(m)._overflowDayOfYear && (overflow < YEAR || overflow > DATE)) {
                overflow = DATE;
            }
            if (getParsingFlags(m)._overflowWeeks && overflow === -1) {
                overflow = WEEK;
            }
            if (getParsingFlags(m)._overflowWeekday && overflow === -1) {
                overflow = WEEKDAY;
            }

            getParsingFlags(m).overflow = overflow;
        }

        return m;
    }

    // Pick the first defined of two or three arguments.
    function defaults(a, b, c) {
        if (a != null) {
            return a;
        }
        if (b != null) {
            return b;
        }
        return c;
    }

    function currentDateArray(config) {
        // hooks is actually the exported moment object
        var nowValue = new Date(hooks.now());
        if (config._useUTC) {
            return [nowValue.getUTCFullYear(), nowValue.getUTCMonth(), nowValue.getUTCDate()];
        }
        return [nowValue.getFullYear(), nowValue.getMonth(), nowValue.getDate()];
    }

    // convert an array to a date.
    // the array should mirror the parameters below
    // note: all values past the year are optional and will default to the lowest possible value.
    // [year, month, day , hour, minute, second, millisecond]
    function configFromArray (config) {
        var i, date, input = [], currentDate, expectedWeekday, yearToUse;

        if (config._d) {
            return;
        }

        currentDate = currentDateArray(config);

        //compute day of the year from weeks and weekdays
        if (config._w && config._a[DATE] == null && config._a[MONTH] == null) {
            dayOfYearFromWeekInfo(config);
        }

        //if the day of the year is set, figure out what it is
        if (config._dayOfYear != null) {
            yearToUse = defaults(config._a[YEAR], currentDate[YEAR]);

            if (config._dayOfYear > daysInYear(yearToUse) || config._dayOfYear === 0) {
                getParsingFlags(config)._overflowDayOfYear = true;
            }

            date = createUTCDate(yearToUse, 0, config._dayOfYear);
            config._a[MONTH] = date.getUTCMonth();
            config._a[DATE] = date.getUTCDate();
        }

        // Default to current date.
        // * if no year, month, day of month are given, default to today
        // * if day of month is given, default month and year
        // * if month is given, default only year
        // * if year is given, don't default anything
        for (i = 0; i < 3 && config._a[i] == null; ++i) {
            config._a[i] = input[i] = currentDate[i];
        }

        // Zero out whatever was not defaulted, including time
        for (; i < 7; i++) {
            config._a[i] = input[i] = (config._a[i] == null) ? (i === 2 ? 1 : 0) : config._a[i];
        }

        // Check for 24:00:00.000
        if (config._a[HOUR] === 24 &&
            config._a[MINUTE] === 0 &&
            config._a[SECOND] === 0 &&
            config._a[MILLISECOND] === 0) {
            config._nextDay = true;
            config._a[HOUR] = 0;
        }

        config._d = (config._useUTC ? createUTCDate : createDate).apply(null, input);
        expectedWeekday = config._useUTC ? config._d.getUTCDay() : config._d.getDay();

        // Apply timezone offset from input. The actual utcOffset can be changed
        // with parseZone.
        if (config._tzm != null) {
            config._d.setUTCMinutes(config._d.getUTCMinutes() - config._tzm);
        }

        if (config._nextDay) {
            config._a[HOUR] = 24;
        }

        // check for mismatching day of week
        if (config._w && typeof config._w.d !== 'undefined' && config._w.d !== expectedWeekday) {
            getParsingFlags(config).weekdayMismatch = true;
        }
    }

    function dayOfYearFromWeekInfo(config) {
        var w, weekYear, week, weekday, dow, doy, temp, weekdayOverflow;

        w = config._w;
        if (w.GG != null || w.W != null || w.E != null) {
            dow = 1;
            doy = 4;

            // TODO: We need to take the current isoWeekYear, but that depends on
            // how we interpret now (local, utc, fixed offset). So create
            // a now version of current config (take local/utc/offset flags, and
            // create now).
            weekYear = defaults(w.GG, config._a[YEAR], weekOfYear(createLocal(), 1, 4).year);
            week = defaults(w.W, 1);
            weekday = defaults(w.E, 1);
            if (weekday < 1 || weekday > 7) {
                weekdayOverflow = true;
            }
        } else {
            dow = config._locale._week.dow;
            doy = config._locale._week.doy;

            var curWeek = weekOfYear(createLocal(), dow, doy);

            weekYear = defaults(w.gg, config._a[YEAR], curWeek.year);

            // Default to current week.
            week = defaults(w.w, curWeek.week);

            if (w.d != null) {
                // weekday -- low day numbers are considered next week
                weekday = w.d;
                if (weekday < 0 || weekday > 6) {
                    weekdayOverflow = true;
                }
            } else if (w.e != null) {
                // local weekday -- counting starts from beginning of week
                weekday = w.e + dow;
                if (w.e < 0 || w.e > 6) {
                    weekdayOverflow = true;
                }
            } else {
                // default to beginning of week
                weekday = dow;
            }
        }
        if (week < 1 || week > weeksInYear(weekYear, dow, doy)) {
            getParsingFlags(config)._overflowWeeks = true;
        } else if (weekdayOverflow != null) {
            getParsingFlags(config)._overflowWeekday = true;
        } else {
            temp = dayOfYearFromWeeks(weekYear, week, weekday, dow, doy);
            config._a[YEAR] = temp.year;
            config._dayOfYear = temp.dayOfYear;
        }
    }

    // iso 8601 regex
    // 0000-00-00 0000-W00 or 0000-W00-0 + T + 00 or 00:00 or 00:00:00 or 00:00:00.000 + +00:00 or +0000 or +00)
    var extendedIsoRegex = /^\s*((?:[+-]\d{6}|\d{4})-(?:\d\d-\d\d|W\d\d-\d|W\d\d|\d\d\d|\d\d))(?:(T| )(\d\d(?::\d\d(?::\d\d(?:[.,]\d+)?)?)?)([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/;
    var basicIsoRegex = /^\s*((?:[+-]\d{6}|\d{4})(?:\d\d\d\d|W\d\d\d|W\d\d|\d\d\d|\d\d))(?:(T| )(\d\d(?:\d\d(?:\d\d(?:[.,]\d+)?)?)?)([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/;

    var tzRegex = /Z|[+-]\d\d(?::?\d\d)?/;

    var isoDates = [
        ['YYYYYY-MM-DD', /[+-]\d{6}-\d\d-\d\d/],
        ['YYYY-MM-DD', /\d{4}-\d\d-\d\d/],
        ['GGGG-[W]WW-E', /\d{4}-W\d\d-\d/],
        ['GGGG-[W]WW', /\d{4}-W\d\d/, false],
        ['YYYY-DDD', /\d{4}-\d{3}/],
        ['YYYY-MM', /\d{4}-\d\d/, false],
        ['YYYYYYMMDD', /[+-]\d{10}/],
        ['YYYYMMDD', /\d{8}/],
        // YYYYMM is NOT allowed by the standard
        ['GGGG[W]WWE', /\d{4}W\d{3}/],
        ['GGGG[W]WW', /\d{4}W\d{2}/, false],
        ['YYYYDDD', /\d{7}/]
    ];

    // iso time formats and regexes
    var isoTimes = [
        ['HH:mm:ss.SSSS', /\d\d:\d\d:\d\d\.\d+/],
        ['HH:mm:ss,SSSS', /\d\d:\d\d:\d\d,\d+/],
        ['HH:mm:ss', /\d\d:\d\d:\d\d/],
        ['HH:mm', /\d\d:\d\d/],
        ['HHmmss.SSSS', /\d\d\d\d\d\d\.\d+/],
        ['HHmmss,SSSS', /\d\d\d\d\d\d,\d+/],
        ['HHmmss', /\d\d\d\d\d\d/],
        ['HHmm', /\d\d\d\d/],
        ['HH', /\d\d/]
    ];

    var aspNetJsonRegex = /^\/?Date\((\-?\d+)/i;

    // date from iso format
    function configFromISO(config) {
        var i, l,
            string = config._i,
            match = extendedIsoRegex.exec(string) || basicIsoRegex.exec(string),
            allowTime, dateFormat, timeFormat, tzFormat;

        if (match) {
            getParsingFlags(config).iso = true;

            for (i = 0, l = isoDates.length; i < l; i++) {
                if (isoDates[i][1].exec(match[1])) {
                    dateFormat = isoDates[i][0];
                    allowTime = isoDates[i][2] !== false;
                    break;
                }
            }
            if (dateFormat == null) {
                config._isValid = false;
                return;
            }
            if (match[3]) {
                for (i = 0, l = isoTimes.length; i < l; i++) {
                    if (isoTimes[i][1].exec(match[3])) {
                        // match[2] should be 'T' or space
                        timeFormat = (match[2] || ' ') + isoTimes[i][0];
                        break;
                    }
                }
                if (timeFormat == null) {
                    config._isValid = false;
                    return;
                }
            }
            if (!allowTime && timeFormat != null) {
                config._isValid = false;
                return;
            }
            if (match[4]) {
                if (tzRegex.exec(match[4])) {
                    tzFormat = 'Z';
                } else {
                    config._isValid = false;
                    return;
                }
            }
            config._f = dateFormat + (timeFormat || '') + (tzFormat || '');
            configFromStringAndFormat(config);
        } else {
            config._isValid = false;
        }
    }

    // RFC 2822 regex: For details see https://tools.ietf.org/html/rfc2822#section-3.3
    var rfc2822 = /^(?:(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s)?(\d{1,2})\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s(\d{2,4})\s(\d\d):(\d\d)(?::(\d\d))?\s(?:(UT|GMT|[ECMP][SD]T)|([Zz])|([+-]\d{4}))$/;

    function extractFromRFC2822Strings(yearStr, monthStr, dayStr, hourStr, minuteStr, secondStr) {
        var result = [
            untruncateYear(yearStr),
            defaultLocaleMonthsShort.indexOf(monthStr),
            parseInt(dayStr, 10),
            parseInt(hourStr, 10),
            parseInt(minuteStr, 10)
        ];

        if (secondStr) {
            result.push(parseInt(secondStr, 10));
        }

        return result;
    }

    function untruncateYear(yearStr) {
        var year = parseInt(yearStr, 10);
        if (year <= 49) {
            return 2000 + year;
        } else if (year <= 999) {
            return 1900 + year;
        }
        return year;
    }

    function preprocessRFC2822(s) {
        // Remove comments and folding whitespace and replace multiple-spaces with a single space
        return s.replace(/\([^)]*\)|[\n\t]/g, ' ').replace(/(\s\s+)/g, ' ').replace(/^\s\s*/, '').replace(/\s\s*$/, '');
    }

    function checkWeekday(weekdayStr, parsedInput, config) {
        if (weekdayStr) {
            // TODO: Replace the vanilla JS Date object with an indepentent day-of-week check.
            var weekdayProvided = defaultLocaleWeekdaysShort.indexOf(weekdayStr),
                weekdayActual = new Date(parsedInput[0], parsedInput[1], parsedInput[2]).getDay();
            if (weekdayProvided !== weekdayActual) {
                getParsingFlags(config).weekdayMismatch = true;
                config._isValid = false;
                return false;
            }
        }
        return true;
    }

    var obsOffsets = {
        UT: 0,
        GMT: 0,
        EDT: -4 * 60,
        EST: -5 * 60,
        CDT: -5 * 60,
        CST: -6 * 60,
        MDT: -6 * 60,
        MST: -7 * 60,
        PDT: -7 * 60,
        PST: -8 * 60
    };

    function calculateOffset(obsOffset, militaryOffset, numOffset) {
        if (obsOffset) {
            return obsOffsets[obsOffset];
        } else if (militaryOffset) {
            // the only allowed military tz is Z
            return 0;
        } else {
            var hm = parseInt(numOffset, 10);
            var m = hm % 100, h = (hm - m) / 100;
            return h * 60 + m;
        }
    }

    // date and time from ref 2822 format
    function configFromRFC2822(config) {
        var match = rfc2822.exec(preprocessRFC2822(config._i));
        if (match) {
            var parsedArray = extractFromRFC2822Strings(match[4], match[3], match[2], match[5], match[6], match[7]);
            if (!checkWeekday(match[1], parsedArray, config)) {
                return;
            }

            config._a = parsedArray;
            config._tzm = calculateOffset(match[8], match[9], match[10]);

            config._d = createUTCDate.apply(null, config._a);
            config._d.setUTCMinutes(config._d.getUTCMinutes() - config._tzm);

            getParsingFlags(config).rfc2822 = true;
        } else {
            config._isValid = false;
        }
    }

    // date from iso format or fallback
    function configFromString(config) {
        var matched = aspNetJsonRegex.exec(config._i);

        if (matched !== null) {
            config._d = new Date(+matched[1]);
            return;
        }

        configFromISO(config);
        if (config._isValid === false) {
            delete config._isValid;
        } else {
            return;
        }

        configFromRFC2822(config);
        if (config._isValid === false) {
            delete config._isValid;
        } else {
            return;
        }

        // Final attempt, use Input Fallback
        hooks.createFromInputFallback(config);
    }

    hooks.createFromInputFallback = deprecate(
        'value provided is not in a recognized RFC2822 or ISO format. moment construction falls back to js Date(), ' +
        'which is not reliable across all browsers and versions. Non RFC2822/ISO date formats are ' +
        'discouraged and will be removed in an upcoming major release. Please refer to ' +
        'http://momentjs.com/guides/#/warnings/js-date/ for more info.',
        function (config) {
            config._d = new Date(config._i + (config._useUTC ? ' UTC' : ''));
        }
    );

    // constant that refers to the ISO standard
    hooks.ISO_8601 = function () {};

    // constant that refers to the RFC 2822 form
    hooks.RFC_2822 = function () {};

    // date from string and format string
    function configFromStringAndFormat(config) {
        // TODO: Move this to another part of the creation flow to prevent circular deps
        if (config._f === hooks.ISO_8601) {
            configFromISO(config);
            return;
        }
        if (config._f === hooks.RFC_2822) {
            configFromRFC2822(config);
            return;
        }
        config._a = [];
        getParsingFlags(config).empty = true;

        // This array is used to make a Date, either with `new Date` or `Date.UTC`
        var string = '' + config._i,
            i, parsedInput, tokens, token, skipped,
            stringLength = string.length,
            totalParsedInputLength = 0;

        tokens = expandFormat(config._f, config._locale).match(formattingTokens) || [];

        for (i = 0; i < tokens.length; i++) {
            token = tokens[i];
            parsedInput = (string.match(getParseRegexForToken(token, config)) || [])[0];
            // console.log('token', token, 'parsedInput', parsedInput,
            //         'regex', getParseRegexForToken(token, config));
            if (parsedInput) {
                skipped = string.substr(0, string.indexOf(parsedInput));
                if (skipped.length > 0) {
                    getParsingFlags(config).unusedInput.push(skipped);
                }
                string = string.slice(string.indexOf(parsedInput) + parsedInput.length);
                totalParsedInputLength += parsedInput.length;
            }
            // don't parse if it's not a known token
            if (formatTokenFunctions[token]) {
                if (parsedInput) {
                    getParsingFlags(config).empty = false;
                }
                else {
                    getParsingFlags(config).unusedTokens.push(token);
                }
                addTimeToArrayFromToken(token, parsedInput, config);
            }
            else if (config._strict && !parsedInput) {
                getParsingFlags(config).unusedTokens.push(token);
            }
        }

        // add remaining unparsed input length to the string
        getParsingFlags(config).charsLeftOver = stringLength - totalParsedInputLength;
        if (string.length > 0) {
            getParsingFlags(config).unusedInput.push(string);
        }

        // clear _12h flag if hour is <= 12
        if (config._a[HOUR] <= 12 &&
            getParsingFlags(config).bigHour === true &&
            config._a[HOUR] > 0) {
            getParsingFlags(config).bigHour = undefined;
        }

        getParsingFlags(config).parsedDateParts = config._a.slice(0);
        getParsingFlags(config).meridiem = config._meridiem;
        // handle meridiem
        config._a[HOUR] = meridiemFixWrap(config._locale, config._a[HOUR], config._meridiem);

        configFromArray(config);
        checkOverflow(config);
    }


    function meridiemFixWrap (locale, hour, meridiem) {
        var isPm;

        if (meridiem == null) {
            // nothing to do
            return hour;
        }
        if (locale.meridiemHour != null) {
            return locale.meridiemHour(hour, meridiem);
        } else if (locale.isPM != null) {
            // Fallback
            isPm = locale.isPM(meridiem);
            if (isPm && hour < 12) {
                hour += 12;
            }
            if (!isPm && hour === 12) {
                hour = 0;
            }
            return hour;
        } else {
            // this is not supposed to happen
            return hour;
        }
    }

    // date from string and array of format strings
    function configFromStringAndArray(config) {
        var tempConfig,
            bestMoment,

            scoreToBeat,
            i,
            currentScore;

        if (config._f.length === 0) {
            getParsingFlags(config).invalidFormat = true;
            config._d = new Date(NaN);
            return;
        }

        for (i = 0; i < config._f.length; i++) {
            currentScore = 0;
            tempConfig = copyConfig({}, config);
            if (config._useUTC != null) {
                tempConfig._useUTC = config._useUTC;
            }
            tempConfig._f = config._f[i];
            configFromStringAndFormat(tempConfig);

            if (!isValid(tempConfig)) {
                continue;
            }

            // if there is any input that was not parsed add a penalty for that format
            currentScore += getParsingFlags(tempConfig).charsLeftOver;

            //or tokens
            currentScore += getParsingFlags(tempConfig).unusedTokens.length * 10;

            getParsingFlags(tempConfig).score = currentScore;

            if (scoreToBeat == null || currentScore < scoreToBeat) {
                scoreToBeat = currentScore;
                bestMoment = tempConfig;
            }
        }

        extend(config, bestMoment || tempConfig);
    }

    function configFromObject(config) {
        if (config._d) {
            return;
        }

        var i = normalizeObjectUnits(config._i);
        config._a = map([i.year, i.month, i.day || i.date, i.hour, i.minute, i.second, i.millisecond], function (obj) {
            return obj && parseInt(obj, 10);
        });

        configFromArray(config);
    }

    function createFromConfig (config) {
        var res = new Moment(checkOverflow(prepareConfig(config)));
        if (res._nextDay) {
            // Adding is smart enough around DST
            res.add(1, 'd');
            res._nextDay = undefined;
        }

        return res;
    }

    function prepareConfig (config) {
        var input = config._i,
            format = config._f;

        config._locale = config._locale || getLocale(config._l);

        if (input === null || (format === undefined && input === '')) {
            return createInvalid({nullInput: true});
        }

        if (typeof input === 'string') {
            config._i = input = config._locale.preparse(input);
        }

        if (isMoment(input)) {
            return new Moment(checkOverflow(input));
        } else if (isDate(input)) {
            config._d = input;
        } else if (isArray(format)) {
            configFromStringAndArray(config);
        } else if (format) {
            configFromStringAndFormat(config);
        }  else {
            configFromInput(config);
        }

        if (!isValid(config)) {
            config._d = null;
        }

        return config;
    }

    function configFromInput(config) {
        var input = config._i;
        if (isUndefined(input)) {
            config._d = new Date(hooks.now());
        } else if (isDate(input)) {
            config._d = new Date(input.valueOf());
        } else if (typeof input === 'string') {
            configFromString(config);
        } else if (isArray(input)) {
            config._a = map(input.slice(0), function (obj) {
                return parseInt(obj, 10);
            });
            configFromArray(config);
        } else if (isObject(input)) {
            configFromObject(config);
        } else if (isNumber(input)) {
            // from milliseconds
            config._d = new Date(input);
        } else {
            hooks.createFromInputFallback(config);
        }
    }

    function createLocalOrUTC (input, format, locale, strict, isUTC) {
        var c = {};

        if (locale === true || locale === false) {
            strict = locale;
            locale = undefined;
        }

        if ((isObject(input) && isObjectEmpty(input)) ||
            (isArray(input) && input.length === 0)) {
            input = undefined;
        }
        // object construction must be done this way.
        // https://github.com/moment/moment/issues/1423
        c._isAMomentObject = true;
        c._useUTC = c._isUTC = isUTC;
        c._l = locale;
        c._i = input;
        c._f = format;
        c._strict = strict;

        return createFromConfig(c);
    }

    function createLocal (input, format, locale, strict) {
        return createLocalOrUTC(input, format, locale, strict, false);
    }

    var prototypeMin = deprecate(
        'moment().min is deprecated, use moment.max instead. http://momentjs.com/guides/#/warnings/min-max/',
        function () {
            var other = createLocal.apply(null, arguments);
            if (this.isValid() && other.isValid()) {
                return other < this ? this : other;
            } else {
                return createInvalid();
            }
        }
    );

    var prototypeMax = deprecate(
        'moment().max is deprecated, use moment.min instead. http://momentjs.com/guides/#/warnings/min-max/',
        function () {
            var other = createLocal.apply(null, arguments);
            if (this.isValid() && other.isValid()) {
                return other > this ? this : other;
            } else {
                return createInvalid();
            }
        }
    );

    // Pick a moment m from moments so that m[fn](other) is true for all
    // other. This relies on the function fn to be transitive.
    //
    // moments should either be an array of moment objects or an array, whose
    // first element is an array of moment objects.
    function pickBy(fn, moments) {
        var res, i;
        if (moments.length === 1 && isArray(moments[0])) {
            moments = moments[0];
        }
        if (!moments.length) {
            return createLocal();
        }
        res = moments[0];
        for (i = 1; i < moments.length; ++i) {
            if (!moments[i].isValid() || moments[i][fn](res)) {
                res = moments[i];
            }
        }
        return res;
    }

    // TODO: Use [].sort instead?
    function min () {
        var args = [].slice.call(arguments, 0);

        return pickBy('isBefore', args);
    }

    function max () {
        var args = [].slice.call(arguments, 0);

        return pickBy('isAfter', args);
    }

    var now = function () {
        return Date.now ? Date.now() : +(new Date());
    };

    var ordering = ['year', 'quarter', 'month', 'week', 'day', 'hour', 'minute', 'second', 'millisecond'];

    function isDurationValid(m) {
        for (var key in m) {
            if (!(indexOf.call(ordering, key) !== -1 && (m[key] == null || !isNaN(m[key])))) {
                return false;
            }
        }

        var unitHasDecimal = false;
        for (var i = 0; i < ordering.length; ++i) {
            if (m[ordering[i]]) {
                if (unitHasDecimal) {
                    return false; // only allow non-integers for smallest unit
                }
                if (parseFloat(m[ordering[i]]) !== toInt(m[ordering[i]])) {
                    unitHasDecimal = true;
                }
            }
        }

        return true;
    }

    function isValid$1() {
        return this._isValid;
    }

    function createInvalid$1() {
        return createDuration(NaN);
    }

    function Duration (duration) {
        var normalizedInput = normalizeObjectUnits(duration),
            years = normalizedInput.year || 0,
            quarters = normalizedInput.quarter || 0,
            months = normalizedInput.month || 0,
            weeks = normalizedInput.week || normalizedInput.isoWeek || 0,
            days = normalizedInput.day || 0,
            hours = normalizedInput.hour || 0,
            minutes = normalizedInput.minute || 0,
            seconds = normalizedInput.second || 0,
            milliseconds = normalizedInput.millisecond || 0;

        this._isValid = isDurationValid(normalizedInput);

        // representation for dateAddRemove
        this._milliseconds = +milliseconds +
            seconds * 1e3 + // 1000
            minutes * 6e4 + // 1000 * 60
            hours * 1000 * 60 * 60; //using 1000 * 60 * 60 instead of 36e5 to avoid floating point rounding errors https://github.com/moment/moment/issues/2978
        // Because of dateAddRemove treats 24 hours as different from a
        // day when working around DST, we need to store them separately
        this._days = +days +
            weeks * 7;
        // It is impossible to translate months into days without knowing
        // which months you are are talking about, so we have to store
        // it separately.
        this._months = +months +
            quarters * 3 +
            years * 12;

        this._data = {};

        this._locale = getLocale();

        this._bubble();
    }

    function isDuration (obj) {
        return obj instanceof Duration;
    }

    function absRound (number) {
        if (number < 0) {
            return Math.round(-1 * number) * -1;
        } else {
            return Math.round(number);
        }
    }

    // FORMATTING

    function offset (token, separator) {
        addFormatToken(token, 0, 0, function () {
            var offset = this.utcOffset();
            var sign = '+';
            if (offset < 0) {
                offset = -offset;
                sign = '-';
            }
            return sign + zeroFill(~~(offset / 60), 2) + separator + zeroFill(~~(offset) % 60, 2);
        });
    }

    offset('Z', ':');
    offset('ZZ', '');

    // PARSING

    addRegexToken('Z',  matchShortOffset);
    addRegexToken('ZZ', matchShortOffset);
    addParseToken(['Z', 'ZZ'], function (input, array, config) {
        config._useUTC = true;
        config._tzm = offsetFromString(matchShortOffset, input);
    });

    // HELPERS

    // timezone chunker
    // '+10:00' > ['10',  '00']
    // '-1530'  > ['-15', '30']
    var chunkOffset = /([\+\-]|\d\d)/gi;

    function offsetFromString(matcher, string) {
        var matches = (string || '').match(matcher);

        if (matches === null) {
            return null;
        }

        var chunk   = matches[matches.length - 1] || [];
        var parts   = (chunk + '').match(chunkOffset) || ['-', 0, 0];
        var minutes = +(parts[1] * 60) + toInt(parts[2]);

        return minutes === 0 ?
            0 :
            parts[0] === '+' ? minutes : -minutes;
    }

    // Return a moment from input, that is local/utc/zone equivalent to model.
    function cloneWithOffset(input, model) {
        var res, diff;
        if (model._isUTC) {
            res = model.clone();
            diff = (isMoment(input) || isDate(input) ? input.valueOf() : createLocal(input).valueOf()) - res.valueOf();
            // Use low-level api, because this fn is low-level api.
            res._d.setTime(res._d.valueOf() + diff);
            hooks.updateOffset(res, false);
            return res;
        } else {
            return createLocal(input).local();
        }
    }

    function getDateOffset (m) {
        // On Firefox.24 Date#getTimezoneOffset returns a floating point.
        // https://github.com/moment/moment/pull/1871
        return -Math.round(m._d.getTimezoneOffset() / 15) * 15;
    }

    // HOOKS

    // This function will be called whenever a moment is mutated.
    // It is intended to keep the offset in sync with the timezone.
    hooks.updateOffset = function () {};

    // MOMENTS

    // keepLocalTime = true means only change the timezone, without
    // affecting the local hour. So 5:31:26 +0300 --[utcOffset(2, true)]-->
    // 5:31:26 +0200 It is possible that 5:31:26 doesn't exist with offset
    // +0200, so we adjust the time as needed, to be valid.
    //
    // Keeping the time actually adds/subtracts (one hour)
    // from the actual represented time. That is why we call updateOffset
    // a second time. In case it wants us to change the offset again
    // _changeInProgress == true case, then we have to adjust, because
    // there is no such time in the given timezone.
    function getSetOffset (input, keepLocalTime, keepMinutes) {
        var offset = this._offset || 0,
            localAdjust;
        if (!this.isValid()) {
            return input != null ? this : NaN;
        }
        if (input != null) {
            if (typeof input === 'string') {
                input = offsetFromString(matchShortOffset, input);
                if (input === null) {
                    return this;
                }
            } else if (Math.abs(input) < 16 && !keepMinutes) {
                input = input * 60;
            }
            if (!this._isUTC && keepLocalTime) {
                localAdjust = getDateOffset(this);
            }
            this._offset = input;
            this._isUTC = true;
            if (localAdjust != null) {
                this.add(localAdjust, 'm');
            }
            if (offset !== input) {
                if (!keepLocalTime || this._changeInProgress) {
                    addSubtract(this, createDuration(input - offset, 'm'), 1, false);
                } else if (!this._changeInProgress) {
                    this._changeInProgress = true;
                    hooks.updateOffset(this, true);
                    this._changeInProgress = null;
                }
            }
            return this;
        } else {
            return this._isUTC ? offset : getDateOffset(this);
        }
    }

    function getSetZone (input, keepLocalTime) {
        if (input != null) {
            if (typeof input !== 'string') {
                input = -input;
            }

            this.utcOffset(input, keepLocalTime);

            return this;
        } else {
            return -this.utcOffset();
        }
    }

    function setOffsetToUTC (keepLocalTime) {
        return this.utcOffset(0, keepLocalTime);
    }

    function setOffsetToLocal (keepLocalTime) {
        if (this._isUTC) {
            this.utcOffset(0, keepLocalTime);
            this._isUTC = false;

            if (keepLocalTime) {
                this.subtract(getDateOffset(this), 'm');
            }
        }
        return this;
    }

    function setOffsetToParsedOffset () {
        if (this._tzm != null) {
            this.utcOffset(this._tzm, false, true);
        } else if (typeof this._i === 'string') {
            var tZone = offsetFromString(matchOffset, this._i);
            if (tZone != null) {
                this.utcOffset(tZone);
            }
            else {
                this.utcOffset(0, true);
            }
        }
        return this;
    }

    function hasAlignedHourOffset (input) {
        if (!this.isValid()) {
            return false;
        }
        input = input ? createLocal(input).utcOffset() : 0;

        return (this.utcOffset() - input) % 60 === 0;
    }

    function isDaylightSavingTime () {
        return (
            this.utcOffset() > this.clone().month(0).utcOffset() ||
            this.utcOffset() > this.clone().month(5).utcOffset()
        );
    }

    function isDaylightSavingTimeShifted () {
        if (!isUndefined(this._isDSTShifted)) {
            return this._isDSTShifted;
        }

        var c = {};

        copyConfig(c, this);
        c = prepareConfig(c);

        if (c._a) {
            var other = c._isUTC ? createUTC(c._a) : createLocal(c._a);
            this._isDSTShifted = this.isValid() &&
                compareArrays(c._a, other.toArray()) > 0;
        } else {
            this._isDSTShifted = false;
        }

        return this._isDSTShifted;
    }

    function isLocal () {
        return this.isValid() ? !this._isUTC : false;
    }

    function isUtcOffset () {
        return this.isValid() ? this._isUTC : false;
    }

    function isUtc () {
        return this.isValid() ? this._isUTC && this._offset === 0 : false;
    }

    // ASP.NET json date format regex
    var aspNetRegex = /^(\-|\+)?(?:(\d*)[. ])?(\d+)\:(\d+)(?:\:(\d+)(\.\d*)?)?$/;

    // from http://docs.closure-library.googlecode.com/git/closure_goog_date_date.js.source.html
    // somewhat more in line with 4.4.3.2 2004 spec, but allows decimal anywhere
    // and further modified to allow for strings containing both week and day
    var isoRegex = /^(-|\+)?P(?:([-+]?[0-9,.]*)Y)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)W)?(?:([-+]?[0-9,.]*)D)?(?:T(?:([-+]?[0-9,.]*)H)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)S)?)?$/;

    function createDuration (input, key) {
        var duration = input,
            // matching against regexp is expensive, do it on demand
            match = null,
            sign,
            ret,
            diffRes;

        if (isDuration(input)) {
            duration = {
                ms : input._milliseconds,
                d  : input._days,
                M  : input._months
            };
        } else if (isNumber(input)) {
            duration = {};
            if (key) {
                duration[key] = input;
            } else {
                duration.milliseconds = input;
            }
        } else if (!!(match = aspNetRegex.exec(input))) {
            sign = (match[1] === '-') ? -1 : 1;
            duration = {
                y  : 0,
                d  : toInt(match[DATE])                         * sign,
                h  : toInt(match[HOUR])                         * sign,
                m  : toInt(match[MINUTE])                       * sign,
                s  : toInt(match[SECOND])                       * sign,
                ms : toInt(absRound(match[MILLISECOND] * 1000)) * sign // the millisecond decimal point is included in the match
            };
        } else if (!!(match = isoRegex.exec(input))) {
            sign = (match[1] === '-') ? -1 : 1;
            duration = {
                y : parseIso(match[2], sign),
                M : parseIso(match[3], sign),
                w : parseIso(match[4], sign),
                d : parseIso(match[5], sign),
                h : parseIso(match[6], sign),
                m : parseIso(match[7], sign),
                s : parseIso(match[8], sign)
            };
        } else if (duration == null) {// checks for null or undefined
            duration = {};
        } else if (typeof duration === 'object' && ('from' in duration || 'to' in duration)) {
            diffRes = momentsDifference(createLocal(duration.from), createLocal(duration.to));

            duration = {};
            duration.ms = diffRes.milliseconds;
            duration.M = diffRes.months;
        }

        ret = new Duration(duration);

        if (isDuration(input) && hasOwnProp(input, '_locale')) {
            ret._locale = input._locale;
        }

        return ret;
    }

    createDuration.fn = Duration.prototype;
    createDuration.invalid = createInvalid$1;

    function parseIso (inp, sign) {
        // We'd normally use ~~inp for this, but unfortunately it also
        // converts floats to ints.
        // inp may be undefined, so careful calling replace on it.
        var res = inp && parseFloat(inp.replace(',', '.'));
        // apply sign while we're at it
        return (isNaN(res) ? 0 : res) * sign;
    }

    function positiveMomentsDifference(base, other) {
        var res = {};

        res.months = other.month() - base.month() +
            (other.year() - base.year()) * 12;
        if (base.clone().add(res.months, 'M').isAfter(other)) {
            --res.months;
        }

        res.milliseconds = +other - +(base.clone().add(res.months, 'M'));

        return res;
    }

    function momentsDifference(base, other) {
        var res;
        if (!(base.isValid() && other.isValid())) {
            return {milliseconds: 0, months: 0};
        }

        other = cloneWithOffset(other, base);
        if (base.isBefore(other)) {
            res = positiveMomentsDifference(base, other);
        } else {
            res = positiveMomentsDifference(other, base);
            res.milliseconds = -res.milliseconds;
            res.months = -res.months;
        }

        return res;
    }

    // TODO: remove 'name' arg after deprecation is removed
    function createAdder(direction, name) {
        return function (val, period) {
            var dur, tmp;
            //invert the arguments, but complain about it
            if (period !== null && !isNaN(+period)) {
                deprecateSimple(name, 'moment().' + name  + '(period, number) is deprecated. Please use moment().' + name + '(number, period). ' +
                    'See http://momentjs.com/guides/#/warnings/add-inverted-param/ for more info.');
                tmp = val; val = period; period = tmp;
            }

            val = typeof val === 'string' ? +val : val;
            dur = createDuration(val, period);
            addSubtract(this, dur, direction);
            return this;
        };
    }

    function addSubtract (mom, duration, isAdding, updateOffset) {
        var milliseconds = duration._milliseconds,
            days = absRound(duration._days),
            months = absRound(duration._months);

        if (!mom.isValid()) {
            // No op
            return;
        }

        updateOffset = updateOffset == null ? true : updateOffset;

        if (months) {
            setMonth(mom, get(mom, 'Month') + months * isAdding);
        }
        if (days) {
            set$1(mom, 'Date', get(mom, 'Date') + days * isAdding);
        }
        if (milliseconds) {
            mom._d.setTime(mom._d.valueOf() + milliseconds * isAdding);
        }
        if (updateOffset) {
            hooks.updateOffset(mom, days || months);
        }
    }

    var add      = createAdder(1, 'add');
    var subtract = createAdder(-1, 'subtract');

    function getCalendarFormat(myMoment, now) {
        var diff = myMoment.diff(now, 'days', true);
        return diff < -6 ? 'sameElse' :
            diff < -1 ? 'lastWeek' :
                diff < 0 ? 'lastDay' :
                    diff < 1 ? 'sameDay' :
                        diff < 2 ? 'nextDay' :
                            diff < 7 ? 'nextWeek' : 'sameElse';
    }

    function calendar$1 (time, formats) {
        // We want to compare the start of today, vs this.
        // Getting start-of-today depends on whether we're local/utc/offset or not.
        var now = time || createLocal(),
            sod = cloneWithOffset(now, this).startOf('day'),
            format = hooks.calendarFormat(this, sod) || 'sameElse';

        var output = formats && (isFunction(formats[format]) ? formats[format].call(this, now) : formats[format]);

        return this.format(output || this.localeData().calendar(format, this, createLocal(now)));
    }

    function clone () {
        return new Moment(this);
    }

    function isAfter (input, units) {
        var localInput = isMoment(input) ? input : createLocal(input);
        if (!(this.isValid() && localInput.isValid())) {
            return false;
        }
        units = normalizeUnits(units) || 'millisecond';
        if (units === 'millisecond') {
            return this.valueOf() > localInput.valueOf();
        } else {
            return localInput.valueOf() < this.clone().startOf(units).valueOf();
        }
    }

    function isBefore (input, units) {
        var localInput = isMoment(input) ? input : createLocal(input);
        if (!(this.isValid() && localInput.isValid())) {
            return false;
        }
        units = normalizeUnits(units) || 'millisecond';
        if (units === 'millisecond') {
            return this.valueOf() < localInput.valueOf();
        } else {
            return this.clone().endOf(units).valueOf() < localInput.valueOf();
        }
    }

    function isBetween (from, to, units, inclusivity) {
        var localFrom = isMoment(from) ? from : createLocal(from),
            localTo = isMoment(to) ? to : createLocal(to);
        if (!(this.isValid() && localFrom.isValid() && localTo.isValid())) {
            return false;
        }
        inclusivity = inclusivity || '()';
        return (inclusivity[0] === '(' ? this.isAfter(localFrom, units) : !this.isBefore(localFrom, units)) &&
            (inclusivity[1] === ')' ? this.isBefore(localTo, units) : !this.isAfter(localTo, units));
    }

    function isSame (input, units) {
        var localInput = isMoment(input) ? input : createLocal(input),
            inputMs;
        if (!(this.isValid() && localInput.isValid())) {
            return false;
        }
        units = normalizeUnits(units) || 'millisecond';
        if (units === 'millisecond') {
            return this.valueOf() === localInput.valueOf();
        } else {
            inputMs = localInput.valueOf();
            return this.clone().startOf(units).valueOf() <= inputMs && inputMs <= this.clone().endOf(units).valueOf();
        }
    }

    function isSameOrAfter (input, units) {
        return this.isSame(input, units) || this.isAfter(input, units);
    }

    function isSameOrBefore (input, units) {
        return this.isSame(input, units) || this.isBefore(input, units);
    }

    function diff (input, units, asFloat) {
        var that,
            zoneDelta,
            output;

        if (!this.isValid()) {
            return NaN;
        }

        that = cloneWithOffset(input, this);

        if (!that.isValid()) {
            return NaN;
        }

        zoneDelta = (that.utcOffset() - this.utcOffset()) * 6e4;

        units = normalizeUnits(units);

        switch (units) {
            case 'year': output = monthDiff(this, that) / 12; break;
            case 'month': output = monthDiff(this, that); break;
            case 'quarter': output = monthDiff(this, that) / 3; break;
            case 'second': output = (this - that) / 1e3; break; // 1000
            case 'minute': output = (this - that) / 6e4; break; // 1000 * 60
            case 'hour': output = (this - that) / 36e5; break; // 1000 * 60 * 60
            case 'day': output = (this - that - zoneDelta) / 864e5; break; // 1000 * 60 * 60 * 24, negate dst
            case 'week': output = (this - that - zoneDelta) / 6048e5; break; // 1000 * 60 * 60 * 24 * 7, negate dst
            default: output = this - that;
        }

        return asFloat ? output : absFloor(output);
    }

    function monthDiff (a, b) {
        // difference in months
        var wholeMonthDiff = ((b.year() - a.year()) * 12) + (b.month() - a.month()),
            // b is in (anchor - 1 month, anchor + 1 month)
            anchor = a.clone().add(wholeMonthDiff, 'months'),
            anchor2, adjust;

        if (b - anchor < 0) {
            anchor2 = a.clone().add(wholeMonthDiff - 1, 'months');
            // linear across the month
            adjust = (b - anchor) / (anchor - anchor2);
        } else {
            anchor2 = a.clone().add(wholeMonthDiff + 1, 'months');
            // linear across the month
            adjust = (b - anchor) / (anchor2 - anchor);
        }

        //check for negative zero, return zero if negative zero
        return -(wholeMonthDiff + adjust) || 0;
    }

    hooks.defaultFormat = 'YYYY-MM-DDTHH:mm:ssZ';
    hooks.defaultFormatUtc = 'YYYY-MM-DDTHH:mm:ss[Z]';

    function toString () {
        return this.clone().locale('en').format('ddd MMM DD YYYY HH:mm:ss [GMT]ZZ');
    }

    function toISOString(keepOffset) {
        if (!this.isValid()) {
            return null;
        }
        var utc = keepOffset !== true;
        var m = utc ? this.clone().utc() : this;
        if (m.year() < 0 || m.year() > 9999) {
            return formatMoment(m, utc ? 'YYYYYY-MM-DD[T]HH:mm:ss.SSS[Z]' : 'YYYYYY-MM-DD[T]HH:mm:ss.SSSZ');
        }
        if (isFunction(Date.prototype.toISOString)) {
            // native implementation is ~50x faster, use it when we can
            if (utc) {
                return this.toDate().toISOString();
            } else {
                return new Date(this.valueOf() + this.utcOffset() * 60 * 1000).toISOString().replace('Z', formatMoment(m, 'Z'));
            }
        }
        return formatMoment(m, utc ? 'YYYY-MM-DD[T]HH:mm:ss.SSS[Z]' : 'YYYY-MM-DD[T]HH:mm:ss.SSSZ');
    }

    /**
     * Return a human readable representation of a moment that can
     * also be evaluated to get a new moment which is the same
     *
     * @link https://nodejs.org/dist/latest/docs/api/util.html#util_custom_inspect_function_on_objects
     */
    function inspect () {
        if (!this.isValid()) {
            return 'moment.invalid(/* ' + this._i + ' */)';
        }
        var func = 'moment';
        var zone = '';
        if (!this.isLocal()) {
            func = this.utcOffset() === 0 ? 'moment.utc' : 'moment.parseZone';
            zone = 'Z';
        }
        var prefix = '[' + func + '("]';
        var year = (0 <= this.year() && this.year() <= 9999) ? 'YYYY' : 'YYYYYY';
        var datetime = '-MM-DD[T]HH:mm:ss.SSS';
        var suffix = zone + '[")]';

        return this.format(prefix + year + datetime + suffix);
    }

    function format (inputString) {
        if (!inputString) {
            inputString = this.isUtc() ? hooks.defaultFormatUtc : hooks.defaultFormat;
        }
        var output = formatMoment(this, inputString);
        return this.localeData().postformat(output);
    }

    function from (time, withoutSuffix) {
        if (this.isValid() &&
            ((isMoment(time) && time.isValid()) ||
                createLocal(time).isValid())) {
            return createDuration({to: this, from: time}).locale(this.locale()).humanize(!withoutSuffix);
        } else {
            return this.localeData().invalidDate();
        }
    }

    function fromNow (withoutSuffix) {
        return this.from(createLocal(), withoutSuffix);
    }

    function to (time, withoutSuffix) {
        if (this.isValid() &&
            ((isMoment(time) && time.isValid()) ||
                createLocal(time).isValid())) {
            return createDuration({from: this, to: time}).locale(this.locale()).humanize(!withoutSuffix);
        } else {
            return this.localeData().invalidDate();
        }
    }

    function toNow (withoutSuffix) {
        return this.to(createLocal(), withoutSuffix);
    }

    // If passed a locale key, it will set the locale for this
    // instance.  Otherwise, it will return the locale configuration
    // variables for this instance.
    function locale (key) {
        var newLocaleData;

        if (key === undefined) {
            return this._locale._abbr;
        } else {
            newLocaleData = getLocale(key);
            if (newLocaleData != null) {
                this._locale = newLocaleData;
            }
            return this;
        }
    }

    var lang = deprecate(
        'moment().lang() is deprecated. Instead, use moment().localeData() to get the language configuration. Use moment().locale() to change languages.',
        function (key) {
            if (key === undefined) {
                return this.localeData();
            } else {
                return this.locale(key);
            }
        }
    );

    function localeData () {
        return this._locale;
    }

    var MS_PER_SECOND = 1000;
    var MS_PER_MINUTE = 60 * MS_PER_SECOND;
    var MS_PER_HOUR = 60 * MS_PER_MINUTE;
    var MS_PER_400_YEARS = (365 * 400 + 97) * 24 * MS_PER_HOUR;

    // actual modulo - handles negative numbers (for dates before 1970):
    function mod$1(dividend, divisor) {
        return (dividend % divisor + divisor) % divisor;
    }

    function localStartOfDate(y, m, d) {
        // the date constructor remaps years 0-99 to 1900-1999
        if (y < 100 && y >= 0) {
            // preserve leap years using a full 400 year cycle, then reset
            return new Date(y + 400, m, d) - MS_PER_400_YEARS;
        } else {
            return new Date(y, m, d).valueOf();
        }
    }

    function utcStartOfDate(y, m, d) {
        // Date.UTC remaps years 0-99 to 1900-1999
        if (y < 100 && y >= 0) {
            // preserve leap years using a full 400 year cycle, then reset
            return Date.UTC(y + 400, m, d) - MS_PER_400_YEARS;
        } else {
            return Date.UTC(y, m, d);
        }
    }

    function startOf (units) {
        var time;
        units = normalizeUnits(units);
        if (units === undefined || units === 'millisecond' || !this.isValid()) {
            return this;
        }

        var startOfDate = this._isUTC ? utcStartOfDate : localStartOfDate;

        switch (units) {
            case 'year':
                time = startOfDate(this.year(), 0, 1);
                break;
            case 'quarter':
                time = startOfDate(this.year(), this.month() - this.month() % 3, 1);
                break;
            case 'month':
                time = startOfDate(this.year(), this.month(), 1);
                break;
            case 'week':
                time = startOfDate(this.year(), this.month(), this.date() - this.weekday());
                break;
            case 'isoWeek':
                time = startOfDate(this.year(), this.month(), this.date() - (this.isoWeekday() - 1));
                break;
            case 'day':
            case 'date':
                time = startOfDate(this.year(), this.month(), this.date());
                break;
            case 'hour':
                time = this._d.valueOf();
                time -= mod$1(time + (this._isUTC ? 0 : this.utcOffset() * MS_PER_MINUTE), MS_PER_HOUR);
                break;
            case 'minute':
                time = this._d.valueOf();
                time -= mod$1(time, MS_PER_MINUTE);
                break;
            case 'second':
                time = this._d.valueOf();
                time -= mod$1(time, MS_PER_SECOND);
                break;
        }

        this._d.setTime(time);
        hooks.updateOffset(this, true);
        return this;
    }

    function endOf (units) {
        var time;
        units = normalizeUnits(units);
        if (units === undefined || units === 'millisecond' || !this.isValid()) {
            return this;
        }

        var startOfDate = this._isUTC ? utcStartOfDate : localStartOfDate;

        switch (units) {
            case 'year':
                time = startOfDate(this.year() + 1, 0, 1) - 1;
                break;
            case 'quarter':
                time = startOfDate(this.year(), this.month() - this.month() % 3 + 3, 1) - 1;
                break;
            case 'month':
                time = startOfDate(this.year(), this.month() + 1, 1) - 1;
                break;
            case 'week':
                time = startOfDate(this.year(), this.month(), this.date() - this.weekday() + 7) - 1;
                break;
            case 'isoWeek':
                time = startOfDate(this.year(), this.month(), this.date() - (this.isoWeekday() - 1) + 7) - 1;
                break;
            case 'day':
            case 'date':
                time = startOfDate(this.year(), this.month(), this.date() + 1) - 1;
                break;
            case 'hour':
                time = this._d.valueOf();
                time += MS_PER_HOUR - mod$1(time + (this._isUTC ? 0 : this.utcOffset() * MS_PER_MINUTE), MS_PER_HOUR) - 1;
                break;
            case 'minute':
                time = this._d.valueOf();
                time += MS_PER_MINUTE - mod$1(time, MS_PER_MINUTE) - 1;
                break;
            case 'second':
                time = this._d.valueOf();
                time += MS_PER_SECOND - mod$1(time, MS_PER_SECOND) - 1;
                break;
        }

        this._d.setTime(time);
        hooks.updateOffset(this, true);
        return this;
    }

    function valueOf () {
        return this._d.valueOf() - ((this._offset || 0) * 60000);
    }

    function unix () {
        return Math.floor(this.valueOf() / 1000);
    }

    function toDate () {
        return new Date(this.valueOf());
    }

    function toArray () {
        var m = this;
        return [m.year(), m.month(), m.date(), m.hour(), m.minute(), m.second(), m.millisecond()];
    }

    function toObject () {
        var m = this;
        return {
            years: m.year(),
            months: m.month(),
            date: m.date(),
            hours: m.hours(),
            minutes: m.minutes(),
            seconds: m.seconds(),
            milliseconds: m.milliseconds()
        };
    }

    function toJSON () {
        // new Date(NaN).toJSON() === null
        return this.isValid() ? this.toISOString() : null;
    }

    function isValid$2 () {
        return isValid(this);
    }

    function parsingFlags () {
        return extend({}, getParsingFlags(this));
    }

    function invalidAt () {
        return getParsingFlags(this).overflow;
    }

    function creationData() {
        return {
            input: this._i,
            format: this._f,
            locale: this._locale,
            isUTC: this._isUTC,
            strict: this._strict
        };
    }

    // FORMATTING

    addFormatToken(0, ['gg', 2], 0, function () {
        return this.weekYear() % 100;
    });

    addFormatToken(0, ['GG', 2], 0, function () {
        return this.isoWeekYear() % 100;
    });

    function addWeekYearFormatToken (token, getter) {
        addFormatToken(0, [token, token.length], 0, getter);
    }

    addWeekYearFormatToken('gggg',     'weekYear');
    addWeekYearFormatToken('ggggg',    'weekYear');
    addWeekYearFormatToken('GGGG',  'isoWeekYear');
    addWeekYearFormatToken('GGGGG', 'isoWeekYear');

    // ALIASES

    addUnitAlias('weekYear', 'gg');
    addUnitAlias('isoWeekYear', 'GG');

    // PRIORITY

    addUnitPriority('weekYear', 1);
    addUnitPriority('isoWeekYear', 1);


    // PARSING

    addRegexToken('G',      matchSigned);
    addRegexToken('g',      matchSigned);
    addRegexToken('GG',     match1to2, match2);
    addRegexToken('gg',     match1to2, match2);
    addRegexToken('GGGG',   match1to4, match4);
    addRegexToken('gggg',   match1to4, match4);
    addRegexToken('GGGGG',  match1to6, match6);
    addRegexToken('ggggg',  match1to6, match6);

    addWeekParseToken(['gggg', 'ggggg', 'GGGG', 'GGGGG'], function (input, week, config, token) {
        week[token.substr(0, 2)] = toInt(input);
    });

    addWeekParseToken(['gg', 'GG'], function (input, week, config, token) {
        week[token] = hooks.parseTwoDigitYear(input);
    });

    // MOMENTS

    function getSetWeekYear (input) {
        return getSetWeekYearHelper.call(this,
            input,
            this.week(),
            this.weekday(),
            this.localeData()._week.dow,
            this.localeData()._week.doy);
    }

    function getSetISOWeekYear (input) {
        return getSetWeekYearHelper.call(this,
            input, this.isoWeek(), this.isoWeekday(), 1, 4);
    }

    function getISOWeeksInYear () {
        return weeksInYear(this.year(), 1, 4);
    }

    function getWeeksInYear () {
        var weekInfo = this.localeData()._week;
        return weeksInYear(this.year(), weekInfo.dow, weekInfo.doy);
    }

    function getSetWeekYearHelper(input, week, weekday, dow, doy) {
        var weeksTarget;
        if (input == null) {
            return weekOfYear(this, dow, doy).year;
        } else {
            weeksTarget = weeksInYear(input, dow, doy);
            if (week > weeksTarget) {
                week = weeksTarget;
            }
            return setWeekAll.call(this, input, week, weekday, dow, doy);
        }
    }

    function setWeekAll(weekYear, week, weekday, dow, doy) {
        var dayOfYearData = dayOfYearFromWeeks(weekYear, week, weekday, dow, doy),
            date = createUTCDate(dayOfYearData.year, 0, dayOfYearData.dayOfYear);

        this.year(date.getUTCFullYear());
        this.month(date.getUTCMonth());
        this.date(date.getUTCDate());
        return this;
    }

    // FORMATTING

    addFormatToken('Q', 0, 'Qo', 'quarter');

    // ALIASES

    addUnitAlias('quarter', 'Q');

    // PRIORITY

    addUnitPriority('quarter', 7);

    // PARSING

    addRegexToken('Q', match1);
    addParseToken('Q', function (input, array) {
        array[MONTH] = (toInt(input) - 1) * 3;
    });

    // MOMENTS

    function getSetQuarter (input) {
        return input == null ? Math.ceil((this.month() + 1) / 3) : this.month((input - 1) * 3 + this.month() % 3);
    }

    // FORMATTING

    addFormatToken('D', ['DD', 2], 'Do', 'date');

    // ALIASES

    addUnitAlias('date', 'D');

    // PRIORITY
    addUnitPriority('date', 9);

    // PARSING

    addRegexToken('D',  match1to2);
    addRegexToken('DD', match1to2, match2);
    addRegexToken('Do', function (isStrict, locale) {
        // TODO: Remove "ordinalParse" fallback in next major release.
        return isStrict ?
            (locale._dayOfMonthOrdinalParse || locale._ordinalParse) :
            locale._dayOfMonthOrdinalParseLenient;
    });

    addParseToken(['D', 'DD'], DATE);
    addParseToken('Do', function (input, array) {
        array[DATE] = toInt(input.match(match1to2)[0]);
    });

    // MOMENTS

    var getSetDayOfMonth = makeGetSet('Date', true);

    // FORMATTING

    addFormatToken('DDD', ['DDDD', 3], 'DDDo', 'dayOfYear');

    // ALIASES

    addUnitAlias('dayOfYear', 'DDD');

    // PRIORITY
    addUnitPriority('dayOfYear', 4);

    // PARSING

    addRegexToken('DDD',  match1to3);
    addRegexToken('DDDD', match3);
    addParseToken(['DDD', 'DDDD'], function (input, array, config) {
        config._dayOfYear = toInt(input);
    });

    // HELPERS

    // MOMENTS

    function getSetDayOfYear (input) {
        var dayOfYear = Math.round((this.clone().startOf('day') - this.clone().startOf('year')) / 864e5) + 1;
        return input == null ? dayOfYear : this.add((input - dayOfYear), 'd');
    }

    // FORMATTING

    addFormatToken('m', ['mm', 2], 0, 'minute');

    // ALIASES

    addUnitAlias('minute', 'm');

    // PRIORITY

    addUnitPriority('minute', 14);

    // PARSING

    addRegexToken('m',  match1to2);
    addRegexToken('mm', match1to2, match2);
    addParseToken(['m', 'mm'], MINUTE);

    // MOMENTS

    var getSetMinute = makeGetSet('Minutes', false);

    // FORMATTING

    addFormatToken('s', ['ss', 2], 0, 'second');

    // ALIASES

    addUnitAlias('second', 's');

    // PRIORITY

    addUnitPriority('second', 15);

    // PARSING

    addRegexToken('s',  match1to2);
    addRegexToken('ss', match1to2, match2);
    addParseToken(['s', 'ss'], SECOND);

    // MOMENTS

    var getSetSecond = makeGetSet('Seconds', false);

    // FORMATTING

    addFormatToken('S', 0, 0, function () {
        return ~~(this.millisecond() / 100);
    });

    addFormatToken(0, ['SS', 2], 0, function () {
        return ~~(this.millisecond() / 10);
    });

    addFormatToken(0, ['SSS', 3], 0, 'millisecond');
    addFormatToken(0, ['SSSS', 4], 0, function () {
        return this.millisecond() * 10;
    });
    addFormatToken(0, ['SSSSS', 5], 0, function () {
        return this.millisecond() * 100;
    });
    addFormatToken(0, ['SSSSSS', 6], 0, function () {
        return this.millisecond() * 1000;
    });
    addFormatToken(0, ['SSSSSSS', 7], 0, function () {
        return this.millisecond() * 10000;
    });
    addFormatToken(0, ['SSSSSSSS', 8], 0, function () {
        return this.millisecond() * 100000;
    });
    addFormatToken(0, ['SSSSSSSSS', 9], 0, function () {
        return this.millisecond() * 1000000;
    });


    // ALIASES

    addUnitAlias('millisecond', 'ms');

    // PRIORITY

    addUnitPriority('millisecond', 16);

    // PARSING

    addRegexToken('S',    match1to3, match1);
    addRegexToken('SS',   match1to3, match2);
    addRegexToken('SSS',  match1to3, match3);

    var token;
    for (token = 'SSSS'; token.length <= 9; token += 'S') {
        addRegexToken(token, matchUnsigned);
    }

    function parseMs(input, array) {
        array[MILLISECOND] = toInt(('0.' + input) * 1000);
    }

    for (token = 'S'; token.length <= 9; token += 'S') {
        addParseToken(token, parseMs);
    }
    // MOMENTS

    var getSetMillisecond = makeGetSet('Milliseconds', false);

    // FORMATTING

    addFormatToken('z',  0, 0, 'zoneAbbr');
    addFormatToken('zz', 0, 0, 'zoneName');

    // MOMENTS

    function getZoneAbbr () {
        return this._isUTC ? 'UTC' : '';
    }

    function getZoneName () {
        return this._isUTC ? 'Coordinated Universal Time' : '';
    }

    var proto = Moment.prototype;

    proto.add               = add;
    proto.calendar          = calendar$1;
    proto.clone             = clone;
    proto.diff              = diff;
    proto.endOf             = endOf;
    proto.format            = format;
    proto.from              = from;
    proto.fromNow           = fromNow;
    proto.to                = to;
    proto.toNow             = toNow;
    proto.get               = stringGet;
    proto.invalidAt         = invalidAt;
    proto.isAfter           = isAfter;
    proto.isBefore          = isBefore;
    proto.isBetween         = isBetween;
    proto.isSame            = isSame;
    proto.isSameOrAfter     = isSameOrAfter;
    proto.isSameOrBefore    = isSameOrBefore;
    proto.isValid           = isValid$2;
    proto.lang              = lang;
    proto.locale            = locale;
    proto.localeData        = localeData;
    proto.max               = prototypeMax;
    proto.min               = prototypeMin;
    proto.parsingFlags      = parsingFlags;
    proto.set               = stringSet;
    proto.startOf           = startOf;
    proto.subtract          = subtract;
    proto.toArray           = toArray;
    proto.toObject          = toObject;
    proto.toDate            = toDate;
    proto.toISOString       = toISOString;
    proto.inspect           = inspect;
    proto.toJSON            = toJSON;
    proto.toString          = toString;
    proto.unix              = unix;
    proto.valueOf           = valueOf;
    proto.creationData      = creationData;
    proto.year       = getSetYear;
    proto.isLeapYear = getIsLeapYear;
    proto.weekYear    = getSetWeekYear;
    proto.isoWeekYear = getSetISOWeekYear;
    proto.quarter = proto.quarters = getSetQuarter;
    proto.month       = getSetMonth;
    proto.daysInMonth = getDaysInMonth;
    proto.week           = proto.weeks        = getSetWeek;
    proto.isoWeek        = proto.isoWeeks     = getSetISOWeek;
    proto.weeksInYear    = getWeeksInYear;
    proto.isoWeeksInYear = getISOWeeksInYear;
    proto.date       = getSetDayOfMonth;
    proto.day        = proto.days             = getSetDayOfWeek;
    proto.weekday    = getSetLocaleDayOfWeek;
    proto.isoWeekday = getSetISODayOfWeek;
    proto.dayOfYear  = getSetDayOfYear;
    proto.hour = proto.hours = getSetHour;
    proto.minute = proto.minutes = getSetMinute;
    proto.second = proto.seconds = getSetSecond;
    proto.millisecond = proto.milliseconds = getSetMillisecond;
    proto.utcOffset            = getSetOffset;
    proto.utc                  = setOffsetToUTC;
    proto.local                = setOffsetToLocal;
    proto.parseZone            = setOffsetToParsedOffset;
    proto.hasAlignedHourOffset = hasAlignedHourOffset;
    proto.isDST                = isDaylightSavingTime;
    proto.isLocal              = isLocal;
    proto.isUtcOffset          = isUtcOffset;
    proto.isUtc                = isUtc;
    proto.isUTC                = isUtc;
    proto.zoneAbbr = getZoneAbbr;
    proto.zoneName = getZoneName;
    proto.dates  = deprecate('dates accessor is deprecated. Use date instead.', getSetDayOfMonth);
    proto.months = deprecate('months accessor is deprecated. Use month instead', getSetMonth);
    proto.years  = deprecate('years accessor is deprecated. Use year instead', getSetYear);
    proto.zone   = deprecate('moment().zone is deprecated, use moment().utcOffset instead. http://momentjs.com/guides/#/warnings/zone/', getSetZone);
    proto.isDSTShifted = deprecate('isDSTShifted is deprecated. See http://momentjs.com/guides/#/warnings/dst-shifted/ for more information', isDaylightSavingTimeShifted);

    function createUnix (input) {
        return createLocal(input * 1000);
    }

    function createInZone () {
        return createLocal.apply(null, arguments).parseZone();
    }

    function preParsePostFormat (string) {
        return string;
    }

    var proto$1 = Locale.prototype;

    proto$1.calendar        = calendar;
    proto$1.longDateFormat  = longDateFormat;
    proto$1.invalidDate     = invalidDate;
    proto$1.ordinal         = ordinal;
    proto$1.preparse        = preParsePostFormat;
    proto$1.postformat      = preParsePostFormat;
    proto$1.relativeTime    = relativeTime;
    proto$1.pastFuture      = pastFuture;
    proto$1.set             = set;

    proto$1.months            =        localeMonths;
    proto$1.monthsShort       =        localeMonthsShort;
    proto$1.monthsParse       =        localeMonthsParse;
    proto$1.monthsRegex       = monthsRegex;
    proto$1.monthsShortRegex  = monthsShortRegex;
    proto$1.week = localeWeek;
    proto$1.firstDayOfYear = localeFirstDayOfYear;
    proto$1.firstDayOfWeek = localeFirstDayOfWeek;

    proto$1.weekdays       =        localeWeekdays;
    proto$1.weekdaysMin    =        localeWeekdaysMin;
    proto$1.weekdaysShort  =        localeWeekdaysShort;
    proto$1.weekdaysParse  =        localeWeekdaysParse;

    proto$1.weekdaysRegex       =        weekdaysRegex;
    proto$1.weekdaysShortRegex  =        weekdaysShortRegex;
    proto$1.weekdaysMinRegex    =        weekdaysMinRegex;

    proto$1.isPM = localeIsPM;
    proto$1.meridiem = localeMeridiem;

    function get$1 (format, index, field, setter) {
        var locale = getLocale();
        var utc = createUTC().set(setter, index);
        return locale[field](utc, format);
    }

    function listMonthsImpl (format, index, field) {
        if (isNumber(format)) {
            index = format;
            format = undefined;
        }

        format = format || '';

        if (index != null) {
            return get$1(format, index, field, 'month');
        }

        var i;
        var out = [];
        for (i = 0; i < 12; i++) {
            out[i] = get$1(format, i, field, 'month');
        }
        return out;
    }

    // ()
    // (5)
    // (fmt, 5)
    // (fmt)
    // (true)
    // (true, 5)
    // (true, fmt, 5)
    // (true, fmt)
    function listWeekdaysImpl (localeSorted, format, index, field) {
        if (typeof localeSorted === 'boolean') {
            if (isNumber(format)) {
                index = format;
                format = undefined;
            }

            format = format || '';
        } else {
            format = localeSorted;
            index = format;
            localeSorted = false;

            if (isNumber(format)) {
                index = format;
                format = undefined;
            }

            format = format || '';
        }

        var locale = getLocale(),
            shift = localeSorted ? locale._week.dow : 0;

        if (index != null) {
            return get$1(format, (index + shift) % 7, field, 'day');
        }

        var i;
        var out = [];
        for (i = 0; i < 7; i++) {
            out[i] = get$1(format, (i + shift) % 7, field, 'day');
        }
        return out;
    }

    function listMonths (format, index) {
        return listMonthsImpl(format, index, 'months');
    }

    function listMonthsShort (format, index) {
        return listMonthsImpl(format, index, 'monthsShort');
    }

    function listWeekdays (localeSorted, format, index) {
        return listWeekdaysImpl(localeSorted, format, index, 'weekdays');
    }

    function listWeekdaysShort (localeSorted, format, index) {
        return listWeekdaysImpl(localeSorted, format, index, 'weekdaysShort');
    }

    function listWeekdaysMin (localeSorted, format, index) {
        return listWeekdaysImpl(localeSorted, format, index, 'weekdaysMin');
    }

    getSetGlobalLocale('en', {
        dayOfMonthOrdinalParse: /\d{1,2}(th|st|nd|rd)/,
        ordinal : function (number) {
            var b = number % 10,
                output = (toInt(number % 100 / 10) === 1) ? 'th' :
                    (b === 1) ? 'st' :
                        (b === 2) ? 'nd' :
                            (b === 3) ? 'rd' : 'th';
            return number + output;
        }
    });

    // Side effect imports

    hooks.lang = deprecate('moment.lang is deprecated. Use moment.locale instead.', getSetGlobalLocale);
    hooks.langData = deprecate('moment.langData is deprecated. Use moment.localeData instead.', getLocale);

    var mathAbs = Math.abs;

    function abs () {
        var data           = this._data;

        this._milliseconds = mathAbs(this._milliseconds);
        this._days         = mathAbs(this._days);
        this._months       = mathAbs(this._months);

        data.milliseconds  = mathAbs(data.milliseconds);
        data.seconds       = mathAbs(data.seconds);
        data.minutes       = mathAbs(data.minutes);
        data.hours         = mathAbs(data.hours);
        data.months        = mathAbs(data.months);
        data.years         = mathAbs(data.years);

        return this;
    }

    function addSubtract$1 (duration, input, value, direction) {
        var other = createDuration(input, value);

        duration._milliseconds += direction * other._milliseconds;
        duration._days         += direction * other._days;
        duration._months       += direction * other._months;

        return duration._bubble();
    }

    // supports only 2.0-style add(1, 's') or add(duration)
    function add$1 (input, value) {
        return addSubtract$1(this, input, value, 1);
    }

    // supports only 2.0-style subtract(1, 's') or subtract(duration)
    function subtract$1 (input, value) {
        return addSubtract$1(this, input, value, -1);
    }

    function absCeil (number) {
        if (number < 0) {
            return Math.floor(number);
        } else {
            return Math.ceil(number);
        }
    }

    function bubble () {
        var milliseconds = this._milliseconds;
        var days         = this._days;
        var months       = this._months;
        var data         = this._data;
        var seconds, minutes, hours, years, monthsFromDays;

        // if we have a mix of positive and negative values, bubble down first
        // check: https://github.com/moment/moment/issues/2166
        if (!((milliseconds >= 0 && days >= 0 && months >= 0) ||
            (milliseconds <= 0 && days <= 0 && months <= 0))) {
            milliseconds += absCeil(monthsToDays(months) + days) * 864e5;
            days = 0;
            months = 0;
        }

        // The following code bubbles up values, see the tests for
        // examples of what that means.
        data.milliseconds = milliseconds % 1000;

        seconds           = absFloor(milliseconds / 1000);
        data.seconds      = seconds % 60;

        minutes           = absFloor(seconds / 60);
        data.minutes      = minutes % 60;

        hours             = absFloor(minutes / 60);
        data.hours        = hours % 24;

        days += absFloor(hours / 24);

        // convert days to months
        monthsFromDays = absFloor(daysToMonths(days));
        months += monthsFromDays;
        days -= absCeil(monthsToDays(monthsFromDays));

        // 12 months -> 1 year
        years = absFloor(months / 12);
        months %= 12;

        data.days   = days;
        data.months = months;
        data.years  = years;

        return this;
    }

    function daysToMonths (days) {
        // 400 years have 146097 days (taking into account leap year rules)
        // 400 years have 12 months === 4800
        return days * 4800 / 146097;
    }

    function monthsToDays (months) {
        // the reverse of daysToMonths
        return months * 146097 / 4800;
    }

    function as (units) {
        if (!this.isValid()) {
            return NaN;
        }
        var days;
        var months;
        var milliseconds = this._milliseconds;

        units = normalizeUnits(units);

        if (units === 'month' || units === 'quarter' || units === 'year') {
            days = this._days + milliseconds / 864e5;
            months = this._months + daysToMonths(days);
            switch (units) {
                case 'month':   return months;
                case 'quarter': return months / 3;
                case 'year':    return months / 12;
            }
        } else {
            // handle milliseconds separately because of floating point math errors (issue #1867)
            days = this._days + Math.round(monthsToDays(this._months));
            switch (units) {
                case 'week'   : return days / 7     + milliseconds / 6048e5;
                case 'day'    : return days         + milliseconds / 864e5;
                case 'hour'   : return days * 24    + milliseconds / 36e5;
                case 'minute' : return days * 1440  + milliseconds / 6e4;
                case 'second' : return days * 86400 + milliseconds / 1000;
                // Math.floor prevents floating point math errors here
                case 'millisecond': return Math.floor(days * 864e5) + milliseconds;
                default: throw new Error('Unknown unit ' + units);
            }
        }
    }

    // TODO: Use this.as('ms')?
    function valueOf$1 () {
        if (!this.isValid()) {
            return NaN;
        }
        return (
            this._milliseconds +
            this._days * 864e5 +
            (this._months % 12) * 2592e6 +
            toInt(this._months / 12) * 31536e6
        );
    }

    function makeAs (alias) {
        return function () {
            return this.as(alias);
        };
    }

    var asMilliseconds = makeAs('ms');
    var asSeconds      = makeAs('s');
    var asMinutes      = makeAs('m');
    var asHours        = makeAs('h');
    var asDays         = makeAs('d');
    var asWeeks        = makeAs('w');
    var asMonths       = makeAs('M');
    var asQuarters     = makeAs('Q');
    var asYears        = makeAs('y');

    function clone$1 () {
        return createDuration(this);
    }

    function get$2 (units) {
        units = normalizeUnits(units);
        return this.isValid() ? this[units + 's']() : NaN;
    }

    function makeGetter(name) {
        return function () {
            return this.isValid() ? this._data[name] : NaN;
        };
    }

    var milliseconds = makeGetter('milliseconds');
    var seconds      = makeGetter('seconds');
    var minutes      = makeGetter('minutes');
    var hours        = makeGetter('hours');
    var days         = makeGetter('days');
    var months       = makeGetter('months');
    var years        = makeGetter('years');

    function weeks () {
        return absFloor(this.days() / 7);
    }

    var round = Math.round;
    var thresholds = {
        ss: 44,         // a few seconds to seconds
        s : 45,         // seconds to minute
        m : 45,         // minutes to hour
        h : 22,         // hours to day
        d : 26,         // days to month
        M : 11          // months to year
    };

    // helper function for moment.fn.from, moment.fn.fromNow, and moment.duration.fn.humanize
    function substituteTimeAgo(string, number, withoutSuffix, isFuture, locale) {
        return locale.relativeTime(number || 1, !!withoutSuffix, string, isFuture);
    }

    function relativeTime$1 (posNegDuration, withoutSuffix, locale) {
        var duration = createDuration(posNegDuration).abs();
        var seconds  = round(duration.as('s'));
        var minutes  = round(duration.as('m'));
        var hours    = round(duration.as('h'));
        var days     = round(duration.as('d'));
        var months   = round(duration.as('M'));
        var years    = round(duration.as('y'));

        var a = seconds <= thresholds.ss && ['s', seconds]  ||
            seconds < thresholds.s   && ['ss', seconds] ||
            minutes <= 1             && ['m']           ||
            minutes < thresholds.m   && ['mm', minutes] ||
            hours   <= 1             && ['h']           ||
            hours   < thresholds.h   && ['hh', hours]   ||
            days    <= 1             && ['d']           ||
            days    < thresholds.d   && ['dd', days]    ||
            months  <= 1             && ['M']           ||
            months  < thresholds.M   && ['MM', months]  ||
            years   <= 1             && ['y']           || ['yy', years];

        a[2] = withoutSuffix;
        a[3] = +posNegDuration > 0;
        a[4] = locale;
        return substituteTimeAgo.apply(null, a);
    }

    // This function allows you to set the rounding function for relative time strings
    function getSetRelativeTimeRounding (roundingFunction) {
        if (roundingFunction === undefined) {
            return round;
        }
        if (typeof(roundingFunction) === 'function') {
            round = roundingFunction;
            return true;
        }
        return false;
    }

    // This function allows you to set a threshold for relative time strings
    function getSetRelativeTimeThreshold (threshold, limit) {
        if (thresholds[threshold] === undefined) {
            return false;
        }
        if (limit === undefined) {
            return thresholds[threshold];
        }
        thresholds[threshold] = limit;
        if (threshold === 's') {
            thresholds.ss = limit - 1;
        }
        return true;
    }

    function humanize (withSuffix) {
        if (!this.isValid()) {
            return this.localeData().invalidDate();
        }

        var locale = this.localeData();
        var output = relativeTime$1(this, !withSuffix, locale);

        if (withSuffix) {
            output = locale.pastFuture(+this, output);
        }

        return locale.postformat(output);
    }

    var abs$1 = Math.abs;

    function sign(x) {
        return ((x > 0) - (x < 0)) || +x;
    }

    function toISOString$1() {
        // for ISO strings we do not use the normal bubbling rules:
        //  * milliseconds bubble up until they become hours
        //  * days do not bubble at all
        //  * months bubble up until they become years
        // This is because there is no context-free conversion between hours and days
        // (think of clock changes)
        // and also not between days and months (28-31 days per month)
        if (!this.isValid()) {
            return this.localeData().invalidDate();
        }

        var seconds = abs$1(this._milliseconds) / 1000;
        var days         = abs$1(this._days);
        var months       = abs$1(this._months);
        var minutes, hours, years;

        // 3600 seconds -> 60 minutes -> 1 hour
        minutes           = absFloor(seconds / 60);
        hours             = absFloor(minutes / 60);
        seconds %= 60;
        minutes %= 60;

        // 12 months -> 1 year
        years  = absFloor(months / 12);
        months %= 12;


        // inspired by https://github.com/dordille/moment-isoduration/blob/master/moment.isoduration.js
        var Y = years;
        var M = months;
        var D = days;
        var h = hours;
        var m = minutes;
        var s = seconds ? seconds.toFixed(3).replace(/\.?0+$/, '') : '';
        var total = this.asSeconds();

        if (!total) {
            // this is the same as C#'s (Noda) and python (isodate)...
            // but not other JS (goog.date)
            return 'P0D';
        }

        var totalSign = total < 0 ? '-' : '';
        var ymSign = sign(this._months) !== sign(total) ? '-' : '';
        var daysSign = sign(this._days) !== sign(total) ? '-' : '';
        var hmsSign = sign(this._milliseconds) !== sign(total) ? '-' : '';

        return totalSign + 'P' +
            (Y ? ymSign + Y + 'Y' : '') +
            (M ? ymSign + M + 'M' : '') +
            (D ? daysSign + D + 'D' : '') +
            ((h || m || s) ? 'T' : '') +
            (h ? hmsSign + h + 'H' : '') +
            (m ? hmsSign + m + 'M' : '') +
            (s ? hmsSign + s + 'S' : '');
    }

    var proto$2 = Duration.prototype;

    proto$2.isValid        = isValid$1;
    proto$2.abs            = abs;
    proto$2.add            = add$1;
    proto$2.subtract       = subtract$1;
    proto$2.as             = as;
    proto$2.asMilliseconds = asMilliseconds;
    proto$2.asSeconds      = asSeconds;
    proto$2.asMinutes      = asMinutes;
    proto$2.asHours        = asHours;
    proto$2.asDays         = asDays;
    proto$2.asWeeks        = asWeeks;
    proto$2.asMonths       = asMonths;
    proto$2.asQuarters     = asQuarters;
    proto$2.asYears        = asYears;
    proto$2.valueOf        = valueOf$1;
    proto$2._bubble        = bubble;
    proto$2.clone          = clone$1;
    proto$2.get            = get$2;
    proto$2.milliseconds   = milliseconds;
    proto$2.seconds        = seconds;
    proto$2.minutes        = minutes;
    proto$2.hours          = hours;
    proto$2.days           = days;
    proto$2.weeks          = weeks;
    proto$2.months         = months;
    proto$2.years          = years;
    proto$2.humanize       = humanize;
    proto$2.toISOString    = toISOString$1;
    proto$2.toString       = toISOString$1;
    proto$2.toJSON         = toISOString$1;
    proto$2.locale         = locale;
    proto$2.localeData     = localeData;

    proto$2.toIsoString = deprecate('toIsoString() is deprecated. Please use toISOString() instead (notice the capitals)', toISOString$1);
    proto$2.lang = lang;

    // Side effect imports

    // FORMATTING

    addFormatToken('X', 0, 0, 'unix');
    addFormatToken('x', 0, 0, 'valueOf');

    // PARSING

    addRegexToken('x', matchSigned);
    addRegexToken('X', matchTimestamp);
    addParseToken('X', function (input, array, config) {
        config._d = new Date(parseFloat(input, 10) * 1000);
    });
    addParseToken('x', function (input, array, config) {
        config._d = new Date(toInt(input));
    });

    // Side effect imports


    hooks.version = '2.24.0';

    setHookCallback(createLocal);

    hooks.fn                    = proto;
    hooks.min                   = min;
    hooks.max                   = max;
    hooks.now                   = now;
    hooks.utc                   = createUTC;
    hooks.unix                  = createUnix;
    hooks.months                = listMonths;
    hooks.isDate                = isDate;
    hooks.locale                = getSetGlobalLocale;
    hooks.invalid               = createInvalid;
    hooks.duration              = createDuration;
    hooks.isMoment              = isMoment;
    hooks.weekdays              = listWeekdays;
    hooks.parseZone             = createInZone;
    hooks.localeData            = getLocale;
    hooks.isDuration            = isDuration;
    hooks.monthsShort           = listMonthsShort;
    hooks.weekdaysMin           = listWeekdaysMin;
    hooks.defineLocale          = defineLocale;
    hooks.updateLocale          = updateLocale;
    hooks.locales               = listLocales;
    hooks.weekdaysShort         = listWeekdaysShort;
    hooks.normalizeUnits        = normalizeUnits;
    hooks.relativeTimeRounding  = getSetRelativeTimeRounding;
    hooks.relativeTimeThreshold = getSetRelativeTimeThreshold;
    hooks.calendarFormat        = getCalendarFormat;
    hooks.prototype             = proto;

    // currently HTML5 input type only supports 24-hour formats
    hooks.HTML5_FMT = {
        DATETIME_LOCAL: 'YYYY-MM-DDTHH:mm',             // <input type="datetime-local" />
        DATETIME_LOCAL_SECONDS: 'YYYY-MM-DDTHH:mm:ss',  // <input type="datetime-local" step="1" />
        DATETIME_LOCAL_MS: 'YYYY-MM-DDTHH:mm:ss.SSS',   // <input type="datetime-local" step="0.001" />
        DATE: 'YYYY-MM-DD',                             // <input type="date" />
        TIME: 'HH:mm',                                  // <input type="time" />
        TIME_SECONDS: 'HH:mm:ss',                       // <input type="time" step="1" />
        TIME_MS: 'HH:mm:ss.SSS',                        // <input type="time" step="0.001" />
        WEEK: 'GGGG-[W]WW',                             // <input type="week" />
        MONTH: 'YYYY-MM'                                // <input type="month" />
    };

    return hooks;

};
var satellitex = function ()
{
    var pi = Math.PI;
    var twoPi = pi * 2;
    var deg2rad = pi / 180.0;
    var rad2deg = 180 / pi;
    var minutesPerDay = 1440.0;
    var mu = 398600.5; // in km3 / s2

    var earthRadius = 6378.137; // in km

    var xke = 60.0 / Math.sqrt(earthRadius * earthRadius * earthRadius / mu);
    var vkmpersec = earthRadius * xke / 60.0;
    var tumin = 1.0 / xke;
    var j2 = 0.00108262998905;
    var j3 = -0.00000253215306;
    var j4 = -0.00000161098761;
    var j3oj2 = j3 / j2;
    var x2o3 = 2.0 / 3.0;

    var constants = /*#__PURE__*/Object.freeze({
        pi: pi,
        twoPi: twoPi,
        deg2rad: deg2rad,
        rad2deg: rad2deg,
        minutesPerDay: minutesPerDay,
        mu: mu,
        earthRadius: earthRadius,
        xke: xke,
        vkmpersec: vkmpersec,
        tumin: tumin,
        j2: j2,
        j3: j3,
        j4: j4,
        j3oj2: j3oj2,
        x2o3: x2o3
    });

    /* -----------------------------------------------------------------------------
         *
         *                           procedure days2mdhms
         *
         *  this procedure converts the day of the year, days, to the equivalent month
         *    day, hour, minute and second.
         *
         *  algorithm     : set up array for the number of days per month
         *                  find leap year - use 1900 because 2000 is a leap year
         *                  loop through a temp value while the value is < the days
         *                  perform int conversions to the correct day and month
         *                  convert remainder into h m s using type conversions
         *
         *  author        : david vallado                  719-573-2600    1 mar 2001
         *
         *  inputs          description                    range / units
         *    year        - year                           1900 .. 2100
         *    days        - julian day of the year         0.0  .. 366.0
         *
         *  outputs       :
         *    mon         - month                          1 .. 12
         *    day         - day                            1 .. 28,29,30,31
         *    hr          - hour                           0 .. 23
         *    min         - minute                         0 .. 59
         *    sec         - second                         0.0 .. 59.999
         *
         *  locals        :
         *    dayofyr     - day of year
         *    temp        - temporary extended values
         *    inttemp     - temporary int value
         *    i           - index
         *    lmonth[12]  - int array containing the number of days per month
         *
         *  coupling      :
         *    none.
         * --------------------------------------------------------------------------- */
    function days2mdhms(year, days) {
        var lmonth = [31, year % 4 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        var dayofyr = Math.floor(days); //  ----------------- find month and day of month ----------------

        var i = 1;
        var inttemp = 0;

        while (dayofyr > inttemp + lmonth[i - 1] && i < 12) {
            inttemp += lmonth[i - 1];
            i += 1;
        }

        var mon = i;
        var day = dayofyr - inttemp; //  ----------------- find hours minutes and seconds -------------

        var temp = (days - dayofyr) * 24.0;
        var hr = Math.floor(temp);
        temp = (temp - hr) * 60.0;
        var minute = Math.floor(temp);
        var sec = (temp - minute) * 60.0;
        return {
            mon: mon,
            day: day,
            hr: hr,
            minute: minute,
            sec: sec
        };
    }
    /* -----------------------------------------------------------------------------
         *
         *                           procedure jday
         *
         *  this procedure finds the julian date given the year, month, day, and time.
         *    the julian date is defined by each elapsed day since noon, jan 1, 4713 bc.
         *
         *  algorithm     : calculate the answer in one step for efficiency
         *
         *  author        : david vallado                  719-573-2600    1 mar 2001
         *
         *  inputs          description                    range / units
         *    year        - year                           1900 .. 2100
         *    mon         - month                          1 .. 12
         *    day         - day                            1 .. 28,29,30,31
         *    hr          - universal time hour            0 .. 23
         *    min         - universal time min             0 .. 59
         *    sec         - universal time sec             0.0 .. 59.999
         *
         *  outputs       :
         *    jd          - julian date                    days from 4713 bc
         *
         *  locals        :
         *    none.
         *
         *  coupling      :
         *    none.
         *
         *  references    :
         *    vallado       2007, 189, alg 14, ex 3-14
         *
         * --------------------------------------------------------------------------- */

    function jdayInternal(year, mon, day, hr, minute, sec) {
        var msec = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : 0;
        return 367.0 * year - Math.floor(7 * (year + Math.floor((mon + 9) / 12.0)) * 0.25) + Math.floor(275 * mon / 9.0) + day + 1721013.5 + ((msec / 60000 + sec / 60.0 + minute) / 60.0 + hr) / 24.0 // ut in days
            // # - 0.5*sgn(100.0*year + mon - 190002.5) + 0.5;
            ;
    }

    function jday(year, mon, day, hr, minute, sec, msec) {
        if (year instanceof Date) {
            var date = year;
            return jdayInternal(date.getUTCFullYear(), date.getUTCMonth() + 1, // Note, this function requires months in range 1-12.
                date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds());
        }

        return jdayInternal(year, mon, day, hr, minute, sec, msec);
    }
    /* -----------------------------------------------------------------------------
         *
         *                           procedure invjday
         *
         *  this procedure finds the year, month, day, hour, minute and second
         *  given the julian date. tu can be ut1, tdt, tdb, etc.
         *
         *  algorithm     : set up starting values
         *                  find leap year - use 1900 because 2000 is a leap year
         *                  find the elapsed days through the year in a loop
         *                  call routine to find each individual value
         *
         *  author        : david vallado                  719-573-2600    1 mar 2001
         *
         *  inputs          description                    range / units
         *    jd          - julian date                    days from 4713 bc
         *
         *  outputs       :
         *    year        - year                           1900 .. 2100
         *    mon         - month                          1 .. 12
         *    day         - day                            1 .. 28,29,30,31
         *    hr          - hour                           0 .. 23
         *    min         - minute                         0 .. 59
         *    sec         - second                         0.0 .. 59.999
         *
         *  locals        :
         *    days        - day of year plus fractional
         *                  portion of a day               days
         *    tu          - julian centuries from 0 h
         *                  jan 0, 1900
         *    temp        - temporary double values
         *    leapyrs     - number of leap years from 1900
         *
         *  coupling      :
         *    days2mdhms  - finds month, day, hour, minute and second given days and year
         *
         *  references    :
         *    vallado       2007, 208, alg 22, ex 3-13
         * --------------------------------------------------------------------------- */

    function invjday(jd, asArray) {
        // --------------- find year and days of the year -
        var temp = jd - 2415019.5;
        var tu = temp / 365.25;
        var year = 1900 + Math.floor(tu);
        var leapyrs = Math.floor((year - 1901) * 0.25); // optional nudge by 8.64x10-7 sec to get even outputs

        var days = temp - ((year - 1900) * 365.0 + leapyrs) + 0.00000000001; // ------------ check for case of beginning of a year -----------

        if (days < 1.0) {
            year -= 1;
            leapyrs = Math.floor((year - 1901) * 0.25);
            days = temp - ((year - 1900) * 365.0 + leapyrs);
        } // ----------------- find remaing data  -------------------------


        var mdhms = days2mdhms(year, days);
        var mon = mdhms.mon,
            day = mdhms.day,
            hr = mdhms.hr,
            minute = mdhms.minute;
        var sec = mdhms.sec - 0.00000086400;

        if (asArray) {
            return [year, mon, day, hr, minute, Math.floor(sec)];
        }

        return new Date(Date.UTC(year, mon - 1, day, hr, minute, Math.floor(sec)));
    }

    /* -----------------------------------------------------------------------------
         *
         *                           procedure dpper
         *
         *  this procedure provides deep space long period periodic contributions
         *    to the mean elements.  by design, these periodics are zero at epoch.
         *    this used to be dscom which included initialization, but it's really a
         *    recurring function.
         *
         *  author        : david vallado                  719-573-2600   28 jun 2005
         *
         *  inputs        :
         *    e3          -
         *    ee2         -
         *    peo         -
         *    pgho        -
         *    pho         -
         *    pinco       -
         *    plo         -
         *    se2 , se3 , sgh2, sgh3, sgh4, sh2, sh3, si2, si3, sl2, sl3, sl4 -
         *    t           -
         *    xh2, xh3, xi2, xi3, xl2, xl3, xl4 -
         *    zmol        -
         *    zmos        -
         *    ep          - eccentricity                           0.0 - 1.0
         *    inclo       - inclination - needed for lyddane modification
         *    nodep       - right ascension of ascending node
         *    argpp       - argument of perigee
         *    mp          - mean anomaly
         *
         *  outputs       :
         *    ep          - eccentricity                           0.0 - 1.0
         *    inclp       - inclination
         *    nodep        - right ascension of ascending node
         *    argpp       - argument of perigee
         *    mp          - mean anomaly
         *
         *  locals        :
         *    alfdp       -
         *    betdp       -
         *    cosip  , sinip  , cosop  , sinop  ,
         *    dalf        -
         *    dbet        -
         *    dls         -
         *    f2, f3      -
         *    pe          -
         *    pgh         -
         *    ph          -
         *    pinc        -
         *    pl          -
         *    sel   , ses   , sghl  , sghs  , shl   , shs   , sil   , sinzf , sis   ,
         *    sll   , sls
         *    xls         -
         *    xnoh        -
         *    zf          -
         *    zm          -
         *
         *  coupling      :
         *    none.
         *
         *  references    :
         *    hoots, roehrich, norad spacetrack report #3 1980
         *    hoots, norad spacetrack report #6 1986
         *    hoots, schumacher and glover 2004
         *    vallado, crawford, hujsak, kelso  2006
         ----------------------------------------------------------------------------*/

    function dpper(satrec, options) {
        var e3 = satrec.e3,
            ee2 = satrec.ee2,
            peo = satrec.peo,
            pgho = satrec.pgho,
            pho = satrec.pho,
            pinco = satrec.pinco,
            plo = satrec.plo,
            se2 = satrec.se2,
            se3 = satrec.se3,
            sgh2 = satrec.sgh2,
            sgh3 = satrec.sgh3,
            sgh4 = satrec.sgh4,
            sh2 = satrec.sh2,
            sh3 = satrec.sh3,
            si2 = satrec.si2,
            si3 = satrec.si3,
            sl2 = satrec.sl2,
            sl3 = satrec.sl3,
            sl4 = satrec.sl4,
            t = satrec.t,
            xgh2 = satrec.xgh2,
            xgh3 = satrec.xgh3,
            xgh4 = satrec.xgh4,
            xh2 = satrec.xh2,
            xh3 = satrec.xh3,
            xi2 = satrec.xi2,
            xi3 = satrec.xi3,
            xl2 = satrec.xl2,
            xl3 = satrec.xl3,
            xl4 = satrec.xl4,
            zmol = satrec.zmol,
            zmos = satrec.zmos;
        var init = options.init,
            opsmode = options.opsmode;
        var ep = options.ep,
            inclp = options.inclp,
            nodep = options.nodep,
            argpp = options.argpp,
            mp = options.mp; // Copy satellite attributes into local variables for convenience
        // and symmetry in writing formulae.

        var alfdp;
        var betdp;
        var cosip;
        var sinip;
        var cosop;
        var sinop;
        var dalf;
        var dbet;
        var dls;
        var f2;
        var f3;
        var pe;
        var pgh;
        var ph;
        var pinc;
        var pl;
        var sinzf;
        var xls;
        var xnoh;
        var zf;
        var zm; //  ---------------------- constants -----------------------------

        var zns = 1.19459e-5;
        var zes = 0.01675;
        var znl = 1.5835218e-4;
        var zel = 0.05490; //  --------------- calculate time varying periodics -----------

        zm = zmos + zns * t; // be sure that the initial call has time set to zero

        if (init === 'y') {
            zm = zmos;
        }

        zf = zm + 2.0 * zes * Math.sin(zm);
        sinzf = Math.sin(zf);
        f2 = 0.5 * sinzf * sinzf - 0.25;
        f3 = -0.5 * sinzf * Math.cos(zf);
        var ses = se2 * f2 + se3 * f3;
        var sis = si2 * f2 + si3 * f3;
        var sls = sl2 * f2 + sl3 * f3 + sl4 * sinzf;
        var sghs = sgh2 * f2 + sgh3 * f3 + sgh4 * sinzf;
        var shs = sh2 * f2 + sh3 * f3;
        zm = zmol + znl * t;

        if (init === 'y') {
            zm = zmol;
        }

        zf = zm + 2.0 * zel * Math.sin(zm);
        sinzf = Math.sin(zf);
        f2 = 0.5 * sinzf * sinzf - 0.25;
        f3 = -0.5 * sinzf * Math.cos(zf);
        var sel = ee2 * f2 + e3 * f3;
        var sil = xi2 * f2 + xi3 * f3;
        var sll = xl2 * f2 + xl3 * f3 + xl4 * sinzf;
        var sghl = xgh2 * f2 + xgh3 * f3 + xgh4 * sinzf;
        var shll = xh2 * f2 + xh3 * f3;
        pe = ses + sel;
        pinc = sis + sil;
        pl = sls + sll;
        pgh = sghs + sghl;
        ph = shs + shll;

        if (init === 'n') {
            pe -= peo;
            pinc -= pinco;
            pl -= plo;
            pgh -= pgho;
            ph -= pho;
            inclp += pinc;
            ep += pe;
            sinip = Math.sin(inclp);
            cosip = Math.cos(inclp);
            /* ----------------- apply periodics directly ------------ */
            // sgp4fix for lyddane choice
            // strn3 used original inclination - this is technically feasible
            // gsfc used perturbed inclination - also technically feasible
            // probably best to readjust the 0.2 limit value and limit discontinuity
            // 0.2 rad = 11.45916 deg
            // use next line for original strn3 approach and original inclination
            // if (inclo >= 0.2)
            // use next line for gsfc version and perturbed inclination

            if (inclp >= 0.2) {
                ph /= sinip;
                pgh -= cosip * ph;
                argpp += pgh;
                nodep += ph;
                mp += pl;
            } else {
                //  ---- apply periodics with lyddane modification ----
                sinop = Math.sin(nodep);
                cosop = Math.cos(nodep);
                alfdp = sinip * sinop;
                betdp = sinip * cosop;
                dalf = ph * cosop + pinc * cosip * sinop;
                dbet = -ph * sinop + pinc * cosip * cosop;
                alfdp += dalf;
                betdp += dbet;
                nodep %= twoPi; //  sgp4fix for afspc written intrinsic functions
                //  nodep used without a trigonometric function ahead

                if (nodep < 0.0 && opsmode === 'a') {
                    nodep += twoPi;
                }

                xls = mp + argpp + cosip * nodep;
                dls = pl + pgh - pinc * nodep * sinip;
                xls += dls;
                xnoh = nodep;
                nodep = Math.atan2(alfdp, betdp); //  sgp4fix for afspc written intrinsic functions
                //  nodep used without a trigonometric function ahead

                if (nodep < 0.0 && opsmode === 'a') {
                    nodep += twoPi;
                }

                if (Math.abs(xnoh - nodep) > pi) {
                    if (nodep < xnoh) {
                        nodep += twoPi;
                    } else {
                        nodep -= twoPi;
                    }
                }

                mp += pl;
                argpp = xls - mp - cosip * nodep;
            }
        }

        return {
            ep: ep,
            inclp: inclp,
            nodep: nodep,
            argpp: argpp,
            mp: mp
        };
    }

    /*-----------------------------------------------------------------------------
         *
         *                           procedure dscom
         *
         *  this procedure provides deep space common items used by both the secular
         *    and periodics subroutines.  input is provided as shown. this routine
         *    used to be called dpper, but the functions inside weren't well organized.
         *
         *  author        : david vallado                  719-573-2600   28 jun 2005
         *
         *  inputs        :
         *    epoch       -
         *    ep          - eccentricity
         *    argpp       - argument of perigee
         *    tc          -
         *    inclp       - inclination
         *    nodep       - right ascension of ascending node
         *    np          - mean motion
         *
         *  outputs       :
         *    sinim  , cosim  , sinomm , cosomm , snodm  , cnodm
         *    day         -
         *    e3          -
         *    ee2         -
         *    em          - eccentricity
         *    emsq        - eccentricity squared
         *    gam         -
         *    peo         -
         *    pgho        -
         *    pho         -
         *    pinco       -
         *    plo         -
         *    rtemsq      -
         *    se2, se3         -
         *    sgh2, sgh3, sgh4        -
         *    sh2, sh3, si2, si3, sl2, sl3, sl4         -
         *    s1, s2, s3, s4, s5, s6, s7          -
         *    ss1, ss2, ss3, ss4, ss5, ss6, ss7, sz1, sz2, sz3         -
         *    sz11, sz12, sz13, sz21, sz22, sz23, sz31, sz32, sz33        -
         *    xgh2, xgh3, xgh4, xh2, xh3, xi2, xi3, xl2, xl3, xl4         -
         *    nm          - mean motion
         *    z1, z2, z3, z11, z12, z13, z21, z22, z23, z31, z32, z33         -
         *    zmol        -
         *    zmos        -
         *
         *  locals        :
         *    a1, a2, a3, a4, a5, a6, a7, a8, a9, a10         -
         *    betasq      -
         *    cc          -
         *    ctem, stem        -
         *    x1, x2, x3, x4, x5, x6, x7, x8          -
         *    xnodce      -
         *    xnoi        -
         *    zcosg  , zsing  , zcosgl , zsingl , zcosh  , zsinh  , zcoshl , zsinhl ,
         *    zcosi  , zsini  , zcosil , zsinil ,
         *    zx          -
         *    zy          -
         *
         *  coupling      :
         *    none.
         *
         *  references    :
         *    hoots, roehrich, norad spacetrack report #3 1980
         *    hoots, norad spacetrack report #6 1986
         *    hoots, schumacher and glover 2004
         *    vallado, crawford, hujsak, kelso  2006
         ----------------------------------------------------------------------------*/

    function dscom(options) {
        var epoch = options.epoch,
            ep = options.ep,
            argpp = options.argpp,
            tc = options.tc,
            inclp = options.inclp,
            nodep = options.nodep,
            np = options.np;
        var a1;
        var a2;
        var a3;
        var a4;
        var a5;
        var a6;
        var a7;
        var a8;
        var a9;
        var a10;
        var cc;
        var x1;
        var x2;
        var x3;
        var x4;
        var x5;
        var x6;
        var x7;
        var x8;
        var zcosg;
        var zsing;
        var zcosh;
        var zsinh;
        var zcosi;
        var zsini;
        var ss1;
        var ss2;
        var ss3;
        var ss4;
        var ss5;
        var ss6;
        var ss7;
        var sz1;
        var sz2;
        var sz3;
        var sz11;
        var sz12;
        var sz13;
        var sz21;
        var sz22;
        var sz23;
        var sz31;
        var sz32;
        var sz33;
        var s1;
        var s2;
        var s3;
        var s4;
        var s5;
        var s6;
        var s7;
        var z1;
        var z2;
        var z3;
        var z11;
        var z12;
        var z13;
        var z21;
        var z22;
        var z23;
        var z31;
        var z32;
        var z33; // -------------------------- constants -------------------------

        var zes = 0.01675;
        var zel = 0.05490;
        var c1ss = 2.9864797e-6;
        var c1l = 4.7968065e-7;
        var zsinis = 0.39785416;
        var zcosis = 0.91744867;
        var zcosgs = 0.1945905;
        var zsings = -0.98088458; //  --------------------- local variables ------------------------

        var nm = np;
        var em = ep;
        var snodm = Math.sin(nodep);
        var cnodm = Math.cos(nodep);
        var sinomm = Math.sin(argpp);
        var cosomm = Math.cos(argpp);
        var sinim = Math.sin(inclp);
        var cosim = Math.cos(inclp);
        var emsq = em * em;
        var betasq = 1.0 - emsq;
        var rtemsq = Math.sqrt(betasq); //  ----------------- initialize lunar solar terms ---------------

        var peo = 0.0;
        var pinco = 0.0;
        var plo = 0.0;
        var pgho = 0.0;
        var pho = 0.0;
        var day = epoch + 18261.5 + tc / 1440.0;
        var xnodce = (4.5236020 - 9.2422029e-4 * day) % twoPi;
        var stem = Math.sin(xnodce);
        var ctem = Math.cos(xnodce);
        var zcosil = 0.91375164 - 0.03568096 * ctem;
        var zsinil = Math.sqrt(1.0 - zcosil * zcosil);
        var zsinhl = 0.089683511 * stem / zsinil;
        var zcoshl = Math.sqrt(1.0 - zsinhl * zsinhl);
        var gam = 5.8351514 + 0.0019443680 * day;
        var zx = 0.39785416 * stem / zsinil;
        var zy = zcoshl * ctem + 0.91744867 * zsinhl * stem;
        zx = Math.atan2(zx, zy);
        zx += gam - xnodce;
        var zcosgl = Math.cos(zx);
        var zsingl = Math.sin(zx); //  ------------------------- do solar terms ---------------------

        zcosg = zcosgs;
        zsing = zsings;
        zcosi = zcosis;
        zsini = zsinis;
        zcosh = cnodm;
        zsinh = snodm;
        cc = c1ss;
        var xnoi = 1.0 / nm;
        var lsflg = 0;

        while (lsflg < 2) {
            lsflg += 1;
            a1 = zcosg * zcosh + zsing * zcosi * zsinh;
            a3 = -zsing * zcosh + zcosg * zcosi * zsinh;
            a7 = -zcosg * zsinh + zsing * zcosi * zcosh;
            a8 = zsing * zsini;
            a9 = zsing * zsinh + zcosg * zcosi * zcosh;
            a10 = zcosg * zsini;
            a2 = cosim * a7 + sinim * a8;
            a4 = cosim * a9 + sinim * a10;
            a5 = -sinim * a7 + cosim * a8;
            a6 = -sinim * a9 + cosim * a10;
            x1 = a1 * cosomm + a2 * sinomm;
            x2 = a3 * cosomm + a4 * sinomm;
            x3 = -a1 * sinomm + a2 * cosomm;
            x4 = -a3 * sinomm + a4 * cosomm;
            x5 = a5 * sinomm;
            x6 = a6 * sinomm;
            x7 = a5 * cosomm;
            x8 = a6 * cosomm;
            z31 = 12.0 * x1 * x1 - 3.0 * x3 * x3;
            z32 = 24.0 * x1 * x2 - 6.0 * x3 * x4;
            z33 = 12.0 * x2 * x2 - 3.0 * x4 * x4;
            z1 = 3.0 * (a1 * a1 + a2 * a2) + z31 * emsq;
            z2 = 6.0 * (a1 * a3 + a2 * a4) + z32 * emsq;
            z3 = 3.0 * (a3 * a3 + a4 * a4) + z33 * emsq;
            z11 = -6.0 * a1 * a5 + emsq * (-24.0 * x1 * x7 - 6.0 * x3 * x5);
            z12 = -6.0 * (a1 * a6 + a3 * a5) + emsq * (-24.0 * (x2 * x7 + x1 * x8) + -6.0 * (x3 * x6 + x4 * x5));
            z13 = -6.0 * a3 * a6 + emsq * (-24.0 * x2 * x8 - 6.0 * x4 * x6);
            z21 = 6.0 * a2 * a5 + emsq * (24.0 * x1 * x5 - 6.0 * x3 * x7);
            z22 = 6.0 * (a4 * a5 + a2 * a6) + emsq * (24.0 * (x2 * x5 + x1 * x6) - 6.0 * (x4 * x7 + x3 * x8));
            z23 = 6.0 * a4 * a6 + emsq * (24.0 * x2 * x6 - 6.0 * x4 * x8);
            z1 = z1 + z1 + betasq * z31;
            z2 = z2 + z2 + betasq * z32;
            z3 = z3 + z3 + betasq * z33;
            s3 = cc * xnoi;
            s2 = -0.5 * s3 / rtemsq;
            s4 = s3 * rtemsq;
            s1 = -15.0 * em * s4;
            s5 = x1 * x3 + x2 * x4;
            s6 = x2 * x3 + x1 * x4;
            s7 = x2 * x4 - x1 * x3; //  ----------------------- do lunar terms -------------------

            if (lsflg === 1) {
                ss1 = s1;
                ss2 = s2;
                ss3 = s3;
                ss4 = s4;
                ss5 = s5;
                ss6 = s6;
                ss7 = s7;
                sz1 = z1;
                sz2 = z2;
                sz3 = z3;
                sz11 = z11;
                sz12 = z12;
                sz13 = z13;
                sz21 = z21;
                sz22 = z22;
                sz23 = z23;
                sz31 = z31;
                sz32 = z32;
                sz33 = z33;
                zcosg = zcosgl;
                zsing = zsingl;
                zcosi = zcosil;
                zsini = zsinil;
                zcosh = zcoshl * cnodm + zsinhl * snodm;
                zsinh = snodm * zcoshl - cnodm * zsinhl;
                cc = c1l;
            }
        }

        var zmol = (4.7199672 + (0.22997150 * day - gam)) % twoPi;
        var zmos = (6.2565837 + 0.017201977 * day) % twoPi; //  ------------------------ do solar terms ----------------------

        var se2 = 2.0 * ss1 * ss6;
        var se3 = 2.0 * ss1 * ss7;
        var si2 = 2.0 * ss2 * sz12;
        var si3 = 2.0 * ss2 * (sz13 - sz11);
        var sl2 = -2.0 * ss3 * sz2;
        var sl3 = -2.0 * ss3 * (sz3 - sz1);
        var sl4 = -2.0 * ss3 * (-21.0 - 9.0 * emsq) * zes;
        var sgh2 = 2.0 * ss4 * sz32;
        var sgh3 = 2.0 * ss4 * (sz33 - sz31);
        var sgh4 = -18.0 * ss4 * zes;
        var sh2 = -2.0 * ss2 * sz22;
        var sh3 = -2.0 * ss2 * (sz23 - sz21); //  ------------------------ do lunar terms ----------------------

        var ee2 = 2.0 * s1 * s6;
        var e3 = 2.0 * s1 * s7;
        var xi2 = 2.0 * s2 * z12;
        var xi3 = 2.0 * s2 * (z13 - z11);
        var xl2 = -2.0 * s3 * z2;
        var xl3 = -2.0 * s3 * (z3 - z1);
        var xl4 = -2.0 * s3 * (-21.0 - 9.0 * emsq) * zel;
        var xgh2 = 2.0 * s4 * z32;
        var xgh3 = 2.0 * s4 * (z33 - z31);
        var xgh4 = -18.0 * s4 * zel;
        var xh2 = -2.0 * s2 * z22;
        var xh3 = -2.0 * s2 * (z23 - z21);
        return {
            snodm: snodm,
            cnodm: cnodm,
            sinim: sinim,
            cosim: cosim,
            sinomm: sinomm,
            cosomm: cosomm,
            day: day,
            e3: e3,
            ee2: ee2,
            em: em,
            emsq: emsq,
            gam: gam,
            peo: peo,
            pgho: pgho,
            pho: pho,
            pinco: pinco,
            plo: plo,
            rtemsq: rtemsq,
            se2: se2,
            se3: se3,
            sgh2: sgh2,
            sgh3: sgh3,
            sgh4: sgh4,
            sh2: sh2,
            sh3: sh3,
            si2: si2,
            si3: si3,
            sl2: sl2,
            sl3: sl3,
            sl4: sl4,
            s1: s1,
            s2: s2,
            s3: s3,
            s4: s4,
            s5: s5,
            s6: s6,
            s7: s7,
            ss1: ss1,
            ss2: ss2,
            ss3: ss3,
            ss4: ss4,
            ss5: ss5,
            ss6: ss6,
            ss7: ss7,
            sz1: sz1,
            sz2: sz2,
            sz3: sz3,
            sz11: sz11,
            sz12: sz12,
            sz13: sz13,
            sz21: sz21,
            sz22: sz22,
            sz23: sz23,
            sz31: sz31,
            sz32: sz32,
            sz33: sz33,
            xgh2: xgh2,
            xgh3: xgh3,
            xgh4: xgh4,
            xh2: xh2,
            xh3: xh3,
            xi2: xi2,
            xi3: xi3,
            xl2: xl2,
            xl3: xl3,
            xl4: xl4,
            nm: nm,
            z1: z1,
            z2: z2,
            z3: z3,
            z11: z11,
            z12: z12,
            z13: z13,
            z21: z21,
            z22: z22,
            z23: z23,
            z31: z31,
            z32: z32,
            z33: z33,
            zmol: zmol,
            zmos: zmos
        };
    }

    /*-----------------------------------------------------------------------------
         *
         *                           procedure dsinit
         *
         *  this procedure provides deep space contributions to mean motion dot due
         *    to geopotential resonance with half day and one day orbits.
         *
         *  author        : david vallado                  719-573-2600   28 jun 2005
         *
         *  inputs        :
         *    cosim, sinim-
         *    emsq        - eccentricity squared
         *    argpo       - argument of perigee
         *    s1, s2, s3, s4, s5      -
         *    ss1, ss2, ss3, ss4, ss5 -
         *    sz1, sz3, sz11, sz13, sz21, sz23, sz31, sz33 -
         *    t           - time
         *    tc          -
         *    gsto        - greenwich sidereal time                   rad
         *    mo          - mean anomaly
         *    mdot        - mean anomaly dot (rate)
         *    no          - mean motion
         *    nodeo       - right ascension of ascending node
         *    nodedot     - right ascension of ascending node dot (rate)
         *    xpidot      -
         *    z1, z3, z11, z13, z21, z23, z31, z33 -
         *    eccm        - eccentricity
         *    argpm       - argument of perigee
         *    inclm       - inclination
         *    mm          - mean anomaly
         *    xn          - mean motion
         *    nodem       - right ascension of ascending node
         *
         *  outputs       :
         *    em          - eccentricity
         *    argpm       - argument of perigee
         *    inclm       - inclination
         *    mm          - mean anomaly
         *    nm          - mean motion
         *    nodem       - right ascension of ascending node
         *    irez        - flag for resonance           0-none, 1-one day, 2-half day
         *    atime       -
         *    d2201, d2211, d3210, d3222, d4410, d4422, d5220, d5232, d5421, d5433    -
         *    dedt        -
         *    didt        -
         *    dmdt        -
         *    dndt        -
         *    dnodt       -
         *    domdt       -
         *    del1, del2, del3        -
         *    ses  , sghl , sghs , sgs  , shl  , shs  , sis  , sls
         *    theta       -
         *    xfact       -
         *    xlamo       -
         *    xli         -
         *    xni
         *
         *  locals        :
         *    ainv2       -
         *    aonv        -
         *    cosisq      -
         *    eoc         -
         *    f220, f221, f311, f321, f322, f330, f441, f442, f522, f523, f542, f543  -
         *    g200, g201, g211, g300, g310, g322, g410, g422, g520, g521, g532, g533  -
         *    sini2       -
         *    temp        -
         *    temp1       -
         *    theta       -
         *    xno2        -
         *
         *  coupling      :
         *    getgravconst
         *
         *  references    :
         *    hoots, roehrich, norad spacetrack report #3 1980
         *    hoots, norad spacetrack report #6 1986
         *    hoots, schumacher and glover 2004
         *    vallado, crawford, hujsak, kelso  2006
         ----------------------------------------------------------------------------*/

    function dsinit(options) {
        var cosim = options.cosim,
            argpo = options.argpo,
            s1 = options.s1,
            s2 = options.s2,
            s3 = options.s3,
            s4 = options.s4,
            s5 = options.s5,
            sinim = options.sinim,
            ss1 = options.ss1,
            ss2 = options.ss2,
            ss3 = options.ss3,
            ss4 = options.ss4,
            ss5 = options.ss5,
            sz1 = options.sz1,
            sz3 = options.sz3,
            sz11 = options.sz11,
            sz13 = options.sz13,
            sz21 = options.sz21,
            sz23 = options.sz23,
            sz31 = options.sz31,
            sz33 = options.sz33,
            t = options.t,
            tc = options.tc,
            gsto = options.gsto,
            mo = options.mo,
            mdot = options.mdot,
            no = options.no,
            nodeo = options.nodeo,
            nodedot = options.nodedot,
            xpidot = options.xpidot,
            z1 = options.z1,
            z3 = options.z3,
            z11 = options.z11,
            z13 = options.z13,
            z21 = options.z21,
            z23 = options.z23,
            z31 = options.z31,
            z33 = options.z33,
            ecco = options.ecco,
            eccsq = options.eccsq;
        var emsq = options.emsq,
            em = options.em,
            argpm = options.argpm,
            inclm = options.inclm,
            mm = options.mm,
            nm = options.nm,
            nodem = options.nodem,
            irez = options.irez,
            atime = options.atime,
            d2201 = options.d2201,
            d2211 = options.d2211,
            d3210 = options.d3210,
            d3222 = options.d3222,
            d4410 = options.d4410,
            d4422 = options.d4422,
            d5220 = options.d5220,
            d5232 = options.d5232,
            d5421 = options.d5421,
            d5433 = options.d5433,
            dedt = options.dedt,
            didt = options.didt,
            dmdt = options.dmdt,
            dnodt = options.dnodt,
            domdt = options.domdt,
            del1 = options.del1,
            del2 = options.del2,
            del3 = options.del3,
            xfact = options.xfact,
            xlamo = options.xlamo,
            xli = options.xli,
            xni = options.xni;
        var f220;
        var f221;
        var f311;
        var f321;
        var f322;
        var f330;
        var f441;
        var f442;
        var f522;
        var f523;
        var f542;
        var f543;
        var g200;
        var g201;
        var g211;
        var g300;
        var g310;
        var g322;
        var g410;
        var g422;
        var g520;
        var g521;
        var g532;
        var g533;
        var sini2;
        var temp;
        var temp1;
        var xno2;
        var ainv2;
        var aonv;
        var cosisq;
        var eoc;
        var q22 = 1.7891679e-6;
        var q31 = 2.1460748e-6;
        var q33 = 2.2123015e-7;
        var root22 = 1.7891679e-6;
        var root44 = 7.3636953e-9;
        var root54 = 2.1765803e-9;
        var rptim = 4.37526908801129966e-3; // equates to 7.29211514668855e-5 rad/sec

        var root32 = 3.7393792e-7;
        var root52 = 1.1428639e-7;
        var znl = 1.5835218e-4;
        var zns = 1.19459e-5; // -------------------- deep space initialization ------------

        irez = 0;

        if (nm < 0.0052359877 && nm > 0.0034906585) {
            irez = 1;
        }

        if (nm >= 8.26e-3 && nm <= 9.24e-3 && em >= 0.5) {
            irez = 2;
        } // ------------------------ do solar terms -------------------


        var ses = ss1 * zns * ss5;
        var sis = ss2 * zns * (sz11 + sz13);
        var sls = -zns * ss3 * (sz1 + sz3 - 14.0 - 6.0 * emsq);
        var sghs = ss4 * zns * (sz31 + sz33 - 6.0);
        var shs = -zns * ss2 * (sz21 + sz23); // sgp4fix for 180 deg incl

        if (inclm < 5.2359877e-2 || inclm > pi - 5.2359877e-2) {
            shs = 0.0;
        }

        if (sinim !== 0.0) {
            shs /= sinim;
        }

        var sgs = sghs - cosim * shs; // ------------------------- do lunar terms ------------------

        dedt = ses + s1 * znl * s5;
        didt = sis + s2 * znl * (z11 + z13);
        dmdt = sls - znl * s3 * (z1 + z3 - 14.0 - 6.0 * emsq);
        var sghl = s4 * znl * (z31 + z33 - 6.0);
        var shll = -znl * s2 * (z21 + z23); // sgp4fix for 180 deg incl

        if (inclm < 5.2359877e-2 || inclm > pi - 5.2359877e-2) {
            shll = 0.0;
        }

        domdt = sgs + sghl;
        dnodt = shs;

        if (sinim !== 0.0) {
            domdt -= cosim / sinim * shll;
            dnodt += shll / sinim;
        } // ----------- calculate deep space resonance effects --------


        var dndt = 0.0;
        var theta = (gsto + tc * rptim) % twoPi;
        em += dedt * t;
        inclm += didt * t;
        argpm += domdt * t;
        nodem += dnodt * t;
        mm += dmdt * t; // sgp4fix for negative inclinations
        // the following if statement should be commented out
        // if (inclm < 0.0)
        // {
        //   inclm  = -inclm;
        //   argpm  = argpm - pi;
        //   nodem = nodem + pi;
        // }
        // -------------- initialize the resonance terms -------------

        if (irez !== 0) {
            aonv = Math.pow(nm / xke, x2o3); // ---------- geopotential resonance for 12 hour orbits ------

            if (irez === 2) {
                cosisq = cosim * cosim;
                var emo = em;
                em = ecco;
                var emsqo = emsq;
                emsq = eccsq;
                eoc = em * emsq;
                g201 = -0.306 - (em - 0.64) * 0.440;

                if (em <= 0.65) {
                    g211 = 3.616 - 13.2470 * em + 16.2900 * emsq;
                    g310 = -19.302 + 117.3900 * em - 228.4190 * emsq + 156.5910 * eoc;
                    g322 = -18.9068 + 109.7927 * em - 214.6334 * emsq + 146.5816 * eoc;
                    g410 = -41.122 + 242.6940 * em - 471.0940 * emsq + 313.9530 * eoc;
                    g422 = -146.407 + 841.8800 * em - 1629.014 * emsq + 1083.4350 * eoc;
                    g520 = -532.114 + 3017.977 * em - 5740.032 * emsq + 3708.2760 * eoc;
                } else {
                    g211 = -72.099 + 331.819 * em - 508.738 * emsq + 266.724 * eoc;
                    g310 = -346.844 + 1582.851 * em - 2415.925 * emsq + 1246.113 * eoc;
                    g322 = -342.585 + 1554.908 * em - 2366.899 * emsq + 1215.972 * eoc;
                    g410 = -1052.797 + 4758.686 * em - 7193.992 * emsq + 3651.957 * eoc;
                    g422 = -3581.690 + 16178.110 * em - 24462.770 * emsq + 12422.520 * eoc;

                    if (em > 0.715) {
                        g520 = -5149.66 + 29936.92 * em - 54087.36 * emsq + 31324.56 * eoc;
                    } else {
                        g520 = 1464.74 - 4664.75 * em + 3763.64 * emsq;
                    }
                }

                if (em < 0.7) {
                    g533 = -919.22770 + 4988.6100 * em - 9064.7700 * emsq + 5542.21 * eoc;
                    g521 = -822.71072 + 4568.6173 * em - 8491.4146 * emsq + 5337.524 * eoc;
                    g532 = -853.66600 + 4690.2500 * em - 8624.7700 * emsq + 5341.4 * eoc;
                } else {
                    g533 = -37995.780 + 161616.52 * em - 229838.20 * emsq + 109377.94 * eoc;
                    g521 = -51752.104 + 218913.95 * em - 309468.16 * emsq + 146349.42 * eoc;
                    g532 = -40023.880 + 170470.89 * em - 242699.48 * emsq + 115605.82 * eoc;
                }

                sini2 = sinim * sinim;
                f220 = 0.75 * (1.0 + 2.0 * cosim + cosisq);
                f221 = 1.5 * sini2;
                f321 = 1.875 * sinim * (1.0 - 2.0 * cosim - 3.0 * cosisq);
                f322 = -1.875 * sinim * (1.0 + 2.0 * cosim - 3.0 * cosisq);
                f441 = 35.0 * sini2 * f220;
                f442 = 39.3750 * sini2 * sini2;
                f522 = 9.84375 * sinim * (sini2 * (1.0 - 2.0 * cosim - 5.0 * cosisq) + 0.33333333 * (-2.0 + 4.0 * cosim + 6.0 * cosisq));
                f523 = sinim * (4.92187512 * sini2 * (-2.0 - 4.0 * cosim + 10.0 * cosisq) + 6.56250012 * (1.0 + 2.0 * cosim - 3.0 * cosisq));
                f542 = 29.53125 * sinim * (2.0 - 8.0 * cosim + cosisq * (-12.0 + 8.0 * cosim + 10.0 * cosisq));
                f543 = 29.53125 * sinim * (-2.0 - 8.0 * cosim + cosisq * (12.0 + 8.0 * cosim - 10.0 * cosisq));
                xno2 = nm * nm;
                ainv2 = aonv * aonv;
                temp1 = 3.0 * xno2 * ainv2;
                temp = temp1 * root22;
                d2201 = temp * f220 * g201;
                d2211 = temp * f221 * g211;
                temp1 *= aonv;
                temp = temp1 * root32;
                d3210 = temp * f321 * g310;
                d3222 = temp * f322 * g322;
                temp1 *= aonv;
                temp = 2.0 * temp1 * root44;
                d4410 = temp * f441 * g410;
                d4422 = temp * f442 * g422;
                temp1 *= aonv;
                temp = temp1 * root52;
                d5220 = temp * f522 * g520;
                d5232 = temp * f523 * g532;
                temp = 2.0 * temp1 * root54;
                d5421 = temp * f542 * g521;
                d5433 = temp * f543 * g533;
                xlamo = (mo + nodeo + nodeo - (theta + theta)) % twoPi;
                xfact = mdot + dmdt + 2.0 * (nodedot + dnodt - rptim) - no;
                em = emo;
                emsq = emsqo;
            } //  ---------------- synchronous resonance terms --------------


            if (irez === 1) {
                g200 = 1.0 + emsq * (-2.5 + 0.8125 * emsq);
                g310 = 1.0 + 2.0 * emsq;
                g300 = 1.0 + emsq * (-6.0 + 6.60937 * emsq);
                f220 = 0.75 * (1.0 + cosim) * (1.0 + cosim);
                f311 = 0.9375 * sinim * sinim * (1.0 + 3.0 * cosim) - 0.75 * (1.0 + cosim);
                f330 = 1.0 + cosim;
                f330 *= 1.875 * f330 * f330;
                del1 = 3.0 * nm * nm * aonv * aonv;
                del2 = 2.0 * del1 * f220 * g200 * q22;
                del3 = 3.0 * del1 * f330 * g300 * q33 * aonv;
                del1 = del1 * f311 * g310 * q31 * aonv;
                xlamo = (mo + nodeo + argpo - theta) % twoPi;
                xfact = mdot + xpidot + dmdt + domdt + dnodt - (no + rptim);
            } //  ------------ for sgp4, initialize the integrator ----------


            xli = xlamo;
            xni = no;
            atime = 0.0;
            nm = no + dndt;
        }

        return {
            em: em,
            argpm: argpm,
            inclm: inclm,
            mm: mm,
            nm: nm,
            nodem: nodem,
            irez: irez,
            atime: atime,
            d2201: d2201,
            d2211: d2211,
            d3210: d3210,
            d3222: d3222,
            d4410: d4410,
            d4422: d4422,
            d5220: d5220,
            d5232: d5232,
            d5421: d5421,
            d5433: d5433,
            dedt: dedt,
            didt: didt,
            dmdt: dmdt,
            dndt: dndt,
            dnodt: dnodt,
            domdt: domdt,
            del1: del1,
            del2: del2,
            del3: del3,
            xfact: xfact,
            xlamo: xlamo,
            xli: xli,
            xni: xni
        };
    }

    /* -----------------------------------------------------------------------------
         *
         *                           function gstime
         *
         *  this function finds the greenwich sidereal time.
         *
         *  author        : david vallado                  719-573-2600    1 mar 2001
         *
         *  inputs          description                    range / units
         *    jdut1       - julian date in ut1             days from 4713 bc
         *
         *  outputs       :
         *    gstime      - greenwich sidereal time        0 to 2pi rad
         *
         *  locals        :
         *    temp        - temporary variable for doubles   rad
         *    tut1        - julian centuries from the
         *                  jan 1, 2000 12 h epoch (ut1)
         *
         *  coupling      :
         *    none
         *
         *  references    :
         *    vallado       2004, 191, eq 3-45
         * --------------------------------------------------------------------------- */

    function gstimeInternal(jdut1) {
        var tut1 = (jdut1 - 2451545.0) / 36525.0;
        var temp = -6.2e-6 * tut1 * tut1 * tut1 + 0.093104 * tut1 * tut1 + (876600.0 * 3600 + 8640184.812866) * tut1 + 67310.54841; // # sec

        temp = temp * deg2rad / 240.0 % twoPi; // 360/86400 = 1/240, to deg, to rad
        //  ------------------------ check quadrants ---------------------

        if (temp < 0.0) {
            temp += twoPi;
        }

        return temp;
    }

    function gstime() {
        if ((arguments.length <= 0 ? undefined : arguments[0]) instanceof Date || arguments.length > 1) {
            return gstimeInternal(jday.apply(void 0, arguments));
        }

        return gstimeInternal.apply(void 0, arguments);
    }

    /*-----------------------------------------------------------------------------
         *
         *                           procedure initl
         *
         *  this procedure initializes the sgp4 propagator. all the initialization is
         *    consolidated here instead of having multiple loops inside other routines.
         *
         *  author        : david vallado                  719-573-2600   28 jun 2005
         *
         *  inputs        :
         *    ecco        - eccentricity                           0.0 - 1.0
         *    epoch       - epoch time in days from jan 0, 1950. 0 hr
         *    inclo       - inclination of satellite
         *    no          - mean motion of satellite
         *    satn        - satellite number
         *
         *  outputs       :
         *    ainv        - 1.0 / a
         *    ao          - semi major axis
         *    con41       -
         *    con42       - 1.0 - 5.0 cos(i)
         *    cosio       - cosine of inclination
         *    cosio2      - cosio squared
         *    eccsq       - eccentricity squared
         *    method      - flag for deep space                    'd', 'n'
         *    omeosq      - 1.0 - ecco * ecco
         *    posq        - semi-parameter squared
         *    rp          - radius of perigee
         *    rteosq      - square root of (1.0 - ecco*ecco)
         *    sinio       - sine of inclination
         *    gsto        - gst at time of observation               rad
         *    no          - mean motion of satellite
         *
         *  locals        :
         *    ak          -
         *    d1          -
         *    del         -
         *    adel        -
         *    po          -
         *
         *  coupling      :
         *    getgravconst
         *    gstime      - find greenwich sidereal time from the julian date
         *
         *  references    :
         *    hoots, roehrich, norad spacetrack report #3 1980
         *    hoots, norad spacetrack report #6 1986
         *    hoots, schumacher and glover 2004
         *    vallado, crawford, hujsak, kelso  2006
         ----------------------------------------------------------------------------*/

    function initl(options) {
        var ecco = options.ecco,
            epoch = options.epoch,
            inclo = options.inclo,
            opsmode = options.opsmode;
        var no = options.no; // sgp4fix use old way of finding gst
        // ----------------------- earth constants ---------------------
        // sgp4fix identify constants and allow alternate values
        // ------------- calculate auxillary epoch quantities ----------

        var eccsq = ecco * ecco;
        var omeosq = 1.0 - eccsq;
        var rteosq = Math.sqrt(omeosq);
        var cosio = Math.cos(inclo);
        var cosio2 = cosio * cosio; // ------------------ un-kozai the mean motion -----------------

        var ak = Math.pow(xke / no, x2o3);
        var d1 = 0.75 * j2 * (3.0 * cosio2 - 1.0) / (rteosq * omeosq);
        var delPrime = d1 / (ak * ak);
        var adel = ak * (1.0 - delPrime * delPrime - delPrime * (1.0 / 3.0 + 134.0 * delPrime * delPrime / 81.0));
        delPrime = d1 / (adel * adel);
        no /= 1.0 + delPrime;
        var ao = Math.pow(xke / no, x2o3);
        var sinio = Math.sin(inclo);
        var po = ao * omeosq;
        var con42 = 1.0 - 5.0 * cosio2;
        var con41 = -con42 - cosio2 - cosio2;
        var ainv = 1.0 / ao;
        var posq = po * po;
        var rp = ao * (1.0 - ecco);
        var method = 'n'; //  sgp4fix modern approach to finding sidereal time

        var gsto;

        if (opsmode === 'a') {
            //  sgp4fix use old way of finding gst
            //  count integer number of days from 0 jan 1970
            var ts70 = epoch - 7305.0;
            var ds70 = Math.floor(ts70 + 1.0e-8);
            var tfrac = ts70 - ds70; //  find greenwich location at epoch

            var c1 = 1.72027916940703639e-2;
            var thgr70 = 1.7321343856509374;
            var fk5r = 5.07551419432269442e-15;
            var c1p2p = c1 + twoPi;
            gsto = (thgr70 + c1 * ds70 + c1p2p * tfrac + ts70 * ts70 * fk5r) % twoPi;

            if (gsto < 0.0) {
                gsto += twoPi;
            }
        } else {
            gsto = gstime(epoch + 2433281.5);
        }

        return {
            no: no,
            method: method,
            ainv: ainv,
            ao: ao,
            con41: con41,
            con42: con42,
            cosio: cosio,
            cosio2: cosio2,
            eccsq: eccsq,
            omeosq: omeosq,
            posq: posq,
            rp: rp,
            rteosq: rteosq,
            sinio: sinio,
            gsto: gsto
        };
    }

    /*-----------------------------------------------------------------------------
         *
         *                           procedure dspace
         *
         *  this procedure provides deep space contributions to mean elements for
         *    perturbing third body.  these effects have been averaged over one
         *    revolution of the sun and moon.  for earth resonance effects, the
         *    effects have been averaged over no revolutions of the satellite.
         *    (mean motion)
         *
         *  author        : david vallado                  719-573-2600   28 jun 2005
         *
         *  inputs        :
         *    d2201, d2211, d3210, d3222, d4410, d4422, d5220, d5232, d5421, d5433 -
         *    dedt        -
         *    del1, del2, del3  -
         *    didt        -
         *    dmdt        -
         *    dnodt       -
         *    domdt       -
         *    irez        - flag for resonance           0-none, 1-one day, 2-half day
         *    argpo       - argument of perigee
         *    argpdot     - argument of perigee dot (rate)
         *    t           - time
         *    tc          -
         *    gsto        - gst
         *    xfact       -
         *    xlamo       -
         *    no          - mean motion
         *    atime       -
         *    em          - eccentricity
         *    ft          -
         *    argpm       - argument of perigee
         *    inclm       - inclination
         *    xli         -
         *    mm          - mean anomaly
         *    xni         - mean motion
         *    nodem       - right ascension of ascending node
         *
         *  outputs       :
         *    atime       -
         *    em          - eccentricity
         *    argpm       - argument of perigee
         *    inclm       - inclination
         *    xli         -
         *    mm          - mean anomaly
         *    xni         -
         *    nodem       - right ascension of ascending node
         *    dndt        -
         *    nm          - mean motion
         *
         *  locals        :
         *    delt        -
         *    ft          -
         *    theta       -
         *    x2li        -
         *    x2omi       -
         *    xl          -
         *    xldot       -
         *    xnddt       -
         *    xndt        -
         *    xomi        -
         *
         *  coupling      :
         *    none        -
         *
         *  references    :
         *    hoots, roehrich, norad spacetrack report #3 1980
         *    hoots, norad spacetrack report #6 1986
         *    hoots, schumacher and glover 2004
         *    vallado, crawford, hujsak, kelso  2006
         ----------------------------------------------------------------------------*/

    function dspace(options) {
        var irez = options.irez,
            d2201 = options.d2201,
            d2211 = options.d2211,
            d3210 = options.d3210,
            d3222 = options.d3222,
            d4410 = options.d4410,
            d4422 = options.d4422,
            d5220 = options.d5220,
            d5232 = options.d5232,
            d5421 = options.d5421,
            d5433 = options.d5433,
            dedt = options.dedt,
            del1 = options.del1,
            del2 = options.del2,
            del3 = options.del3,
            didt = options.didt,
            dmdt = options.dmdt,
            dnodt = options.dnodt,
            domdt = options.domdt,
            argpo = options.argpo,
            argpdot = options.argpdot,
            t = options.t,
            tc = options.tc,
            gsto = options.gsto,
            xfact = options.xfact,
            xlamo = options.xlamo,
            no = options.no;
        var atime = options.atime,
            em = options.em,
            argpm = options.argpm,
            inclm = options.inclm,
            xli = options.xli,
            mm = options.mm,
            xni = options.xni,
            nodem = options.nodem,
            nm = options.nm;
        var fasx2 = 0.13130908;
        var fasx4 = 2.8843198;
        var fasx6 = 0.37448087;
        var g22 = 5.7686396;
        var g32 = 0.95240898;
        var g44 = 1.8014998;
        var g52 = 1.0508330;
        var g54 = 4.4108898;
        var rptim = 4.37526908801129966e-3; // equates to 7.29211514668855e-5 rad/sec

        var stepp = 720.0;
        var stepn = -720.0;
        var step2 = 259200.0;
        var delt;
        var x2li;
        var x2omi;
        var xl;
        var xldot;
        var xnddt;
        var xndt;
        var xomi;
        var dndt = 0.0;
        var ft = 0.0; //  ----------- calculate deep space resonance effects -----------

        var theta = (gsto + tc * rptim) % twoPi;
        em += dedt * t;
        inclm += didt * t;
        argpm += domdt * t;
        nodem += dnodt * t;
        mm += dmdt * t; // sgp4fix for negative inclinations
        // the following if statement should be commented out
        // if (inclm < 0.0)
        // {
        //   inclm = -inclm;
        //   argpm = argpm - pi;
        //   nodem = nodem + pi;
        // }

        /* - update resonances : numerical (euler-maclaurin) integration - */

        /* ------------------------- epoch restart ----------------------  */
        //   sgp4fix for propagator problems
        //   the following integration works for negative time steps and periods
        //   the specific changes are unknown because the original code was so convoluted
        // sgp4fix take out atime = 0.0 and fix for faster operation

        if (irez !== 0) {
            //  sgp4fix streamline check
            if (atime === 0.0 || t * atime <= 0.0 || Math.abs(t) < Math.abs(atime)) {
                atime = 0.0;
                xni = no;
                xli = xlamo;
            } // sgp4fix move check outside loop


            if (t > 0.0) {
                delt = stepp;
            } else {
                delt = stepn;
            }

            var iretn = 381; // added for do loop

            while (iretn === 381) {
                //  ------------------- dot terms calculated -------------
                //  ----------- near - synchronous resonance terms -------
                if (irez !== 2) {
                    xndt = del1 * Math.sin(xli - fasx2) + del2 * Math.sin(2.0 * (xli - fasx4)) + del3 * Math.sin(3.0 * (xli - fasx6));
                    xldot = xni + xfact;
                    xnddt = del1 * Math.cos(xli - fasx2) + 2.0 * del2 * Math.cos(2.0 * (xli - fasx4)) + 3.0 * del3 * Math.cos(3.0 * (xli - fasx6));
                    xnddt *= xldot;
                } else {
                    // --------- near - half-day resonance terms --------
                    xomi = argpo + argpdot * atime;
                    x2omi = xomi + xomi;
                    x2li = xli + xli;
                    xndt = d2201 * Math.sin(x2omi + xli - g22) + d2211 * Math.sin(xli - g22) + d3210 * Math.sin(xomi + xli - g32) + d3222 * Math.sin(-xomi + xli - g32) + d4410 * Math.sin(x2omi + x2li - g44) + d4422 * Math.sin(x2li - g44) + d5220 * Math.sin(xomi + xli - g52) + d5232 * Math.sin(-xomi + xli - g52) + d5421 * Math.sin(xomi + x2li - g54) + d5433 * Math.sin(-xomi + x2li - g54);
                    xldot = xni + xfact;
                    xnddt = d2201 * Math.cos(x2omi + xli - g22) + d2211 * Math.cos(xli - g22) + d3210 * Math.cos(xomi + xli - g32) + d3222 * Math.cos(-xomi + xli - g32) + d5220 * Math.cos(xomi + xli - g52) + d5232 * Math.cos(-xomi + xli - g52) + 2.0 * d4410 * Math.cos(x2omi + x2li - g44) + d4422 * Math.cos(x2li - g44) + d5421 * Math.cos(xomi + x2li - g54) + d5433 * Math.cos(-xomi + x2li - g54);
                    xnddt *= xldot;
                } //  ----------------------- integrator -------------------
                //  sgp4fix move end checks to end of routine


                if (Math.abs(t - atime) >= stepp) {
                    iretn = 381;
                } else {
                    ft = t - atime;
                    iretn = 0;
                }

                if (iretn === 381) {
                    xli += xldot * delt + xndt * step2;
                    xni += xndt * delt + xnddt * step2;
                    atime += delt;
                }
            }

            nm = xni + xndt * ft + xnddt * ft * ft * 0.5;
            xl = xli + xldot * ft + xndt * ft * ft * 0.5;

            if (irez !== 1) {
                mm = xl - 2.0 * nodem + 2.0 * theta;
                dndt = nm - no;
            } else {
                mm = xl - nodem - argpm + theta;
                dndt = nm - no;
            }

            nm = no + dndt;
        }

        return {
            atime: atime,
            em: em,
            argpm: argpm,
            inclm: inclm,
            xli: xli,
            mm: mm,
            xni: xni,
            nodem: nodem,
            dndt: dndt,
            nm: nm
        };
    }

    /*----------------------------------------------------------------------------
         *
         *                             procedure sgp4
         *
         *  this procedure is the sgp4 prediction model from space command. this is an
         *    updated and combined version of sgp4 and sdp4, which were originally
         *    published separately in spacetrack report //3. this version follows the
         *    methodology from the aiaa paper (2006) describing the history and
         *    development of the code.
         *
         *  author        : david vallado                  719-573-2600   28 jun 2005
         *
         *  inputs        :
         *    satrec  - initialised structure from sgp4init() call.
         *    tsince  - time since epoch (minutes)
         *
         *  outputs       :
         *    r           - position vector                     km
         *    v           - velocity                            km/sec
         *  return code - non-zero on error.
         *                   1 - mean elements, ecc >= 1.0 or ecc < -0.001 or a < 0.95 er
         *                   2 - mean motion less than 0.0
         *                   3 - pert elements, ecc < 0.0  or  ecc > 1.0
         *                   4 - semi-latus rectum < 0.0
         *                   5 - epoch elements are sub-orbital
         *                   6 - satellite has decayed
         *
         *  locals        :
         *    am          -
         *    axnl, aynl        -
         *    betal       -
         *    cosim   , sinim   , cosomm  , sinomm  , cnod    , snod    , cos2u   ,
         *    sin2u   , coseo1  , sineo1  , cosi    , sini    , cosip   , sinip   ,
         *    cosisq  , cossu   , sinsu   , cosu    , sinu
         *    delm        -
         *    delomg      -
         *    dndt        -
         *    eccm        -
         *    emsq        -
         *    ecose       -
         *    el2         -
         *    eo1         -
         *    eccp        -
         *    esine       -
         *    argpm       -
         *    argpp       -
         *    omgadf      -
         *    pl          -
         *    r           -
         *    rtemsq      -
         *    rdotl       -
         *    rl          -
         *    rvdot       -
         *    rvdotl      -
         *    su          -
         *    t2  , t3   , t4    , tc
         *    tem5, temp , temp1 , temp2  , tempa  , tempe  , templ
         *    u   , ux   , uy    , uz     , vx     , vy     , vz
         *    inclm       - inclination
         *    mm          - mean anomaly
         *    nm          - mean motion
         *    nodem       - right asc of ascending node
         *    xinc        -
         *    xincp       -
         *    xl          -
         *    xlm         -
         *    mp          -
         *    xmdf        -
         *    xmx         -
         *    xmy         -
         *    nodedf      -
         *    xnode       -
         *    nodep       -
         *    np          -
         *
         *  coupling      :
         *    getgravconst-
         *    dpper
         *    dspace
         *
         *  references    :
         *    hoots, roehrich, norad spacetrack report //3 1980
         *    hoots, norad spacetrack report //6 1986
         *    hoots, schumacher and glover 2004
         *    vallado, crawford, hujsak, kelso  2006
         ----------------------------------------------------------------------------*/

    function sgp4(satrec, tsince) {
        /* eslint-disable no-param-reassign */
        var coseo1;
        var sineo1;
        var cosip;
        var sinip;
        var cosisq;
        var delm;
        var delomg;
        var eo1;
        var argpm;
        var argpp;
        var su;
        var t3;
        var t4;
        var tc;
        var tem5;
        var temp;
        var tempa;
        var tempe;
        var templ;
        var inclm;
        var mm;
        var nm;
        var nodem;
        var xincp;
        var xlm;
        var mp;
        var nodep;
        /* ------------------ set mathematical constants --------------- */
        // sgp4fix divisor for divide by zero check on inclination
        // the old check used 1.0 + cos(pi-1.0e-9), but then compared it to
        // 1.5 e-12, so the threshold was changed to 1.5e-12 for consistency

        var temp4 = 1.5e-12; // --------------------- clear sgp4 error flag -----------------

        satrec.t = tsince;
        satrec.error = 0; //  ------- update for secular gravity and atmospheric drag -----

        var xmdf = satrec.mo + satrec.mdot * satrec.t;
        var argpdf = satrec.argpo + satrec.argpdot * satrec.t;
        var nodedf = satrec.nodeo + satrec.nodedot * satrec.t;
        argpm = argpdf;
        mm = xmdf;
        var t2 = satrec.t * satrec.t;
        nodem = nodedf + satrec.nodecf * t2;
        tempa = 1.0 - satrec.cc1 * satrec.t;
        tempe = satrec.bstar * satrec.cc4 * satrec.t;
        templ = satrec.t2cof * t2;

        if (satrec.isimp !== 1) {
            delomg = satrec.omgcof * satrec.t; //  sgp4fix use mutliply for speed instead of pow

            var delmtemp = 1.0 + satrec.eta * Math.cos(xmdf);
            delm = satrec.xmcof * (delmtemp * delmtemp * delmtemp - satrec.delmo);
            temp = delomg + delm;
            mm = xmdf + temp;
            argpm = argpdf - temp;
            t3 = t2 * satrec.t;
            t4 = t3 * satrec.t;
            tempa = tempa - satrec.d2 * t2 - satrec.d3 * t3 - satrec.d4 * t4;
            tempe += satrec.bstar * satrec.cc5 * (Math.sin(mm) - satrec.sinmao);
            templ = templ + satrec.t3cof * t3 + t4 * (satrec.t4cof + satrec.t * satrec.t5cof);
        }

        nm = satrec.no;
        var em = satrec.ecco;
        inclm = satrec.inclo;

        if (satrec.method === 'd') {
            tc = satrec.t;
            var dspaceOptions = {
                irez: satrec.irez,
                d2201: satrec.d2201,
                d2211: satrec.d2211,
                d3210: satrec.d3210,
                d3222: satrec.d3222,
                d4410: satrec.d4410,
                d4422: satrec.d4422,
                d5220: satrec.d5220,
                d5232: satrec.d5232,
                d5421: satrec.d5421,
                d5433: satrec.d5433,
                dedt: satrec.dedt,
                del1: satrec.del1,
                del2: satrec.del2,
                del3: satrec.del3,
                didt: satrec.didt,
                dmdt: satrec.dmdt,
                dnodt: satrec.dnodt,
                domdt: satrec.domdt,
                argpo: satrec.argpo,
                argpdot: satrec.argpdot,
                t: satrec.t,
                tc: tc,
                gsto: satrec.gsto,
                xfact: satrec.xfact,
                xlamo: satrec.xlamo,
                no: satrec.no,
                atime: satrec.atime,
                em: em,
                argpm: argpm,
                inclm: inclm,
                xli: satrec.xli,
                mm: mm,
                xni: satrec.xni,
                nodem: nodem,
                nm: nm
            };
            var dspaceResult = dspace(dspaceOptions);
            em = dspaceResult.em;
            argpm = dspaceResult.argpm;
            inclm = dspaceResult.inclm;
            mm = dspaceResult.mm;
            nodem = dspaceResult.nodem;
            nm = dspaceResult.nm;
        }

        if (nm <= 0.0) {
            // printf("// error nm %f\n", nm);
            satrec.error = 2; // sgp4fix add return

            return [false, false];
        }

        var am = Math.pow(xke / nm, x2o3) * tempa * tempa;
        nm = xke / Math.pow(am, 1.5);
        em -= tempe; // fix tolerance for error recognition
        // sgp4fix am is fixed from the previous nm check

        if (em >= 1.0 || em < -0.001) {
            // || (am < 0.95)
            // printf("// error em %f\n", em);
            satrec.error = 1; // sgp4fix to return if there is an error in eccentricity

            return [false, false];
        } //  sgp4fix fix tolerance to avoid a divide by zero


        if (em < 1.0e-6) {
            em = 1.0e-6;
        }

        mm += satrec.no * templ;
        xlm = mm + argpm + nodem;
        nodem %= twoPi;
        argpm %= twoPi;
        xlm %= twoPi;
        mm = (xlm - argpm - nodem) % twoPi; // ----------------- compute extra mean quantities -------------

        var sinim = Math.sin(inclm);
        var cosim = Math.cos(inclm); // -------------------- add lunar-solar periodics --------------

        var ep = em;
        xincp = inclm;
        argpp = argpm;
        nodep = nodem;
        mp = mm;
        sinip = sinim;
        cosip = cosim;

        if (satrec.method === 'd') {
            var dpperParameters = {
                inclo: satrec.inclo,
                init: 'n',
                ep: ep,
                inclp: xincp,
                nodep: nodep,
                argpp: argpp,
                mp: mp,
                opsmode: satrec.operationmode
            };
            var dpperResult = dpper(satrec, dpperParameters);
            ep = dpperResult.ep;
            nodep = dpperResult.nodep;
            argpp = dpperResult.argpp;
            mp = dpperResult.mp;
            xincp = dpperResult.inclp;

            if (xincp < 0.0) {
                xincp = -xincp;
                nodep += pi;
                argpp -= pi;
            }

            if (ep < 0.0 || ep > 1.0) {
                //  printf("// error ep %f\n", ep);
                satrec.error = 3; //  sgp4fix add return

                return [false, false];
            }
        } //  -------------------- long period periodics ------------------


        if (satrec.method === 'd') {
            sinip = Math.sin(xincp);
            cosip = Math.cos(xincp);
            satrec.aycof = -0.5 * j3oj2 * sinip; //  sgp4fix for divide by zero for xincp = 180 deg

            if (Math.abs(cosip + 1.0) > 1.5e-12) {
                satrec.xlcof = -0.25 * j3oj2 * sinip * (3.0 + 5.0 * cosip) / (1.0 + cosip);
            } else {
                satrec.xlcof = -0.25 * j3oj2 * sinip * (3.0 + 5.0 * cosip) / temp4;
            }
        }

        var axnl = ep * Math.cos(argpp);
        temp = 1.0 / (am * (1.0 - ep * ep));
        var aynl = ep * Math.sin(argpp) + temp * satrec.aycof;
        var xl = mp + argpp + nodep + temp * satrec.xlcof * axnl; // --------------------- solve kepler's equation ---------------

        var u = (xl - nodep) % twoPi;
        eo1 = u;
        tem5 = 9999.9;
        var ktr = 1; //    sgp4fix for kepler iteration
        //    the following iteration needs better limits on corrections

        while (Math.abs(tem5) >= 1.0e-12 && ktr <= 10) {
            sineo1 = Math.sin(eo1);
            coseo1 = Math.cos(eo1);
            tem5 = 1.0 - coseo1 * axnl - sineo1 * aynl;
            tem5 = (u - aynl * coseo1 + axnl * sineo1 - eo1) / tem5;

            if (Math.abs(tem5) >= 0.95) {
                if (tem5 > 0.0) {
                    tem5 = 0.95;
                } else {
                    tem5 = -0.95;
                }
            }

            eo1 += tem5;
            ktr += 1;
        } //  ------------- short period preliminary quantities -----------


        var ecose = axnl * coseo1 + aynl * sineo1;
        var esine = axnl * sineo1 - aynl * coseo1;
        var el2 = axnl * axnl + aynl * aynl;
        var pl = am * (1.0 - el2);

        if (pl < 0.0) {
            //  printf("// error pl %f\n", pl);
            satrec.error = 4; //  sgp4fix add return

            return [false, false];
        }

        var rl = am * (1.0 - ecose);
        var rdotl = Math.sqrt(am) * esine / rl;
        var rvdotl = Math.sqrt(pl) / rl;
        var betal = Math.sqrt(1.0 - el2);
        temp = esine / (1.0 + betal);
        var sinu = am / rl * (sineo1 - aynl - axnl * temp);
        var cosu = am / rl * (coseo1 - axnl + aynl * temp);
        su = Math.atan2(sinu, cosu);
        var sin2u = (cosu + cosu) * sinu;
        var cos2u = 1.0 - 2.0 * sinu * sinu;
        temp = 1.0 / pl;
        var temp1 = 0.5 * j2 * temp;
        var temp2 = temp1 * temp; // -------------- update for short period periodics ------------

        if (satrec.method === 'd') {
            cosisq = cosip * cosip;
            satrec.con41 = 3.0 * cosisq - 1.0;
            satrec.x1mth2 = 1.0 - cosisq;
            satrec.x7thm1 = 7.0 * cosisq - 1.0;
        }

        var mrt = rl * (1.0 - 1.5 * temp2 * betal * satrec.con41) + 0.5 * temp1 * satrec.x1mth2 * cos2u; // sgp4fix for decaying satellites

        if (mrt < 1.0) {
            // printf("// decay condition %11.6f \n",mrt);
            satrec.error = 6;
            return {
                position: false,
                velocity: false
            };
        }

        su -= 0.25 * temp2 * satrec.x7thm1 * sin2u;
        var xnode = nodep + 1.5 * temp2 * cosip * sin2u;
        var xinc = xincp + 1.5 * temp2 * cosip * sinip * cos2u;
        var mvt = rdotl - nm * temp1 * satrec.x1mth2 * sin2u / xke;
        var rvdot = rvdotl + nm * temp1 * (satrec.x1mth2 * cos2u + 1.5 * satrec.con41) / xke; // --------------------- orientation vectors -------------------

        var sinsu = Math.sin(su);
        var cossu = Math.cos(su);
        var snod = Math.sin(xnode);
        var cnod = Math.cos(xnode);
        var sini = Math.sin(xinc);
        var cosi = Math.cos(xinc);
        var xmx = -snod * cosi;
        var xmy = cnod * cosi;
        var ux = xmx * sinsu + cnod * cossu;
        var uy = xmy * sinsu + snod * cossu;
        var uz = sini * sinsu;
        var vx = xmx * cossu - cnod * sinsu;
        var vy = xmy * cossu - snod * sinsu;
        var vz = sini * cossu; // --------- position and velocity (in km and km/sec) ----------

        var r = {
            x: mrt * ux * earthRadius,
            y: mrt * uy * earthRadius,
            z: mrt * uz * earthRadius
        };
        var v = {
            x: (mvt * ux + rvdot * vx) * vkmpersec,
            y: (mvt * uy + rvdot * vy) * vkmpersec,
            z: (mvt * uz + rvdot * vz) * vkmpersec
        };
        return {
            position: r,
            velocity: v
        };
        /* eslint-enable no-param-reassign */
    }

    /*-----------------------------------------------------------------------------
         *
         *                             procedure sgp4init
         *
         *  this procedure initializes variables for sgp4.
         *
         *  author        : david vallado                  719-573-2600   28 jun 2005
         *  author        : david vallado                  719-573-2600   28 jun 2005
         *
         *  inputs        :
         *    opsmode     - mode of operation afspc or improved 'a', 'i'
         *    satn        - satellite number
         *    bstar       - sgp4 type drag coefficient              kg/m2er
         *    ecco        - eccentricity
         *    epoch       - epoch time in days from jan 0, 1950. 0 hr
         *    argpo       - argument of perigee (output if ds)
         *    inclo       - inclination
         *    mo          - mean anomaly (output if ds)
         *    no          - mean motion
         *    nodeo       - right ascension of ascending node
         *
         *  outputs       :
         *    rec      - common values for subsequent calls
         *    return code - non-zero on error.
         *                   1 - mean elements, ecc >= 1.0 or ecc < -0.001 or a < 0.95 er
         *                   2 - mean motion less than 0.0
         *                   3 - pert elements, ecc < 0.0  or  ecc > 1.0
         *                   4 - semi-latus rectum < 0.0
         *                   5 - epoch elements are sub-orbital
         *                   6 - satellite has decayed
         *
         *  locals        :
         *    cnodm  , snodm  , cosim  , sinim  , cosomm , sinomm
         *    cc1sq  , cc2    , cc3
         *    coef   , coef1
         *    cosio4      -
         *    day         -
         *    dndt        -
         *    em          - eccentricity
         *    emsq        - eccentricity squared
         *    eeta        -
         *    etasq       -
         *    gam         -
         *    argpm       - argument of perigee
         *    nodem       -
         *    inclm       - inclination
         *    mm          - mean anomaly
         *    nm          - mean motion
         *    perige      - perigee
         *    pinvsq      -
         *    psisq       -
         *    qzms24      -
         *    rtemsq      -
         *    s1, s2, s3, s4, s5, s6, s7          -
         *    sfour       -
         *    ss1, ss2, ss3, ss4, ss5, ss6, ss7         -
         *    sz1, sz2, sz3
         *    sz11, sz12, sz13, sz21, sz22, sz23, sz31, sz32, sz33        -
         *    tc          -
         *    temp        -
         *    temp1, temp2, temp3       -
         *    tsi         -
         *    xpidot      -
         *    xhdot1      -
         *    z1, z2, z3          -
         *    z11, z12, z13, z21, z22, z23, z31, z32, z33         -
         *
         *  coupling      :
         *    getgravconst-
         *    initl       -
         *    dscom       -
         *    dpper       -
         *    dsinit      -
         *    sgp4        -
         *
         *  references    :
         *    hoots, roehrich, norad spacetrack report #3 1980
         *    hoots, norad spacetrack report #6 1986
         *    hoots, schumacher and glover 2004
         *    vallado, crawford, hujsak, kelso  2006
         ----------------------------------------------------------------------------*/

    function sgp4init(satrec, options) {
        /* eslint-disable no-param-reassign */
        var opsmode = options.opsmode,
            satn = options.satn,
            epoch = options.epoch,
            xbstar = options.xbstar,
            xecco = options.xecco,
            xargpo = options.xargpo,
            xinclo = options.xinclo,
            xmo = options.xmo,
            xno = options.xno,
            xnodeo = options.xnodeo;
        var cosim;
        var sinim;
        var cc1sq;
        var cc2;
        var cc3;
        var coef;
        var coef1;
        var cosio4;
        var em;
        var emsq;
        var eeta;
        var etasq;
        var argpm;
        var nodem;
        var inclm;
        var mm;
        var nm;
        var perige;
        var pinvsq;
        var psisq;
        var qzms24;
        var s1;
        var s2;
        var s3;
        var s4;
        var s5;
        var sfour;
        var ss1;
        var ss2;
        var ss3;
        var ss4;
        var ss5;
        var sz1;
        var sz3;
        var sz11;
        var sz13;
        var sz21;
        var sz23;
        var sz31;
        var sz33;
        var tc;
        var temp;
        var temp1;
        var temp2;
        var temp3;
        var tsi;
        var xpidot;
        var xhdot1;
        var z1;
        var z3;
        var z11;
        var z13;
        var z21;
        var z23;
        var z31;
        var z33;
        /* ------------------------ initialization --------------------- */
        // sgp4fix divisor for divide by zero check on inclination
        // the old check used 1.0 + Math.cos(pi-1.0e-9), but then compared it to
        // 1.5 e-12, so the threshold was changed to 1.5e-12 for consistency

        var temp4 = 1.5e-12; // ----------- set all near earth variables to zero ------------

        satrec.isimp = 0;
        satrec.method = 'n';
        satrec.aycof = 0.0;
        satrec.con41 = 0.0;
        satrec.cc1 = 0.0;
        satrec.cc4 = 0.0;
        satrec.cc5 = 0.0;
        satrec.d2 = 0.0;
        satrec.d3 = 0.0;
        satrec.d4 = 0.0;
        satrec.delmo = 0.0;
        satrec.eta = 0.0;
        satrec.argpdot = 0.0;
        satrec.omgcof = 0.0;
        satrec.sinmao = 0.0;
        satrec.t = 0.0;
        satrec.t2cof = 0.0;
        satrec.t3cof = 0.0;
        satrec.t4cof = 0.0;
        satrec.t5cof = 0.0;
        satrec.x1mth2 = 0.0;
        satrec.x7thm1 = 0.0;
        satrec.mdot = 0.0;
        satrec.nodedot = 0.0;
        satrec.xlcof = 0.0;
        satrec.xmcof = 0.0;
        satrec.nodecf = 0.0; // ----------- set all deep space variables to zero ------------

        satrec.irez = 0;
        satrec.d2201 = 0.0;
        satrec.d2211 = 0.0;
        satrec.d3210 = 0.0;
        satrec.d3222 = 0.0;
        satrec.d4410 = 0.0;
        satrec.d4422 = 0.0;
        satrec.d5220 = 0.0;
        satrec.d5232 = 0.0;
        satrec.d5421 = 0.0;
        satrec.d5433 = 0.0;
        satrec.dedt = 0.0;
        satrec.del1 = 0.0;
        satrec.del2 = 0.0;
        satrec.del3 = 0.0;
        satrec.didt = 0.0;
        satrec.dmdt = 0.0;
        satrec.dnodt = 0.0;
        satrec.domdt = 0.0;
        satrec.e3 = 0.0;
        satrec.ee2 = 0.0;
        satrec.peo = 0.0;
        satrec.pgho = 0.0;
        satrec.pho = 0.0;
        satrec.pinco = 0.0;
        satrec.plo = 0.0;
        satrec.se2 = 0.0;
        satrec.se3 = 0.0;
        satrec.sgh2 = 0.0;
        satrec.sgh3 = 0.0;
        satrec.sgh4 = 0.0;
        satrec.sh2 = 0.0;
        satrec.sh3 = 0.0;
        satrec.si2 = 0.0;
        satrec.si3 = 0.0;
        satrec.sl2 = 0.0;
        satrec.sl3 = 0.0;
        satrec.sl4 = 0.0;
        satrec.gsto = 0.0;
        satrec.xfact = 0.0;
        satrec.xgh2 = 0.0;
        satrec.xgh3 = 0.0;
        satrec.xgh4 = 0.0;
        satrec.xh2 = 0.0;
        satrec.xh3 = 0.0;
        satrec.xi2 = 0.0;
        satrec.xi3 = 0.0;
        satrec.xl2 = 0.0;
        satrec.xl3 = 0.0;
        satrec.xl4 = 0.0;
        satrec.xlamo = 0.0;
        satrec.zmol = 0.0;
        satrec.zmos = 0.0;
        satrec.atime = 0.0;
        satrec.xli = 0.0;
        satrec.xni = 0.0; // sgp4fix - note the following variables are also passed directly via satrec.
        // it is possible to streamline the sgp4init call by deleting the "x"
        // variables, but the user would need to set the satrec.* values first. we
        // include the additional assignments in case twoline2rv is not used.

        satrec.bstar = xbstar;
        satrec.ecco = xecco;
        satrec.argpo = xargpo;
        satrec.inclo = xinclo;
        satrec.mo = xmo;
        satrec.no = xno;
        satrec.nodeo = xnodeo; //  sgp4fix add opsmode

        satrec.operationmode = opsmode; // ------------------------ earth constants -----------------------
        // sgp4fix identify constants and allow alternate values

        var ss = 78.0 / earthRadius + 1.0; // sgp4fix use multiply for speed instead of pow

        var qzms2ttemp = (120.0 - 78.0) / earthRadius;
        var qzms2t = qzms2ttemp * qzms2ttemp * qzms2ttemp * qzms2ttemp;
        satrec.init = 'y';
        satrec.t = 0.0;
        var initlOptions = {
            satn: satn,
            ecco: satrec.ecco,
            epoch: epoch,
            inclo: satrec.inclo,
            no: satrec.no,
            method: satrec.method,
            opsmode: satrec.operationmode
        };
        var initlResult = initl(initlOptions);
        var ao = initlResult.ao,
            con42 = initlResult.con42,
            cosio = initlResult.cosio,
            cosio2 = initlResult.cosio2,
            eccsq = initlResult.eccsq,
            omeosq = initlResult.omeosq,
            posq = initlResult.posq,
            rp = initlResult.rp,
            rteosq = initlResult.rteosq,
            sinio = initlResult.sinio;
        satrec.no = initlResult.no;
        satrec.con41 = initlResult.con41;
        satrec.gsto = initlResult.gsto;
        satrec.error = 0; // sgp4fix remove this check as it is unnecessary
        // the mrt check in sgp4 handles decaying satellite cases even if the starting
        // condition is below the surface of te earth
        // if (rp < 1.0)
        // {
        //   printf("// *** satn%d epoch elts sub-orbital ***\n", satn);
        //   satrec.error = 5;
        // }

        if (omeosq >= 0.0 || satrec.no >= 0.0) {
            satrec.isimp = 0;

            if (rp < 220.0 / earthRadius + 1.0) {
                satrec.isimp = 1;
            }

            sfour = ss;
            qzms24 = qzms2t;
            perige = (rp - 1.0) * earthRadius; // - for perigees below 156 km, s and qoms2t are altered -

            if (perige < 156.0) {
                sfour = perige - 78.0;

                if (perige < 98.0) {
                    sfour = 20.0;
                } // sgp4fix use multiply for speed instead of pow


                var qzms24temp = (120.0 - sfour) / earthRadius;
                qzms24 = qzms24temp * qzms24temp * qzms24temp * qzms24temp;
                sfour = sfour / earthRadius + 1.0;
            }

            pinvsq = 1.0 / posq;
            tsi = 1.0 / (ao - sfour);
            satrec.eta = ao * satrec.ecco * tsi;
            etasq = satrec.eta * satrec.eta;
            eeta = satrec.ecco * satrec.eta;
            psisq = Math.abs(1.0 - etasq);
            coef = qzms24 * Math.pow(tsi, 4.0);
            coef1 = coef / Math.pow(psisq, 3.5);
            cc2 = coef1 * satrec.no * (ao * (1.0 + 1.5 * etasq + eeta * (4.0 + etasq)) + 0.375 * j2 * tsi / psisq * satrec.con41 * (8.0 + 3.0 * etasq * (8.0 + etasq)));
            satrec.cc1 = satrec.bstar * cc2;
            cc3 = 0.0;

            if (satrec.ecco > 1.0e-4) {
                cc3 = -2.0 * coef * tsi * j3oj2 * satrec.no * sinio / satrec.ecco;
            }

            satrec.x1mth2 = 1.0 - cosio2;
            satrec.cc4 = 2.0 * satrec.no * coef1 * ao * omeosq * (satrec.eta * (2.0 + 0.5 * etasq) + satrec.ecco * (0.5 + 2.0 * etasq) - j2 * tsi / (ao * psisq) * (-3.0 * satrec.con41 * (1.0 - 2.0 * eeta + etasq * (1.5 - 0.5 * eeta)) + 0.75 * satrec.x1mth2 * (2.0 * etasq - eeta * (1.0 + etasq)) * Math.cos(2.0 * satrec.argpo)));
            satrec.cc5 = 2.0 * coef1 * ao * omeosq * (1.0 + 2.75 * (etasq + eeta) + eeta * etasq);
            cosio4 = cosio2 * cosio2;
            temp1 = 1.5 * j2 * pinvsq * satrec.no;
            temp2 = 0.5 * temp1 * j2 * pinvsq;
            temp3 = -0.46875 * j4 * pinvsq * pinvsq * satrec.no;
            satrec.mdot = satrec.no + 0.5 * temp1 * rteosq * satrec.con41 + 0.0625 * temp2 * rteosq * (13.0 - 78.0 * cosio2 + 137.0 * cosio4);
            satrec.argpdot = -0.5 * temp1 * con42 + 0.0625 * temp2 * (7.0 - 114.0 * cosio2 + 395.0 * cosio4) + temp3 * (3.0 - 36.0 * cosio2 + 49.0 * cosio4);
            xhdot1 = -temp1 * cosio;
            satrec.nodedot = xhdot1 + (0.5 * temp2 * (4.0 - 19.0 * cosio2) + 2.0 * temp3 * (3.0 - 7.0 * cosio2)) * cosio;
            xpidot = satrec.argpdot + satrec.nodedot;
            satrec.omgcof = satrec.bstar * cc3 * Math.cos(satrec.argpo);
            satrec.xmcof = 0.0;

            if (satrec.ecco > 1.0e-4) {
                satrec.xmcof = -x2o3 * coef * satrec.bstar / eeta;
            }

            satrec.nodecf = 3.5 * omeosq * xhdot1 * satrec.cc1;
            satrec.t2cof = 1.5 * satrec.cc1; // sgp4fix for divide by zero with xinco = 180 deg

            if (Math.abs(cosio + 1.0) > 1.5e-12) {
                satrec.xlcof = -0.25 * j3oj2 * sinio * (3.0 + 5.0 * cosio) / (1.0 + cosio);
            } else {
                satrec.xlcof = -0.25 * j3oj2 * sinio * (3.0 + 5.0 * cosio) / temp4;
            }

            satrec.aycof = -0.5 * j3oj2 * sinio; // sgp4fix use multiply for speed instead of pow

            var delmotemp = 1.0 + satrec.eta * Math.cos(satrec.mo);
            satrec.delmo = delmotemp * delmotemp * delmotemp;
            satrec.sinmao = Math.sin(satrec.mo);
            satrec.x7thm1 = 7.0 * cosio2 - 1.0; // --------------- deep space initialization -------------

            if (2 * pi / satrec.no >= 225.0) {
                satrec.method = 'd';
                satrec.isimp = 1;
                tc = 0.0;
                inclm = satrec.inclo;
                var dscomOptions = {
                    epoch: epoch,
                    ep: satrec.ecco,
                    argpp: satrec.argpo,
                    tc: tc,
                    inclp: satrec.inclo,
                    nodep: satrec.nodeo,
                    np: satrec.no,
                    e3: satrec.e3,
                    ee2: satrec.ee2,
                    peo: satrec.peo,
                    pgho: satrec.pgho,
                    pho: satrec.pho,
                    pinco: satrec.pinco,
                    plo: satrec.plo,
                    se2: satrec.se2,
                    se3: satrec.se3,
                    sgh2: satrec.sgh2,
                    sgh3: satrec.sgh3,
                    sgh4: satrec.sgh4,
                    sh2: satrec.sh2,
                    sh3: satrec.sh3,
                    si2: satrec.si2,
                    si3: satrec.si3,
                    sl2: satrec.sl2,
                    sl3: satrec.sl3,
                    sl4: satrec.sl4,
                    xgh2: satrec.xgh2,
                    xgh3: satrec.xgh3,
                    xgh4: satrec.xgh4,
                    xh2: satrec.xh2,
                    xh3: satrec.xh3,
                    xi2: satrec.xi2,
                    xi3: satrec.xi3,
                    xl2: satrec.xl2,
                    xl3: satrec.xl3,
                    xl4: satrec.xl4,
                    zmol: satrec.zmol,
                    zmos: satrec.zmos
                };
                var dscomResult = dscom(dscomOptions);
                satrec.e3 = dscomResult.e3;
                satrec.ee2 = dscomResult.ee2;
                satrec.peo = dscomResult.peo;
                satrec.pgho = dscomResult.pgho;
                satrec.pho = dscomResult.pho;
                satrec.pinco = dscomResult.pinco;
                satrec.plo = dscomResult.plo;
                satrec.se2 = dscomResult.se2;
                satrec.se3 = dscomResult.se3;
                satrec.sgh2 = dscomResult.sgh2;
                satrec.sgh3 = dscomResult.sgh3;
                satrec.sgh4 = dscomResult.sgh4;
                satrec.sh2 = dscomResult.sh2;
                satrec.sh3 = dscomResult.sh3;
                satrec.si2 = dscomResult.si2;
                satrec.si3 = dscomResult.si3;
                satrec.sl2 = dscomResult.sl2;
                satrec.sl3 = dscomResult.sl3;
                satrec.sl4 = dscomResult.sl4;
                sinim = dscomResult.sinim;
                cosim = dscomResult.cosim;
                em = dscomResult.em;
                emsq = dscomResult.emsq;
                s1 = dscomResult.s1;
                s2 = dscomResult.s2;
                s3 = dscomResult.s3;
                s4 = dscomResult.s4;
                s5 = dscomResult.s5;
                ss1 = dscomResult.ss1;
                ss2 = dscomResult.ss2;
                ss3 = dscomResult.ss3;
                ss4 = dscomResult.ss4;
                ss5 = dscomResult.ss5;
                sz1 = dscomResult.sz1;
                sz3 = dscomResult.sz3;
                sz11 = dscomResult.sz11;
                sz13 = dscomResult.sz13;
                sz21 = dscomResult.sz21;
                sz23 = dscomResult.sz23;
                sz31 = dscomResult.sz31;
                sz33 = dscomResult.sz33;
                satrec.xgh2 = dscomResult.xgh2;
                satrec.xgh3 = dscomResult.xgh3;
                satrec.xgh4 = dscomResult.xgh4;
                satrec.xh2 = dscomResult.xh2;
                satrec.xh3 = dscomResult.xh3;
                satrec.xi2 = dscomResult.xi2;
                satrec.xi3 = dscomResult.xi3;
                satrec.xl2 = dscomResult.xl2;
                satrec.xl3 = dscomResult.xl3;
                satrec.xl4 = dscomResult.xl4;
                satrec.zmol = dscomResult.zmol;
                satrec.zmos = dscomResult.zmos;
                nm = dscomResult.nm;
                z1 = dscomResult.z1;
                z3 = dscomResult.z3;
                z11 = dscomResult.z11;
                z13 = dscomResult.z13;
                z21 = dscomResult.z21;
                z23 = dscomResult.z23;
                z31 = dscomResult.z31;
                z33 = dscomResult.z33;
                var dpperOptions = {
                    inclo: inclm,
                    init: satrec.init,
                    ep: satrec.ecco,
                    inclp: satrec.inclo,
                    nodep: satrec.nodeo,
                    argpp: satrec.argpo,
                    mp: satrec.mo,
                    opsmode: satrec.operationmode
                };
                var dpperResult = dpper(satrec, dpperOptions);
                satrec.ecco = dpperResult.ep;
                satrec.inclo = dpperResult.inclp;
                satrec.nodeo = dpperResult.nodep;
                satrec.argpo = dpperResult.argpp;
                satrec.mo = dpperResult.mp;
                argpm = 0.0;
                nodem = 0.0;
                mm = 0.0;
                var dsinitOptions = {
                    cosim: cosim,
                    emsq: emsq,
                    argpo: satrec.argpo,
                    s1: s1,
                    s2: s2,
                    s3: s3,
                    s4: s4,
                    s5: s5,
                    sinim: sinim,
                    ss1: ss1,
                    ss2: ss2,
                    ss3: ss3,
                    ss4: ss4,
                    ss5: ss5,
                    sz1: sz1,
                    sz3: sz3,
                    sz11: sz11,
                    sz13: sz13,
                    sz21: sz21,
                    sz23: sz23,
                    sz31: sz31,
                    sz33: sz33,
                    t: satrec.t,
                    tc: tc,
                    gsto: satrec.gsto,
                    mo: satrec.mo,
                    mdot: satrec.mdot,
                    no: satrec.no,
                    nodeo: satrec.nodeo,
                    nodedot: satrec.nodedot,
                    xpidot: xpidot,
                    z1: z1,
                    z3: z3,
                    z11: z11,
                    z13: z13,
                    z21: z21,
                    z23: z23,
                    z31: z31,
                    z33: z33,
                    ecco: satrec.ecco,
                    eccsq: eccsq,
                    em: em,
                    argpm: argpm,
                    inclm: inclm,
                    mm: mm,
                    nm: nm,
                    nodem: nodem,
                    irez: satrec.irez,
                    atime: satrec.atime,
                    d2201: satrec.d2201,
                    d2211: satrec.d2211,
                    d3210: satrec.d3210,
                    d3222: satrec.d3222,
                    d4410: satrec.d4410,
                    d4422: satrec.d4422,
                    d5220: satrec.d5220,
                    d5232: satrec.d5232,
                    d5421: satrec.d5421,
                    d5433: satrec.d5433,
                    dedt: satrec.dedt,
                    didt: satrec.didt,
                    dmdt: satrec.dmdt,
                    dnodt: satrec.dnodt,
                    domdt: satrec.domdt,
                    del1: satrec.del1,
                    del2: satrec.del2,
                    del3: satrec.del3,
                    xfact: satrec.xfact,
                    xlamo: satrec.xlamo,
                    xli: satrec.xli,
                    xni: satrec.xni
                };
                var dsinitResult = dsinit(dsinitOptions);
                satrec.irez = dsinitResult.irez;
                satrec.atime = dsinitResult.atime;
                satrec.d2201 = dsinitResult.d2201;
                satrec.d2211 = dsinitResult.d2211;
                satrec.d3210 = dsinitResult.d3210;
                satrec.d3222 = dsinitResult.d3222;
                satrec.d4410 = dsinitResult.d4410;
                satrec.d4422 = dsinitResult.d4422;
                satrec.d5220 = dsinitResult.d5220;
                satrec.d5232 = dsinitResult.d5232;
                satrec.d5421 = dsinitResult.d5421;
                satrec.d5433 = dsinitResult.d5433;
                satrec.dedt = dsinitResult.dedt;
                satrec.didt = dsinitResult.didt;
                satrec.dmdt = dsinitResult.dmdt;
                satrec.dnodt = dsinitResult.dnodt;
                satrec.domdt = dsinitResult.domdt;
                satrec.del1 = dsinitResult.del1;
                satrec.del2 = dsinitResult.del2;
                satrec.del3 = dsinitResult.del3;
                satrec.xfact = dsinitResult.xfact;
                satrec.xlamo = dsinitResult.xlamo;
                satrec.xli = dsinitResult.xli;
                satrec.xni = dsinitResult.xni;
            } // ----------- set variables if not deep space -----------


            if (satrec.isimp !== 1) {
                cc1sq = satrec.cc1 * satrec.cc1;
                satrec.d2 = 4.0 * ao * tsi * cc1sq;
                temp = satrec.d2 * tsi * satrec.cc1 / 3.0;
                satrec.d3 = (17.0 * ao + sfour) * temp;
                satrec.d4 = 0.5 * temp * ao * tsi * (221.0 * ao + 31.0 * sfour) * satrec.cc1;
                satrec.t3cof = satrec.d2 + 2.0 * cc1sq;
                satrec.t4cof = 0.25 * (3.0 * satrec.d3 + satrec.cc1 * (12.0 * satrec.d2 + 10.0 * cc1sq));
                satrec.t5cof = 0.2 * (3.0 * satrec.d4 + 12.0 * satrec.cc1 * satrec.d3 + 6.0 * satrec.d2 * satrec.d2 + 15.0 * cc1sq * (2.0 * satrec.d2 + cc1sq));
            }
            /* finally propogate to zero epoch to initialize all others. */
            // sgp4fix take out check to let satellites process until they are actually below earth surface
            // if(satrec.error == 0)

        }

        sgp4(satrec, 0, 0);
        satrec.init = 'n';
        /* eslint-enable no-param-reassign */
    }

    /* -----------------------------------------------------------------------------
         *
         *                           function twoline2rv
         *
         *  this function converts the two line element set character string data to
         *    variables and initializes the sgp4 variables. several intermediate varaibles
         *    and quantities are determined. note that the result is a structure so multiple
         *    satellites can be processed simultaneously without having to reinitialize. the
         *    verification mode is an important option that permits quick checks of any
         *    changes to the underlying technical theory. this option works using a
         *    modified tle file in which the start, stop, and delta time values are
         *    included at the end of the second line of data. this only works with the
         *    verification mode. the catalog mode simply propagates from -1440 to 1440 min
         *    from epoch and is useful when performing entire catalog runs.
         *
         *  author        : david vallado                  719-573-2600    1 mar 2001
         *
         *  inputs        :
         *    longstr1    - first line of the tle
         *    longstr2    - second line of the tle
         *    typerun     - type of run                    verification 'v', catalog 'c',
         *                                                 manual 'm'
         *    typeinput   - type of manual input           mfe 'm', epoch 'e', dayofyr 'd'
         *    opsmode     - mode of operation afspc or improved 'a', 'i'
         *    whichconst  - which set of constants to use  72, 84
         *
         *  outputs       :
         *    satrec      - structure containing all the sgp4 satellite information
         *
         *  coupling      :
         *    getgravconst-
         *    days2mdhms  - conversion of days to month, day, hour, minute, second
         *    jday        - convert day month year hour minute second into julian date
         *    sgp4init    - initialize the sgp4 variables
         *
         *  references    :
         *    norad spacetrack report #3
         *    vallado, crawford, hujsak, kelso  2006
         --------------------------------------------------------------------------- */

    /**
     * Return a Satellite imported from two lines of TLE data.
     *
     * Provide the two TLE lines as strings `longstr1` and `longstr2`,
     * and select which standard set of gravitational constants you want
     * by providing `gravity_constants`:
     *
     * `sgp4.propagation.wgs72` - Standard WGS 72 model
     * `sgp4.propagation.wgs84` - More recent WGS 84 model
     * `sgp4.propagation.wgs72old` - Legacy support for old SGP4 behavior
     *
     * Normally, computations are made using letious recent improvements
     * to the algorithm.  If you want to turn some of these off and go
     * back into "afspc" mode, then set `afspc_mode` to `True`.
     */

    function twoline2satrec(longstr1, longstr2) {
        var opsmode = 'i';
        var xpdotp = 1440.0 / (2.0 * pi); // 229.1831180523293;

        var year = 0;
        var satrec = {};
        satrec.error = 0;
        satrec.satnum = longstr1.substring(2, 7);
        satrec.epochyr = parseInt(longstr1.substring(18, 20), 10);
        satrec.epochdays = parseFloat(longstr1.substring(20, 32));
        satrec.ndot = parseFloat(longstr1.substring(33, 43));
        satrec.nddot = parseFloat(".".concat(parseInt(longstr1.substring(44, 50), 10), "E").concat(longstr1.substring(50, 52)));
        satrec.bstar = parseFloat("".concat(longstr1.substring(53, 54), ".").concat(parseInt(longstr1.substring(54, 59), 10), "E").concat(longstr1.substring(59, 61))); // satrec.satnum = longstr2.substring(2, 7);

        satrec.inclo = parseFloat(longstr2.substring(8, 16));
        satrec.nodeo = parseFloat(longstr2.substring(17, 25));
        satrec.ecco = parseFloat(".".concat(longstr2.substring(26, 33)));
        satrec.argpo = parseFloat(longstr2.substring(34, 42));
        satrec.mo = parseFloat(longstr2.substring(43, 51));
        satrec.no = parseFloat(longstr2.substring(52, 63)); // ---- find no, ndot, nddot ----

        satrec.no /= xpdotp; //   rad/min
        // satrec.nddot= satrec.nddot * Math.pow(10.0, nexp);
        // satrec.bstar= satrec.bstar * Math.pow(10.0, ibexp);
        // ---- convert to sgp4 units ----

        satrec.a = Math.pow(satrec.no * tumin, -2.0 / 3.0);
        satrec.ndot /= xpdotp * 1440.0; // ? * minperday

        satrec.nddot /= xpdotp * 1440.0 * 1440; // ---- find standard orbital elements ----

        satrec.inclo *= deg2rad;
        satrec.nodeo *= deg2rad;
        satrec.argpo *= deg2rad;
        satrec.mo *= deg2rad;
        satrec.alta = satrec.a * (1.0 + satrec.ecco) - 1.0;
        satrec.altp = satrec.a * (1.0 - satrec.ecco) - 1.0; // ----------------------------------------------------------------
        // find sgp4epoch time of element set
        // remember that sgp4 uses units of days from 0 jan 1950 (sgp4epoch)
        // and minutes from the epoch (time)
        // ----------------------------------------------------------------
        // ---------------- temp fix for years from 1957-2056 -------------------
        // --------- correct fix will occur when year is 4-digit in tle ---------

        if (satrec.epochyr < 57) {
            year = satrec.epochyr + 2000;
        } else {
            year = satrec.epochyr + 1900;
        }

        var mdhmsResult = days2mdhms(year, satrec.epochdays);
        var mon = mdhmsResult.mon,
            day = mdhmsResult.day,
            hr = mdhmsResult.hr,
            minute = mdhmsResult.minute,
            sec = mdhmsResult.sec;
        satrec.jdsatepoch = jday(year, mon, day, hr, minute, sec); //  ---------------- initialize the orbit at sgp4epoch -------------------

        sgp4init(satrec, {
            opsmode: opsmode,
            satn: satrec.satnum,
            epoch: satrec.jdsatepoch - 2433281.5,
            xbstar: satrec.bstar,
            xecco: satrec.ecco,
            xargpo: satrec.argpo,
            xinclo: satrec.inclo,
            xmo: satrec.mo,
            xno: satrec.no,
            xnodeo: satrec.nodeo
        });
        return satrec;
    }

    function _toConsumableArray(arr) {
        return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread();
    }

    function _arrayWithoutHoles(arr) {
        if (Array.isArray(arr)) {
            for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

            return arr2;
        }
    }

    function _iterableToArray(iter) {
        if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter);
    }

    function _nonIterableSpread() {
        throw new TypeError("Invalid attempt to spread non-iterable instance");
    }

    function propagate() {
        for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
        }

        // Return a position and velocity vector for a given date and time.
        var satrec = args[0];
        var date = Array.prototype.slice.call(args, 1);
        var j = jday.apply(void 0, _toConsumableArray(date));
        var m = (j - satrec.jdsatepoch) * minutesPerDay;
        return sgp4(satrec, m);
    }

    function dopplerFactor(location, position, velocity) {
        var currentRange = Math.sqrt(Math.pow(position.x - location.x, 2) + Math.pow(position.y - location.y, 2) + Math.pow(position.z - location.z, 2));
        var nextPos = {
            x: position.x + velocity.x,
            y: position.y + velocity.y,
            z: position.z + velocity.z
        };
        var nextRange = Math.sqrt(Math.pow(nextPos.x - location.x, 2) + Math.pow(nextPos.y - location.y, 2) + Math.pow(nextPos.z - location.z, 2));
        var rangeRate = nextRange - currentRange;

        function sign(value) {
            return value >= 0 ? 1 : -1;
        }

        rangeRate *= sign(rangeRate);
        var c = 299792.458; // Speed of light in km/s

        return 1 + rangeRate / c;
    }

    function radiansToDegrees(radians) {
        return radians * rad2deg;
    }
    function degreesToRadians(degrees) {
        return degrees * deg2rad;
    }
    function degreesLat(radians) {
        if (radians < -pi / 2 || radians > pi / 2) {
            throw new RangeError('Latitude radians must be in range [-pi/2; pi/2].');
        }

        return radiansToDegrees(radians);
    }
    function degreesLong(radians) {
        if (radians < -pi || radians > pi) {
            throw new RangeError('Longitude radians must be in range [-pi; pi].');
        }

        return radiansToDegrees(radians);
    }
    function radiansLat(degrees) {
        if (degrees < -90 || degrees > 90) {
            throw new RangeError('Latitude degrees must be in range [-90; 90].');
        }

        return degreesToRadians(degrees);
    }
    function radiansLong(degrees) {
        if (degrees < -180 || degrees > 180) {
            throw new RangeError('Longitude degrees must be in range [-180; 180].');
        }

        return degreesToRadians(degrees);
    }
    function geodeticToEcf(geodetic) {
        var longitude = geodetic.longitude,
            latitude = geodetic.latitude,
            height = geodetic.height;
        var a = 6378.137;
        var b = 6356.7523142;
        var f = (a - b) / a;
        var e2 = 2 * f - f * f;
        var normal = a / Math.sqrt(1 - e2 * (Math.sin(latitude) * Math.sin(latitude)));
        var x = (normal + height) * Math.cos(latitude) * Math.cos(longitude);
        var y = (normal + height) * Math.cos(latitude) * Math.sin(longitude);
        var z = (normal * (1 - e2) + height) * Math.sin(latitude);
        return {
            x: x,
            y: y,
            z: z
        };
    }
    function eciToGeodetic(eci, gmst) {
        // http://www.celestrak.com/columns/v02n03/
        var a = 6378.137;
        var b = 6356.7523142;
        var R = Math.sqrt(eci.x * eci.x + eci.y * eci.y);
        var f = (a - b) / a;
        var e2 = 2 * f - f * f;
        var longitude = Math.atan2(eci.y, eci.x) - gmst;

        while (longitude < -pi) {
            longitude += twoPi;
        }

        while (longitude > pi) {
            longitude -= twoPi;
        }

        var kmax = 20;
        var k = 0;
        var latitude = Math.atan2(eci.z, Math.sqrt(eci.x * eci.x + eci.y * eci.y));
        var C;

        while (k < kmax) {
            C = 1 / Math.sqrt(1 - e2 * (Math.sin(latitude) * Math.sin(latitude)));
            latitude = Math.atan2(eci.z + a * C * e2 * Math.sin(latitude), R);
            k += 1;
        }

        var height = R / Math.cos(latitude) - a * C;
        return {
            longitude: longitude,
            latitude: latitude,
            height: height
        };
    }
    function ecfToEci(ecf, gmst) {
        // ccar.colorado.edu/ASEN5070/handouts/coordsys.doc
        //
        // [X]     [C -S  0][X]
        // [Y]  =  [S  C  0][Y]
        // [Z]eci  [0  0  1][Z]ecf
        //
        var X = ecf.x * Math.cos(gmst) - ecf.y * Math.sin(gmst);
        var Y = ecf.x * Math.sin(gmst) + ecf.y * Math.cos(gmst);
        var Z = ecf.z;
        return {
            x: X,
            y: Y,
            z: Z
        };
    }
    function eciToEcf(eci, gmst) {
        // ccar.colorado.edu/ASEN5070/handouts/coordsys.doc
        //
        // [X]     [C -S  0][X]
        // [Y]  =  [S  C  0][Y]
        // [Z]eci  [0  0  1][Z]ecf
        //
        //
        // Inverse:
        // [X]     [C  S  0][X]
        // [Y]  =  [-S C  0][Y]
        // [Z]ecf  [0  0  1][Z]eci
        var x = eci.x * Math.cos(gmst) + eci.y * Math.sin(gmst);
        var y = eci.x * -Math.sin(gmst) + eci.y * Math.cos(gmst);
        var z = eci.z;
        return {
            x: x,
            y: y,
            z: z
        };
    }

    function topocentric(observerGeodetic, satelliteEcf) {
        // http://www.celestrak.com/columns/v02n02/
        // TS Kelso's method, except I'm using ECF frame
        // and he uses ECI.
        var longitude = observerGeodetic.longitude,
            latitude = observerGeodetic.latitude;
        var observerEcf = geodeticToEcf(observerGeodetic);
        var rx = satelliteEcf.x - observerEcf.x;
        var ry = satelliteEcf.y - observerEcf.y;
        var rz = satelliteEcf.z - observerEcf.z;
        var topS = Math.sin(latitude) * Math.cos(longitude) * rx + Math.sin(latitude) * Math.sin(longitude) * ry - Math.cos(latitude) * rz;
        var topE = -Math.sin(longitude) * rx + Math.cos(longitude) * ry;
        var topZ = Math.cos(latitude) * Math.cos(longitude) * rx + Math.cos(latitude) * Math.sin(longitude) * ry + Math.sin(latitude) * rz;
        return {
            topS: topS,
            topE: topE,
            topZ: topZ
        };
    }
    /**
     * @param {Object} tc
     * @param {Number} tc.topS Positive horizontal vector S due south.
     * @param {Number} tc.topE Positive horizontal vector E due east.
     * @param {Number} tc.topZ Vector Z normal to the surface of the earth (up).
     * @returns {Object}
     */


    function topocentricToLookAngles(tc) {
        var topS = tc.topS,
            topE = tc.topE,
            topZ = tc.topZ;
        var rangeSat = Math.sqrt(topS * topS + topE * topE + topZ * topZ);
        var El = Math.asin(topZ / rangeSat);
        var Az = Math.atan2(-topE, topS) + pi;
        return {
            azimuth: Az,
            elevation: El,
            rangeSat: rangeSat // Range in km

        };
    }

    function ecfToLookAngles(observerGeodetic, satelliteEcf) {
        var topocentricCoords = topocentric(observerGeodetic, satelliteEcf);
        return topocentricToLookAngles(topocentricCoords);
    }

    var indexUmd = {
        constants: constants,
        // Propagation
        propagate: propagate,
        sgp4: sgp4,
        twoline2satrec: twoline2satrec,
        gstime: gstime,
        jday: jday,
        invjday: invjday,
        dopplerFactor: dopplerFactor,
        // Coordinate transforms
        radiansToDegrees: radiansToDegrees,
        degreesToRadians: degreesToRadians,
        degreesLat: degreesLat,
        degreesLong: degreesLong,
        radiansLat: radiansLat,
        radiansLong: radiansLong,
        geodeticToEcf: geodeticToEcf,
        eciToGeodetic: eciToGeodetic,
        eciToEcf: eciToEcf,
        ecfToEci: ecfToEci,
        ecfToLookAngles: ecfToLookAngles
    };

    return indexUmd;

};
var jspredictx = function ()
{
    // Meteor includes the moment dependency differently than Npm or Bower,
    // so we need this hack (using m_moment) else it gets upset about moment = require('moment');
    // var m_moment;
    //
    // // Npm
    // if (typeof require !== 'undefined') {
    //     var satellite = require('satellite.js');
    //     m_moment = require('moment');
    // }
    // // Meteor
    // if (this.satellite) {
    //     var satellite = this.satellite;
    // }
    // m_moment = m_moment || moment;
    var xkmper = 6.378137E3; // earth radius (km) wgs84
    var astro_unit = 1.49597870691E8; // Astronomical unit - km (IAU 76)
    var solar_radius = 6.96000E5; // solar radius - km (IAU 76)
    var deg2rad = Math.PI / 180;
    var ms2day = 1000 * 60 * 60 * 24; // milliseconds to day
    var max_iterations = 25000;
    var defaultMinElevation = 4; // degrees

    var _jspredict = {
        observe: function(tle, qth, start) {
            var tles = tle.split('\n');
            var satrec = satellite.twoline2satrec(tles[1], tles[2]);

            if (this._badSat(satrec, qth, start)) {
                return null;
            }

            return this._observe(satrec, qth, start)
        },

        observes: function(tle, qth, start, end, interval) {
            start = m_moment(start);
            end = m_moment(end);

            var tles = tle.split('\n');
            var satrec = satellite.twoline2satrec(tles[1], tles[2]);

            if (this._badSat(satrec, qth, start)) {
                return null;
            }

            var observes = [], observed;
            var iterations = 0;
            while (start < end && iterations < max_iterations) {
                observed = this._observe(satrec, qth, start);
                if (!observed) {
                    break;
                }
                observes.push(observed);
                start.add(interval);
                iterations += 1;
            }

            return observes
        },

        transits: function(tle, qth, start, end, minElevation, maxTransits) {
            start = m_moment(start);
            end = m_moment(end);

            if (!minElevation) {
                minElevation = defaultMinElevation;
            }

            if (!maxTransits) {
                maxTransits = max_iterations;
            }

            var tles = tle.split('\n');
            var satrec = satellite.twoline2satrec(tles[1], tles[2]);
            if (this._badSat(satrec, qth, start)) {
                return [];
            }

            var time = start.valueOf();
            var transits = [];
            var nextTransit;
            var iterations = 0;

            while (iterations < max_iterations && transits.length < maxTransits) {
                transit = this._quickPredict(satrec, qth, time);
                if (!transit) {
                    break;
                }
                if (transit.end > end.valueOf()) {
                    break;
                }
                if (transit.end > start.valueOf() && transit.maxElevation > minElevation) {
                    transits.push(transit);
                }
                time = transit.end + 60 * 1000;
                iterations += 1;
            }

            return transits
        },

        _observe: function(satrec, qth, start) {
            start = m_moment(start);
            var eci = this._eci(satrec, start);
            var gmst = this._gmst(start);
            if (!eci.position) {
                return null;
            }
            var geo = satellite.eciToGeodetic(eci.position, gmst);

            var solar_vector = this._calculateSolarPosition(start.valueOf());
            var eclipse = this._satEclipsed(eci.position, solar_vector);

            var track = {
                eci: eci,
                gmst: gmst,
                latitude: geo.latitude / deg2rad,
                longitude: this._boundLongitude(geo.longitude / deg2rad),
                altitude: geo.height,
                footprint: 12756.33 * Math.acos(xkmper / (xkmper + geo.height)),
                sunlit: !eclipse.eclipsed,
                eclipseDepth: eclipse.depth / deg2rad
            }

            // If we have a groundstation let's get those additional observe parameters
            if (qth && qth.length == 3) {
                var observerGd = {
                    longitude: qth[1] * deg2rad,
                    latitude: qth[0] * deg2rad,
                    height: qth[2]
                }

                var positionEcf = satellite.eciToEcf(eci.position, gmst),
                    velocityEcf = satellite.eciToEcf(eci.velocity, gmst),
                    observerEcf = satellite.geodeticToEcf(observerGd),
                    lookAngles = satellite.ecfToLookAngles(observerGd, positionEcf),
                    doppler = satellite.dopplerFactor(observerEcf, positionEcf, velocityEcf);

                track.azimuth = lookAngles.azimuth / deg2rad;
                track.elevation = lookAngles.elevation / deg2rad;
                track.rangeSat = lookAngles.rangeSat;
                track.doppler = doppler;
                track.positionEcf = positionEcf;
            }

            return track
        },

        _quickPredict: function(satrec, qth, start) {
            var transit = {};
            var lastel = 0;
            var iterations = 0;

            if (this._badSat(satrec, qth, start)) {
                return null;
            }

            var daynum = this._findAOS(satrec, qth, start);
            if (!daynum) {
                return null;
            }
            transit.start = daynum;

            var observed = this._observe(satrec, qth, daynum);
            if (!observed) {
                return null;
            }

            var iel = Math.round(observed.elevation);

            var maxEl = 0, apexAz = 0, minAz = 360, maxAz = 0;

            while (iel >= 0 && iterations < max_iterations) {
                lastel = iel;
                daynum = daynum + ms2day * Math.cos((observed.elevation-1.0)*deg2rad)*Math.sqrt(observed.altitude)/25000.0;
                observed = this._observe(satrec, qth, daynum);
                iel = Math.round(observed.elevation);
                if (maxEl < observed.elevation) {
                    maxEl = observed.elevation;
                    apexAz = observed.azimuth;
                }
                maxAz = Math.max(maxAz, observed.azimuth);
                minAz = Math.min(minAz, observed.azimuth);
                iterations += 1;
            }
            if (lastel !== 0) {
                daynum = this._findLOS(satrec, qth, daynum);
            }

            transit.end = daynum;
            transit.maxElevation = maxEl;
            transit.apexAzimuth = apexAz;
            transit.maxAzimuth = maxAz;
            transit.minAzimuth = minAz;
            transit.duration = transit.end - transit.start;

            return transit
        },

        _badSat: function(satrec, qth, start) {
            if (qth && !this._aosHappens(satrec, qth)) {
                return true
            } else if (start && this._decayed(satrec, start)) {
                return true
            } else {
                return false
            }
        },

        _aosHappens: function(satrec, qth) {
            var lin, sma, apogee;
            var meanmo = satrec.no * 24 * 60 / (2 * Math.PI); // convert rad/min to rev/day
            if (meanmo === 0) {
                return false
            } else {
                lin = satrec.inclo / deg2rad;

                if (lin >= 90.0) {
                    lin = 180.0 - lin;
                }

                sma = 331.25 * Math.exp(Math.log(1440.0/meanmo)*(2.0/3.0));
                apogee = sma * (1.0 + satrec.ecco) - xkmper;

                if ((Math.acos(xkmper/(apogee+xkmper))+(lin*deg2rad)) > Math.abs(qth[0]*deg2rad)) {
                    return true
                } else {
                    return false
                }
            }
        },

        _decayed: function(satrec, start) {
            start = m_moment(start);

            var satepoch = m_moment.utc(satrec.epochyr, "YY").add(satrec.epochdays, 'days').valueOf();

            var meanmo = satrec.no * 24 * 60 / (2 * Math.PI); // convert rad/min to rev/day
            var drag = satrec.ndot * 24 * 60 * 24 * 60 / (2 * Math.PI); // convert rev/day^2

            if (satepoch + ms2day * ((16.666666-meanmo)/(10.0*Math.abs(drag))) < start) {
                return true
            } else {
                return false
            }
        },

        _findAOS: function(satrec, qth, start) {
            var current = start;
            var observed = this._observe(satrec, qth, current);
            if (!observed) {
                return null;
            }
            var aostime = 0;
            var iterations = 0;

            if (observed.elevation > 0) {
                return current
            }
            while (observed.elevation < -1 && iterations < max_iterations) {
                current = current - ms2day * 0.00035*(observed.elevation*((observed.altitude/8400.0)+0.46)-2.0);
                observed = this._observe(satrec, qth, current);
                if (!observed) {
                    break;
                }
                iterations += 1;
            }
            iterations = 0;
            while (aostime === 0 && iterations < max_iterations) {
                if (!observed) {
                    break;
                }
                if (Math.abs(observed.elevation) < 0.50) { // this was 0.03 but switched to 0.50 for performance
                    aostime = current;
                } else {
                    current = current - ms2day * observed.elevation * Math.sqrt(observed.altitude)/530000.0;
                    observed = this._observe(satrec, qth, current);
                }
                iterations += 1;
            }
            if (aostime === 0) {
                return null;
            }
            return aostime
        },

        _findLOS: function(satrec, qth, start) {
            var current = start;
            var observed = this._observe(satrec, qth, current);
            var lostime = 0;
            var iterations = 0;

            while (lostime === 0 && iterations < max_iterations) {
                if (Math.abs(observed.elevation) < 0.50) { // this was 0.03 but switched to 0.50 for performance
                    lostime = current;
                } else {
                    current = current + ms2day * observed.elevation * Math.sqrt(observed.altitude)/502500.0;
                    observed = this._observe(satrec, qth, current);
                    if (!observed) {
                        break;
                    }
                }
                iterations += 1;
            }
            return lostime
        },

        _eci: function(satrec, date) {
            date = new Date(date.valueOf());
            return satellite.propagate(
                satrec,
                date.getUTCFullYear(),
                date.getUTCMonth() + 1, // months range 1-12
                date.getUTCDate(),
                date.getUTCHours(),
                date.getUTCMinutes(),
                date.getUTCSeconds()
            );
        },

        _gmst: function(date) {
            date = new Date(date.valueOf());
            return satellite.gstime(
                date.getUTCFullYear(),
                date.getUTCMonth() + 1, // months range 1-12
                date.getUTCDate(),
                date.getUTCHours(),
                date.getUTCMinutes(),
                date.getUTCSeconds()
            );
        },

        _boundLongitude: function(longitude) {
            while (longitude < -180) {
                longitude += 360;
            }
            while (longitude > 180) {
                longitude -= 360;
            }
            return longitude
        },

        _satEclipsed: function(pos, sol) {
            var sd_earth = Math.asin(xkmper / this._magnitude(pos));
            var rho = this._vecSub(sol, pos);
            var sd_sun = Math.asin(solar_radius / rho.w);
            var earth = this._scalarMultiply(-1, pos);
            var delta = this._angle(sol, earth);

            var eclipseDepth = sd_earth - sd_sun - delta;
            var eclipse;
            if (sd_earth < sd_sun) {
                eclipse = false;
            } else if (eclipseDepth >= 0) {
                eclipse = true;
            } else {
                eclipse = false;
            }
            return {
                depth: eclipseDepth,
                eclipsed: eclipse
            }
        },

        _calculateSolarPosition: function(start) {
            var time = start / ms2day + 2444238.5; // jul_utc

            var mjd = time - 2415020.0;
            var year = 1900 + mjd / 365.25;
            var T = (mjd + this._deltaET(year) / (ms2day / 1000)) / 36525.0;
            var M = deg2rad * ((358.47583 + ((35999.04975 * T) % 360) - (0.000150 + 0.0000033 * T) * Math.pow(T, 2)) % 360);
            var L = deg2rad * ((279.69668 + ((36000.76892 * T) % 360) + 0.0003025 * Math.pow(T, 2)) % 360);
            var e = 0.01675104 - (0.0000418 + 0.000000126 * T) * T;
            var C = deg2rad * ((1.919460 - (0.004789 + 0.000014 * T) * T) * Math.sin(M) + (0.020094 - 0.000100 * T) * Math.sin(2 * M) + 0.000293 * Math.sin(3 * M));
            var O = deg2rad * ((259.18 - 1934.142 * T) % 360.0);
            var Lsa = (L + C - deg2rad * (0.00569 - 0.00479 * Math.sin(O))) % (2 * Math.PI);
            var nu = (M + C) % (2 * Math.PI);
            var R = 1.0000002 * (1 - Math.pow(e, 2)) / (1 + e * Math.cos(nu));
            var eps = deg2rad * (23.452294 - (0.0130125 + (0.00000164 - 0.000000503 * T) * T) * T + 0.00256 * Math.cos(O));
            var R = astro_unit * R;

            return {
                x: R * Math.cos(Lsa),
                y: R * Math.sin(Lsa) * Math.cos(eps),
                z: R * Math.sin(Lsa) * Math.sin(eps),
                w: R
            }
        },

        _deltaET: function(year) {
            return 26.465 + 0.747622 * (year - 1950) + 1.886913 * Math.sin((2 * Math.PI) * (year - 1975) / 33)
        },

        _vecSub: function(v1, v2) {
            var vec = {
                x: v1.x - v2.x,
                y: v1.y - v2.y,
                z: v1.z - v2.z
            }
            vec.w = this._magnitude(vec);
            return vec
        },

        _scalarMultiply: function(k, v) {
            return {
                x: k * v.x,
                y: k * v.y,
                z: k * v.z,
                w: v.w ? Math.abs(k) * v.w : undefined
            }
        },

        _magnitude: function(v) {
            return Math.sqrt(Math.pow(v.x, 2) + Math.pow(v.y, 2) + Math.pow(v.z, 2))
        },

        _angle: function(v1, v2) {
            var dot = (v1.x * v2.x + v1.y * v2.y + v1.z * v2.z);
            return Math.acos(dot / (this._magnitude(v1) * this._magnitude(v2)))
        }
    }

    return _jspredict;
};
// 上边是个 lib js
var m_moment =  new moment();
var satellite =  new satellitex();
var jspredict = new jspredictx();

//  创建CZML的内容
function createOrbitCzml(stm,etm,timeStep,cartesian){
}
// 获取运行圈数
function getZhouQi(longstr2){
    var xpdotp = 1440.0 / (2.0 * Math.PI); // 229.1831180523293;
    var year = 0;
    var satrec = {};
    satrec.error = 0;
    satrec.inclo = parseFloat(longstr2.substring(8, 16));
    satrec.nodeo = parseFloat(longstr2.substring(17, 25));
    satrec.ecco = parseFloat(".".concat(longstr2.substring(26, 33)));
    satrec.argpo = parseFloat(longstr2.substring(34, 42));
    satrec.mo = parseFloat(longstr2.substring(43, 51));
    satrec.no = parseFloat(longstr2.substring(52, 63));
    return satrec;
}
// 获取卫星的环绕一周的长度
function getGuiJILong(position){
    var l =0;
    l = 2*Math.PI*(6370*1000+position.altitude);
    l = l*1.1;// 加长点
    // return Math.abs(position.positionEcf.z);
    return Math.abs(position.rangeSat);
}


function doCalculation(parameters, colors) {
    // calculate some result using the inputs in paramete
    // rs
    // 根据两行根数计算 轨迹
    // jspredictx.max_iterations = 2500 ;
    let stname =  parameters.fSatelliteName+'_'+parameters.fSensor;
    let fTwoLineRootFirst = parameters.fTwoLineRootFirst;
    let fTwoLineRootLast =  parameters.fTwoLineRootLast;
    console.log(stname)
    let oooo = getZhouQi(fTwoLineRootLast)
    let tle = '0 '+stname+'\n'+fTwoLineRootFirst+'\n'+fTwoLineRootLast
    // 2020-08-06T13:08:00+00:00/2020-08-07T13:08:00+00:00
    var stm = new Date();
    var etm = new Date();
    etm.setSeconds((stm.getSeconds()+1440*60) * 7); // 前进一天
    let sdate = stm
    let edate = etm
    let result = jspredict.observes(tle, [0,0,0], stm, etm, 5*60*1000) // 每一分钟获取一个点 ，一共1440个点
    // let result = jspredict.observes(tle, null, new Date("2020-08-04 00:00:01"), new Date("2020-08-04 23:59:59"), 60*1000)
    // 当前时间 = 包含时差的当前时间 + 时差时间，getTimezoneOffset() 获取时差（以分钟为单位），转为小时需要除以 60
    // sdate.setHours(sdate.getHours() )
    // edate.setHours(edate.getHours() )
    var stm = sdate.toISOString(); // "2019-09-03T15:05:00+00:00"
    // stm = "2020-08-06T13:08:00+00:00"
    var etm = edate.toISOString();
    // etm = "2020-08-07T13:08:00+00:00"
    var stm_etm =  stm+"/"+etm;
    // console.log(result)
    let ll = []
    let list = []
    let cartesian = [] // 笛卡尔坐标系
    let trailTimes = []
    let leadTimes = []
    let cartographicDegrees = []
    let preLit = null // 上一个
    let timeStep = 5*60
    let yuanshouTime = Math.round(Math.round((1440/oooo.no) * 1) /5 ) //分钟
    // let yuanshouTime = 1460 //分钟
    var lll = getGuiJILong(result[0]); //周长距离 要计算的
    var radius = lll/(2*Math.PI)*1000;
    // var lll = 888000; //周长距离 要计算的
    // 根据
    console.log(result.length)
    for (var j = 0; j < result.length; j++) {
        var item = result[j]
        // console.log(item)
        // if(preLit!=null && preLit ===item.sunlit){
        //     list.push(item.longitude);
        //     list.push(item.latitude);
        // }else if(preLit!=null && preLit !==item.sunlit){
        //     preLit = item.sunlit;
        //     ll.push(list);
        //     list = []
        //     list.push(item.longitude);
        //     list.push(item.latitude);
        // }else{
        //     preLit = item.sunlit;
        //     list.push(item.longitude);
        //     list.push(item.latitude);
        // }
        list.push(item.longitude);
        list.push(item.latitude);
        cartographicDegrees.push(timeStep);
        cartographicDegrees.push(item.longitude);
        cartographicDegrees.push(item.latitude);
        cartographicDegrees.push(10);
        // let ddd = CesiumX.Cartesian3.fromDegrees(item.longitude, item.latitude, item.altitude);
        // cartesian.push(timeStep*j);
        // cartesian.push(ddd.x);
        // cartesian.push(ddd.y);
        // cartesian.push(ddd.z);
        // 惯性坐标系 ECI
        cartesian.push(timeStep*j);
        cartesian.push(item.eci.position.x * 1000);
        cartesian.push(item.eci.position.y * 1000);
        cartesian.push(item.eci.position.z * 1000);

        // item.footprint

        //ECEF 固定坐标系
        // cartesian.push(timeStep*j);
        // cartesian.push(item.positionEcf.x * 1000);
        // cartesian.push(item.positionEcf.y * 1000);
        // cartesian.push(item.positionEcf.z * 1000);

        if(j % yuanshouTime === 0){

            let curTime = new Date(stm)
            curTime.setSeconds(curTime.getSeconds()+timeStep*j);
            curTime =  curTime.toISOString()
            let curTime2 = new Date(stm)
            curTime2.setSeconds(curTime2.getSeconds()+timeStep*j+yuanshouTime*60*5);
            curTime2 =  curTime2.toISOString()
            let trailTime =  {
                "number": [
                    0,
                    0,
                    lll,
                    lll
                ],
                "epoch": curTime,
                "interval": curTime+"/"+curTime2
            }
            trailTimes.push(trailTime);
            let leadTime =  {
                "number": [
                    0,
                    lll,
                    lll,
                    0
                ],
                "epoch": curTime,
                "interval": curTime+"/"+curTime2
            }
            leadTimes.push(leadTime);
        }
    }

    var czml = [
        {
            id: "document",
            name: stname,
            version: "1.0",
            clock: {
                step: "SYSTEM_CLOCK_MULTIPLIER",
                interval: stm_etm,
                currentTime: stm,
                multiplier: 60,
            },
        },
        {
            "billboard": {
                "scale": 1.5,
                "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAADJSURBVDhPnZHRDcMgEEMZjVEYpaNklIzSEfLfD4qNnXAJSFWfhO7w2Zc0Tf9QG2rXrEzSUeZLOGm47WoH95x3Hl3jEgilvDgsOQUTqsNl68ezEwn1vae6lceSEEYvvWNT/Rxc4CXQNGadho1NXoJ+9iaqc2xi2xbt23PJCDIB6TQjOC6Bho/sDy3fBQT8PrVhibU7yBFcEPaRxOoeTwbwByCOYf9VGp1BYI1BA+EeHhmfzKbBoJEQwn1yzUZtyspIQUha85MpkNIXB7GizqDEECsAAAAASUVORK5CYII=",
                "show": true
            },
            "label": {
                "fillColor": {
                    "rgba":parameters.colors
                    //     [
                    //     "213",
                    //     "255",
                    //     "0",
                    //     255
                    // ]
                },
                "pixelOffset": {
                    "cartesian2": [
                        12,
                        0
                    ]
                },
                "font": "11pt Lucida Console",
                "text": parameters.fSatelliteName,
                "horizontalOrigin": "LEFT",
                "showBackground":true,
                "outlineColor": {
                    "rgba": parameters.colors
                },
                "outlineWidth": 2,
                "show": true
            },
            "description": "Orbit of Satellite:  "+stname,
            "position": {
                "interpolationAlgorithm": "LAGRANGE",
                "cartesian": cartesian,
                "epoch": stm,
                "interpolationDegree": 5,
                "referenceFrame": "INERTIAL"
            },
            "path": {
                "material": {
                    "solidColor": {
                        "color": {
                            "rgba": parameters.colors
                        }
                    }
                },
                "trailTime":trailTimes,
                "leadTime": leadTimes,
                "resolution": 120,
                "width": 1,
                "show": [
                    {
                        "boolean": true,
                        "interval": stm_etm
                    }
                ]
            },
            "availability": stm_etm,
            "id": "Satellite/"+stname
        },

        {
            id: stname+"_point",
            availability: stm_etm,
            position: {
                epoch: stm,
                cartographicDegrees: cartographicDegrees
            },
            point: {
                color: {
                    rgba: [255, 255, 255, 128],
                },
                outlineColor: {
                    rgba: [255, 0, 0, 128],
                },
                outlineWidth: 3,
                pixelSize: 15,
            },
        },
        // {
        //     "id":stname+"_point"+"/Point-to-Satellite/"+stname,
        //     "name":stname+" to "+stname,
        //     "availability":[stm_etm],
        //     "description":stname+"_point"+"/Point-to-Satellite/"+stname,
        //     "polyline":{
        //         "width":2,
        //         "material":{
        //             "solidColor":{"color":{"rgba":[0,255,55,255]}}
        //         },
        //         "arcType":"NONE",
        //         "positions":{
        //             "references":[stname+"_point"+"#position","Satellite/"+stname+"#position"]
        //         }
        //     }
        // }
    ];

    // console.log(czml)
    // console.log(JSON.stringify(czml))
    return {n:parameters,czml:czml,radius:radius,color:parameters.colors,lll:list};
}
var result = createTaskProcessorWorker(doCalculation);
export default result;