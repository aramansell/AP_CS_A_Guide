/**
 * Master curriculum data for the IBW AP CS A course, 2026-27.
 *
 * ONE source of truth. Everything data-driven on the site derives from this
 * file at build time:
 *   - the unified Dashboard & Pacing Calendar (src/pages/index.astro & src/pages/pace.astro)
 *   - PACING.md (src/integrations/pacing-md.ts)
 *   - the CED coverage matrix (src/pages/docs/coverage.astro)
 *   - the prev/next chain on every lesson page (src/layouts/LessonLayout.astro)
 *
 * Course shape:
 *   Phase 1  = CED Unit 1  Using Objects and Methods   (Units 1 + 2)
 *   Phase 2  = CED Unit 2  Selection and Iteration     (Units 3 + 4, 1 unified build/day from 3.4 on)
 *   Phase 3  = CED Unit 3  Class Creation              (Unit 5)
 *   Phase 4  = CED Unit 4  Data Collections            (Units 6, 7, 8, 10)
 *   Sprint   = 1-month exam prep & testing sprint (Apr 12 - May 12)
 *   Season 2 = post-exam arc (inheritance, mazes, pixels, capstone)
 *
 * AP CSA exam: Wednesday May 12, 2027, 12:00 PM (Session 2).
 */

export const EXAM_DATE = '2027-05-12';
export const EXAM_TIME = '12:00 PM (Session 2)';

/** A-day calendar for IBW 2026-27, taken from the IBW Trivory calendar. */
export const A_DAYS: string[] = [
  // August 2026
  '2026-08-31',
  // September 2026
  '2026-09-02', '2026-09-04', '2026-09-09', '2026-09-11', '2026-09-15',
  '2026-09-17', '2026-09-21', '2026-09-23', '2026-09-25', '2026-09-29',
  // October 2026
  '2026-10-01', '2026-10-05', '2026-10-07', '2026-10-12', '2026-10-14',
  '2026-10-15', '2026-10-19', '2026-10-21', '2026-10-23', '2026-10-27',
  // November 2026
  '2026-11-02', '2026-11-04', '2026-11-06', '2026-11-10', '2026-11-13',
  '2026-11-17', '2026-11-19', '2026-11-30',
  // December 2026
  '2026-12-02', '2026-12-04', '2026-12-08', '2026-12-10', '2026-12-14',
  '2026-12-16', '2026-12-18',
  // January 2027
  '2027-01-05', '2027-01-07', '2027-01-11', '2027-01-13', '2027-01-15',
  '2027-01-20', '2027-01-22', '2027-01-27', '2027-01-29',
  // February 2027
  '2027-02-02', '2027-02-04', '2027-02-08', '2027-02-10', '2027-02-12',
  '2027-02-17', '2027-02-19', '2027-02-23', '2027-02-25',
  // March 2027
  '2027-03-01', '2027-03-04', '2027-03-08', '2027-03-10', '2027-03-12',
  '2027-03-16', '2027-03-18', '2027-03-29', '2027-03-31',
  // April 2027
  '2027-04-06', '2027-04-08', '2027-04-12', '2027-04-14', '2027-04-16',
  '2027-04-20', '2027-04-22', '2027-04-26', '2027-04-28', '2027-04-30',
  // May 2027
  '2027-05-04', '2027-05-06', '2027-05-10', '2027-05-12',
  // Season 2 (post-exam)
  '2027-05-14', '2027-05-18', '2027-05-20', '2027-05-24', '2027-05-26',
  '2027-05-28',
  '2027-06-02',
];

/** Calendar notes for the schedule (non-teaching events on teaching days). */
export const DAY_NOTES: Record<string, string> = {
  '2026-08-31': 'First day of school. Syllabus, accounts, lab setup, then straight into code.',
  '2026-10-14': 'Shortened class period (half-day schedule). The Character Creator week runs Mon/Wed/Thu: 2.7a, 2.7b, 2.7c.',
  '2026-11-02': 'New daily format launches: one unified 90-minute AP-style discovery build per day with compiling stub + Check.java.',
  '2026-11-19': 'Last class before Thanksgiving week.',
  '2026-12-18': 'Last class before winter break. No homework over break.',
  '2027-01-05': 'First class back from winter break.',
  '2027-03-18': 'Last class before spring break (Mar 22-26).',
  '2027-04-08': 'All 53 required CED topics are complete! The 1-month AP Exam Sprint begins next class.',
  '2027-05-10': 'Exam eve. Logistics, strategy, early night.',
  '2027-05-12': 'AP CSA EXAM, 12:00 PM, Session 2. You are ready.',
};

export type EntryKind =
  | 'launch' | 'lesson' | 'test' | 'frq' | 'mock' | 'clinic'
  | 'eve' | 'exam' | 'season2' | 'capstone';

