/**
 * DungeonLoop.java — Two-Day Dungeon Crawler RPG Engine (Lessons 4.6a & 4.6b).
 *
 * Run the Campaign Sandbox BEFORE unlocking DungeonLoopCheck:
 *   javac Dice.java DungeonLoop.java
 *   java DungeonLoop
 */
public class DungeonLoop {

    // ---- Day 1 (4.6a): Multi-Round Combat Loops ----

    /**
     * Simulates a deterministic turn-based duel until either the player or monster falls
     * (playerHP <= 0 or monsterHP <= 0). Each round, the player strikes first; only if
     * the monster survives (monsterHP > 0) does the monster counterattack.
     *
     * @param playerHP         starting hit points of the hero
     * @param playerDmgPerHit  damage dealt by the hero each round
     * @param monsterHP        starting hit points of the monster
     * @param monsterDmgPerHit damage dealt by the monster if still alive
     * @return hero's remaining HP after combat, clamped at 0 if defeated
     */
    public static int simulateDuelToDeath(int playerHP, int playerDmgPerHit, int monsterHP, int monsterDmgPerHit) {
        return 0;
    }

    /**
     * Runs a live dice-driven combat encounter using {@code Dice.roll(int)} until one combatant
     * drops to 0 HP or below. Player rolls d20 (Nat 20 = 2 * d8; Nat 1 = auto-miss; otherwise
     * d20 + bonus >= monsterAC deals d8). Living monster counters with d20 + bonus >= playerAC
     * for Dice.roll(monsterDamageDie).
     *
     * @param playerName        hero display name
     * @param playerHP          hero starting HP
     * @param playerAC          hero Armor Class
     * @param playerAttackBonus hero attack modifier
     * @param monsterName       monster display name
     * @param monsterHP         monster starting HP
     * @param monsterAC         monster Armor Class
     * @param monsterAttackBonus monster attack modifier
     * @param monsterDamageDie  sides on monster damage die
     * @return true if the hero survived (playerHP > 0), false if defeated
     */
    public static boolean runCombat(String playerName, int playerHP, int playerAC,
                                    int playerAttackBonus, String monsterName,
                                    int monsterHP, int monsterAC,
                                    int monsterAttackBonus, int monsterDamageDie) {
        return false;
    }

    // ---- Day 2 (4.6b): Multi-Room Floors & Multi-Floor Nested Campaign ----

    /**
     * Walks a hero through rooms 1..numRooms on a single dungeon floor. Each room r spawns
     * a monster with (monsterBaseHP + r * 2) HP resolved via {@code simulateDuelToDeath}.
     * If the hero survives room r and r is a multiple of 3, a Healing Shrine restores +4 HP.
     *
     * @param startingHP    hero's HP entering room 1
     * @param numRooms      total rooms on this floor
     * @param monsterBaseHP base HP added to r * 2 for each room's monster
     * @param playerDmg     hero damage per strike
     * @param monsterDmg    monster damage per strike
     * @return remaining HP after room numRooms, or 0 immediately upon defeat
     */
    public static int exploreFloorDeterministic(int startingHP, int numRooms, int monsterBaseHP,
                                                int playerDmg, int monsterDmg) {
        return 0;
    }

    /**
     * Runs a multi-floor dungeon campaign (outer loop over floors 1..floors, inner loop
     * over rooms 1..roomsPerFloor). Each monster has (floor * 4 + room * 2) HP. Dying on
     * floor f immediately returns -f; clearing a floor grants an end-of-floor campfire heal
     * of (floor * 3) HP capped at maxHP.
     *
     * @param startingHP    hero starting HP
     * @param maxHP         maximum HP cap for campfire healing
     * @param floors        number of dungeon floors
     * @param roomsPerFloor rooms per floor
     * @param playerDmg     hero damage per hit
     * @param monsterDmg    monster damage per hit
     * @return final positive HP if all floors are cleared, or -floor where hero died
     */
    public static int runMultiFloorCampaign(int startingHP, int maxHP, int floors, int roomsPerFloor,
                                            int playerDmg, int monsterDmg) {
        return 0;
    }

    // =========================================================================
    // DUNGEON CAMPAIGN SANDBOX — Run `java DungeonLoop` to test Day 1 & Day 2!
    // =========================================================================
    public static void main(String[] args) {
        System.out.println("==========================================================");
        System.out.println("   DUNGEON CRAWLER CAMPAIGN SANDBOX (Lessons 4.6a/4.6b)   ");
        System.out.println("==========================================================");

        System.out.println("\n[Day 1 / Part 1] Deterministic Duels:");
        System.out.println("  20 HP (6 dmg) vs 12 HP (5 dmg)  -> " + simulateDuelToDeath(20, 6, 12, 5) + " HP left");
        System.out.println("  10 HP (15 dmg) vs 12 HP (99 dmg)-> " + simulateDuelToDeath(10, 15, 12, 99) + " HP left");
        System.out.println("  10 HP (3 dmg) vs 20 HP (6 dmg)  -> " + simulateDuelToDeath(10, 3, 20, 6) + " HP left");

        System.out.println("\n[Day 1 / Part 2] Live Dice Encounter (Hero vs Cave Goblin):");
        boolean won = runCombat("Aria", 24, 14, 4, "Cave Goblin", 16, 12, 2, 6);
        System.out.println("  Outcome: " + (won ? "VICTORY!" : "DEFEATED!"));

        System.out.println("\n[Day 2 / Part 3] Single-Floor Shrine Gauntlet:");
        System.out.println("  Start 20 HP, 3 rooms -> " + exploreFloorDeterministic(20, 3, 4, 5, 3) + " HP");
        System.out.println("  Start 8 HP, 3 rooms  -> " + exploreFloorDeterministic(8, 3, 4, 5, 3) + " HP");

        System.out.println("\n[Day 2 / Part 4] Multi-Floor Campaign:");
        System.out.println("  2x2 campaign (start 25/25) -> " + runMultiFloorCampaign(25, 25, 2, 2, 6, 4));
        System.out.println("  Overheal cap check (1x2)   -> " + runMultiFloorCampaign(25, 25, 1, 2, 20, 4));
        System.out.println("  Doomed run (start 10/25)   -> " + runMultiFloorCampaign(10, 25, 3, 2, 5, 4));
    }
}
