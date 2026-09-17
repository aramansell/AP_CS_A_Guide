/**
 * DiceCheck.java - acceptance test for your Dice.java engine.
 *
 * HOW TO RUN
 *   1. Put this file in the same folder as your Dice.java.
 *   2. Compile both:   javac Dice.java DiceCheck.java
 *   3. Run the tests:  java DiceCheck
 *
 * If this file will not compile, read the error message. It will name the
 * method whose signature does not match the spec - fix that method in your
 * Dice.java, not this file.
 *
 * WHY THE TESTS LOOK LIKE THIS
 * Dice are random, so no test can demand an exact number. Each check below runs
 * many trials and tests the RANGE of results instead. That catches the bugs
 * that actually happen: an off-by-one (a d6 that returns 0 or 7), a method that
 * ignores one of its parameters, and a "sum" that is secretly a multiplication.
 */
public class DiceCheck {

    // How many times each check rolls the dice. High enough that reaching an
    // unlikely value (snake eyes, a natural 20) is a safe bet, low enough that
    // the whole suite finishes instantly.
    private static final int TRIALS = 2000;

    // How many separate sets of ability scores statRoll() is asked for.
    private static final int STAT_SETS = 200;

    private static int passed = 0;
    private static int failed = 0;

    public static void main(String[] args) {
        System.out.println("Dice engine acceptance test");
        System.out.println("===========================");

        testRoll();
        testRollSides();
        testRollNumSides();
        testRollWithStat();
        testSkillCheck();
        testSkillCheckWithSkill();
        testStatRoll();

        System.out.println();
        System.out.println("===========================");
        System.out.println(passed + " passed, " + failed + " failed");
        if (failed == 0) {
            System.out.println("Your Dice engine meets the spec.");
        } else {
            System.out.println("Fix the FAIL lines above, recompile, and run again.");
        }
    }

    /* ------------------------------------------------------------------ */
    /* roll() - a d6, no arguments                                        */
    /* ------------------------------------------------------------------ */

    private static void testRoll() {
        section("roll() - a plain d6");

        int min = Integer.MAX_VALUE;
        int max = Integer.MIN_VALUE;
        boolean inRange = true;

        for (int i = 0; i < TRIALS; i++) {
            int r = Dice.roll();
            if (r < 1 || r > 6) {
                inRange = false;
            }
            min = Math.min(min, r);
            max = Math.max(max, r);
        }

        System.out.println("  observed range: " + min + " to " + max);

        check("every roll lands between 1 and 6", inRange);
        check("a 1 turns up eventually", min == 1);
        check("a 6 turns up eventually", max == 6);
    }

    /* ------------------------------------------------------------------ */
    /* roll(int sides) - one die with the given number of sides           */
    /* ------------------------------------------------------------------ */

    private static void testRollSides() {
        section("roll(int sides) - one die, any size");

        check("roll(20) stays between 1 and 20", alwaysInRange(20, 1, 20));
        check("roll(6) stays between 1 and 6", alwaysInRange(6, 1, 6));
        check("roll(2) stays between 1 and 2", alwaysInRange(2, 1, 2));

        System.out.println("  roll(20) observed range: " + observeRange(20, 1));

        check("roll(20) reaches both 1 and 20", reachesBothEnds(20));
    }

    /* ------------------------------------------------------------------ */
    /* roll(int num, int sides) - several dice, summed                    */
    /* ------------------------------------------------------------------ */

    private static void testRollNumSides() {
        section("roll(int num, int sides) - a handful of dice, summed");

        check("roll(2, 6) stays between 2 and 12", alwaysInRange(2, 6, 2, 12));
        check("roll(3, 6) stays between 3 and 18", alwaysInRange(3, 6, 3, 18));
        check("roll(1, 20) stays between 1 and 20", alwaysInRange(1, 20, 1, 20));
        check("roll(4, 6) stays between 4 and 24", alwaysInRange(4, 6, 4, 24));

        System.out.println("  roll(3, 6) observed range: " + observeRange(3, 6, 3));

        // A real sum can land on an odd total. num * roll(sides) cannot - it
        // only ever produces multiples of num.
        check("roll(2, 6) can produce an odd total", seesOddTotal(2, 6));
        check("roll(3, 6) can produce a total that is not a multiple of 3",
                seesNonMultiple(3, 6));
    }

    /* ------------------------------------------------------------------ */
    /* roll(int num, int sides, int stat) - the same, plus a modifier     */
    /* ------------------------------------------------------------------ */