export interface SequenceEntry {
  /** ISO date (an A day) */
  d: string;
  kind: EntryKind;
  /** lesson group label, e.g. "1.2" or "T1" */
  group: string;
  /** 1-6 (phase; 5 = sprint, 6 = season 2) */
  phase: number;
  /** CED topic numbers covered (Fall 2025 CED) */
  ced: string[];
  title: string;
  /** lesson file ids taught on this day, in order */
  lessons: string[];
  /** marks entries written for the Fall 2025 CED rewrite */
  new?: boolean;
  note?: string;
}

export const SEQUENCE: SequenceEntry[] = [
  // ---------------- PHASE 1: Using Objects and Methods (CED Unit 1, 15-25%) ----------------
  { d: '2026-08-31', kind: 'launch',  group: '1.1', phase: 1, ced: ['1.1', '1.2'],
    title: 'Launch + Hello World & Compile', lessons: ['1.1a'],
    note: 'First 45 min: course tour, how the docs work, lab rules. Then straight into 1.1a. Finish 1.1b for next class.' },
  { d: '2026-09-02', kind: 'lesson', group: '1.2', phase: 1, ced: ['1.2', '1.3', '1.4'],
    title: 'Printing, Concatenation, StatBlock', lessons: ['1.1b', '1.1c', '1.2a'] },
  { d: '2026-09-04', kind: 'lesson', group: '1.3', phase: 1, ced: ['1.3', '1.11'],
    title: 'Math.random() Deep Dive', lessons: ['1.2b', '1.2c', '1.3a'] },
  { d: '2026-09-09', kind: 'lesson', group: '1.4', phase: 1, ced: ['1.3', '1.4'],
    title: 'Slot Machine Build', lessons: ['1.3b', '1.3c', '1.4a', '1.4b'] },
  { d: '2026-09-11', kind: 'lesson', group: '1.5', phase: 1, ced: ['1.3', '1.4'],
    title: 'Tip Calculator Build', lessons: ['1.4c', '1.5a', '1.5b'] },
  { d: '2026-09-15', kind: 'lesson', group: '1.6', phase: 1, ced: ['1.3', '1.4', '1.15'],
    title: 'Bill Splitter & RPG Gold', lessons: ['1.5c', '1.6a', '1.6b', '1.6c'] },
  { d: '2026-09-17', kind: 'lesson', group: '1.7', phase: 1, ced: ['1.9', '1.10'],
    title: 'Dice Roller RPG Build', lessons: ['1.7a', '1.7b', '1.7c'] },
  { d: '2026-09-21', kind: 'lesson', group: '1.8', phase: 1, ced: ['1.5', '1.6'],
    title: 'Casting & Compound Assignment', lessons: ['1.8a', '1.8b'], new: true,
    note: 'New CED topics: casting and range of variables, compound assignment operators.' },
  { d: '2026-09-23', kind: 'lesson', group: '2.1', phase: 1, ced: ['1.12', '1.13', '1.14'],
    title: 'Objects & Classes, RPG Character Creator', lessons: ['2.1a', '2.1b', '2.1c'] },
  { d: '2026-09-25', kind: 'lesson', group: '2.2', phase: 1, ced: ['1.14', '1.15'],
    title: 'String Exploration & Parser', lessons: ['2.2a', '2.2b', '2.2c'] },
  { d: '2026-09-29', kind: 'lesson', group: '2.3', phase: 1, ced: ['1.4', '1.14'],
    title: 'Scanner Input & Combat Dialogue', lessons: ['2.3a', '2.3b', '2.3c'] },
  { d: '2026-10-01', kind: 'lesson', group: '2.4', phase: 1, ced: ['1.4', '1.14'],
    title: 'Scanner Discovery & Character Input', lessons: ['2.4a', '2.4b', '2.4c'] },
  { d: '2026-10-05', kind: 'lesson', group: '2.5', phase: 1, ced: ['1.10', '1.11'],
    title: 'The Math Class: Damage & Distance', lessons: ['2.5a', '2.5b', '2.5c'] },
  { d: '2026-10-07', kind: 'lesson', group: '2.6', phase: 1, ced: ['4.7'],
    title: 'Wrapper Classes & Stat Serializer', lessons: ['2.6a', '2.6b', '2.6c'] },
  { d: '2026-10-12', kind: 'lesson', group: '2.7', phase: 1, ced: ['1.12', '1.13', '1.14', '1.15'],
    title: 'Character Creator RPG Build — StatBlock', lessons: ['2.7a'] },
  { d: '2026-10-14', kind: 'lesson', group: '2.7', phase: 1, ced: ['1.15'],
    title: 'Character Creator RPG Build — Print the Sheet', lessons: ['2.7b'],
    note: 'Shortened class period — the display day is sized to fit.' },
  { d: '2026-10-15', kind: 'lesson', group: '2.7', phase: 1, ced: [],
    title: 'Character Creator RPG Build — Party & Skill Checks', lessons: ['2.7c'] },
  { d: '2026-10-19', kind: 'lesson', group: '2.8', phase: 1, ced: ['1.7', '1.8', '1.9'],
    title: 'APIs, Comments & Method Signatures', lessons: ['2.8a', '2.8b', '2.8c'], new: true,
    note: 'New CED topics: API and libraries, documentation with comments, method signatures. First JQR drills.' },

  // ---------------- PHASE 2: Selection and Iteration (CED Unit 2, 25-35%) ----------------
  { d: '2026-10-21', kind: 'lesson', group: '3.1', phase: 2, ced: ['2.2', '2.3'],
    title: 'Relational Operators & if', lessons: ['3.1a', '3.1b', '3.1c'] },
  { d: '2026-10-23', kind: 'lesson', group: '3.2', phase: 2, ced: ['2.2', '2.5'],
    title: 'Boolean Logic', lessons: ['3.2a', '3.2b', '3.2c'] },
  { d: '2026-10-27', kind: 'lesson', group: '3.3', phase: 2, ced: ['2.3', '2.4'],
    title: 'else-if Chains & Combat Round Resolver', lessons: ['3.3a', '3.3b', '3.3c'] },
  { d: '2026-11-02', kind: 'lesson', group: '3.4', phase: 2, ced: ['2.6'],
    title: 'Comparing Objects & The CommandParser Build', lessons: ['3.4'],
    note: '90-min AP-style build: String interning trap, null-safe short-circuiting, JQR substring/indexOf parsing, compareTo.' },
  { d: '2026-11-04', kind: 'lesson', group: '3.5', phase: 2, ced: ['2.2', '2.5', '2.6'],
    title: "De Morgan's Laws & The DungeonGatekeeper Build", lessons: ['3.5'],
    note: '90-min AP-style build: De Morgan truth-table traps, boundary negation, && vs || precedence, short-circuit guards.' },
  { d: '2026-11-06', kind: 'lesson', group: '3.6', phase: 2, ced: ['2.1', '2.3', '2.5'],
    title: 'Combat Engine RPG Build (Day 1): Attack & Crit Resolver', lessons: ['3.6a'],
    note: 'Part 1 of the Combat Engine: deterministic roll evaluation, natural 1/20 precedence traps, and Dice integration.' },
  { d: '2026-11-10', kind: 'lesson', group: '3.6', phase: 2, ced: ['2.1', '2.3', '2.4', '2.5'],
    title: 'Combat Engine RPG Build (Day 2): Tactical Round & Stances', lessons: ['3.6b'],
    note: 'Part 2 of the Combat Engine: shield/defend damage reduction, overkill clamping, counterattack gating, and pass-by-value.' },
  { d: '2026-11-13', kind: 'lesson', group: '4.1', phase: 2, ced: ['2.1', '2.7'],
    title: 'while Loops & The WhileLab Algorithms Build', lessons: ['4.1'],
    note: '90-min AP-style build: indeterminate survival loops, digit extraction (% 10 / 10), and the premature-return trap.' },
  { d: '2026-11-17', kind: 'lesson', group: '4.2', phase: 2, ced: ['2.8'],
    title: 'for Loops & The EncounterSim Build', lessons: ['4.2'],
    note: '90-min AP-style build: range accumulation, streak detection, and the accumulator-reset trap.' },
  { d: '2026-11-19', kind: 'lesson', group: '4.3', phase: 2, ced: ['2.8', '2.10'],
    title: 'String Traversal: The ScrollCipher & AP String Build', lessons: ['4.3'],
    note: '90-min AP-style build: JQR substring(i, i+1) traversal, lookahead bounds traps, Caesar/Vigenere decoding, substring removal.' },
  { d: '2026-11-30', kind: 'lesson', group: '4.4', phase: 2, ced: ['2.11'],
    title: 'Nested Loops: The GridArchitect & Fog-of-War Build', lessons: ['4.4'],
    note: '90-min AP-style build: 2D coordinate grids, Manhattan-distance fog of war, dependent inner bounds.' },
  { d: '2026-12-02', kind: 'lesson', group: '4.5', phase: 2, ced: ['2.1', '2.9'],
    title: 'Loop Analysis, Fencepost Traps & The LoopTracer Build', lessons: ['4.5'],
    note: '90-min AP-style build: iteration counting, off-by-one bug hunting, and equivalent loop transformations.' },
  { d: '2026-12-04', kind: 'lesson', group: '4.6', phase: 2, ced: ['2.1', '2.9'],
    title: 'Dungeon Crawler RPG Build (Day 1): Combat & Floor Engine', lessons: ['4.6a'],
    note: 'Part 1 of the Dungeon Crawler: multi-round combat while-loop and multi-room floor for-loop with early break on death.' },
  { d: '2026-12-08', kind: 'lesson', group: '4.6', phase: 2, ced: ['2.9', '2.11'],
    title: 'Dungeon Crawler RPG Build (Day 2): Multi-Floor Campaign & Boss', lessons: ['4.6b'],
    note: 'Part 2 of the Dungeon Crawler: nested floor-by-room campaign, array-wrapped state mutation, and boss encounter.' },
  { d: '2026-12-10', kind: 'lesson', group: '4.7', phase: 2, ced: ['2.12'],
    title: 'Informal Run-Time Analysis & The RuntimeAnalyzer Build', lessons: ['4.7'], new: true,
    note: '90-min AP-style build: instrumenting linear, quadratic, and logarithmic algorithms to count exact statement executions.' },
  { d: '2026-12-14', kind: 'frq',    group: 'E1',  phase: 2, ced: ['2.9'],
    title: 'AP FRQ 1 Coding Lab: Methods & Control Structures', lessons: [],
    note: 'Two full AP-style Methods & Control Structures FRQs coded and tested against rubrics.' },

  // ---------------- PHASE 3: Class Creation (CED Unit 3, 10-18%) ----------------
  { d: '2026-12-16', kind: 'lesson', group: '5.1', phase: 3, ced: ['3.3', '3.4'],
    title: 'Anatomy of a Class & Your First Class', lessons: ['5.1a', '5.1b', '5.1c'] },
  { d: '2026-12-18', kind: 'lesson', group: '5.2', phase: 3, ced: ['3.4'],
    title: 'Constructors & Enemy Factory', lessons: ['5.2a', '5.2b', '5.2c'] },
  { d: '2027-01-05', kind: 'lesson', group: '5.3', phase: 3, ced: ['3.5', '3.8'],
    title: 'Accessors, Mutators & Validation', lessons: ['5.3a', '5.3b', '5.3c'] },
  { d: '2027-01-07', kind: 'lesson', group: '5.4', phase: 3, ced: ['3.5', '3.6', '3.7', '3.8', '3.9'],
    title: 'Methods, static, this, Card & BankAccount', lessons: ['5.4a', '5.4b', '5.4c'] },
  { d: '2027-01-11', kind: 'lesson', group: '5.5', phase: 3, ced: ['3.1', '3.5'],
    title: 'Player & Monster RPG Build', lessons: ['5.5a', '5.5b', '5.5c'] },
  { d: '2027-01-13', kind: 'lesson', group: '5.6', phase: 3, ced: ['3.1', '3.2'],
    title: 'Design From a Spec', lessons: ['5.6a'], new: true,
    note: 'New CED topics: abstraction and program design, impact of program design. FRQ 2 format practice.' },
  { d: '2027-01-15', kind: 'frq',    group: 'E2',  phase: 3, ced: ['3.1', '3.2'],
    title: 'AP FRQ 2 Coding Lab: Class Design', lessons: [],
    note: 'Full FRQ 2 simulation: spec table in, working Java class out.' },

  // ---------------- PHASE 4: Data Collections (CED Unit 4, 30-40%) ----------------
  { d: '2027-01-20', kind: 'lesson', group: '6.1', phase: 4, ced: ['4.3'],
    title: 'Array Basics & RPG Inventory', lessons: ['6.1a', '6.1b', '6.1c'] },
  { d: '2027-01-22', kind: 'lesson', group: '6.2', phase: 4, ced: ['4.4'],
    title: 'Array Traversal & Party Manager', lessons: ['6.2a', '6.2b', '6.2c'] },
  { d: '2027-01-27', kind: 'lesson', group: '6.3', phase: 4, ced: ['4.5', '4.14'],
    title: 'Array Algorithms: Search & Insert', lessons: ['6.3a', '6.3b', '6.3c'] },
  { d: '2027-01-29', kind: 'lesson', group: '6.4', phase: 4, ced: ['4.4', '4.5'],
    title: 'Arrays of Objects & Card Deck', lessons: ['6.4a', '6.4b', '6.4c'] },
  { d: '2027-02-02', kind: 'lesson', group: '6.5', phase: 4, ced: ['4.3', '4.4', '4.5'],
    title: 'Item Class & FixedInventory RPG Build', lessons: ['6.5a', '6.5b', '6.5c'] },
  { d: '2027-02-04', kind: 'lesson', group: '6.6', phase: 4, ced: ['4.1', '4.2'],
    title: 'Data Ethics & The Telemetry Dataset', lessons: ['6.6a', '6.6b'], new: true,
    note: 'New CED topics: ethical and social issues around data collection, introduction to data sets.' },
  { d: '2027-02-08', kind: 'lesson', group: '7.1', phase: 4, ced: ['4.8'],
    title: 'ArrayList Basics & Quest Log', lessons: ['7.1a', '7.1b', '7.1c'] },
  { d: '2027-02-10', kind: 'lesson', group: '7.2', phase: 4, ced: ['4.9'],
    title: 'ArrayList Traversal & Enemy Horde', lessons: ['7.2a', '7.2b', '7.2c'] },
  { d: '2027-02-12', kind: 'lesson', group: '7.3', phase: 4, ced: ['4.14', '4.15'],
    title: 'Searching & Sorting', lessons: ['7.3a', '7.3b', '7.3c'] },
  { d: '2027-02-17', kind: 'lesson', group: '7.4', phase: 4, ced: ['4.10'],
    title: 'Dynamic Inventory RPG Build', lessons: ['7.4a', '7.4b', '7.4c'] },
  { d: '2027-02-19', kind: 'lesson', group: '7.5', phase: 4, ced: ['4.10'],
    title: 'Dedup, Frequency, Pairs & Shuffle', lessons: ['7.5a', '7.5b', '7.5c'],
    note: 'Classic FRQ 3 material: frequency counting and pair finding.' },
  { d: '2027-02-23', kind: 'lesson', group: '7.6', phase: 4, ced: ['4.6', '4.10'],
    title: 'Reading Files: monsters.txt & Save Data', lessons: ['7.6a', '7.6b'], new: true,
    note: 'New CED topic: using text files (File + Scanner).' },
  { d: '2027-02-25', kind: 'frq',    group: 'E3',  phase: 4, ced: ['4.8', '4.9', '4.10'],
    title: 'AP FRQ 3 Coding Lab: Data Analysis with ArrayList', lessons: [],
    note: 'FRQ 3 is ArrayList-only on the new exam. Two data-analysis FRQs, coded and tested.' },
  { d: '2027-03-01', kind: 'lesson', group: '8.1', phase: 4, ced: ['4.11'],
    title: '2D Array Basics & Tile Map Editor', lessons: ['8.1a', '8.1b', '8.1c'] },
  { d: '2027-03-04', kind: 'lesson', group: '8.2', phase: 4, ced: ['4.12'],
    title: '2D Traversal & Battle Grid', lessons: ['8.2a', '8.2b', '8.2c'] },
  { d: '2027-03-08', kind: 'lesson', group: '8.3', phase: 4, ced: ['4.13'],
    title: '2D Algorithms: Tic-Tac-Toe & Connect Four', lessons: ['8.3a', '8.3b', '8.3c'] },
  { d: '2027-03-10', kind: 'lesson', group: '8.4', phase: 4, ced: ['4.11', '4.12', '4.13'],
    title: 'Dungeon Grid RPG Build', lessons: ['8.4a', '8.4b', '8.4c'] },
  { d: '2027-03-12', kind: 'lesson', group: '8.6', phase: 4, ced: ['4.6', '4.11', '4.12'],
    title: 'Dungeon Maps From Files', lessons: ['8.6a'], new: true,
    note: 'File reading meets 2D arrays: load dungeon1.txt into your grid.' },
  { d: '2027-03-16', kind: 'frq',    group: 'E4',  phase: 4, ced: ['4.11', '4.12', '4.13'],
    title: 'AP FRQ 4 Coding Lab: 2D Array', lessons: [],
    note: 'Two 2D-array FRQs in exam format, coded and rubric scored.' },
  { d: '2027-03-18', kind: 'lesson', group: '10.1', phase: 4, ced: ['4.16'],
    title: 'Recursion Basics & Recursive Dungeon', lessons: ['10.1a', '10.1b', '10.1c'] },
  { d: '2027-03-29', kind: 'lesson', group: '10.2', phase: 4, ced: ['4.16'],
    title: 'Recursive Traversal & Loot Finder', lessons: ['10.2a', '10.2b', '10.2c'] },
  { d: '2027-03-31', kind: 'lesson', group: '10.3', phase: 4, ced: ['4.17'],
    title: 'Merge Sort, Fibonacci, Palindrome', lessons: ['10.3a', '10.3b', '10.3c'] },
  { d: '2027-04-06', kind: 'lesson', group: '10.4', phase: 4, ced: ['4.16'],
    title: 'Flood Fill & Procedural Dungeon RPG Build', lessons: ['10.4a', '10.4b', '10.4c'],
    note: 'The RPG engine is complete - the flood-fill build closes out the last build of the year.' },
  { d: '2027-04-08', kind: 'lesson', group: '10.6', phase: 4, ced: ['4.17'],
    title: 'Recursive Binary Search + Full Course Content Complete', lessons: ['10.6a'], new: true,
    note: 'New CED topic completion: recursive searching. All 53 required CED topics DONE today — 1 month before the exam!' },

  // ---------------- SPRINT: One-Month Pre-Exam Testing & Review (Apr 12 - May 12) ----------------
  { d: '2027-04-12', kind: 'test',   group: 'T1', phase: 5, ced: [],
    title: 'Diagnostic Test 1: Objects, Methods, Selection & Iteration (CED Units 1-2)', lessons: [],
    note: 'First test of the spring sprint (1 month before the AP Exam): 25 AP-style MC + FRQ 1 under exam timing.' },
  { d: '2027-04-14', kind: 'clinic', group: 'W1', phase: 5, ced: [],
    title: 'FRQ 1 & 2 Coding Gauntlet: Control Structures & Class Design', lessons: [],
    note: 'Debrief Diagnostic 1, then build and test full solutions to AP FRQ 1 and FRQ 2 problems.' },
  { d: '2027-04-16', kind: 'test',   group: 'T2', phase: 5, ced: [],
    title: 'Diagnostic Test 2: Classes, Arrays, ArrayList & 2D Arrays (CED Units 3-4)', lessons: [],
    note: 'Second diagnostic test: 25 AP-style MC + FRQ 3 & 4 under exam timing.' },
  { d: '2027-04-20', kind: 'clinic', group: 'W2', phase: 5, ced: [],
    title: 'FRQ 3 & 4 Coding Gauntlet: ArrayList Data Analysis & 2D Grids', lessons: [],
    note: 'Debrief Diagnostic 2, then high-intensity coding practice on ArrayList and 2D Array FRQs.' },
  { d: '2027-04-22', kind: 'clinic', group: 'W3', phase: 5, ced: [],
    title: 'Algorithm, Search, Sort & Recursion Mastery Clinic', lessons: [],
    note: 'Targeted tracing and coding drills on Selection/Insertion/Merge Sort, Binary Search, and Recursion.' },
  { d: '2027-04-26', kind: 'mock',   group: 'M1', phase: 5, ced: [],
    title: 'Mock Exam: Section I Multiple Choice (42 questions, 90 min)', lessons: [],
    note: 'Full Section I simulation. Scored same day. Builds the personal error list for the final clinics.' },
  { d: '2027-04-28', kind: 'mock',   group: 'M2', phase: 5, ced: [],
    title: 'Mock Exam: Section II Free Response (4 questions, 90 min)', lessons: [],
    note: 'Full Section II simulation across all four FRQ types.' },
  { d: '2027-04-30', kind: 'clinic', group: 'C1', phase: 5, ced: [],
    title: 'Rubric Workshop + MC Error Clinic', lessons: [],
    note: "Score each other's FRQs with official rubrics and refactor solutions. Attack your personal MC error list." },
  { d: '2027-05-04', kind: 'test',   group: 'T3', phase: 5, ced: [],
    title: 'Final Dress Rehearsal: Timed Mixed MC & FRQ Sprint', lessons: [],
    note: 'High-yield mixed set covering the top exam traps across all 4 CED units.' },
  { d: '2027-05-06', kind: 'clinic', group: 'C2', phase: 5, ced: [],
    title: 'JQR Speed Drills + Weak-Topic Clinic', lessons: [],
    note: 'Java Quick Reference retrieval speed and final gap closing.' },
  { d: '2027-05-10', kind: 'eve',    group: 'VE', phase: 5, ced: [],
    title: 'Exam Eve: Strategy, Logistics, Confidence', lessons: [],
    note: 'What to bring, when to arrive, how to spend 90+90 minutes. Early night.' },
  { d: '2027-05-12', kind: 'exam',   group: 'EX', phase: 5, ced: [],
    title: 'THE AP CSA EXAM: 12:00 PM, Session 2', lessons: [],
    note: '42 multiple choice + 4 free response. Three hours. You have trained for this since August.' },

  // ---------------- SEASON 2 (post-exam): The Engine Room ----------------
  { d: '2027-05-14', kind: 'season2', group: '9.1', phase: 6, ced: [],
    title: 'Season 2 Launch: Inheritance & Overriding', lessons: ['9.1a', '9.1b', '9.1c', '9.2a', '9.2b', '9.2c'],
    note: 'Two groups, one day: extends and super, then method overriding in elemental combat. Copy-paste is the enemy.' },
  { d: '2027-05-18', kind: 'season2', group: '9.3', phase: 6, ced: [],
    title: 'Polymorphism & Battle System', lessons: ['9.3a', '9.3b', '9.3c'] },
  { d: '2027-05-20', kind: 'season2', group: '9.4', phase: 6, ced: [],
    title: 'Interfaces & Combat Abilities Engine', lessons: ['9.4a', '9.4b', '9.4c'] },
  { d: '2027-05-24', kind: 'season2', group: '9.5', phase: 6, ced: [],
    title: 'Downcasting + GameCharacter Hierarchy Build', lessons: ['9.5a', '9.5b', '9.5c', '9.6a', '9.6b', '9.6c'],
    note: 'Two groups, one day: downcasting, then the big hierarchy build.' },
  { d: '2027-05-26', kind: 'season2', group: '10.5', phase: 6, ced: [],
    title: 'Maze Solver + Pixel Arrays', lessons: ['10.5a', '10.5b', '10.5c', '8.5a', '8.5b', '8.5c'],
    note: 'Two mini-arcade applications in one day: recursive mazes and pixel-array fog of war.' },
  { d: '2027-05-28', kind: 'capstone', group: 'CAP1', phase: 6, ced: [],
    title: 'Capstone 1: Ship the Game', lessons: [],
    note: 'Integrate everything: polymorphic battle engine, file-loaded maps, save games.' },
  { d: '2027-06-02', kind: 'capstone', group: 'CAP2', phase: 6, ced: [],
    title: 'Capstone 2: Demo Day, Code Review & Send-Off', lessons: [],
    note: 'Live demos, peer code review with a real rubric, retro of the whole year. Last A day of the year - compare your Unit 1 code to your engine.' },
];

