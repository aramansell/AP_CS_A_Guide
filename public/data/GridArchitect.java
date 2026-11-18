/**
 * GridArchitect.java — Procedural Dungeon Map & Pair Builder (Lesson 4.4).
 *
 * Run the built-in Dungeon Map Renderer Preview BEFORE unlocking GridArchitectCheck:
 *   javac GridArchitect.java
 *   java GridArchitect
 */
public class GridArchitect {

    /**
     * Generates an ASCII dungeon chamber of {@code rows} by {@code cols} tiles:
     * '#' along every outer border cell, '.' on interior floor cells, and '\n'
     * at the end of every row.
     *
     * @param rows number of rows (precondition: rows >= 2)
     * @param cols number of columns (precondition: cols >= 2)
     * @return multi-line ASCII map string ending with '\n'
     */
    public static String buildBorderedRoom(int rows, int cols) {
        return "";
    }

    /**
     * Renders a square {@code size} x {@code size} fog-of-war radar centered around
     * the hero at {@code (heroRow, heroCol)}: '@' at the hero's tile, '.' for any
     * other tile within Manhattan distance {@code <= visionRadius}, and '?' beyond.
     *
     * @param size         width and height of the square map
     * @param heroRow      0-based hero row index
     * @param heroCol      0-based hero column index
     * @param visionRadius maximum Manhattan distance visible around the hero
     * @return multi-line ASCII fog-of-war grid with '\n' after every row
     */
    public static String renderFogOfWar(int size, int heroRow, int heroCol, int visionRadius) {
        return "";
    }

    /**
     * Generates a right-aligned stone staircase of {@code height} rows where row {@code r}
     * (1..height) has {@code height - r} '.' tiles followed by {@code r} '#' tiles and '\n'.
     * Returns "" if {@code height <= 0}.
     *
     * @param height number of staircase steps
     * @return multi-line staircase string, or "" when height <= 0
     */
    public static String buildRightStaircase(int height) {
        return "";
    }

    /**
     * Counts distinct unordered chest-tier pairs (a, b) with {@code 1 <= a < b <= maxTier}
     * whose combined tier {@code (a + b)} is divisible by 3.
     *
     * @param maxTier highest chest tier available
     * @return number of unique Lucky Pairs (0 if maxTier <= 1)
     */
    public static int countLuckyLootPairs(int maxTier) {
        return 0;
    }

    // =========================================================================
    // DUNGEON MAP RENDERER PREVIEW — Run `java GridArchitect` to inspect maps!
    // =========================================================================
    public static void main(String[] args) {
        System.out.println("==========================================================");
        System.out.println("   DUNGEON MAP RENDERER PREVIEW (Lesson 4.4 Sandbox)      ");
        System.out.println("==========================================================");

        System.out.println("\n[Part 1] Bordered Room 3x4:");
        printGrid(buildBorderedRoom(3, 4));
        System.out.println("[Part 1] Bordered Room 2x2:");
        printGrid(buildBorderedRoom(2, 2));

        System.out.println("\n[Part 2] Fog of War 5x5, hero=(2,2), radius=1:");
        printGrid(renderFogOfWar(5, 2, 2, 1));
        System.out.println("[Part 2] Fog of War 3x3, hero=(0,0), radius=2:");
        printGrid(renderFogOfWar(3, 0, 0, 2));
        System.out.println("[Part 2] Fog of War 3x3, hero=(1,1), radius=0:");
        printGrid(renderFogOfWar(3, 1, 1, 0));

        System.out.println("\n[Part 3] Right Staircase height=4:");
        printGrid(buildRightStaircase(4));
        System.out.println("[Part 3] Right Staircase height=0 length: " + buildRightStaircase(0).length());

        System.out.println("\n[Part 4] Lucky Loot Pairs:");
        System.out.println("  maxTier = 1 -> " + countLuckyLootPairs(1) + " pairs");
        System.out.println("  maxTier = 2 -> " + countLuckyLootPairs(2) + " pairs");
        System.out.println("  maxTier = 4 -> " + countLuckyLootPairs(4) + " pairs");
        System.out.println("  maxTier = 6 -> " + countLuckyLootPairs(6) + " pairs");
    }

    private static void printGrid(String grid) {
        if (grid == null || grid.isEmpty()) {
            System.out.println("  (empty output)");
        } else {
            System.out.print(grid);
            if (!grid.endsWith("\n")) {
                System.out.println("  [missing trailing newline!]");
            }
        }
    }
}