    private static void testRollWithStat() {
        section("roll(int num, int sides, int stat) - dice plus an ability modifier");

        System.out.println("  stat becomes a modifier: (stat - 10) / 2");

        // 2d6 alone spans 2 to 12. The modifier shifts both ends.
        check("roll(2, 6, 14) stays between 4 and 14   (str 14 gives +2)",
                alwaysInRange(2, 6, 14, 4, 14));
        check("roll(2, 6, 10) stays between 2 and 12   (str 10 gives +0)",
                alwaysInRange(2, 6, 10, 2, 12));
        check("roll(2, 6, 8) stays between 1 and 11    (str 8 gives -1)",
                alwaysInRange(2, 6, 8, 1, 11));
        check("roll(2, 6, 18) stays between 6 and 16   (str 18 gives +4)",
                alwaysInRange(2, 6, 18, 6, 16));
    }

    /* ------------------------------------------------------------------ */
    /* skillCheck(int pass) - a d20 against a difficulty                  */
    /* ------------------------------------------------------------------ */

    private static void testSkillCheck() {
        section("skillCheck(int pass) - a d20 against a difficulty");

        System.out.println("  -1 crit fail, 0 fail, 1 success, 2 crit success");

        check("every result is one of -1, 0, 1, 2", codesValid(10));
        check("pass 1: never returns 0 (only a natural 1 can miss)", neverResult(1, 0));
        check("pass 21: never returns 1 (only a natural 20 can hit)", neverResult(21, 1));
        check("a crit fail is reachable", everResult(10, -1));
        check("a crit success is reachable", everResult(10, 2));
    }

    /* ------------------------------------------------------------------ */
    /* skillCheck(int pass, int skill) - the same, with an ability bonus  */
    /* ------------------------------------------------------------------ */

    private static void testSkillCheckWithSkill() {
        section("skillCheck(int pass, int skill) - a d20 plus an ability modifier");

        // skillCheck(14, str): 14 is the difficulty, str is your ability score.
        check("every result is one of -1, 0, 1, 2", codesValid(14, 14));
        check("skillCheck(1, 18) never returns 0 (+4 beats any difficulty)",
                neverResult(1, 18, 0));
        check("skillCheck(100, 18) never returns 1 (+4 cannot reach 100)",
                neverResult(100, 18, 1));
        check("a natural 20 still crits through a hopeless difficulty",
                everResult(100, 18, 2));

        // These two pin down that the skill argument is actually being used.
        // At strength 20 the modifier is +5, so a 19 on the die just reaches a
        // difficulty of 24. At strength 10 there is no modifier, and 24 is out
        // of reach entirely - a skillCheck that ignores its second argument
        // would get both of these the same way round, and fail.
        check("skillCheck(24, 20) can succeed (+5 just reaches a difficulty of 24)",
                everResult(24, 20, 1));
        check("skillCheck(24, 10) never succeeds (with no bonus, 24 is out of reach)",
                neverResult(24, 10, 1));
    }

    /* ------------------------------------------------------------------ */
    /* statRoll(int stats) - a whole set of ability scores                */
    /* ------------------------------------------------------------------ */