export interface Phase {
  name: string;
  ced: string;
  weight: string;
  span: string;
  old: string;
  color: string;
}

export const PHASES: Record<number, Phase> = {
  1: { name: 'Phase 1: Using Objects and Methods', ced: 'CED Unit 1', weight: '15-25% of the exam',
       span: 'Aug 31 - Oct 19', old: 'Units 1 + 2', color: 'discovery' },
  2: { name: 'Phase 2: Selection and Iteration', ced: 'CED Unit 2', weight: '25-35% of the exam',
       span: 'Oct 21 - Dec 14', old: 'Units 3 + 4', color: 'basic-app' },
  3: { name: 'Phase 3: Class Creation', ced: 'CED Unit 3', weight: '10-18% of the exam',
       span: 'Dec 16 - Jan 15', old: 'Unit 5', color: 'expand-app' },
  4: { name: 'Phase 4: Data Collections', ced: 'CED Unit 4', weight: '30-40% of the exam',
       span: 'Jan 20 - Apr 8', old: 'Units 6, 7, 8, 10', color: 'rpg' },
  5: { name: 'Sprint: 1-Month Exam Prep & Testing', ced: 'All 4 CED Units', weight: 'The exam is May 12, 2027',
       span: 'Apr 12 - May 12', old: 'Diagnostics + Mock Exam + Clinics', color: 'assessment' },
  6: { name: 'Season 2: The Engine Room', ced: 'Post-exam', weight: 'Beyond the exam, for the love of the game',
       span: 'May 14 - Jun 2', old: 'Unit 9 + 8.5 + 10.5', color: 'hybrid' },
};

