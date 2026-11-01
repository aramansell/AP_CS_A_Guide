/**
 * EncounterSimCheck.java — acceptance test for Lesson 4.2 (EncounterSim.java).
 *
 * HOW TO RUN
 *   javac EncounterSim.java EncounterSimCheck.java
 *   java EncounterSimCheck
 */
public class EncounterSimCheck {

    private static int passed = 0;
    private static int failed = 0;

    public static void main(String[] args) {
        System.out.println("EncounterSim acceptance test (Lesson 4.2)");
        System.out.println("=========================================");

        testTotalScaledXP();
        testCountDangerSpikes();
        testLongestSafeStreak();
        testSimulateGauntletHP();

        System.out.println();
        System.out.println("=========================================");
        System.out.println(passed + " passed, " + failed + " failed");
        if (failed == 0) {
            System.out.println("All checks passed! Your EncounterSim meets the AP spec.");
        } else {
            System.out.println("Fix the FAIL lines above, recompile, and run again.");
        }
    }

    private static void testTotalScaledXP() {
        section("Part 1: totalScaledXP(int startFloor, int endFloor, int bossMultiplier)");

        check("floors 1..4 with multiplier 3 -> 100 + 200 + 300 + 400 = 1000",
                EncounterSim.totalScaledXP(1, 4, 3) == 1000);
        check("floors 1..5 with multiplier 3 -> 1000 + (5 * 100 * 3) = 2500 (includes endFloor and boss multiplier!)",
                EncounterSim.totalScaledXP(1, 5, 3) == 2500);
        check("floors 4..10 with multiplier 2 -> 400 + 1000 + 600 + 700 + 800 + 900 + 2000 = 6400",
                EncounterSim.totalScaledXP(4, 10, 2) == 6400);
        check("single floor (5..5, multiplier 4) -> 2000",
                EncounterSim.totalScaledXP(5, 5, 4) == 2000);
        check("invalid range (startFloor > endFloor) -> 0",
                EncounterSim.totalScaledXP(6, 3, 2) == 0);
    }

    private static void testCountDangerSpikes() {
        section("Part 2: countDangerSpikes(int numRooms, int seed, int threshold)");

        // Room r in 1..numRooms has danger = (r * seed + 17) % 100
        // For numRooms = 5, seed = 20:
        // r=1: 37, r=2: 57, r=3: 77, r=4: 97, r=5: 17
        check("numRooms=5, seed=20, threshold=50 -> 3 spikes (rooms 2, 3, 4: 57, 77, 97)",
                EncounterSim.countDangerSpikes(5, 20, 50) == 3);
        check("exact boundary: numRooms=5, seed=20, threshold=57 -> 3 spikes (>= threshold includes 57!)",
                EncounterSim.countDangerSpikes(5, 20, 57) == 3);
        check("numRooms=5, seed=20, threshold=98 -> 0 spikes",
                EncounterSim.countDangerSpikes(5, 20, 98) == 0);
        check("numRooms=0 -> 0 spikes",
                EncounterSim.countDangerSpikes(0, 20, 50) == 0);
    }

    private static void testLongestSafeStreak() {
        section("Part 3: longestSafeStreak(int numRooms, int trapCycle, int bossRoom)");

        // Rooms 1..10, trap every 4th room (4, 8), bossRoom = 9:
        // Safe: 1, 2, 3 (streak 3) | 4 unsafe | 5, 6, 7 (streak 3) | 8 unsafe | 9 unsafe | 10 (streak 1)
        check("10 rooms, trapCycle=4, bossRoom=9 -> longest safe streak is 3",
                EncounterSim.longestSafeStreak(10, 4, 9) == 3);
        // Trailing streak trap: rooms 1..10, trapCycle=6 (room 6), bossRoom=2:
        // 1 safe (1), 2 boss (0), 3,4,5 safe (3), 6 trap (0), 7,8,9,10 safe (4 at the very end!)
        check("TRAILING STREAK TRAP: 10 rooms, trapCycle=6, bossRoom=2 -> longest streak is 4 (rooms 7..10 at end!)",
                EncounterSim.longestSafeStreak(10, 6, 2) == 4);
        check("all rooms safe: 7 rooms, trapCycle=99, bossRoom=99 -> 7",
                EncounterSim.longestSafeStreak(7, 99, 99) == 7);
        check("every room is a trap: 5 rooms, trapCycle=1, bossRoom=3 -> 0",
                EncounterSim.longestSafeStreak(5, 1, 3) == 0);
    }

    private static void testSimulateGauntletHP() {
        section("Part 4: simulateGauntletHP(int startingHP, int numRooms, int trapCycle, int healCycle)");

        // Room r in 1..numRooms:
        // - If r is divisible by BOTH trapCycle and healCycle: cursed fountain! Subtract 5 HP.
        // - Else if r is divisible by trapCycle: subtract r * 2 HP.
        // - Else if r is divisible by healCycle: add 6 HP.
        // - Otherwise: subtract 1 HP (travel fatigue).
        // If HP drops to <= 0 at the end of any room, immediately return 0 (hero died, do not heal in later rooms!).
        check("survives 6 rooms (start 20, trapCycle 2, healCycle 3): r1(19), r2(15), r3(21), r4(13), r5(12), r6(7)",
                EncounterSim.simulateGauntletHP(20, 6, 2, 3) == 7);
        check("NO POST-MORTEM HEAL TRAP: start 5, 4 rooms, trapCycle 2, healCycle 3 -> dies in room 2 (5->4->0), does NOT heal to +6 in room 3!",
                EncounterSim.simulateGauntletHP(5, 4, 2, 3) == 0);
        check("0 rooms leaves startingHP unchanged (20 -> 20)",
                EncounterSim.simulateGauntletHP(20, 0, 2, 3) == 20);
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
