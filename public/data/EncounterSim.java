/**
 * EncounterSim.java — Dungeon Floor XP, Danger Radar, Safe Streaks & Gauntlet Simulator (Lesson 4.2).
 *
 * Run the built-in Dungeon Encounter Simulator Bench BEFORE unlocking EncounterSimCheck:
 *   javac EncounterSim.java
 *   java EncounterSim
 */
public class EncounterSim {

    /**
     * Computes the total XP earned by clearing floors {@code startFloor} through {@code endFloor}
     * inclusive. Standard floors award {@code f * 100} XP; every 5th floor ({@code f % 5 == 0})
     * is a Boss Floor awarding {@code f * 100 * bossMultiplier} XP instead. Returns 0 if
     * {@code startFloor > endFloor}.
     *
     * @param startFloor     first floor cleared (inclusive)
     * @param endFloor       last floor cleared (inclusive)
     * @param bossMultiplier XP multiplier applied on Boss Floors (multiples of 5)
     * @return total XP earned across the floor range
     */
    public static int totalScaledXP(int startFloor, int endFloor, int bossMultiplier) {
        return 0;
    }

    /**
     * Scans rooms {@code r = 1 .. numRooms} inclusive using the generator formula
     * {@code int danger = (r * seed + 17) % 100;} and counts how many rooms have
     * {@code danger >= threshold}. Returns 0 if {@code numRooms <= 0}.
     *
     * @param numRooms  number of rooms to inspect
     * @param seed      procedural danger seed
     * @param threshold inclusive danger cutoff
     * @return count of rooms meeting or exceeding threshold
     */
    public static int countDangerSpikes(int numRooms, int seed, int threshold) {
        return 0;
    }

    /**
     * Walks rooms {@code 1 .. numRooms} inclusive (precondition: {@code trapCycle > 0}).
     * A room {@code r} is unsafe if {@code r == bossRoom || r % trapCycle == 0}; otherwise it is safe.
     * Tracks and returns the length of the longest consecutive streak of safe rooms.
     *
     * @param numRooms  total rooms in the dungeon
     * @param trapCycle interval of trap rooms (every trapCycle-th room is unsafe)
     * @param bossRoom  room number containing the boss (unsafe)
     * @return longest consecutive run of safe rooms
     */
    public static int longestSafeStreak(int numRooms, int trapCycle, int bossRoom) {
        return 0;
    }

    /**
     * Simulates a hero starting at {@code startingHP} walking rooms {@code 1 .. numRooms}:
     * - Divisible by BOTH trapCycle and healCycle (Cursed Fountain): subtract 5 HP.
     * - Else divisible by trapCycle: subtract {@code r * 2} HP.
     * - Else divisible by healCycle: add 6 HP.
     * - Otherwise: subtract 1 HP (travel fatigue).
     * If HP drops to <= 0 at the end of any room, immediately return 0 (no future heals!).
     *
     * @param startingHP hero HP before Room 1
     * @param numRooms   number of rooms to traverse
     * @param trapCycle  interval of trap rooms
     * @param healCycle  interval of healing rooms
     * @return hero HP after room numRooms (or 0 immediately on death)
     */
    public static int simulateGauntletHP(int startingHP, int numRooms, int trapCycle, int healCycle) {
        return 0;
    }

    // =========================================================================
    // DUNGEON ENCOUNTER SIMULATOR BENCH — Run `java EncounterSim` to test!
    // =========================================================================
    public static void main(String[] args) {
        System.out.println("==========================================================");
        System.out.println("   DUNGEON ENCOUNTER SIMULATOR BENCH (Lesson 4.2)         ");
        System.out.println("==========================================================");

        System.out.println("\n[Part 1] Scaled Floor XP:");
        System.out.println("  floors 1..4 (x3) -> " + totalScaledXP(1, 4, 3));
        System.out.println("  floors 1..5 (x3) -> " + totalScaledXP(1, 5, 3));
        System.out.println("  floors 5..5 (x4) -> " + totalScaledXP(5, 5, 4));
        System.out.println("  floors 6..3 (x2) -> " + totalScaledXP(6, 3, 2));

        System.out.println("\n[Part 2] Danger Spike Radar (5 rooms, seed 20):");
        System.out.println("  threshold 50 -> " + countDangerSpikes(5, 20, 50) + " spikes");
        System.out.println("  threshold 57 -> " + countDangerSpikes(5, 20, 57) + " spikes");
        System.out.println("  threshold 98 -> " + countDangerSpikes(5, 20, 98) + " spikes");

        System.out.println("\n[Part 3] Safe Room Streaks:");
        System.out.println("  10 rooms, trap=4, boss=9  -> longest streak " + longestSafeStreak(10, 4, 9));
        System.out.println("  10 rooms, trap=6, boss=2  -> longest streak " + longestSafeStreak(10, 6, 2));
        System.out.println("  7 rooms, trap=99, boss=99 -> longest streak " + longestSafeStreak(7, 99, 99));
        System.out.println("  5 rooms, trap=1, boss=3   -> longest streak " + longestSafeStreak(5, 1, 3));

        System.out.println("\n[Part 4] Gauntlet Survival HP:");
        System.out.println("  start 20, 6 rooms (2, 3) -> " + simulateGauntletHP(20, 6, 2, 3) + " HP");
        System.out.println("  start 5, 4 rooms (2, 3)  -> " + simulateGauntletHP(5, 4, 2, 3) + " HP");
        System.out.println("  start 20, 0 rooms (2, 3) -> " + simulateGauntletHP(20, 0, 2, 3) + " HP");
    }
}