/** Full CED topic list (Fall 2025) for the coverage matrix. */
export const CED_TOPICS: Record<string, string> = {
  '1.1': 'Introduction to Algorithms, Programming, and Compilers',
  '1.2': 'Variables and Data Types',
  '1.3': 'Expressions and Output',
  '1.4': 'Assignment Statements and Input',
  '1.5': 'Casting and Range of Variables',
  '1.6': 'Compound Assignment Operators',
  '1.7': 'Application Program Interface (API) and Libraries',
  '1.8': 'Documentation with Comments',
  '1.9': 'Method Signatures',
  '1.10': 'Calling Class Methods',
  '1.11': 'Math Class',
  '1.12': 'Objects: Instances of Classes',
  '1.13': 'Object Creation and Storage (Instantiation)',
  '1.14': 'Calling Instance Methods',
  '1.15': 'String Manipulation',
  '2.1': 'Algorithms with Selection and Repetition',
  '2.2': 'Boolean Expressions',
  '2.3': 'if Statements',
  '2.4': 'Nested if Statements',
  '2.5': 'Compound Boolean Expressions',
  '2.6': 'Comparing Boolean Expressions',
  '2.7': 'while Loops',
  '2.8': 'for Loops',
  '2.9': 'Implementing Selection and Iteration Algorithms',
  '2.10': 'Implementing String Algorithms',
  '2.11': 'Nested Iteration',
  '2.12': 'Informal Run-Time Analysis',
  '3.1': 'Abstraction and Program Design',
  '3.2': 'Impact of Program Design',
  '3.3': 'Anatomy of a Class',
  '3.4': 'Constructors',
  '3.5': 'Methods: How to Write Them',
  '3.6': 'Methods: Passing and Returning References of an Object',
  '3.7': 'Class Variables and Methods',
  '3.8': 'Scope and Access',
  '3.9': 'this Keyword',
  '4.1': 'Ethical and Social Issues Around Data Collection',
  '4.2': 'Introduction to Using Data Sets',
  '4.3': 'Array Creation and Access',
  '4.4': 'Array Traversals',
  '4.5': 'Implementing Array Algorithms',
  '4.6': 'Using Text Files',
  '4.7': 'Wrapper Classes',
  '4.8': 'ArrayList Methods',
  '4.9': 'ArrayList Traversals',
  '4.10': 'Implementing ArrayList Algorithms',
  '4.11': '2D Array Creation and Access',
  '4.12': '2D Array Traversals',
  '4.13': 'Implementing 2D Array Algorithms',
  '4.14': 'Searching Algorithms',
  '4.15': 'Sorting Algorithms',
  '4.16': 'Recursion',
  '4.17': 'Recursive Searching and Sorting',
};

