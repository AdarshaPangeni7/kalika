// Serbian script conversion, not translation or spelling correction.
export const LIMIT = 100000;
const latin = [...'abvgdđežzijk l m n o p r s t ć u f h c č š'.replaceAll(' ', '')];
const cyrillic = [...'абвгдђежзијклмнопрстћуфхцчш'];
const toCyr = Object.fromEntries(latin.map((letter, i) => [letter, cyrillic[i]]));
const toLat = Object.fromEntries(latin.map((letter, i) => [cyrillic[i], letter]));
Object.assign(toLat, {'љ':'lj','њ':'nj','џ':'dž'});
const pairs = {'lj':'љ','nj':'њ','dž':'џ'};
// Bounded, explicit exception families; not a dictionary or morphological parser.
function separatePair(word, index) {
 const lower = word.toLowerCase();
 if (index === 1 && /^injek/.test(lower)) return true;
 if (index === 2 && /^konju(?:g|nk)/.test(lower)) return true;
 if (index === 2 && /^tanjug/.test(lower)) return true;
 if (index === 2 && /^nadživ/.test(lower)) return true;
 return false;
}
function wordToCyr(word) {
 let out = '';
 for(let i = 0; i < word.length; i++) {
  const character = word[i], pair = word.slice(i, i + 2).toLowerCase();
  if(pairs[pair] && !separatePair(word, i)) {
   out += character === character.toUpperCase() ? pairs[pair].toUpperCase() : pairs[pair]; i++; continue;
  }
  const replacement = toCyr[character.toLowerCase()];
  out += replacement ? (character === character.toUpperCase() ? replacement.toUpperCase() : replacement) : character;
 }
 return out;
}
function wordToLat(word) {
 const allCaps = word === word.toUpperCase() && word !== word.toLowerCase();
 return [...word].map(character => {
  const replacement = toLat[character.toLowerCase()];
  if(!replacement) return character;
  if(character === character.toLowerCase()) return replacement;
  return allCaps ? replacement.toUpperCase() : replacement[0].toUpperCase() + replacement.slice(1);
 }).join('');
}
export function convert(text, direction = 'cyrillic', preserveLinks = true) {
 if(typeof text !== 'string') throw new TypeError('Text must be a string.');
 if(text.length > LIMIT) throw new RangeError('100000');
 if(!['cyrillic','latin'].includes(direction)) throw new RangeError('Unknown direction.');
 let protectedCount = 0;
 const convertWords = value => value.normalize('NFC').replace(/[\p{L}\p{M}]+/gu, direction === 'cyrillic' ? wordToCyr : wordToLat);
 // Process matches as segments; never inject sentinel strings into user content.
 const pattern = preserveLinks
  ? /\[\[([\s\S]*?)\]\]|(?:https?:\/\/|www\.)[^\s<>"\[\]]+|[\p{L}\p{N}._%+\-]+@[\p{L}\p{N}.\-]+\.[\p{L}]{2,}/giu
  : /\[\[([\s\S]*?)\]\]/gu;
 let output = '', protectedText = '', start = 0;
 for(const match of text.matchAll(pattern)) {
  const segment = convertWords(text.slice(start, match.index));
  output += segment; protectedText += segment;
  output += match[1] ?? match[0]; protectedText += match[0]; protectedCount++; start = match.index + match[0].length;
 }
 const tail = convertWords(text.slice(start)); output += tail; protectedText += tail;
 return {text:output,protectedText,protectedCount,unclosedProtection:text.replace(/\[\[[\s\S]*?\]\]/g,'').includes('[[')};
}
