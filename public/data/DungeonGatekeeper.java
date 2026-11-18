/**
 * DungeonGatekeeper.java — Boolean Logic, De Morgan & Guard Conditions Lab (Lesson 3.5).
 *
 * Run the Dungeon Gatekeeper Security Bench BEFORE unlocking DungeonGatekeeperCheck:
 *   javac DungeonGatekeeper.java
 *   java DungeonGatekeeper
 */
public class DungeonGatekeeper {

    /**
     * Returns true when the Shadow Vault remains locked (exact De Morgan equivalent of
     * {@code !(hasRunekey && isBloodMoon)} written WITHOUT an outer {@code !}).
     *
     * @param hasRunekey  true if the hero holds the Runekey
     * @param isBloodMoon true if the Blood Moon is rising
     * @return true if locked out, false if both conditions allow entry
     */
    public static boolean isVaultLockedOut(boolean hasRunekey, boolean isBloodMoon) {
        return false;
    }

    /**
     * Returns true if {@code score} lies strictly outside the legal 3d6 stat range [3, 18],
     * written WITHOUT using {@code !}.
     *
     * @param score ability score to check
     * @return true if score < 3 or score > 18
     */
    public static boolean isInvalidStatScore(int score) {
        return false;
    }

    /**
     * Returns true if {@code score} lies inside the closed legal 3d6 range [3, 18].
     *
     * @param score ability score to check
     * @return true if 3 <= score <= 18
     */
    public static boolean isSafeStatScore(int score) {
        return false;
    }

    /**
     * Returns true when the dungeon boss enrages: (lowHp OR minionFell) AND NOT silenced.
     *
     * @param lowHp      true if boss HP is low
     * @param minionFell true if a minion fell this turn
     * @param isSilenced true if the boss is silenced
     * @return true if the boss enrages
     */
    public static boolean doesBossEnrage(boolean lowHp, boolean minionFell, boolean isSilenced) {
        return false;
    }

    /**
     * Returns true when {@code partySize > 0}, each hero's integer share ({@code totalGold / partySize})
     * is at least {@code minShare}, and {@code totalGold} divides evenly with 0 remainder.
     * Must use short-circuit {@code &&} so {@code partySize <= 0} never divides by zero.
     *
     * @param partySize number of heroes in the party
     * @param totalGold total gold looted
     * @param minShare  minimum fair share per hero
     * @return true if the split is valid and fair
     */
    public static boolean hasFairGoldSplit(int partySize, int totalGold, int minShare) {
        return false;
    }

    /**
     * Classifies an encounter zone by priority:
     * -1 (Invalid/Banned), 3 (Abyssal Boss), 2 (Dark Hazard), or 1 (Standard).
     * Guards safely against {@code guildRank == null}.
     *
     * @param floor      dungeon floor depth
     * @param partyLevel average party level
     * @param hasTorch   true if the party carries a lit torch
     * @param guildRank  party guild title (may be null)
     * @return zone tier (-1, 1, 2, or 3)
     */
    public static int classifyEncounterZone(int floor, int partyLevel, boolean hasTorch, String guildRank) {
        return 0;
    }

    // =========================================================================
    // DUNGEON GATEKEEPER SECURITY BENCH — Run `java DungeonGatekeeper` to test!
    // =========================================================================
    public static void main(String[] args) {
        System.out.println("==========================================================");
        System.out.println("   DUNGEON GATEKEEPER SECURITY BENCH (Lesson 3.5)         ");
        System.out.println("==========================================================");

        System.out.println("\n[Part 1] Vault Lockout (De Morgan):");
        System.out.println("  (T, T) -> " + isVaultLockedOut(true, true));
        System.out.println("  (T, F) -> " + isVaultLockedOut(true, false));
        System.out.println("  (F, T) -> " + isVaultLockedOut(false, true));

        System.out.println("\n[Part 2] Ability Score Range [3, 18]:");
        for (int s : new int[]{2, 3, 10, 18, 19}) {
            System.out.println("  score " + s + " -> safe=" + isSafeStatScore(s) + ", invalid=" + isInvalidStatScore(s));
        }

        System.out.println("\n[Part 3] Boss Enrage Precedence:");
        System.out.println("  lowHp=T, minion=F, silenced=T -> " + doesBossEnrage(true, false, true));
        System.out.println("  lowHp=T, minion=F, silenced=F -> " + doesBossEnrage(true, false, false));

        System.out.println("\n[Part 4] Fair Gold Split (Short-Circuit Guard):");
        try {
            System.out.println("  party=4, gold=100, min=25 -> " + hasFairGoldSplit(4, 100, 25));
            System.out.println("  party=0, gold=100, min=10 -> " + hasFairGoldSplit(0, 100, 10));
        } catch (Throwable t) {
            System.out.println("  CRASHED on gold split: " + t);
        }

        System.out.println("\n[Part 5] Encounter Zone Classification:");
        try {
            System.out.println("  (5, 5, T, null)           -> " + classifyEncounterZone(5, 5, true, null));
            System.out.println("  (10, 12, T, \"Knight\")     -> " + classifyEncounterZone(10, 12, true, "Knight"));
            System.out.println("  (5, 8, F, \"Veteran\")      -> " + classifyEncounterZone(5, 8, false, "Veteran"));
            System.out.println("  (3, 4, F, \"Veteran\")      -> " + classifyEncounterZone(3, 4, false, "Veteran"));
        } catch (Throwable t) {
            System.out.println("  CRASHED on classifyEncounterZone: " + t);
        }
    }
}
