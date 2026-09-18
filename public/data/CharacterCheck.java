import java.io.ByteArrayOutputStream;
import java.io.PrintStream;

/**
 * CharacterCheck.java - acceptance test for your Character.java.
 *
 * HOW TO RUN
 *   1. Put this file in the same folder as your Character.java AND Dice.java.
 *   2. Compile all three:  javac Dice.java Character.java CharacterCheck.java
 *   3. Run the tests:      java CharacterCheck
 *
 * If this file will not compile, read the error message. It will name the
 * method or field whose shape does not match the spec - fix that in your
 * Character.java, not in this file.
 *
 * YOUR FIELDS ARE PUBLIC IN THIS UNIT
 * This test reads your fields directly (hero.strength, hero.maxHp) instead of
 * going through getters, because 2.7 does not use getters yet. Two things
 * follow from that:
 *
 *   1. Your field NAMES are part of the contract. Renaming hp to hitPoints
 *      stops this test from compiling.
 *   2. If you made a field private, that also stops it from compiling.
 *
 * Both of those are on purpose. Unit 5 is where fields become private and
 * getters appear - and where you find out what having them public costs you.
 *
 * WHY THE TESTS LOOK LIKE THIS
 * generateStats() rolls real dice, so no test can demand an exact ability
 * score. Two techniques are used instead:
 *
 *   1. Where a value is random, the test checks the RANGE of what comes back
 *      (every stat is 3 to 18) across many characters.
 *   2. Where a value is DERIVED from a random value, the test checks the
 *      RELATIONSHIP rather than a hardcoded number - it compares your maxHp
 *      against 10 + your own modifier(constitution). That works no matter
 *      what the dice rolled, and it still catches a wrong formula.
 *
 * The ability modifier is checked only on EVEN ability scores. 5e says an
 * odd score below 10 rounds down (-1 for a score of 9), while Java's integer
 * division truncates toward zero (0 for a score of 9). Both are defensible
 * and Unit 1 let you choose, so this test stays out of that argument.
 */
public class CharacterCheck {

    // How many characters are generated per check. High enough that an
    // unlikely ability score turns up, low enough to finish instantly.
    private static final int TRIALS = 200;

    private static int passed = 0;
    private static int failed = 0;

    // Set if printCharacterSheet() throws, so it can be reported as a
    // failed check instead of crashing the whole run.
    private static boolean sheetThrew = false;

    public static void main(String[] args) {
        System.out.println("Character engine acceptance test");
        System.out.println("================================");

        testModifier();
        testGenerateStats();
        testDerivedValues();
        testProficiencyBonus();
        testAbilityCheck();
        testCharacterSheet();

        System.out.println();
        System.out.println("================================");
        System.out.println(passed + " passed, " + failed + " failed");
        if (failed == 0) {
            System.out.println("Your Character class meets the spec.");
        } else {
            System.out.println("Fix the FAIL lines above, recompile, and run again.");
        }
    }

    /* ------------------------------------------------------------------ */
    /* modifier(int score) - the 5e ability modifier                      */
    /* ------------------------------------------------------------------ */

    private static void testModifier() {
        section("modifier(int score) - the 5e ability modifier");

        System.out.println("  the modifier is (score - 10) / 2, rounded down");
        System.out.println("  checked on even scores only - see the note at the top");

        Character c = new Character();

        check("modifier(10) is 0", c.modifier(10) == 0);
        check("modifier(12) is 1", c.modifier(12) == 1);
        check("modifier(14) is 2", c.modifier(14) == 2);
        check("modifier(16) is 3", c.modifier(16) == 3);
        check("modifier(18) is 4", c.modifier(18) == 4);
        check("modifier(20) is 5", c.modifier(20) == 5);
        check("modifier(8) is -1", c.modifier(8) == -1);
        check("modifier(6) is -2", c.modifier(6) == -2);
        check("modifier(4) is -3", c.modifier(4) == -3);
    }

    /* ------------------------------------------------------------------ */
    /* generateStats() - six ability scores from the dice engine          */
    /* ------------------------------------------------------------------ */

    private static void testGenerateStats() {
        section("generateStats() - six ability scores from Dice.statRoll()");

        check("every stat lands between 3 and 18   (3d6 each)", allStatsInRange());
        check("the six stats are not all the same number", statsAreNotAllEqual());
        check("the stats actually change between characters", statsChangeBetweenCalls());
    }

