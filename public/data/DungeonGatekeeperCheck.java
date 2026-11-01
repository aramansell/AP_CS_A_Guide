/**
 * DungeonGatekeeperCheck.java — acceptance test for Lesson 3.5 (DungeonGatekeeper.java).
 *
 * HOW TO RUN
 *   javac DungeonGatekeeper.java DungeonGatekeeperCheck.java
 *   java DungeonGatekeeperCheck
 */
public class DungeonGatekeeperCheck {

    private static int passed = 0;
    private static int failed = 0;

    public static void main(String[] args) {
        System.out.println("DungeonGatekeeper acceptance test (Lesson 3.5)");
        System.out.println("==============================================");

        testVaultLockedOut();
        testStatScoreRanges();
        testBossEnragePrecedence();
        testFairGoldSplit();
        testClassifyEncounterZone();

        System.out.println();
        System.out.println("==============================================");
        System.out.println(passed + " passed, " + failed + " failed");
        if (failed == 0) {
            System.out.println("All checks passed! Your DungeonGatekeeper meets the AP spec.");
        } else {
            System.out.println("Fix the FAIL lines above, recompile, and run again.");
        }
    }

    private static void testVaultLockedOut() {
        section("Part 1: isVaultLockedOut(boolean hasRunekey, boolean isBloodMoon)");

        check("(true, true) -> false (both conditions met, vault opens)",
                DungeonGatekeeper.isVaultLockedOut(true, true) == false);
        check("(false, false) -> true (missing both)",
                DungeonGatekeeper.isVaultLockedOut(false, false) == true);
        check("(true, false) -> true (has key, no blood moon — catches !A && !B trap!)",
                DungeonGatekeeper.isVaultLockedOut(true, false) == true);
        check("(false, true) -> true (no key, has blood moon — catches !A && !B trap!)",
                DungeonGatekeeper.isVaultLockedOut(false, true) == true);
    }

    private static void testStatScoreRanges() {
        section("Part 2: isInvalidStatScore(int) & isSafeStatScore(int) for range [3, 18]");

        check("score 2 is invalid (isInvalidStatScore(2) == true)",
                DungeonGatekeeper.isInvalidStatScore(2) == true);
        check("score 3 is valid boundary (isInvalidStatScore(3) == false — catches <= 3 trap!)",
                DungeonGatekeeper.isInvalidStatScore(3) == false);
        check("score 10 is valid middle (isInvalidStatScore(10) == false)",
                DungeonGatekeeper.isInvalidStatScore(10) == false);
        check("score 18 is valid boundary (isInvalidStatScore(18) == false — catches >= 18 trap!)",
                DungeonGatekeeper.isInvalidStatScore(18) == false);
        check("score 19 is invalid (isInvalidStatScore(19) == true)",
                DungeonGatekeeper.isInvalidStatScore(19) == true);
        check("isSafeStatScore(score) is always the exact negation of isInvalidStatScore(score) across -5..25",
                complementHolds());
    }

    private static boolean complementHolds() {
        for (int s = -5; s <= 25; s++) {
            boolean expectedSafe = (s >= 3 && s <= 18);
            if (DungeonGatekeeper.isSafeStatScore(s) != expectedSafe) {
                return false;
            }
            if (DungeonGatekeeper.isInvalidStatScore(s) == expectedSafe) {
                return false;
            }
        }
        return true;
    }

    private static void testBossEnragePrecedence() {
        section("Part 3: doesBossEnrage(boolean lowHp, boolean minionFell, boolean isSilenced)");

        check("(true, false, false) -> true (low HP and not silenced)",
                DungeonGatekeeper.doesBossEnrage(true, false, false) == true);
        check("(false, true, false) -> true (minion fell and not silenced)",
                DungeonGatekeeper.doesBossEnrage(false, true, false) == true);
        check("(false, false, false) -> false (neither trigger occurred)",
                DungeonGatekeeper.doesBossEnrage(false, false, false) == false);
        check("(false, true, true) -> false (minion fell, but boss IS silenced)",
                DungeonGatekeeper.doesBossEnrage(false, true, true) == false);
        check("(true, false, true) -> false (low HP, but boss IS silenced — catches && vs || precedence trap!)",
                DungeonGatekeeper.doesBossEnrage(true, false, true) == false);
        check("(true, true, true) -> false (both triggers, but boss IS silenced)",
                DungeonGatekeeper.doesBossEnrage(true, true, true) == false);
    }

    private static void testFairGoldSplit() {
        section("Part 4: hasFairGoldSplit(int partySize, int totalGold, int minShare)");

        check("4 heroes, 100 gold, minShare 25 -> true (25 each, 0 remainder)",
                safeGold(4, 100, 25, true));
        check("4 heroes, 102 gold, minShare 25 -> false (2 gold remainder)",
                safeGold(4, 102, 25, false));
        check("4 heroes, 80 gold, minShare 25 -> false (20 each < 25)",
                safeGold(4, 80, 25, false));
        check("0 heroes, 100 gold, minShare 10 -> false without crashing (catches / by zero short-circuit trap!)",
                safeGold(0, 100, 10, false));
        check("-2 heroes, 100 gold, minShare 10 -> false",
                safeGold(-2, 100, 10, false));
    }

    private static void testClassifyEncounterZone() {
        section("Part 5: classifyEncounterZone(int floor, int partyLevel, boolean hasTorch, String guildRank)");

        check("invalid floor (0) or partyLevel (0) -> -1",
                safeZone(0, 5, true, "Initiate", -1) && safeZone(3, 0, true, "Initiate", -1));
        check("null guildRank -> -1 without crashing (short-circuit null guard)",
                safeZone(5, 5, true, null, -1));
        check("\"Banned\" guildRank -> -1",
                safeZone(5, 10, true, "Banned", -1));
        check("Abyssal Boss Zone (floor 10, level 12, torch, \"Knight\") -> 3",
                safeZone(10, 12, true, "Knight", 3));
        check("Abyssal Boss Zone via Grandmaster (floor 12, level 5, torch, \"Grandmaster\") -> 3",
                safeZone(12, 5, true, "Grandmaster", 3));
        check("Floor 10, level 12, NO torch -> 2 (fails Abyssal torch check, lands in Dark Hazard)",
                safeZone(10, 12, false, "Veteran", 2));
        check("Dark Hazard: no torch on floor 5 even for \"Veteran\" -> 2",
                safeZone(5, 8, false, "Veteran", 2));
        check("Dark Hazard: no torch on floor 2 for \"Initiate\" (not Veteran) -> 2",
                safeZone(2, 4, false, "Initiate", 2));
        check("Standard Zone: no torch on floor 3 for \"Veteran\" -> 1",
                safeZone(3, 4, false, "Veteran", 1));
        check("Standard Zone: has torch on floor 6 for \"Initiate\" -> 1",
                safeZone(6, 6, true, "Initiate", 1));
    }

    private static boolean safeGold(int size, int gold, int min, boolean expected) {
        try {
            return DungeonGatekeeper.hasFairGoldSplit(size, gold, min) == expected;
        } catch (Throwable t) {
            System.out.println("    [crashed with " + t.getClass().getSimpleName() + ": " + t.getMessage() + "]");
            return false;
        }
    }

    private static boolean safeZone(int floor, int level, boolean torch, String rank, int expected) {
        try {
            return DungeonGatekeeper.classifyEncounterZone(floor, level, torch, rank) == expected;
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
