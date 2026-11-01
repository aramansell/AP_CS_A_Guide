/**
 * RuntimeAnalyzerCheck.java — acceptance test for Lesson 4.7 (RuntimeAnalyzer.java).
 *
 * HOW TO RUN
 *   javac RuntimeAnalyzer.java RuntimeAnalyzerCheck.java
 *   java RuntimeAnalyzerCheck
 */
public class RuntimeAnalyzerCheck {

    private static int passed = 0;
    private static int failed = 0;

    public static void main(String[] args) {
        System.out.println("RuntimeAnalyzer acceptance test (Lesson 4.7)");
        System.out.println("============================================");

        testLinearSearchSteps();
        testBinarySearchSteps();
        testGridAndPairSteps();

        System.out.println();
        System.out.println("============================================");
        System.out.println(passed + " passed, " + failed + " failed");
        if (failed == 0) {
            System.out.println("All checks passed! Your RuntimeAnalyzer meets the AP spec.");
        } else {
            System.out.println("Fix the FAIL lines above, recompile, and run again.");
        }
    }

    private static void testLinearSearchSteps() {
        section("Part 1: countLinearSearchSteps(int n, int targetIndex)");

        check("best case (target at index 0 of 1000) -> 1 step",
                RuntimeAnalyzer.countLinearSearchSteps(1000, 0) == 1);
        check("middle case (target at index 499 of 1000) -> 500 steps",
                RuntimeAnalyzer.countLinearSearchSteps(1000, 499) == 500);
        check("worst case found (target at index 999 of 1000) -> 1000 steps",
                RuntimeAnalyzer.countLinearSearchSteps(1000, 999) == 1000);
        check("not found (targetIndex = -1 or 1500 in 1000 items) -> 1000 steps",
                RuntimeAnalyzer.countLinearSearchSteps(1000, -1) == 1000
                        && RuntimeAnalyzer.countLinearSearchSteps(1000, 1500) == 1000);
    }

    private static void testBinarySearchSteps() {
        section("Part 2: countBinarySearchSteps(int n, int targetIndex)");

        // n = 1000: lo = 0, hi = 999 -> first mid = (0 + 999) / 2 = 499 (1 step!)
        check("best case: n=1000, targetIndex=499 (exact first midpoint) -> 1 step",
                RuntimeAnalyzer.countBinarySearchSteps(1000, 499) == 1);
        // n = 15: lo=0, hi=14 -> mid=7 (1) -> target=14: lo=8,hi=14 mid=11 (2) -> lo=12,hi=14 mid=13 (3) -> lo=14,hi=14 mid=14 (4)
        check("n=15, targetIndex=14 (last element) -> 4 steps (vs 15 for linear!)",
                RuntimeAnalyzer.countBinarySearchSteps(15, 14) == 4);
        check("n=1023, targetIndex=1022 -> 10 steps (vs 1023 for linear!)",
                RuntimeAnalyzer.countBinarySearchSteps(1023, 1022) == 10);
        check("not found: n=15, targetIndex=99 -> 4 steps until lo > hi",
                RuntimeAnalyzer.countBinarySearchSteps(15, 99) == 4);
    }

    private static void testGridAndPairSteps() {
        section("Part 3: countFullGridSteps(int n) & countUniquePairSteps(int n)");

        check("countFullGridSteps(10) -> 100, countFullGridSteps(100) -> 10000 (10x input -> 100x work!)",
                RuntimeAnalyzer.countFullGridSteps(10) == 100
                        && RuntimeAnalyzer.countFullGridSteps(100) == 10000);
        check("countUniquePairSteps(10) -> 45 (10 * 9 / 2)",
                RuntimeAnalyzer.countUniquePairSteps(10) == 45);
        check("countUniquePairSteps(100) -> 4950, countUniquePairSteps(1000) -> 499500 (still quadratic!)",
                RuntimeAnalyzer.countUniquePairSteps(100) == 4950
                        && RuntimeAnalyzer.countUniquePairSteps(1000) == 499500);
        check("n <= 1: countUniquePairSteps(1) -> 0, countFullGridSteps(0) -> 0",
                RuntimeAnalyzer.countUniquePairSteps(1) == 0
                        && RuntimeAnalyzer.countFullGridSteps(0) == 0);
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
