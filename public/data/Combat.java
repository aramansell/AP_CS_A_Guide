/**
 * Combat.java — bare-minimum compiling stub for the 3.6 Combat Engine RPG Build (Days 1 & 2).
 *
 * Compile and run the acceptance test:
 *   javac Dice.java Combat.java CombatCheck.java
 *   java CombatCheck
 */
public class Combat {

    // ---- Day 1 (3.6a): Attack & Crit Resolver ----

    public static int evaluateStrike(int d20Roll, int attackBonus, int targetAC, int baseDamage, boolean canCrit) {
        return 0;
    }

    public static int playerAttack(int attackBonus, int targetAC, int damageDie, String targetName) {
        return 0;
    }

    public static int monsterAttack(int attackBonus, int targetAC, int damageDie, String monsterName) {
        return 0;
    }

    // ---- Day 2 (3.6b): Tactical Round, Mitigation & Stances ----

    public static int applyMitigatedDamage(int currentHP, int rawDamage, boolean isDefending, int flatShield) {
        return 0;
    }

    public static int combatRound(int playerAtk, int monsterAC, int playerDmg,
                                  int monsterAtk, int playerAC, int monsterDmg,
                                  String monsterName, int monsterHP) {
        return 0;
    }

    public static int resolveTacticalExchange(String stance, int playerHP, int monsterHP,
                                              int playerDmgDealt, int monsterRawDmg, int flatShield) {
        return 0;
    }
}