    /* ------------------------------------------------------------------ */
    /* the level-1 derived values                                         */
    /* ------------------------------------------------------------------ */

    private static void testDerivedValues() {
        section("the level-1 derived values");

        System.out.println("  maxHp      = 10 + modifier(CON)   (d10 hit die, level 1)");
        System.out.println("  ac         = 10 + modifier(DEX)   (5e unarmored)");
        System.out.println("  initiative =      modifier(DEX)");
        System.out.println("  passive    = 10 + modifier(WIS)");

        check("maxHp is 10 + modifier(constitution)", maxHpMatchesCon());
        check("hp starts at maxHp   (full health)", startsAtFullHealth());
        check("ac is 10 + modifier(dexterity)", acMatchesDex());
        check("initiative is modifier(dexterity)", initiativeMatchesDex());
        check("passive perception is 10 + modifier(wisdom)", passiveMatchesWis());
    }

    /* ------------------------------------------------------------------ */
    /* proficiencyBonus - 5e by level                                     */
    /* ------------------------------------------------------------------ */

    private static void testProficiencyBonus() {
        section("proficiencyBonus - the 5e table by level");

        System.out.println("  the bonus is 2 + (level - 1) / 4");
        System.out.println("  the level is set by hand, then generateStats() recomputes");

        check("level  1 gives +2", proficiencyAt(1) == 2);
        check("level  4 gives +2   (the last level of tier 1)", proficiencyAt(4) == 2);
        check("level  5 gives +3   (tier 2 begins)", proficiencyAt(5) == 3);
        check("level  8 gives +3", proficiencyAt(8) == 3);
        check("level  9 gives +4   (tier 3 begins)", proficiencyAt(9) == 4);
        check("level 12 gives +4", proficiencyAt(12) == 4);
        check("level 13 gives +5   (tier 4 begins)", proficiencyAt(13) == 5);
        check("level 17 gives +6   (the highest bonus in 5e)", proficiencyAt(17) == 6);
        check("level 20 gives +6", proficiencyAt(20) == 6);
        check("generateStats() does not reset your level", generateStatsKeepsLevel());
    }

    /* ------------------------------------------------------------------ */
    /* abilityCheck(int dc, int score) - the dice engine's skill check    */
    /* ------------------------------------------------------------------ */

    private static void testAbilityCheck() {
        section("abilityCheck(int dc, int score) - a d20 against a difficulty");

        System.out.println("  -1 crit fail, 0 fail, 1 success, 2 crit success");

        Character c = new Character();

        check("every result is one of -1, 0, 1, 2", codesAreValid(c));
        check("abilityCheck(1, 18) never returns 0 (+4 beats any difficulty)",
                neverReturns(c, 1, 18, 0));
        check("abilityCheck(100, 18) never returns 1 (+4 cannot reach 100)",
                neverReturns(c, 100, 18, 1));
        check("a natural 1 is still a crit fail however big the bonus",
                everReturns(c, 100, 20, -1));
        check("a natural 20 is still a crit success at a hopeless difficulty",
                everReturns(c, 100, 18, 2));

        // These two pin down that the ability score argument is really used.
        // At a score of 20 the modifier is +5, so a 19 on the die just reaches
        // a difficulty of 24. At 10 there is no modifier and 24 is out of
        // reach - a version that ignored its second argument would get both
        // of these the same way round, and fail.
        check("abilityCheck(24, 20) can succeed (+5 just reaches a DC of 24)",
                everReturns(c, 24, 20, 1));
        check("abilityCheck(24, 10) never succeeds (no bonus, 24 is out of reach)",
                neverReturns(c, 24, 10, 1));
    }

    /* ------------------------------------------------------------------ */
    /* printCharacterSheet() - the sheet itself                           */
    /* ------------------------------------------------------------------ */

