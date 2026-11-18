/**
 * Single source of truth for *Check.java acceptance-test gates and Teacher PINs.
 *
 * When `gatedOnPage` is true, LessonLayout.astro withholds the direct link to
 * `*Check.java` and embeds an XOR-obfuscated payload unlocked either by passing
 * 75% of the lesson's Guided Design check or by entering the lesson PIN / MASTER_TEACHER_PIN.
 *
 * All entries appear behind password protection on /teachers/pin.html and /teacher/pin.html.
 */

export const MASTER_TEACHER_PIN = 'APCSA-GO';

export interface CheckGate {
  lessonId: string;
  title: string;
  starterFile: string;
  checkFile: string;
  pin: string;
  compileCmd: string;
  /** Optional command override shown in the gate prompt (defaults to `java <StarterClass>`) */
  sandboxCmd?: string;
  /** Whether this lesson's page actively locks the check file at the bottom */
  gatedOnPage: boolean;
}

export const CHECK_GATES: Record<string, CheckGate> = {
  '1.7a': {
    lessonId: '1.7a',
    title: 'Dice Roller Part 1',
    starterFile: 'Dice.java',
    checkFile: 'DiceCheck.java',
    pin: 'DICE-17',
    sandboxCmd: 'java DiceTester',
    compileCmd: 'javac Dice.java DiceCheck.java\njava DiceCheck',
    gatedOnPage: true,
  },
  '1.7b': {
    lessonId: '1.7b',
    title: 'Dice Roller Part 2',
    starterFile: 'Dice.java',
    checkFile: 'DiceCheck.java',
    pin: 'DICE-17',
    sandboxCmd: 'java DiceTester',
    compileCmd: 'javac Dice.java DiceCheck.java\njava DiceCheck',
    gatedOnPage: true,
  },
  '1.7c': {
    lessonId: '1.7c',
    title: 'Dice Roller Testing & Integration',
    starterFile: 'Dice.java',
    checkFile: 'DiceCheck.java',
    pin: 'DICE-17',
    sandboxCmd: 'java DiceTester',
    compileCmd: 'javac Dice.java DiceCheck.java\njava DiceCheck',
    gatedOnPage: true,
  },
  '2.7a': {
    lessonId: '2.7a',
    title: 'Character Creator',
    starterFile: 'Character.java',
    checkFile: 'CharacterCheck.java',
    pin: 'HERO-27',
    compileCmd: 'javac Dice.java Character.java CharacterCheck.java\njava CharacterCheck',
    gatedOnPage: true,
  },
  '2.7b': {
    lessonId: '2.7b',
    title: 'Print Char Sheet',
    starterFile: 'Character.java',
    checkFile: 'CharacterCheck.java',
    pin: 'HERO-27',
    compileCmd: 'javac Dice.java Character.java CharacterCheck.java\njava CharacterCheck',
    gatedOnPage: true,
  },
  '2.7c': {
    lessonId: '2.7c',
    title: 'Build a Party',
    starterFile: 'Character.java',
    checkFile: 'CharacterCheck.java',
    pin: 'HERO-27',
    compileCmd: 'javac Dice.java Character.java CharacterCheck.java\njava CharacterCheck',
    gatedOnPage: true,
  },
  '3.4': {
    lessonId: '3.4',
    title: 'Comparing Objects & The CommandParser Build',
    starterFile: 'CommandParser.java',
    checkFile: 'CommandParserCheck.java',
    pin: 'CMDS-34',
    compileCmd: 'javac CommandParser.java CommandParserCheck.java\njava CommandParserCheck',
    gatedOnPage: true,
  },
  '3.5': {
    lessonId: '3.5',
    title: "De Morgan's Laws & The DungeonGatekeeper Build",
    starterFile: 'DungeonGatekeeper.java',
    checkFile: 'DungeonGatekeeperCheck.java',
    pin: 'GATE-35',
    compileCmd: 'javac DungeonGatekeeper.java DungeonGatekeeperCheck.java\njava DungeonGatekeeperCheck',
    gatedOnPage: true,
  },
  '3.6a': {
    lessonId: '3.6a',
    title: 'Combat Engine (Day 1): Attack & Crit Resolver',
    starterFile: 'Combat.java',
    checkFile: 'CombatCheck.java',
    pin: 'CRIT-36',
    compileCmd: 'javac Dice.java Combat.java CombatCheck.java\njava CombatCheck',
    gatedOnPage: true,
  },
  '3.6b': {
    lessonId: '3.6b',
    title: 'Combat Engine (Day 2): Tactical Round & Stances',
    starterFile: 'Combat.java',
    checkFile: 'CombatCheck.java',
    pin: 'SHLD-36',
    compileCmd: 'javac Dice.java Combat.java CombatCheck.java\njava CombatCheck',
    gatedOnPage: true,
  },
  '4.1': {
    lessonId: '4.1',
    title: 'while Loops & The WhileLab Algorithms Build',
    starterFile: 'WhileLab.java',
    checkFile: 'WhileLabCheck.java',
    pin: 'LOOP-41',
    compileCmd: 'javac WhileLab.java WhileLabCheck.java\njava WhileLabCheck',
    gatedOnPage: true,
  },
  '4.2': {
    lessonId: '4.2',
    title: 'for Loops & The EncounterSim Build',
    starterFile: 'EncounterSim.java',
    checkFile: 'EncounterSimCheck.java',
    pin: 'SIMS-42',
    compileCmd: 'javac EncounterSim.java EncounterSimCheck.java\njava EncounterSimCheck',
    gatedOnPage: true,
  },
  '4.3': {
    lessonId: '4.3',
    title: 'String Traversal: ScrollCipher & AP String Build',
    starterFile: 'ScrollCipher.java',
    checkFile: 'ScrollCipherCheck.java',
    pin: 'RUNE-43',
    compileCmd: 'javac ScrollCipher.java ScrollCipherCheck.java\njava ScrollCipherCheck',
    gatedOnPage: true,
  },
  '4.4': {
    lessonId: '4.4',
    title: 'Nested Loops: GridArchitect & Fog-of-War Build',
    starterFile: 'GridArchitect.java',
    checkFile: 'GridArchitectCheck.java',
    pin: 'GRID-44',
    compileCmd: 'javac GridArchitect.java GridArchitectCheck.java\njava GridArchitectCheck',
    gatedOnPage: true,
  },
  '4.5': {
    lessonId: '4.5',
    title: 'Loop Analysis, Fencepost Traps & LoopTracer Build',
    starterFile: 'LoopTracer.java',
    checkFile: 'LoopTracerCheck.java',
    pin: 'FENC-45',
    compileCmd: 'javac LoopTracer.java LoopTracerCheck.java\njava LoopTracerCheck',
    gatedOnPage: true,
  },
  '4.6a': {
    lessonId: '4.6a',
    title: 'Dungeon Crawler (Day 1): Combat & Duel Engine',
    starterFile: 'DungeonLoop.java',
    checkFile: 'DungeonLoopCheck.java',
    pin: 'DUEL-46',
    compileCmd: 'javac Dice.java DungeonLoop.java DungeonLoopCheck.java\njava DungeonLoopCheck',
    gatedOnPage: true,
  },
  '4.6b': {
    lessonId: '4.6b',
    title: 'Dungeon Crawler (Day 2): Multi-Floor Campaign & Boss',
    starterFile: 'DungeonLoop.java',
    checkFile: 'DungeonLoopCheck.java',
    pin: 'BOSS-46',
    compileCmd: 'javac Dice.java DungeonLoop.java DungeonLoopCheck.java\njava DungeonLoopCheck',
    gatedOnPage: true,
  },
  '4.7': {
    lessonId: '4.7',
    title: 'Informal Run-Time Analysis & RuntimeAnalyzer Build',
    starterFile: 'RuntimeAnalyzer.java',
    checkFile: 'RuntimeAnalyzerCheck.java',
    pin: 'STEP-47',
    compileCmd: 'javac RuntimeAnalyzer.java RuntimeAnalyzerCheck.java\njava RuntimeAnalyzerCheck',
    gatedOnPage: true,
  },
};
