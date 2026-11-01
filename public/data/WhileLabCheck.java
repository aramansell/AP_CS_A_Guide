/**
 * WhileLabCheck.java — acceptance test for Lesson 4.1 (WhileLab.java).
 *
 * HOW TO RUN
 *   javac WhileLab.java WhileLabCheck.java
 *   java WhileLabCheck
 */
public class WhileLabCheck {

    private static int passed = 0;
    private static int failed = 0;

    public static void main(String[] args) {
        System.out.println("WhileLab acceptance test (Lesson 4.1)");
        System.out.println("=====================================");

        testPoisonSurvival();
        testSumRuneDigits();
        testCountEvenDigits();
        testManaCrystalSteps();

        System.out.println();
        System.out.println("=====================================");
        System.out.println(passed + " passed, " + failed + " failed");
        if (failed == 0) {
            System.out.println("All checks passed! Your WhileLab meets the AP spec.");
        } else {
            System.out.println("Fix the FAIL lines above, recompile, and run again.");
        }
    }

    private static void testPoisonSurvival() {
        section("Part 1: roundsToSurvivePoison(startingHP, poisonPerRound, regenPerRound)");

        check("already dead (startingHP <= 0) returns 0 rounds",
                WhileLab.roundsToSurvivePoison(0, 5, 2) == 0
                        && WhileLab.roundsToSurvivePoison(-3, 5, 2) == 0);
        check("no regen: 15 HP, 4 poison, 0 regen -> lasts 4 rounds (15 -> 11 -> 7 -> 3 -> -1)",
                WhileLab.roundsToSurvivePoison(15, 4, 0) == 4);
        check("with regen: 10 HP, 4 poison, 2 regen -> lasts 4 rounds (10->8->6->4->0 on round 4 before regen!)",
                WhileLab.roundsToSurvivePoison(10, 4, 2) == 4);
        check("ROUND-1 LETHAL TRAP: 5 HP, 5 poison, 10 regen -> dies on round 1 BEFORE regen triggers (returns 1, NOT -1!)",
                WhileLab.roundsToSurvivePoison(5, 5, 10) == 1);
        check("infinite survival: 10 HP, 4 poison, 4 regen -> survives forever (returns -1 without hanging!)",
                WhileLab.roundsToSurvivePoison(10, 4, 4) == -1);
        check("infinite survival: 10 HP, 4 poison, 6 regen -> survives forever (returns -1)",
                WhileLab.roundsToSurvivePoison(10, 4, 6) == -1);
        check("non-positive poison (poisonPerRound <= 0) with positive HP -> survives forever (-1)",
                WhileLab.roundsToSurvivePoison(10, 0, 0) == -1);
    }

    private static void testSumRuneDigits() {
        section("Part 2: sumRuneDigits(int runeCode) — AP % 10 and / 10 pattern");

        check("sumRuneDigits(4729) -> 22 (4 + 7 + 2 + 9)",
                WhileLab.sumRuneDigits(4729) == 22);
        check("sumRuneDigits(1005) -> 6 (1 + 0 + 0 + 5)",
                WhileLab.sumRuneDigits(1005) == 6);
        check("sumRuneDigits(8) -> 8 (single digit)",
                WhileLab.sumRuneDigits(8) == 8);
        check("sumRuneDigits(0) -> 0",
                WhileLab.sumRuneDigits(0) == 0);
    }

    private static void testCountEvenDigits() {
        section("Part 3: countEvenDigits(int runeCode)");

        check("countEvenDigits(4826) -> 4 (all four digits are even)",
                WhileLab.countEvenDigits(4826) == 4);
        check("countEvenDigits(13579) -> 0 (no even digits)",
                WhileLab.countEvenDigits(13579) == 0);
        check("countEvenDigits(20405) -> 4 (0 is an even digit!)",
                WhileLab.countEvenDigits(20405) == 4);
        check("ZERO EDGE-CASE TRAP: countEvenDigits(0) -> 1 (the number 0 has one even digit)",
                WhileLab.countEvenDigits(0) == 1);
    }

    private static void testManaCrystalSteps() {
        section("Part 4: manaCrystalSteps(int startingEnergy)");

        check("startingEnergy <= 1 returns 0 steps",
                WhileLab.manaCrystalSteps(1) == 0 && WhileLab.manaCrystalSteps(0) == 0);
        check("startingEnergy = 6 -> 8 steps (6 -> 3 -> 10 -> 5 -> 16 -> 8 -> 4 -> 2 -> 1)",
                WhileLab.manaCrystalSteps(6) == 8);
        check("startingEnergy = 16 -> 4 steps (16 -> 8 -> 4 -> 2 -> 1)",
                WhileLab.manaCrystalSteps(16) == 4);
        check("startingEnergy = 27 -> 111 steps",
                WhileLab.manaCrystalSteps(27) == 111);
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