    private static void testCharacterSheet() {
        section("printCharacterSheet() - the sheet itself");

        Character c = new Character();
        c.name = "Thorn Ironvein";
        c.generateStats();

        String full = capture(c);

        check("the sheet prints something", full.trim().length() > 0);
        check("printCharacterSheet() runs without throwing an exception", !sheetThrew);
        check("the character's name appears somewhere on the sheet",
                full.toLowerCase().contains("thorn ironvein"));
        check("all six ability labels appear", hasAllSixLabels(full));
        check("an HP line shows hp/maxHp", hpLineShowsRatio(full, c));
        check("the HP bar is 10 characters wide", barWidth(full) == 10);

        // The bar has to respond to hp, so it is sampled at full, empty, and
        // half. A bar hardcoded to show full health passes the first of these
        // and fails the other two. hp is written directly here - there is no
        // setter in this unit, so nothing stops it going out of range, and
        // the test is careful to stay inside it.
        String fullBar = barOf(full);

        c.hp = 0;
        String emptyBar = barOf(capture(c));

        c.hp = c.maxHp / 2;
        String halfBar = barOf(capture(c));

        check("full health fills the whole bar", isUniform(fullBar));
        check("0 HP empties the whole bar", isUniform(emptyBar));
        check("the filled and empty blocks are different characters",
                fullBar != null && emptyBar != null && !fullBar.equals(emptyBar));
        check("half health fills only part of the bar",
                isHalfFilled(halfBar, fullBar, emptyBar));

        if (!sheetThrew && (barWidth(full) != 10 || !isUniform(fullBar))) {
            System.out.println("  note: the bar is the part between [ and ] on the HP line.");
            System.out.println("        it should be exactly 10 characters, filled plus empty.");
            System.out.println("        if it looks right but fails on Windows, your bar uses");
            System.out.println("        non-ASCII blocks - compile with: javac -encoding UTF-8 ...");
        }
    }

    /* ------------------------------------------------------------------ */
    /* Check helpers                                                      */
    /* ------------------------------------------------------------------ */

    private static void section(String name) {
        System.out.println();
        System.out.println(name);
    }

    private static void check(String label, boolean ok) {
        if (ok) {
            passed++;
            System.out.println("  PASS  " + label);
        } else {
            failed++;
            System.out.println("  FAIL  " + label);
        }
    }

    /** True if all six stats of TRIALS characters are each 3 to 18. */
    private static boolean allStatsInRange() {
        for (int i = 0; i < TRIALS; i++) {
            Character c = new Character();
            c.generateStats();
            int[] stats = sixStats(c);
            for (int j = 0; j < stats.length; j++) {
                if (stats[j] < 3 || stats[j] > 18) {
                    return false;
                }
            }
        }
        return true;
    }

    /** True if a character never ends up with six identical stats. */
    private static boolean statsAreNotAllEqual() {
        for (int i = 0; i < TRIALS; i++) {
            Character c = new Character();
            c.generateStats();
            int[] stats = sixStats(c);
            boolean allEqual = true;
            for (int j = 1; j < stats.length; j++) {
                if (stats[j] != stats[0]) {
                    allEqual = false;
                }
            }
            if (!allEqual) {
                return true;
            }
        }
        return false;
    }

    /** True if strength is not frozen at one value across characters. */
    private static boolean statsChangeBetweenCalls() {
        int first = -1;
        for (int i = 0; i < TRIALS; i++) {
            Character c = new Character();
            c.generateStats();
            if (first == -1) {
                first = c.strength;
            } else if (c.strength != first) {
                return true;
            }
        }
        return false;
    }

    private static boolean maxHpMatchesCon() {
        for (int i = 0; i < TRIALS; i++) {
            Character c = new Character();
            c.generateStats();
            if (c.maxHp != 10 + c.modifier(c.constitution)) {
                return false;
            }
        }
        return true;
    }

    private static boolean startsAtFullHealth() {
        for (int i = 0; i < TRIALS; i++) {
            Character c = new Character();
            c.generateStats();
            if (c.hp != c.maxHp) {
                return false;
            }
        }
        return true;
    }

    private static boolean acMatchesDex() {
        for (int i = 0; i < TRIALS; i++) {
            Character c = new Character();
            c.generateStats();
            if (c.ac != 10 + c.modifier(c.dexterity)) {
                return false;
            }
        }
        return true;
    }

    private static boolean initiativeMatchesDex() {
        for (int i = 0; i < TRIALS; i++) {
            Character c = new Character();
            c.generateStats();
            if (c.initiative != c.modifier(c.dexterity)) {
                return false;
            }
        }
        return true;
    }

    private static boolean passiveMatchesWis() {
        for (int i = 0; i < TRIALS; i++) {
            Character c = new Character();
            c.generateStats();
            if (c.passivePerception != 10 + c.modifier(c.wisdom)) {
                return false;
            }
        }
        return true;
    }

    /**
     * The proficiency bonus a character has after its level is set. The level
     * is written straight into the field and generateStats() then recomputes
     * the bonus from it. That is the only way to change a derived value in
     * this unit - and needing a full reroll to change one number is exactly
     * the awkwardness Unit 5 is about.
     */
    private static int proficiencyAt(int level) {
        Character c = new Character();
        c.level = level;
        c.generateStats();
        return c.proficiencyBonus;
    }

