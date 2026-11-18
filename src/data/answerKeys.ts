/**
 * Answer keys for auto-graded lab questions.
 *
 * Keys are optional: every question is completeness-graded (answered or
 * not) without one. Add a key for questions with an objective answer and
 * scripts/grade-submissions.mjs will score them too.
 *
 * Find question ids with:  npm run dump-questions
 *
 * accept  - list of accepted answers. Each entry is matched against the
 *           student's answer (lowercased, whitespace collapsed):
 *             - a plain string  -> correct if the answer CONTAINS it
 *             - 're:PATTERN'    -> correct if the regex matches
 * all     - true = every entry must match; default = any entry matches
 * note    - shown to the teacher in the feedback file
 */
export interface AnswerKey {
  accept: string[];
  all?: boolean;
  note?: string;
}

export const ANSWER_KEYS: Record<string, Record<string, AnswerKey>> = {
  '1.1c': {
    '1.1c:tk1:q1': {
      accept: ['integer division', 'truncat', 'chop', 'cut off', 'cut the decimal', 'drops the decimal', 're:rounds?\\s+down', 'no decimal'],
      note: 'int / int chops the decimal — integer division',
    },
    '1.1c:sc1:q1': {
      accept: ['cast', '10.0', 'double'],
      note: 'make an operand a double: 10.0 / 3 or (double) 10 / 3',
    },
    '1.1c:bh1:q1': {
      accept: ['91', 'integer division', 'truncat', 'chop'],
      note: '274/3 = 91.33… but int/int truncates to 91.0',
    },
    '1.1c:tk3:q2': {
      accept: ['3.5'],
      all: false,
      note: 'both print 3.5 — either operand being double is enough',
    },
  },
  '1.7a': {
    '1.7a:sc1:q1': {
      accept: ['re:sides|range.*1|min.*1|\\b1\\b'],
      note: 'Specify that range is sides (max - min + 1 = sides) and min is 1.',
    },
    '1.7a:tk1:q1': {
      accept: ['re:total|sum|accumulator|=\\s*0|\\+='],
      note: 'Declare a local variable initialized to 0 before the loop and add each roll to it.',
    },
  },
  '1.7b': {
    '1.7b:sc1:q1': {
      accept: ['re:\\b0\\b|\\b5\\b|\\+5|average|midpoint|two|every 2'],
      note: 'Explain that 10 is the +0 baseline and every 2 points changes the modifier by 1 (score 10 -> 0, score 20 -> +5).',
    },
    '1.7b:tk1:q1': {
      accept: ['re:\\b1\\b|one place|single|duplicate|repeat|reuse|maintain'],
      note: 'Note that reusing roll(3, 6) avoids duplication so any bug fix happens in just one place.',
    },
  },
  '1.7c': {
    '1.7c:sc1:q1': {
      accept: ['re:cast|parenthes|precedence|before|\\(int\\)|truncat'],
      note: 'Point out that (int) binds to Math.random() before multiplying by sides.',
    },
    '1.7c:sc1:q2': {
      accept: ['re:\\b0\\b', 'zero'],
      note: '(int) cast binds first: 0 * sides = 0, every time',
    },
  },
  '1.8b': {
    '1.8b:tk3:q1': {
      accept: ['2147483647'],
      note: 'MAX_VALUE+1 wraps to MIN_VALUE — the odometer',
    },
    '1.8b:sc1:q2': {
      accept: ['re:5.*6'],
      note: 'x++ uses the old value (y=5); ++x increments first (y=6)',
    },
  },
  '2.5a': {
    '2.5a:sc1:q2': {
      accept: ['static'],
    },
    '2.5a:tk1:q1': {
      accept: ['chop', 'truncat', 'cut', 'drops the', 're:rounds?\\s+down'],
      note: 'casting to int truncates — no rounding',
    },
    '2.5a:tk2:q1': {
      accept: ['min'],
      note: 'Math.min(20, strength)',
    },
    '2.5a:tk2:q2': {
      accept: ['max'],
      note: 'Math.max(0, hp)',
    },
  },
  '2.7a': {
    '2.7a:sc1:q1': {
      accept: ['re:\\b0\\b|\\b1\\b|\\b5\\b|\\+5|\\+1'],
      note: 'Calculate the modifiers for 10 (0), 12 (+1), and 20 (+5).',
    },
    '2.7a:sc2:q1': {
      accept: ['share', 'overwrite', 'same', 'all character', 'every character', 'instance', 'own copy'],
      note: 'Explain that static fields would be shared across every Character instead of each hero having its own stats.',
    },
    '2.7a:sc2:q2': {
      accept: ['current', 'maximum', 'max', 'damage', 'heal', 'cap'],
      note: 'Distinguish current hp (changes with damage/healing) from maxHp (the ceiling).',
    },
    '2.7a:tk2:q1': {
      accept: ['re:\\b4\\b.*24|4.*24|min.*4|max.*24'],
      note: 'With 4d6, the lowest possible roll is 4 (four 1s) and the highest is 24 (four 6s).',
    },
  },
  '2.7b': {
    '2.7b:sc1:q1': {
      accept: ['display', 'use', 'step 3', 'third', 'last'],
      note: 'Identify where printCharacterSheet() sits in Declare/Configure/Display (use the object).',
    },
    '2.7b:tk1:q1': {
      accept: ['re:\\b5\\b|\\b10\\b|half|full'],
      note: 'Compute filled for 50/100 (5 blocks) and 12/12 (10 blocks = full bar).',
    },
    '2.7b:tk1:q2': {
      accept: ['re:\\b0\\b|integer division|truncat'],
      note: 'Explain why 50 / 100 evaluates to 0 in integer division, turning the whole bar into 0.',
    },
  },
  '2.7c': {
    '2.7c:sc1:q1': {
      accept: ['integer division', 'truncat', 'drop', 'chop', 'remainder'],
      note: 'Explain how integer division truncates (level - 1) / 4 so every 4 levels steps up by +1.',
    },
    '2.7c:sc2:q1': {
      accept: ['re:\\b1\\b|one place|single|dice'],
      note: 'Note that delegating means fixing a bug in Dice.java updates everything in one place.',
    },
    '2.7c:tk1:q1': {
      accept: ['first', 'party[0]', 'max_value', 'min_value', 'negative', 're:\\b0\\b'],
      note: 'Explain initializing best-so-far to the first element (party[0]) rather than 0.',
    },
    '2.7c:sc3:q2': {
      accept: ['call', 'reus', 'duplicat', 'one place', 'dry', 'delegate'],
      note: 'Contrast calling Dice helpers (single source of truth) vs. duplicating random formulas.',
    },
  },
  '3.4': {
    '3.4:sc1:q1': {
      accept: ['re:intern|literal|pool|reference|address|memory|null'],
      note: 'Explain String literal pooling vs. new substring heap objects, and why null checks must precede .equals.',
    },
    '3.4:tk1:q1': {
      accept: ['equals', 'null', 'return'],
      all: true,
      note: 'Draft isSameCommand with null guards and .equals(...).',
    },
    '3.4:sc2:q1': {
      accept: ['re:-1|space\\s*\\+\\s*1|indexoutofbounds|out of bounds|leading space'],
      note: 'Explain that indexOf(" ") returns -1 when no space exists, and extractTarget starts at space + 1 to skip the space.',
    },
    '3.4:tk2:q1': {
      accept: ['indexof', 'substring', 'return'],
      all: true,
      note: 'Draft extractVerb and extractTarget using indexOf(" "), substring, and return.',
    },
    '3.4:sc3:q1': {
      accept: ['re:-12|negative|<\\s*0|unicode|ascii|boss|uppercase'],
      note: 'Note that "goblin".compareTo("skeleton") returns -12 (so check <= 0, not == -1), and uppercase "Boss" comes before lowercase "goblin".',
    },
    '3.4:tk3:q1': {
      accept: ['compareto', 'return'],
      all: true,
      note: 'Draft firstInTurnOrder using compareTo and return.',
    },
    '3.4:sc4:q1': {
      accept: ['re:fireball|heal|before|shadow|reach|catch|f\\s*<\\s*m|h\\s*<\\s*m'],
      note: 'Explain that "fireball" and "heal" both start before "m", so compareTo("m") < 0 would intercept them if checked first.',
    },
    '3.4:tk4:q1': {
      accept: ['extractverb', 'if', 'return'],
      all: true,
      note: 'Outline or draft resolveCombatTurn calling extractVerb/extractTarget with if/else branches and return.',
    },
  },
  '3.5': {
    '3.5:sc1:q1': {
      accept: ['re:\\|\\||or\\b|flip|invert|both|false|true'],
      note: 'State De Morgan\'s Law: pushing ! inside flips && to || (and || to &&).',
    },
    '3.5:tk1:q1': {
      accept: ['||', 'return'],
      all: true,
      note: 'Draft isVaultLockedOut using || (without an outer !) and return.',
    },
    '3.5:sc2:q1': {
      accept: ['re:impossible|both|inclusive|boundary|<\\s*3|>\\s*18'],
      note: 'Explain why no integer can be both < 3 and > 18, and why >= negates to < (and <= negates to >).',
    },
    '3.5:tk2:q1': {
      accept: ['return', 'score'],
      all: true,
      note: 'Draft both isSafeStatScore and isInvalidStatScore returning boolean range comparisons.',
    },
    '3.5:sc3:q1': {
      accept: ['re:precedence|parenthes|\\(\\s*lowhp\\s*\\|\\|\\s*minionfell\\s*\\)|tighter|first|binds'],
      note: 'Explain that && binds tighter than ||, so parentheses are required around (lowHp || minionFell).',
    },
    '3.5:tk3:q1': {
      accept: ['||', '&&', 'return'],
      all: true,
      note: 'Draft doesBossEnrage with parenthesized ||, && !isSilenced, and return.',
    },
    '3.5:sc4:q1': {
      accept: ['re:arithmeticexception|divide by zero|division by zero|short-circuit|short circuit'],
      note: 'Name ArithmeticException (/ by 0) and explain how placing partySize > 0 first short-circuits &&.',
    },
    '3.5:tk4:q1': {
      accept: ['partysize', '&&', 'return'],
      all: true,
      note: 'Draft hasFairGoldSplit with partySize > 0 first in the && chain and return.',
    },
    '3.5:sc5:q1': {
      accept: ['re:floor\\s*>=\\s*5|\\|\\||null|short-circuit|short circuit'],
      note: 'Apply De Morgan to get floor >= 5 || !guildRank.equals("Veteran"), and explain null guard short-circuiting.',
    },
    '3.5:tk5:q1': {
      accept: ['if', 'return'],
      all: true,
      note: 'Draft classifyEncounterZone with priority if/else if branches and return.',
    },
  },
  '3.6a': {
    '3.6a:sc1:q1': {
      accept: ['re:1\\s*\\+\\s*18|19|unreachable|override|before|first|auto-miss|always miss'],
      note: 'Explain that 1 + 18 >= 10 hits before the Natural 1 branch can run unless d20Roll == 20 and d20Roll == 1 are checked first.',
    },
    '3.6a:sc1:q2': {
      accept: ['re:\\b6\\b|base|double|12|cancrit'],
      note: 'Note it should return normal baseDamage (6) rather than doubling to 12, which requires checking canCrit && d20Roll == 20.',
    },
    '3.6a:tk1:q1': {
      accept: ['if', 'cancrit', 'return'],
      all: true,
      note: 'Draft evaluateStrike using canCrit checks, ordered if/else if branches, and return.',
    },
    '3.6a:sc2:q1': {
      accept: ['re:\\b1\\b|one place|single|duplicat|reuse'],
      note: 'Explain single source of truth: changing crit multiplier requires editing only 1 place inside evaluateStrike.',
    },
    '3.6a:sc2:q2': {
      accept: ['re:20|crit|auto-hit|always hit'],
      note: 'Explain that rolling a Natural 20 automatically hits regardless of AC 50.',
    },
    '3.6a:tk2:q1': {
      accept: ['dice', 'evaluatestrike', 'return'],
      all: true,
      note: 'Draft playerAttack and monsterAttack calling Dice.roll(...) and evaluateStrike(...).',
    },
  },
  '3.6b': {
    '3.6b:sc1:q1': {
      accept: ['re:22|heal|negative|clamp|\\b0\\b'],
      note: 'Explain both clamps: 20 - (-2) = 22 heals without clamping net damage >= 0, and 12 - 33 goes negative without clamping HP >= 0.',
    },
    '3.6b:tk1:q1': {
      accept: ['if', 'return'],
      all: true,
      note: 'Draft applyMitigatedDamage with isDefending halving, flatShield subtraction, both clamps, and return.',
    },
    '3.6b:sc2:q1': {
      accept: ['re:pass[- ]by[- ]value|copy|unchanged|zombie|dead'],
      note: 'Explain that primitive monsterHP is passed by value (caller copy stays unchanged unless returned) and dead monsters must not counterattack.',
    },
    '3.6b:tk2:q1': {
      accept: ['playerattack', 'monsterhp > 0', 'return'],
      all: true,
      note: 'Draft combatRound calling playerAttack, guarding monsterAttack with monsterHP > 0, and returning monsterHP.',
    },
    '3.6b:sc3:q1': {
      accept: ['re:nullpointer|crash|charge|defend|25|20'],
      note: 'Explain guarding against null before .equals, and trace all three stances: "attack" -> 20 HP, while both "charge" (kills monster first) and "defend" (10/2 - 5 = 0 net dmg) leave the player at 25 HP.',
    },
    '3.6b:tk3:q1': {
      accept: ['applymitigateddamage', 'if', 'return'],
      all: true,
      note: 'Draft resolveTacticalExchange with null/"flee" check, stance branches, applyMitigatedDamage calls, and return.',
    },
  },
  '4.1': {
    '4.1:sc1:q1': {
      accept: ['re:round 1|first round|before regen|dies|startinghp\\s*<=\\s*0|poisonperround'],
      note: 'Explain that Round 1 poison hits before regen on (5, 5, 10) returning 1 (not -1), and list the ordered entry guards.',
    },
    '4.1:sc1:q2': {
      accept: ['while', 'round', 'poison', 'regen'],
      note: 'Specify using a while (hp > 0) loop, local hp and rounds variables, and subtracting poison before conditional regen.',
    },
    '4.1:tk1:q1': {
      accept: ['if', 'while', 'return'],
      all: true,
      note: 'Draft roundsToSurvivePoison with entry guards, while loop, intra-round order, and return.',
    },
    '4.1:sc2:q1': {
      accept: ['re:while|%\\s*10|chop|drop|skip|last digit|wrong'],
      note: 'Specify sum variable, while (runeCode > 0), and why dividing by 10 before % 10 drops the ones digit (9 in 4729).',
    },
    '4.1:tk2:q1': {
      accept: ['while', '% 10', 'return'],
      all: true,
      note: 'Draft sumRuneDigits with while (runeCode > 0), % 10, / 10, and return.',
    },
    '4.1:sc3:q1': {
      accept: ['re:stop|exit|early|premature|odd|\\b5\\b'],
      note: 'Explain that putting return inside an else stops the loop immediately on the first odd digit (5 in 20405).',
    },
    '4.1:sc3:q2': {
      accept: ['re:0 times|zero times|even|guard|if\\s*\\(\\s*runecode\\s*==\\s*0|\\b1\\b'],
      note: 'Explain that while (runeCode > 0) skips 0 (returning 0 instead of 1), so add an if (runeCode == 0) return 1; guard.',
    },
    '4.1:tk3:q1': {
      accept: ['if', 'while', '% 10', 'return'],
      all: true,
      note: 'Draft countEvenDigits with the runeCode == 0 guard, while loop, % 10, and return.',
    },
    '4.1:sc4:q1': {
      accept: ['re:10|both|twice|same iteration|else'],
      note: 'Trace energy = 3: first if makes it 10 (even!), so a second standalone if immediately divides 10 by 2 in the same iteration.',
    },
    '4.1:tk4:q1': {
      accept: ['while', 'else', 'return'],
      all: true,
      note: 'Draft manaCrystalSteps with while (energy > 1), if / else, steps++, and return.',
    },
  },
  '4.2': {
    '4.2:sc1:q1': {
      accept: ['for', 'reset', 'scope', 'before', 'outside'],
      note: 'Explain choosing a for loop (known range) and declaring int total = 0; before the loop so it accumulates instead of resetting.',
    },
    '4.2:sc1:q2': {
      accept: ['re:<=|inclusive|miss|double|else'],
      note: 'Explain using f <= endFloor (inclusive, returns 0 when start > end) and if / else so Boss Floors do not double-count.',
    },
    '4.2:tk1:q1': {
      accept: ['for', 'if', 'return'],
      all: true,
      note: 'Draft totalScaledXP with int total = 0, inclusive for loop, boss if / else, and return.',
    },
    '4.2:sc2:q1': {
      accept: ['re:r\\s*=\\s*1|1-based|one-based|>=|room 0|miss'],
      note: 'Explain starting at r = 1; r <= numRooms (1-based rooms) and using danger >= threshold.',
    },
    '4.2:tk2:q1': {
      accept: ['for', 'if', 'return'],
      all: true,
      note: 'Draft countDangerSpikes with r = 1 .. numRooms, danger formula, >= threshold check, and return.',
    },
    '4.2:sc3:q1': {
      accept: ['re:current|streak|max|best'],
      note: 'Name the two counter variables initialized to 0 (currentStreak and maxStreak).',
    },
    '4.2:sc3:q2': {
      accept: ['re:never|0|2|end|trailing|safe'],
      note: 'Explain why updating maxStreak only on unsafe rooms misses trailing streaks like Rooms 7..10 (returning 3 or 0 instead of 4 or 7).',
    },
    '4.2:tk3:q1': {
      accept: ['for', 'if', 'return'],
      all: true,
      note: 'Draft longestSafeStreak updating maxStreak inside the safe branch and returning maxStreak.',
    },
    '4.2:sc4:q1': {
      accept: ['re:trap|cursed|both|first|12|skip|unreachable'],
      note: 'Explain that Room 6 would hit the trap branch (-12) instead of Cursed Fountain (-5) if trapCycle is checked first.',
    },
    '4.2:sc4:q2': {
      accept: ['re:resurrect|heal|room 3|\\+6|6|inside|end of each room'],
      note: 'Explain that Room 3 heals the dead hero back to +6 unless if (hp <= 0) return 0; is checked at the end of every room inside the loop.',
    },
    '4.2:tk4:q1': {
      accept: ['for', 'if', 'return'],
      all: true,
      note: 'Draft simulateGauntletHP with ordered if / else if branches, inside-loop death return, and final return.',
    },
  },
  '4.3': {
    '4.3:sc1:q1': {
      accept: ['re:(length\\(\\)|len)\\s*-\\s*1|length\\s*-\\s*1|i\\s*\\+\\s*1\\s*<|out of bounds|last'],
      note: 'Use a for loop stopping at spell.length() - 1 so i + 1 never steps past the end of the string.',
    },
    '4.3:sc1:q2': {
      accept: ['equals', 'reference', 'address', 'memory', 'object'],
      note: 'Initialize count = 0 before the loop and explain why Strings must use .equals(...) rather than ==.',
    },
    '4.3:sc1:q3': {
      accept: ['0 times', 'zero times', 'never', 'does not run', "doesn't run", 'skip', 'false', 're:\\b0\\b'],
      note: 'Explain how the loop condition is immediately false for length 0 or 1, so the loop runs 0 times and returns 0.',
    },
    '4.3:tk1:q1': {
      accept: ['for', 'substring', 'equals', 'return'],
      all: true,
      note: 'Draft the full method body using a for loop, substring(...), .equals(...), and a return statement.',
    },
    '4.3:sc2:q1': {
      accept: ['""', 'empty string', 'empty', 'accumulator', 'result'],
      note: 'Identify a String accumulator initialized to "" (empty string) before the loop.',
    },
    '4.3:sc2:q2': {
      accept: ['re:(length\\(\\)|len)\\s*-\\s*1|>=\\s*0|index\\s*0'],
      note: 'Start at scroll.length() - 1 and loop while i >= 0 so index 0 is included.',
    },
    '4.3:tk2:q1': {
      accept: ['for', 'substring', 'return'],
      all: true,
      note: 'Draft reverseRunes using a backward for loop, substring, and return.',
    },
    '4.3:sc3:q1': {
      accept: ['-1', 'not found', 'not in', 'unchanged'],
      note: 'Explain that alpha.indexOf(ch) returns -1 when ch is not an uppercase A-Z letter, so ch stays unchanged.',
    },
    '4.3:sc3:q2': {
      accept: ['negative', '-2', '+ 26', '+26', 'out of bounds', '0..25', '0 to 25'],
      note: 'Explain why (0 - 2) % 26 yields -2 in Java and how adding 26 then taking % 26 keeps newPos in 0..25.',
    },
    '4.3:tk3:q1': {
      accept: ['for', 'indexof', 'substring', 'return'],
      all: true,
      note: 'Draft shiftUppercaseCipher using a for loop, indexOf, substring, and return.',
    },
    '4.3:sc4:q1': {
      accept: ['while', '!= -1', '>= 0', 'chained', 'new', 'shift'],
      note: 'Explain why a while loop checking scroll.indexOf(glyph) != -1 (or >= 0) is needed so newly formed occurrences get removed.',
    },
    '4.3:sc4:q2': {
      accept: ['substring(0', 'glyph.length()', 'idx +'],
      note: 'Show the two substring calls: scroll.substring(0, idx) + scroll.substring(idx + glyph.length()).',
    },
    '4.3:tk4:q1': {
      accept: ['while', 'indexof', 'substring', 'return'],
      all: true,
      note: 'Draft purgeCursedGlyph using a while loop, indexOf, substring, and return.',
    },
  },
  '4.4': {
    '4.4:sc1:q1': {
      accept: ['after the inner', 'outside the inner', 'end of each row', 'end of the inner', 'between', 'row by row', 'line by line'],
      note: 'Explain that the outer loop walks rows, the inner loop builds columns, and result += "\\n" runs after the inner loop ends.',
    },
    '4.4:sc1:q2': {
      accept: ['r == 0', 'c == 0', 'rows - 1', 'cols - 1', '||'],
      note: 'Write the || condition checking r == 0, r == rows - 1, c == 0, or c == cols - 1.',
    },
    '4.4:tk1:q1': {
      accept: ['for', 'if', 'return'],
      all: true,
      note: 'Draft buildBorderedRoom with nested for loops, an if/else for "#" vs ".", and a return.',
    },
    '4.4:sc2:q1': {
      accept: ['abs', 'diamond', 'diagonal', 'manhattan', 'steps', 're:\\b2\\b'],
      note: 'Mention computing Manhattan distance with Math.abs(...) and why diagonal corners have distance 2 (> 1).',
    },
    '4.4:sc2:q2': {
      accept: ['before', 'first', 'priority', 'overwrite', 're:\\b0\\b'],
      note: 'Explain that the hero tile has distance 0 (which is <= visionRadius), so "@" must be checked before dist <= visionRadius.',
    },
    '4.4:tk2:q1': {
      accept: ['for', 'abs', 'return'],
      all: true,
      note: 'Draft renderFogOfWar using nested for loops, Math.abs(...), if/else if/else, and return.',
    },
    '4.4:sc3:q1': {
      accept: ['height - r', 'consecutive', 'separate', 'sequential', 'dots', 'hashes'],
      note: 'Explain using two sequential inner loops: one running (height - r) times for dots, then one running r times for hashes.',
    },
    '4.4:sc3:q2': {
      accept: ['0 times', 'zero times', 'never', 'does not run', "doesn't run", 'empty', '""', 'false'],
      note: 'Explain why 1 <= height is immediately false when height <= 0, returning "".',
    },
    '4.4:tk3:q1': {
      accept: ['for', 'return'],
      all: true,
      note: 'Draft buildRightStaircase with an outer for loop, two sequential inner for loops, newline, and return.',
    },
    '4.4:sc4:q1': {
      accept: ['self', 'same', '(3, 3)', '(3,3)', 'duplicate', 'twice', 'reverse', '(2, 1)', '(2,1)', '(4, 2)', '(4,2)'],
      note: 'Mention the two invalid kinds of pairs: self-pairs like (3,3) and reversed duplicates like (2,1) and (4,2).',
    },
    '4.4:sc4:q2': {
      accept: ['a + 1', 'a+1', 'b > a', 'a < b'],
      note: 'Initialize the inner loop at int b = a + 1 so b is always strictly greater than a.',
    },
    '4.4:tk4:q1': {
      accept: ['for', 'if', 'return'],
      all: true,
      note: 'Draft countLuckyLootPairs with nested for loops (b = a + 1), the % 3 == 0 check, and return.',
    },
  },
  '4.5': {
    '4.5:sc1:q1': {
      accept: ['12', 'start >= limit', 'start>=limit', 'false', 'never', 'first', 're:\\b0\\b'],
      note: 'Note that (12, 10, 0) must return 0 because the loop condition is already false, so check start >= limit before step <= 0.',
    },
    '4.5:sc1:q2': {
      accept: ['while', 'count', 'steps', 'val'],
      note: 'Specify your local variables (val, count) and the while (val < limit) loop.',
    },
    '4.5:tk1:q1': {
      accept: ['if', 'while', 'return'],
      all: true,
      note: 'Draft countWhileIterations with the ordered if guards, while loop, and return.',
    },
    '4.5:sc2:q1': {
      accept: ['trailing', 'extra', '---', 'pillars - 1', 'first', 'before'],
      note: 'Explain the trailing "---" bug and how placing the first pillar before the loop (then looping pillars - 1 times) solves it.',
    },
    '4.5:sc2:q2': {
      accept: ['negative', 'empty', '""', 'before', 'first', 're:\\b0\\b'],
      note: 'Explain why you need if (pillars <= 0) return ""; before putting the first post into result.',
    },
    '4.5:tk2:q1': {
      accept: ['if', 'for', 'return'],
      all: true,
      note: 'Draft buildRunedFence with the pillars <= 0 guard, first post, for loop, and return.',
    },
    '4.5:sc3:q1': {
      accept: ['while', 'unknown', 'drain', '11', '15', 'before', 'after', 'end'],
      note: 'Explain why a while loop is needed (unknown turns) and why Turn 3 drain must happen before checking mana >= targetMana.',
    },
    '4.5:sc3:q2': {
      accept: ['turn 2', '10', 'before', 'early', 'peak', 'drain', 'cycle'],
      note: 'Explain that (6, 2, 10, 10) hits 10 on Turn 2 before the Turn-3 drain fires, so you must simulate through Turn 3 first.',
    },
    '4.5:tk3:q1': {
      accept: ['while', 'if', 'return'],
      all: true,
      note: 'Draft firstTurnReachingMana with the startMana guard, while loop, Turn-3 drain, target check, and stall check.',
    },
    '4.5:sc4:q1': {
      accept: ['6', '9'],
      all: true,
      note: 'Include the total step counts for both n = 4 (6 steps) and n = 5 (9 steps) along with the j values.',
    },
    '4.5:tk4:q1': {
      accept: ['for', 'return'],
      all: true,
      note: 'Draft countTriangularSteps using nested for loops (j += 2) and return steps.',
    },
  },
  '4.6a': {
    '4.6a:sc1:q1': {
      accept: ['&&', 'both', 'de morgan', 'forever', 'infinite', 'dead', 'continue'],
      note: 'Explain why you need a while loop with && (both combatants alive: playerHP > 0 && monsterHP > 0), since || continues after one falls.',
    },
    '4.6a:sc1:q2': {
      accept: ['dead', 'negative', 'clamp', 'zombie', 'counter', 're:\\b0\\b'],
      note: 'Identify both bugs: (a) a dead monster still counterattacking, and (b) returning negative HP instead of clamping to 0.',
    },
    '4.6a:tk1:q1': {
      accept: ['while', 'if', 'return'],
      all: true,
      note: 'Draft simulateDuelToDeath with the while loop, monsterHP > 0 guard, and clamped return.',
    },
    '4.6a:sc2:q1': {
      accept: ['playerhp > 0', 'playerhp>0', 'dice', 'boolean', 'while', 'same'],
      note: 'Compare the loop structure to Part 1 and show the single-line Boolean Zen return (return playerHP > 0;).',
    },
    '4.6a:sc2:q2': {
      accept: ['21', '1 + 20', 'unreachable', 'hit', 'first', 'before', '>='],
      note: 'Explain that d20 + playerAttackBonus >= monsterAC evaluates true even on a 1 when attackBonus is large, so check 20 and 1 first.',
    },
    '4.6a:tk2:q1': {
      accept: ['while', 'dice', 'if', 'return'],
      all: true,
      note: 'Draft runCombat using while, Dice.roll(...), ordered crit/fumble/hit branches, monster guard, and return.',
    },
  },
  '4.6b': {
    '4.6b:sc1:q1': {
      accept: ['for', 'duplicate', 'reuse', 'modular', 'known', 'numrooms', 'helper'],
      note: 'Explain using a for loop (known 1..numRooms range) and delegating combat to simulateDuelToDeath instead of duplicating the while loop.',
    },
    '4.6b:sc1:q2': {
      accept: ['4', '+4', 'resurrect', 'heal', 'dead', 'before', 're:\\b0\\b'],
      note: 'Explain that checking the shrine before hp <= 0 would heal a dead hero from 0 up to 4 HP in Room 3.',
    },
    '4.6b:tk1:q1': {
      accept: ['for', 'simulatedueltodeath', 'if', 'return'],
      all: true,
      note: 'Draft exploreFloorDeterministic using a for loop, simulateDuelToDeath(...), hp <= 0 guard, shrine heal, and return.',
    },
    '4.6b:sc2:q1': {
      accept: ['12', 'end of the floor', 'end of each floor', 'after the inner', 'outside the inner', 'every room'],
      note: 'Explain placing the campfire outside the inner room loop (inside the outer floor loop), and note it would trigger 12 times inside the room loop.',
    },
    '4.6b:sc2:q2': {
      accept: ['maxhp', '28', 'exceed', 'break', 'campfire', 'next floor'],
      note: 'Explain both bugs: (a) healing past maxHP (e.g. 28 > 25), and (b) break only exits the inner room loop, letting a dead hero rest and continue.',
    },
    '4.6b:tk2:q1': {
      accept: ['for', 'simulatedueltodeath', 'if', 'return'],
      all: true,
      note: 'Draft runMultiFloorCampaign with nested floor/room for loops, simulateDuelToDeath, return -floor, campfire clamp, and final return.',
    },
  },
  '4.7': {
    '4.7:sc1:q1': {
      accept: ['for', 'before', 'first', 'miss', 're:\\b0\\b', 're:\\b1\\b'],
      note: 'Explain using a for loop over 0..n-1 and why steps++ must execute before if (i == targetIndex) so index 0 counts 1 step.',
    },
    '4.7:tk1:q1': {
      accept: ['for', 'if', 'return'],
      all: true,
      note: 'Draft countLinearSearchSteps with a for loop, steps++, early return on match, and final return.',
    },
    '4.7:sc2:q1': {
      accept: ['while', 'half', 'halv', 'divide', 'unknown', 'lo <= hi', 'log', 're:\\b1\\b'],
      note: 'Explain why binary search uses a while (lo <= hi) loop and why doubling n adds only 1 step.',
    },
    '4.7:sc2:q2': {
      accept: ['infinite', 'forever', 'never ends', '14', 'stuck', 'hang', 'lo <= hi'],
      note: 'Explain that lo = mid leaves lo == 14 and hi == 14 forever, creating an infinite loop.',
    },
    '4.7:tk2:q1': {
      accept: ['while', 'mid', 'return'],
      all: true,
      note: 'Draft countBinarySearchSteps with lo/hi, while (lo <= hi), mid = (lo + hi) / 2, mid+1/mid-1 updates, and return.',
    },
    '4.7:sc3:q1': {
      accept: ['false', '0 times', 'zero times', 'i + 1', 'j = i + 1', '1 < 1', '0 < 0'],
      note: 'Explain why j = i + 1 fails 1 < 1 on n = 1 (returning 0), while FullGrid runs once (returning 1).',
    },
    '4.7:sc3:q2': {
      accept: ['100', 'n^2', 'quadratic', 'constant', 'half', '1/2'],
      note: 'Note that 10x input produces ~100x steps (10^2), and constant factors like 1/2 still scale quadratically.',
    },
    '4.7:tk3:q1': {
      accept: ['for', 'return'],
      all: true,
      note: 'Draft both countFullGridSteps and countUniquePairSteps with nested for loops and return steps.',
    },
  },
};
