/**
 * GridArchitectCheck.java — acceptance test for Lesson 4.4 (GridArchitect.java).
 *
 * HOW TO RUN
 *   javac GridArchitect.java GridArchitectCheck.java
 *   java GridArchitectCheck
 */
public class GridArchitectCheck {

    private static int passed = 0;
    private static int failed = 0;

    public static void main(String[] args) {
        System.out.println("GridArchitect acceptance test (Lesson 4.4)");
        System.out.println("==========================================");

        testBuildBorderedRoom();
        testRenderFogOfWar();
        testBuildRightStaircase();
        testCountLuckyLootPairs();

        System.out.println();
        System.out.println("==========================================");
        System.out.println(passed + " passed, " + failed + " failed");
        if (failed == 0) {
            System.out.println("All checks passed! Your GridArchitect meets the AP spec.");
        } else {
            System.out.println("Fix the FAIL lines above, recompile, and run again.");
        }
    }

    private static void testBuildBorderedRoom() {
        section("Part 1: buildBorderedRoom(int rows, int cols)");

        String expected3x4 =
                "####\n" +
                "#..#\n" +
                "####\n";
        String expected4x5 =
                "#####\n" +
                "#...#\n" +
                "#...#\n" +
                "#####\n";

        check("3x4 room has '#' on outer border, '.' inside, and '\\n' after each row",
                expected3x4.equals(GridArchitect.buildBorderedRoom(3, 4)));
        check("4x5 room matches exact ASCII border layout",
                expected4x5.equals(GridArchitect.buildBorderedRoom(4, 5)));
        check("2x2 room is all border ('#')",
                "##\n##\n".equals(GridArchitect.buildBorderedRoom(2, 2)));
    }

    private static void testRenderFogOfWar() {
        section("Part 2: renderFogOfWar(int size, int heroRow, int heroCol, int visionRadius)");

        // 5x5 grid (0..4), hero at (2, 2), visionRadius = 1 (Manhattan distance <= 1):
        String expectedRadius1 =
                "?????\n" +
                "??.??\n" +
                "?.@.?\n" +
                "??.??\n" +
                "?????\n";
        // 3x3 grid (0..2), hero at (0, 0), visionRadius = 2:
        String expectedCorner =
                "@..\n" +
                "..?\n" +
                ".??\n";

        check("5x5 grid with hero at (2,2) and radius 1 shows diamond of '.' around '@'",
                expectedRadius1.equals(GridArchitect.renderFogOfWar(5, 2, 2, 1)));
        check("3x3 grid with hero at (0,0) and radius 2 shows Manhattan distance <= 2",
                expectedCorner.equals(GridArchitect.renderFogOfWar(3, 0, 0, 2)));
        check("radius 0 shows only '@' surrounded by '?'",
                "???\n?@?\n???\n".equals(GridArchitect.renderFogOfWar(3, 1, 1, 0)));
    }

    private static void testBuildRightStaircase() {
        section("Part 3: buildRightStaircase(int height) — dependent inner bounds");

        String expected4 =
                "...#\n" +
                "..##\n" +
                ".###\n" +
                "####\n";
        check("height 4 prints 3 dots + 1 hash on row 1 up to 0 dots + 4 hashes on row 4",
                expected4.equals(GridArchitect.buildRightStaircase(4)));
        check("height 1 prints \"#\\n\"",
                "#\n".equals(GridArchitect.buildRightStaircase(1)));
        check("height 0 returns \"\"",
                "".equals(GridArchitect.buildRightStaircase(0)));
    }

    private static void testCountLuckyLootPairs() {
        section("Part 4: countLuckyLootPairs(int maxTier) — unique pairs 1 <= a < b <= maxTier where (a+b) % 3 == 0");

        // For maxTier = 4: pairs (a, b) with 1 <= a < b <= 4:
        // (1,2)=3 [yes], (1,3)=4, (1,4)=5, (2,3)=5, (2,4)=6 [yes], (3,4)=7 -> 2 pairs!
        // Notice: if a student starts inner loop at 1, they double-count (2,1) and (4,2) and self-pair (3,3) -> 5 (WRONG!)
        check("maxTier = 4 -> 2 pairs: (1,2) and (2,4) (catches self-pair and duplicate-pair trap!)",
                GridArchitect.countLuckyLootPairs(4) == 2);
        // For maxTier = 6:
        // (1,2)=3, (1,5)=6, (2,4)=6, (3,6)=9, (4,5)=9 -> 5 pairs
        check("maxTier = 6 -> 5 pairs: (1,2), (1,5), (2,4), (3,6), (4,5)",
                GridArchitect.countLuckyLootPairs(6) == 5);
        check("maxTier = 2 -> 1 pair: (1,2)",
                GridArchitect.countLuckyLootPairs(2) == 1);
        check("maxTier = 1 -> 0 pairs (cannot pair 1 with itself!)",
                GridArchitect.countLuckyLootPairs(1) == 0);
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