export const KIND_LABEL: Record<EntryKind, string> = {
  launch: 'Launch', lesson: 'Lesson', test: 'Test', frq: 'FRQ Lab',
  mock: 'Mock Exam', clinic: 'Clinic', eve: 'Exam Eve', exam: 'EXAM',
  season2: 'Season 2', capstone: 'Capstone',
};

// ---------------------------------------------------------------------------
// Derived values
// ---------------------------------------------------------------------------

/** Canonical lesson order: phase order, then within-day order. */
export const LESSON_CHAIN: string[] = (() => {
  const chain: string[] = [];
  for (const e of SEQUENCE) {
    for (const lid of e.lessons) {
      if (!chain.includes(lid)) chain.push(lid);
    }
  }
  return chain;
})();

/** Lessons taught after the exam (inheritance, mazes, pixels). */
export const SEASON2_LESSONS: Set<string> = new Set(
  SEQUENCE.filter((e) => e.kind === 'season2').flatMap((e) => e.lessons),
);

/** Lesson ids grouped by phase, first appearance order. */
export function phaseLessons(phase: number): string[] {
  const out: string[] = [];
  for (const e of SEQUENCE) {
    if (e.phase !== phase) continue;
    for (const lid of e.lessons) if (!out.includes(lid)) out.push(lid);
  }
  return out;
}

