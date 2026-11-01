/**
 * ScrollCipherCheck.java — acceptance test for Lesson 4.3 (ScrollCipher.java).
 *
 * HOW TO RUN
 *   javac ScrollCipher.java ScrollCipherCheck.java
 *   java ScrollCipherCheck
 */
public class ScrollCipherCheck {

    private static int passed = 0;
    private static int failed = 0;

    public static void main(String[] args) {
        System.out.println("ScrollCipher acceptance test (Lesson 4.3)");
        System.out.println("=========================================");

        testCountAdjacentDoubles();
        testReverseRunes();
        testShiftUppercaseCipher();
        testPurgeCursedGlyph();

        System.out.println();
        System.out.println("=========================================");
        System.out.println(passed + " passed, " + failed + " failed");
        if (failed == 0) {
            System.out.println("All checks passed! Your ScrollCipher meets the AP spec.");
        } else {
            System.out.println("Fix the FAIL lines above, recompile, and run again.");
        }
    }

    private static void testCountAdjacentDoubles() {
        section("Part 1: countAdjacentDoubles(String spell) — lookahead bounds trap");

        check("\"bookkeeper\" -> 3 (oo, kk, ee) without crashing at the last character",
                safeDoubles("bookkeeper", 3));
        check("\"abyssal\" -> 1 (ss)",
                safeDoubles("abyssal", 1));
        check("overlapping triple: \"aaa\" -> 2 (indices 0-1 and 1-2)",
                safeDoubles("aaa", 2));
        check("no doubles: \"dragon\" -> 0",
                safeDoubles("dragon", 0));
        check("length 0 or 1: \"\" -> 0 and \"x\" -> 0 without crashing",
                safeDoubles("", 0) && safeDoubles("x", 0));
    }

    private static void testReverseRunes() {
        section("Part 2: reverseRunes(String scroll) — backward traversal");

        check("\"dragon\" -> \"nogard\" (includes index 0 at the end!)",
                safeReverse("dragon", "nogard"));
        check("\"fireball\" -> \"llaberif\"",
                safeReverse("fireball", "llaberif"));
        check("single char: \"A\" -> \"A\"",
                safeReverse("A", "A"));
        check("empty string: \"\" -> \"\"",
                safeReverse("", ""));
    }

    private static void testShiftUppercaseCipher() {
        section("Part 3: shiftUppercaseCipher(String text, int shift) — modulo wrap & negative shift trap");

        check("forward shift: \"ATTACK\" with shift 1 -> \"BUUBDL\"",
                safeCipher("ATTACK", 1, "BUUBDL"));
        check("wrap past Z: \"DRAGON Z\" with shift 3 -> \"GUDJRQ C\" (spaces preserved!)",
                safeCipher("DRAGON Z", 3, "GUDJRQ C"));
        check("NEGATIVE SHIFT TRAP: \"BUUBDL\" with shift -1 -> \"ATTACK\"",
                safeCipher("BUUBDL", -1, "ATTACK"));
        check("NEGATIVE WRAP PAST A: \"ABZ!\" with shift -2 -> \"YZX!\" (catches -2 % 26 == -2 in Java!)",
                safeCipher("ABZ!", -2, "YZX!"));
        check("large shift (> 26): \"HAL\" with shift 27 -> \"IBM\"",
                safeCipher("HAL", 27, "IBM"));
    }

    private static void testPurgeCursedGlyph() {
        section("Part 4: purgeCursedGlyph(String scroll, String glyph) — while + indexOf + substring");

        check("remove \"hex\" from \"hexed sword of hexes\" -> \"ed sword of es\"",
                safePurge("hexed sword of hexes", "hex", "ed sword of es"));
        check("adjacent/repeated occurrences: remove \"ab\" from \"ababab\" -> \"\"",
                safePurge("ababab", "ab", ""));
        check("CHAINED FORMATION TRAP: remove \"oo\" from \"boook\" -> \"bk\"",
                safePurge("boook", "oo", "bk"));
        check("glyph not present: remove \"zzz\" from \"fireball\" -> \"fireball\"",
                safePurge("fireball", "zzz", "fireball"));
    }

    private static boolean safeDoubles(String s, int expected) {
        try {
            return ScrollCipher.countAdjacentDoubles(s) == expected;
        } catch (Throwable t) {
            System.out.println("    [crashed with " + t.getClass().getSimpleName() + "]");
            return false;
        }
    }

    private static boolean safeReverse(String s, String expected) {
        try {
            return expected.equals(ScrollCipher.reverseRunes(s));
        } catch (Throwable t) {
            System.out.println("    [crashed with " + t.getClass().getSimpleName() + "]");
            return false;
        }
    }

    private static boolean safeCipher(String s, int shift, String expected) {
        try {
            return expected.equals(ScrollCipher.shiftUppercaseCipher(s, shift));
        } catch (Throwable t) {
            System.out.println("    [crashed with " + t.getClass().getSimpleName() + "]");
            return false;
        }
    }

    private static boolean safePurge(String s, String g, String expected) {
        try {
            return expected.equals(ScrollCipher.purgeCursedGlyph(s, g));
        } catch (Throwable t) {
            System.out.println("    [crashed with " + t.getClass().getSimpleName() + "]");
            return false;
        }
    }

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
}
