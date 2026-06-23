import type { StateHandler, IncomingMessage, ConversationContext, HandlerResult, ConversationState } from '../types';

/**
 * Extracts the actual name from natural-language phrases.
 *
 * Examples handled:
 *   "meu nome é Lucas"      → "Lucas"
 *   "me chamo Pedro Silva"  → "Pedro Silva"
 *   "pode me chamar de Ana" → "Ana"
 *   "sou o João"            → "João"
 *   "Lucas"                 → "Lucas"  (direct — already works)
 */
const extractName = (text: string): string => {
  const t = text.trim();

  const patterns = [
    /^meu nome [eé]\s+(.+)$/i,
    /^me chamo\s+(.+)$/i,
    /^pode(?:m)? me chamar de\s+(.+)$/i,
    /^chame?-?me de\s+(.+)$/i,
    /^sou (?:o |a )?(.+)$/i,
    /^nome[:\s]+(.+)$/i,
  ];

  for (const pattern of patterns) {
    const match = t.match(pattern);

    if (match?.[1]) {
      return capitalizeName(match[1].trim());
    }
  }

  return capitalizeName(t);
};

/** Capitalizes the first letter of every word, preserving the rest as typed. */
const capitalizeName = (name: string): string =>
  name
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

/** Lowercase, accent-free, letters only — e.g. "Oláá" → "olaa", "José" → "jose". */
const lettersOnly = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '') // drop diacritics (á → a)
    .replace(/[^a-z]/g, ''); // keep only a–z

/** Collapses runs of the same letter: "oii" → "oi", "olaaa" → "ola". */
const collapseRepeats = (text: string): string => text.replace(/(.)\1+/g, '$1');

/** Names need at least this many letters so short ones like "Ana"/"Bia" still pass. */
const MIN_NAME_LETTERS = 3;

/**
 * Greetings that survive the letter-count check but are clearly not names.
 * Written naturally here, then reduced to a comparable core (lowercase, no
 * accents, letters only, repeated letters collapsed) so that every elongation
 * maps to the same entry: "oii"/"oiii" → "oi", "oláá"/"olaa"/"olaaa" → "ola".
 */
const GREETINGS = new Set(
  [
    'oi',
    'oie',
    'oin',
    'olá',
    'ola',
    'alô',
    'alo',
    'e aí',
    'eai',
    'e aê',
    'eae',
    'iai',
    'opa',
    'salve',
    'bom dia',
    'boa tarde',
    'boa noite',
    'bom',
    'boa',
    'tudo bem',
    'tudo bom',
    'como vai',
    'hi',
    'hey',
    'hello',
  ].map(greeting => collapseRepeats(lettersOnly(greeting)))
);

/**
 * A reply only counts as a name when it has at least MIN_NAME_LETTERS letters
 * (so "Ana"/"Bia" pass) and isn't a disguised greeting ("oii", "olaa", "bom dia").
 * Otherwise we re-prompt instead of saving the greeting as the lead's name.
 */
const isLikelyName = (name: string): boolean => {
  const letters = lettersOnly(name);

  if (letters.length < MIN_NAME_LETTERS) {
    return false;
  }

  return !GREETINGS.has(collapseRepeats(letters));
};

export class AwaitingNameHandler implements StateHandler {
  canHandle(state: ConversationState | null): boolean {
    return state === 'AWAITING_NAME';
  }

  async handle(msg: IncomingMessage, _ctx: ConversationContext): Promise<HandlerResult> {
    const raw = msg.text?.trim();

    if (!raw) {
      return {
        sendMessages: [{ text: 'Por favor, me informe seu nome para continuarmos. 😊' }],
      };
    }

    const name = extractName(raw);

    // The lead replied with a greeting (or something too short) instead of a name.
    // Stay in AWAITING_NAME and ask again rather than saving "oi"/"olá" as the name.
    if (!isLikelyName(name)) {
      return {
        sendMessages: [{ text: 'Hmm, não consegui identificar seu nome 😅 Como você gostaria de ser chamado?' }],
      };
    }

    return {
      leadUpdates: { name },
      nextState: 'AWAITING_ADDRESS_ZIP',
      cancelFollowUps: true,
      sendMessages: [
        {
          text: `Olá, ${name}! 😊 Para verificar a cobertura de internet na sua região, precisamos do seu endereço. Qual é o seu CEP? (apenas os 8 números)`,
        },
      ],
    };
  }
}