    private static void testStatRoll() {
        section("statRoll(int stats) - a whole set of ability scores");

        check("statRoll(6) hands back 6 stats, each from 3d6", everySetIsValid(6));
        check("statRoll(4) hands back 4 stats, each from 3d6", everySetIsValid(4));
        check("statRoll(1) hands back 1 stat", everySetIsValid(1));
        check("statRoll(6) does not hand back six identical numbers",
                notAllIdentical(6));
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

    /** True if every roll(sides) over TRIALS lands in low..high. */
    private static boolean alwaysInRange(int sides, int low, int high) {
        for (int i = 0; i < TRIALS; i++) {
            int r = Dice.roll(sides);
            if (r < low || r > high) {
                return false;
            }
        }
        return true;
    }

    /** True if every roll(num, sides) over TRIALS lands in low..high. */
    private static boolean alwaysInRange(int num, int sides, int low, int high) {
        for (int i = 0; i < TRIALS; i++) {
            int r = Dice.roll(num, sides);
            if (r < low || r > high) {
                return false;
            }
        }
        return true;
    }

    /** True if every roll(num, sides, stat) over TRIALS lands in low..high. */
    private static boolean alwaysInRange(int num, int sides, int stat, int low, int high) {
        for (int i = 0; i < TRIALS; i++) {
            int r = Dice.roll(num, sides, stat);
            if (r < low || r > high) {
                return false;
            }
        }
        return true;
    }

    /** True if roll(sides) reaches both 1 and the top of the die. */
    private static boolean reachesBothEnds(int sides) {
        int min = Integer.MAX_VALUE;
        int max = Integer.MIN_VALUE;
        for (int i = 0; i < TRIALS; i++) {
            int r = Dice.roll(sides);
            min = Math.min(min, r);
            max = Math.max(max, r);
        }
        return min == 1 && max == sides;
    }

    /** A readable "lowest to highest observed" string, for eyeballing. */
    private static String observeRange(int sides, int low) {
        int min = Integer.MAX_VALUE;
        int max = Integer.MIN_VALUE;
        for (int i = 0; i < TRIALS; i++) {
            int r = Dice.roll(sides);
            min = Math.min(min, r);
            max = Math.max(max, r);
        }
        return min + " to " + max;
    }

    /** A readable "lowest to highest observed" string, for eyeballing. */
    private static String observeRange(int num, int sides, int low) {
        int min = Integer.MAX_VALUE;
        int max = Integer.MIN_VALUE;
        for (int i = 0; i < TRIALS; i++) {
            int r = Dice.roll(num, sides);
            min = Math.min(min, r);
            max = Math.max(max, r);
        }
        return min + " to " + max;
    }

    /** True if a 2-dice sum ever comes out odd, which a product never would. */
    private static boolean seesOddTotal(int num, int sides) {
        for (int i = 0; i < TRIALS; i++) {
            if (Dice.roll(num, sides) % 2 != 0) {
                return true;
            }
        }
        return false;
    }

    /** True if a sum ever lands off the multiples of num, which a product cannot. */
    private static boolean seesNonMultiple(int num, int sides) {
        for (int i = 0; i < TRIALS; i++) {
            if (Dice.roll(num, sides) % num != 0) {
                return true;
            }
        }
        return false;
    }

    /** True if skillCheck(pass) only ever returns -1, 0, 1, or 2. */
    private static boolean codesValid(int pass) {
        for (int i = 0; i < TRIALS; i++) {
            int r = Dice.skillCheck(pass);
            if (r < -1 || r > 2) {
                return false;
            }
        }
        return true;
    }

    /** True if skillCheck(pass, skill) only ever returns -1, 0, 1, or 2. */
    private static boolean codesValid(int pass, int skill) {
        for (int i = 0; i < TRIALS; i++) {
            int r = Dice.skillCheck(pass, skill);
            if (r < -1 || r > 2) {
                return false;
            }
        }
        return true;
    }

    /** True if skillCheck(pass) never once returns the forbidden code. */
    private static boolean neverResult(int pass, int forbidden) {
        for (int i = 0; i < TRIALS; i++) {
            if (Dice.skillCheck(pass) == forbidden) {
                return false;
            }
        }
        return true;
    }

    /** True if skillCheck(pass, skill) never once returns the forbidden code. */
    private static boolean neverResult(int pass, int skill, int forbidden) {
        for (int i = 0; i < TRIALS; i++) {
            if (Dice.skillCheck(pass, skill) == forbidden) {
                return false;
            }
        }
        return true;
    }

    /** True if skillCheck(pass) produces the wanted code at least once. */
    private static boolean everResult(int pass, int wanted) {
        for (int i = 0; i < TRIALS; i++) {
            if (Dice.skillCheck(pass) == wanted) {
                return true;
            }
        }
        return false;
    }

    /** True if skillCheck(pass, skill) produces the wanted code at least once. */
    private static boolean everResult(int pass, int skill, int wanted) {
        for (int i = 0; i < TRIALS; i++) {
            if (Dice.skillCheck(pass, skill) == wanted) {
                return true;
            }
        }
        return false;
    }

    /** True if every statRoll(stats) hands back the right count, each 3 to 18. */
    private static boolean everySetIsValid(int stats) {
        for (int set = 0; set < STAT_SETS; set++) {
            int[] rolls = Dice.statRoll(stats);
            if (rolls == null || rolls.length != stats) {
                return false;
            }
            for (int i = 0; i < rolls.length; i++) {
                if (rolls[i] < 3 || rolls[i] > 18) {
                    return false;
                }
            }
        }
        return true;
    }

    /** True if statRoll(stats) does not just fill the array with one number. */
    private static boolean notAllIdentical(int stats) {
        for (int set = 0; set < STAT_SETS; set++) {
            int[] rolls = Dice.statRoll(stats);
            boolean identical = true;
            for (int i = 1; i < rolls.length; i++) {
                if (rolls[i] != rolls[0]) {
                    identical = false;
                }
            }
            if (!identical) {
                return true;
            }
        }
        return false;
    }
}
