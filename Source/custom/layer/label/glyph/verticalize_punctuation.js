import scriptDetection from './script_detection';
 function verticalizePunctuation(input) {
    let output = '';

    for (let i = 0; i < input.length; i++) {
        const nextCharCode = input.charCodeAt(i + 1) || null;
        const prevCharCode = input.charCodeAt(i - 1) || null;

        const canReplacePunctuation = (
            (!nextCharCode || !scriptDetection.charHasRotatedVerticalOrientation(nextCharCode) || lookup[input[i + 1]]) &&
            (!prevCharCode || !scriptDetection.charHasRotatedVerticalOrientation(prevCharCode) || lookup[input[i - 1]])
        );

        if (canReplacePunctuation && lookup[input[i]]) {
            output += lookup[input[i]];
        } else {
            output += input[i];
        }
    }

    return output;
};

let lookup = {
    '!': '︕',
    '#': '＃',
    '$': '＄',
    '%': '％',
    '&': '＆',
    '(': '︵',
    ')': '︶',
    '*': '＊',
    '+': '＋',
    ',': '︐',
    '-': '︲',
    '.': '・',
    '/': '／',
    ':': '︓',
    ';': '︔',
    '<': '︿',
    '=': '＝',
    '>': '﹀',
    '?': '︖',
    '@': '＠',
    '[': '﹇',
    '\\': '＼',
    ']': '﹈',
    '^': '＾',
    '_': '︳',
    '`': '｀',
    '{': '︷',
    '|': '―',
    '}': '︸',
    '~': '～',
    '¢': '￠',
    '£': '￡',
    '¥': '￥',
    '¦': '￤',
    '¬': '￢',
    '¯': '￣',
    '–': '︲',
    '—': '︱',
    '‘': '﹃',
    '’': '﹄',
    '“': '﹁',
    '”': '﹂',
    '…': '︙',
    '‧': '・',
    '₩': '￦',
    '、': '︑',
    '。': '︒',
    '〈': '︿',
    '〉': '﹀',
    '《': '︽',
    '》': '︾',
    '「': '﹁',
    '」': '﹂',
    '『': '﹃',
    '』': '﹄',
    '【': '︻',
    '】': '︼',
    '〔': '︹',
    '〕': '︺',
    '〖': '︗',
    '〗': '︘',
    '！': '︕',
    '（': '︵',
    '）': '︶',
    '，': '︐',
    '－': '︲',
    '．': '・',
    '：': '︓',
    '；': '︔',
    '＜': '︿',
    '＞': '﹀',
    '？': '︖',
    '［': '﹇',
    '］': '﹈',
    '＿': '︳',
    '｛': '︷',
    '｜': '―',
    '｝': '︸',
    '｟': '︵',
    '｠': '︶',
    '｡': '︒',
    '｢': '﹁',
    '｣': '﹂'
};

export default {verticalizePunctuation,lookup};