/** Sequence entries grouped by phase, in calendar order. */
export function phaseEntries(phase: number): SequenceEntry[] {
  return SEQUENCE.filter((e) => e.phase === phase);
}

/** First sequence entry that teaches a given CED topic. */
export function firstTeaching(topic: string): SequenceEntry | undefined {
  return SEQUENCE.find((e) => e.ced.includes(topic));
}

/** All CED topics covered somewhere in the sequence. */
export function coveredTopics(): Set<string> {
  return new Set(SEQUENCE.flatMap((e) => e.ced));
}

// ---------------------------------------------------------------------------
// Date formatting helpers (no dependencies).
// ---------------------------------------------------------------------------

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LONG_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];
const LONG_WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** "Mon Aug 31, 2026" — the pace.html table format. */
export function prettyDate(iso: string): string {
  const dt = parseIso(iso);
  return `${WEEKDAYS[dt.getUTCDay()]} ${MONTHS[dt.getUTCMonth()]} ${dt.getUTCDate()}, ${dt.getUTCFullYear()}`;
}

/** "2026-08-31 (Mon)" — the PACING.md table format. */
export function mdDate(iso: string): string {
  const dt = parseIso(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())} (${WEEKDAYS[dt.getUTCDay()]})`;
}

/** "Aug 31" — the coverage matrix format. */
export function shortDate(iso: string): string {
  const dt = parseIso(iso);
  return `${MONTHS[dt.getUTCMonth()]} ${dt.getUTCDate()}`;
}

/** "Mon Nov 2" — compact weekday + month + day for the unified dashboard. */
export function compactDate(iso: string): string {
  const dt = parseIso(iso);
  return `${WEEKDAYS[dt.getUTCDay()]} ${MONTHS[dt.getUTCMonth()]} ${dt.getUTCDate()}`;
}

/** "Wednesday, May 12, 2027" — long form for prose. */
export function longDate(iso: string): string {
  const dt = parseIso(iso);
  return `${LONG_WEEKDAYS[dt.getUTCDay()]}, ${LONG_MONTHS[dt.getUTCMonth()]} ${dt.getUTCDate()}, ${dt.getUTCFullYear()}`;
}

/** "May 12, 2027" — medium form for prose. */
export function mediumDate(iso: string): string {
  const dt = parseIso(iso);
  return `${LONG_MONTHS[dt.getUTCMonth()]} ${dt.getUTCDate()}, ${dt.getUTCFullYear()}`;
}

// Sanity: every sequence date is an A day, no duplicates.
const seqDays = SEQUENCE.map((e) => e.d);
if (new Set(seqDays).size !== seqDays.length) throw new Error('duplicate dates in SEQUENCE');
for (const d of seqDays) {
  if (!A_DAYS.includes(d)) throw new Error(`sequence date ${d} is not an A day`);
}
