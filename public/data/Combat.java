/**
 * Combat.java — Tactical Combat Engine RPG Build (Lessons 3.6a & 3.6b).
 *
 * Run the Tactical Combat Engine Sandbox BEFORE unlocking CombatCheck:
 *   javac Dice.java Combat.java
 *   java Combat
 */
public class Combat {

    // ---- Day 1 (3.6a): Attack & Crit Resolver ----

    /**
     * Evaluates a single d20 attack roll against Armor Class.
     * When {@code canCrit} is true: natural 20 always hits for {@code baseDamage * 2};
     * natural 1 always misses for 0 damage. Otherwise (or if {@code canCrit} is false),
     * hits for {@code baseDamage} whenever {@code d20Roll + attackBonus >= targetAC}.
     *
     * @param d20Roll     raw 1..20 die value
     * @param attackBonus attacker modifier
     * @param targetAC    defender Armor Class
     * @param baseDamage  weapon/spell damage on a standard hit
     * @param canCrit     true for players/bosses; false for standard monsters
     * @return final damage dealt (0 on miss, baseDamage on hit, 2*baseDamage on crit)
     */
    public static int evaluateStrike(int d20Roll, int attackBonus, int targetAC, int baseDamage, boolean canCrit) {
        return 0;
    }

    /**
     * Rolls a d20 and damage die via {@code Dice.roll}, delegates rule resolution to
     * {@code evaluateStrike(..., true)}, prints a combat log line for {@code targetName},
     * and returns the final damage dealt.
     *
     * @param attackBonus hero attack modifier
     * @param targetAC    target Armor Class
     * @param damageDie   sides on hero weapon die
     * @param targetName  target display name
     * @return damage dealt to the target
     */
    public static int playerAttack(int attackBonus, int targetAC, int damageDie, String targetName) {
        return 0;
    }

    /**
     * Rolls a d20 and damage die via {@code Dice.roll}, delegates rule resolution to
     * {@code evaluateStrike(..., false)} (standard monsters cannot crit or auto-fumble),
     * prints a combat log line for {@code monsterName}, and returns the final damage dealt.
     *
     * @param attackBonus monster attack modifier
     * @param targetAC    player Armor Class
     * @param damageDie   sides on monster damage die
     * @param monsterName monster display name
     * @return damage dealt by the monster
     */
    public static int monsterAttack(int attackBonus, int targetAC, int damageDie, String monsterName) {
        return 0;
    }

    // ---- Day 2 (3.6b): Tactical Round, Mitigation & Stances ----

    /**
     * Applies defending stance halving ({@code rawDamage / 2}) and {@code flatShield}
     * absorption to incoming {@code rawDamage}, clamping net damage >= 0 (shields never heal!)
     * and clamping remaining HP >= 0 (no negative overkill HP).
     *
     * @param currentHP   defender HP before hit
     * @param rawDamage   incoming attack damage (<= 0 leaves HP unchanged)
     * @param isDefending true if defender halved incoming damage first
     * @param flatShield  flat damage subtracted after halving
     * @return defender HP after mitigation and clamping
     */
    public static int applyMitigatedDamage(int currentHP, int rawDamage, boolean isDefending, int flatShield) {
        return 0;
    }

    /**
     * Resolves one live combat round: player strikes first via {@code playerAttack}, reducing
     * {@code monsterHP}; ONLY if {@code monsterHP > 0} does the monster counterattack via
     * {@code monsterAttack}. Returns the monster's updated HP.
     *
     * @param playerAtk   hero attack bonus
     * @param monsterAC   monster AC
     * @param playerDmg   hero damage die
     * @param monsterAtk  monster attack bonus
     * @param playerAC    hero AC
     * @param monsterDmg  monster damage die
     * @param monsterName monster name
     * @param monsterHP   monster HP at start of round
     * @return updated monsterHP after the player strike
     */
    public static int combatRound(int playerAtk, int monsterAC, int playerDmg,
                                  int monsterAtk, int playerAC, int monsterDmg,
                                  String monsterName, int monsterHP) {
        return 0;
    }

    /**
     * Resolves a deterministic tactical stance exchange ("attack", "defend", "charge",
     * "flee", null, or other) and returns the hero's remaining HP after any surviving
     * monster counterattack mitigated via {@code applyMitigatedDamage}.
     *
     * @param stance         chosen action string
     * @param playerHP       hero starting HP
     * @param monsterHP      monster starting HP
     * @param playerDmgDealt hero base attack damage
     * @param monsterRawDmg  monster raw counterattack damage
     * @param flatShield     hero shield value
     * @return hero remaining HP at the end of the exchange
     */
    public static int resolveTacticalExchange(String stance, int playerHP, int monsterHP,
                                              int playerDmgDealt, int monsterRawDmg, int flatShield) {
        return 0;
    }

    // =========================================================================
    // TACTICAL COMBAT ENGINE SANDBOX — Run `java Combat` to test Days 1 & 2!
    // =========================================================================
    public static void main(String[] args) {
        System.out.println("==========================================================");
        System.out.println("   TACTICAL COMBAT ENGINE SANDBOX (Lessons 3.6a & 3.6b)   ");
        System.out.println("==========================================================");

        System.out.println("\n[Day 1 / Part 1] evaluateStrike Edge Cases:");
        System.out.println("  Nat 20 crit (6 dmg)      -> " + evaluateStrike(20, 0, 25, 6, true));
        System.out.println("  Nat 1 fumble (+18 vs 10) -> " + evaluateStrike(1, 18, 10, 8, true));
        System.out.println("  Tie (11+3 == AC 14, 5)   -> " + evaluateStrike(11, 3, 14, 5, true));
        System.out.println("  Monster 20 (canCrit=F)   -> " + evaluateStrike(20, 2, 15, 6, false));

        System.out.println("\n[Day 1 / Part 2] Live Dice Strikes:");
        System.out.println("  Player strike dmg -> " + playerAttack(4, 12, 8, "Orc"));
        System.out.println("  Monster strike dmg-> " + monsterAttack(2, 14, 6, "Orc"));

        System.out.println("\n[Day 2 / Part 3] Damage Mitigation:");
        System.out.println("  20 HP, 10 dmg, defend=T, shield 2 -> " + applyMitigatedDamage(20, 10, true, 2));
        System.out.println("  20 HP, 3 dmg, defend=F, shield 5  -> " + applyMitigatedDamage(20, 3, false, 5));
        System.out.println("  12 HP, 35 dmg, defend=F, shield 2 -> " + applyMitigatedDamage(12, 35, false, 2));

        System.out.println("\n[Day 2 / Part 4] Live Combat Round (Goblin 10 HP):");
        System.out.println("  Remaining Goblin HP -> " + combatRound(4, 12, 8, 2, 14, 6, "Goblin", 10));

        System.out.println("\n[Day 2 / Part 5] Tactical Stances (Hero 25 HP vs Monster 12 HP):");
        System.out.println("  attack -> " + resolveTacticalExchange("attack", 25, 12, 6, 10, 5) + " HP");
        System.out.println("  defend -> " + resolveTacticalExchange("defend", 25, 12, 6, 10, 5) + " HP");
        System.out.println("  charge -> " + resolveTacticalExchange("charge", 25, 12, 6, 10, 5) + " HP");
        System.out.println("  flee   -> " + resolveTacticalExchange("flee", 25, 12, 6, 10, 5) + " HP");
    }
}
