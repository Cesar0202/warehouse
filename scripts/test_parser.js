import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/catalogo.json'), 'utf8'));
const aliases = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/alias.json'), 'utf8'));

const catalogMap = new Map();
for (const item of catalog) {
  catalogMap.set(item.cod_arti.toUpperCase().trim(), item);
}

const normalizeString = (str) => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s\/\.\-\"\']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const extractQuantityAndTerm = (rawLine) => {
  let text = rawLine.trim();
  text = text.replace(/^[\-\*•\+\>\[\]]+\s*/, '').trim();
  text = text.replace(/^\d+[\.\)]\s+/, '').trim();

  const unitPattern = '(?:und|unid|unidades|unidad|rollos|rollo|piezas|pzas|pza|tubos|tubo|paquetes|paq|cajas|cja|frascos|frasco|botellas|botella|bot|latas|lata|tarros|tarro|potes|pote|bidones|bidon|baldes|balde|galones|gal|litros|lt|lts|metros|mts|m|docenas|doc|pares|par|tiras|tira|varillas|varilla|planchas|plancha|juegos|juego|set|kit)';

  const leadingRegex = new RegExp(
    `^(?:cant(?:idad)?[\\:\\=\\s]+|x\\s*)?(\\d+(?:[\\.,]\\d+)?)\\s*(?:${unitPattern}\\s+)?(?:de\\s+)?(.*)$`,
    'i'
  );
  let match = text.match(leadingRegex);
  if (match && match[2] && match[2].trim().length > 0) {
    const rawVal = match[1].replace(',', '.');
    const qty = parseFloat(rawVal) || 1;
    const term = match[2].trim();
    return { qty, cleanedText: term };
  }

  const trailingRegex = new RegExp(
    `^(.*?)\\s+(?:cant(?:idad)?[\\:\\=\\s]+|x\\s*)?(\\d+(?:[\\.,]\\d+)?)\\s*(?:${unitPattern})?$`,
    'i'
  );
  match = text.match(trailingRegex);
  if (match && match[1] && match[2]) {
    const term = match[1].trim();
    if (!term.endsWith('/') && !term.match(/\b\d+$/)) {
      const rawVal = match[2].replace(',', '.');
      const qty = parseFloat(rawVal) || 1;
      return { qty, cleanedText: term };
    }
  }

  const infixRegex = new RegExp(
    `^([a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+?)\\s+(\\d+(?:[\\.,]\\d+)?)\\s*(?:${unitPattern})?\\s+(.+)$`,
    'i'
  );
  match = text.match(infixRegex);
  if (match && match[1] && match[2] && match[3]) {
    const term = `${match[1]} ${match[3]}`.trim();
    const rawVal = match[2].replace(',', '.');
    const qty = parseFloat(rawVal) || 1;
    return { qty, cleanedText: term };
  }

  return {
    qty: 1,
    cleanedText: text
  };
};

const findContainedAlias = (searchTarget) => {
  const normTarget = normalizeString(searchTarget);
  const sorted = [...aliases].sort((a, b) => b.alias.length - a.alias.length);

  for (const item of sorted) {
    const normAlias = normalizeString(item.alias);
    if (!normAlias) continue;
    const regex = new RegExp(`(?:^|\\s)${normAlias}(?:$|\\s)`, 'i');
    if (regex.test(normTarget)) {
      return item;
    }
  }
  return null;
};

// Test "drano 2 botellas"
const raw = "drano 2 botellas";
const { qty, cleanedText } = extractQuantityAndTerm(raw);
console.log('Extracted:', { qty, cleanedText });

const alias = findContainedAlias(cleanedText);
console.log('Matched alias:', alias);

const item = alias ? catalogMap.get(alias.cod_arti) : null;
console.log('Catalog item:', item);

if (qty === 2 && item && item.cod_arti === 'DES01' && item.descripcion === 'DESATORADOR') {
  console.log('\n>>> SUCCESS: "drano 2 botellas" perfectly identified as DES01 (DESATORADOR) with Quantity 2 and Stock: ' + item.stock + '! <<<');
} else {
  console.log('\n>>> FAILED <<<');
  process.exit(1);
}