    private static boolean generateStatsKeepsLevel() {
        for (int i = 0; i < TRIALS; i++) {
            Character c = new Character();
            c.level = 7;
            c.generateStats();
            if (c.level != 7) {
                return false;
            }
        }
        return true;
    }

    private static boolean codesAreValid(Character c) {
        for (int i = 0; i < TRIALS; i++) {
            int r = c.abilityCheck(14, 14);
            if (r < -1 || r > 2) {
                return false;
            }
        }
        return true;
    }

    private static boolean neverReturns(Character c, int dc, int score, int forbidden) {
        for (int i = 0; i < TRIALS; i++) {
            if (c.abilityCheck(dc, score) == forbidden) {
                return false;
            }
        }
        return true;
    }

    private static boolean everReturns(Character c, int dc, int score, int wanted) {
        for (int i = 0; i < TRIALS; i++) {
            if (c.abilityCheck(dc, score) == wanted) {
                return true;
            }
        }
        return false;
    }

    private static int[] sixStats(Character c) {
        return new int[] {
            c.strength, c.dexterity, c.constitution,
            c.intelligence, c.wisdom, c.charisma
        };
    }

    /**
     * Run printCharacterSheet() with System.out redirected into a buffer, so
     * the test can read what was printed. Output is always restored, and an
     * exception from the student's method is recorded rather than allowed to
     * kill the run.
     */
    private static String capture(Character c) {
        System.out.flush();
        PrintStream original = System.out;
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        try {
            System.setOut(new PrintStream(buffer, true));
            c.printCharacterSheet();
        } catch (Throwable t) {
            sheetThrew = true;
        } finally {
            System.out.flush();
            System.setOut(original);
        }
        return buffer.toString();
    }

    private static boolean hasAllSixLabels(String sheet) {
        String lower = sheet.toLowerCase();
        String[] labels = { "str", "dex", "con", "int", "wis", "cha" };
        for (int i = 0; i < labels.length; i++) {
            if (!lower.contains(labels[i])) {
                return false;
            }
        }
        return true;
    }

    /** True if some line mentioning HP also shows hp/maxHp. */
    private static boolean hpLineShowsRatio(String sheet, Character c) {
        String wanted = c.hp + "/" + c.maxHp;
        String[] lines = sheet.split("\n");
        for (int i = 0; i < lines.length; i++) {
            if (lines[i].toLowerCase().contains("hp")) {
                String squashed = lines[i].replace(" ", "");
                if (squashed.contains(wanted)) {
                    return true;
                }
            }
        }
        return false;
    }

    /** The characters between the [ ] of the first bar, or null. */
    private static String barOf(String sheet) {
        int open = sheet.indexOf('[');
        if (open < 0) {
            return null;
        }
        int close = sheet.indexOf(']', open);
        if (close < 0) {
            return null;
        }
        return sheet.substring(open + 1, close);
    }

    private static int barWidth(String sheet) {
        String bar = barOf(sheet);
        return bar == null ? -1 : bar.length();
    }

    /** True if the bar is exactly 10 characters, all of them the same. */
    private static boolean isUniform(String bar) {
        if (bar == null || bar.length() != 10) {
            return false;
        }
        for (int i = 1; i < bar.length(); i++) {
            if (bar.charAt(i) != bar.charAt(0)) {
                return false;
            }
        }
        return true;
    }

    /**
     * True if the bar is 10 characters, uses exactly two different
     * characters, starts with the full-health block and ends with the
     * empty block - which is what half health looks like.
     */
    private static boolean isHalfFilled(String halfBar, String fullBar, String emptyBar) {
        if (halfBar == null || halfBar.length() != 10
                || fullBar == null || emptyBar == null) {
            return false;
        }
        if (halfBar.charAt(0) != fullBar.charAt(0)) {
            return false;
        }
        if (halfBar.charAt(9) != emptyBar.charAt(0)) {
            return false;
        }
        for (int i = 1; i < 10; i++) {
            if (halfBar.charAt(i) != halfBar.charAt(i - 1)
                    && halfBar.charAt(i) != halfBar.charAt(0)
                    && halfBar.charAt(i) != emptyBar.charAt(0)) {
                return false;
            }
        }
        return !isUniform(halfBar);
    }
}
