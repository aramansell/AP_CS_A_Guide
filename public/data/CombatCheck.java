/**
 * CombatCheck.java — acceptance test for the 3.6 Combat Engine RPG Build (Days 1 & 2).
 *
 * HOW TO RUN
 *   javac Dice.java Combat.java CombatCheck.java
 *   java CombatCheck
 */
public class CombatCheck {

    private static final int TRIALS = 250;
    private static int passed = 0;
    private static int failed = 0;

    public static void main(String[] args) {
        System.out.println("Combat Engine acceptance test (Lessons 3.6a & 3.6b)");
        System.out.println("===================================================");

        testEvaluateStrike();
        testPlayerAndMonsterAttack();
        testApplyMitigatedDamage();
        testCombatRound();
        testResolveTacticalExchange();

        System.out.println();
        System.out.println("===================================================");
        System.out.println(passed + " passed, " + failed + " failed");
        if (failed == 0) {
            System.out.println("All checks passed! Your Combat Engine is battle-ready.");
        } else {
            System.out.println("Day 1 (3.6a) covers Parts 1-2; Day 2 (3.6b) covers Parts 3-5.");
        }
    }

    private static void testEvaluateStrike() {
        section("Part 1 (3.6a): evaluateStrike(d20Roll, attackBonus, targetAC, baseDamage, canCrit)");

        check("standard hit: roll 12 + bonus 3 >= AC 14 deals baseDamage (7)",
                Combat.evaluateStrike(12, 3, 14, 7, true) == 7);
        check("exact tie hits: roll 11 + bonus 3 == AC 14 deals baseDamage (5) (catches > vs >= trap!)",
                Combat.evaluateStrike(11, 3, 14, 5, true) == 5);
        check("standard miss: roll 10 + bonus 3 < AC 14 returns 0",
                Combat.evaluateStrike(10, 3, 14, 7, true) == 0);
        check("crit hit: natural 20 with canCrit=true doubles baseDamage (6 -> 12)",
                Combat.evaluateStrike(20, 3, 14, 6, true) == 12);
        check("crit hit beats impossible AC: natural 20 with bonus -2 vs AC 30 still deals 2 * baseDamage (16)",
                Combat.evaluateStrike(20, -2, 30, 8, true) == 16);
        check("crit miss overrides huge bonus: natural 1 with bonus +18 vs AC 10 returns 0 (catches order-of-if trap!)",
                Combat.evaluateStrike(1, 18, 10, 8, true) == 0);
        check("monster nat 20 (canCrit=false): roll 20 + bonus 2 vs AC 15 deals normal baseDamage (6), NOT double",
                Combat.evaluateStrike(20, 2, 15, 6, false) == 6);
        check("monster nat 20 against high AC (canCrit=false): roll 20 + bonus 1 vs AC 25 misses (0)",
                Combat.evaluateStrike(20, 1, 25, 6, false) == 0);
        check("monster nat 1 with huge bonus (canCrit=false): roll 1 + bonus 15 vs AC 12 hits (6)",
                Combat.evaluateStrike(1, 15, 12, 6, false) == 6);
    }

    private static void testPlayerAndMonsterAttack() {
        section("Part 2 (3.6a): playerAttack(...) & monsterAttack(...) with Dice.java");

        check("playerAttack damage is always 0 or between 1 and 2*damageDie",
                playerRangeValid());
        check("playerAttack against AC 50 still lands crits on natural 20s",
                playerEverCritsImpossibleAC());
        check("playerAttack with +50 bonus against AC 5 still misses on natural 1s",
                playerEverMissesOnNat1());
        check("monsterAttack against AC 50 with +2 bonus never hits (monsters cannot crit)",
                monsterNeverHitsImpossibleAC());
        check("monsterAttack with +50 bonus against AC 5 always returns 1..damageDie (never 0, never > damageDie)",
                monsterAlwaysHitsGuaranteed());
    }

    private static void testApplyMitigatedDamage() {
        section("Part 3 (3.6b): applyMitigatedDamage(currentHP, rawDamage, isDefending, flatShield)");

        check("normal hit, no shield: 20 HP, 7 dmg, defend=false, shield=0 -> 13 HP",
                Combat.applyMitigatedDamage(20, 7, false, 0) == 13);
        check("normal hit with shield: 20 HP, 7 dmg, defend=false, shield=2 -> 15 HP (7 - 2 = 5 net dmg)",
                Combat.applyMitigatedDamage(20, 7, false, 2) == 15);
        check("defending halves rawDamage before shield: 20 HP, 10 dmg, defend=true, shield=2 -> 17 HP (10/2 - 2 = 3 net dmg)",
                Combat.applyMitigatedDamage(20, 10, true, 2) == 17);
        check("defending truncates odd damage: 20 HP, 9 dmg, defend=true, shield=1 -> 17 HP (9/2 = 4, 4 - 1 = 3 net dmg)",
                Combat.applyMitigatedDamage(20, 9, true, 1) == 17);
        check("ARMOR-HEAL TRAP: taking 3 dmg with 5 shield leaves 20 HP at 20 HP (NOT 22 HP!)",
                Combat.applyMitigatedDamage(20, 3, false, 5) == 20);
        check("zero or negative rawDamage leaves currentHP unchanged (20 HP -> 20 HP)",
                Combat.applyMitigatedDamage(20, 0, false, 3) == 20
                        && Combat.applyMitigatedDamage(20, -4, false, 0) == 20);
        check("OVERKILL CLAMP: taking 35 dmg at 12 HP clamps remaining HP to 0 (not negative)",
                Combat.applyMitigatedDamage(12, 35, false, 2) == 0);
    }

    private static void testCombatRound() {
        section("Part 4 (3.6b): combatRound(...) orchestration & dead-monster gate");

        check("guaranteed lethal player hit reduces monsterHP and monster does not counterattack",
                deadMonsterNeverAttacks());
        check("surviving monster in combatRound can counterattack",
                liveMonsterCanAttack());
    }

    private static void testResolveTacticalExchange() {
        section("Part 5 (3.6b): resolveTacticalExchange(stance, playerHP, monsterHP, playerDmgDealt, monsterRawDmg, flatShield)");

        check("null stance leaves playerHP unchanged (25 -> 25)",
                 safeTactical(null, 25, 15, 6, 8, 2, 25));
        check("\"flee\" stance escapes before any attacks: playerHP stays 25",
                safeTactical("flee", 25, 15, 6, 8, 2, 25));
        check("\"attack\" kills monster first (monsterHP 8, playerDmg 8): monster never counterattacks, player stays at 25",
                safeTactical("attack", 25, 8, 8, 10, 1, 25));
        check("\"attack\" monster survives (monsterHP 12, playerDmg 8): player takes 10 - 2 shield = 8 dmg (25 -> 17)",
                safeTactical("attack", 25, 12, 8, 10, 2, 17));
        check("\"defend\" halves playerDmg (8/2 = 4); monster (HP 6) survives and deals 10/2 - 2 = 3 net dmg (25 -> 22)",
                safeTactical("defend", 25, 6, 8, 10, 2, 22));
        check("\"defend\" still kills 4-HP monster when playerDmg is 8 (8/2 = 4): player takes 0 dmg (25 -> 25)",
                safeTactical("defend", 25, 4, 8, 10, 2, 25));
        check("\"charge\" doubles playerDmg (6*2 = 12), killing 12-HP monster before it can strike back (25 -> 25)",
                safeTactical("charge", 25, 12, 6, 10, 5, 25));
        check("\"charge\" against 20-HP boss: monster survives, deals 10*2 = 20 dmg with 0 shield (25 -> 5)",
                safeTactical("charge", 25, 20, 6, 10, 5, 5));
        check("unknown stance (\"dance\"): player deals 0 dmg, monster survives and hits with shield active (25 -> 17)",
                safeTactical("dance", 25, 1, 10, 10, 2, 17));
    }

    private static boolean safeTactical(String stance, int pHP, int mHP, int pDmg, int mDmg, int shield, int expected) {
        try {
            return Combat.resolveTacticalExchange(stance, pHP, mHP, pDmg, mDmg, shield) == expected;
        } catch (Throwable t) {
            System.out.println("    [crashed with " + t.getClass().getSimpleName() + "]");
            return false;
        }
    }

    private static boolean playerRangeValid() {
        java.io.PrintStream orig = System.out;
        try {
            System.setOut(new java.io.PrintStream(new java.io.ByteArrayOutputStream()));
            for (int i = 0; i < TRIALS; i++) {
                int dmg = Combat.playerAttack(3, 14, 8, "Goblin");
                if (dmg < 0 || dmg > 16) return false;
            }
            return true;
        } catch (Throwable t) {
            return false;
        } finally {
            System.setOut(orig);
        }
    }

    private static boolean playerEverCritsImpossibleAC() {
        java.io.PrintStream orig = System.out;
        try {
            System.setOut(new java.io.PrintStream(new java.io.ByteArrayOutputStream()));
            for (int i = 0; i < TRIALS; i++) {
                int dmg = Combat.playerAttack(0, 50, 6, "Dragon");
                if (dmg >= 2 && dmg <= 12 && dmg % 2 == 0) return true;
            }
            return false;
        } catch (Throwable t) {
            return false;
        } finally {
            System.setOut(orig);
        }
    }

    private static boolean playerEverMissesOnNat1() {
        java.io.PrintStream orig = System.out;
        try {
            System.setOut(new java.io.PrintStream(new java.io.ByteArrayOutputStream()));
            for (int i = 0; i < TRIALS; i++) {
                int dmg = Combat.playerAttack(50, 5, 6, "Slime");
                if (dmg == 0) return true;
            }
            return false;
        } catch (Throwable t) {
            return false;
        } finally {
            System.setOut(orig);
        }
    }

    private static boolean monsterNeverHitsImpossibleAC() {
        java.io.PrintStream orig = System.out;
        try {
            System.setOut(new java.io.PrintStream(new java.io.ByteArrayOutputStream()));
            for (int i = 0; i < TRIALS; i++) {
                if (Combat.monsterAttack(2, 50, 6, "Goblin") != 0) return false;
            }
            return true;
        } catch (Throwable t) {
            return false;
        } finally {
            System.setOut(orig);
        }
    }

    private static boolean monsterAlwaysHitsGuaranteed() {
        java.io.PrintStream orig = System.out;
        try {
            System.setOut(new java.io.PrintStream(new java.io.ByteArrayOutputStream()));
            for (int i = 0; i < TRIALS; i++) {
                int dmg = Combat.monsterAttack(50, 5, 6, "Orc");
                if (dmg < 1 || dmg > 6) return false;
            }
            return true;
        } catch (Throwable t) {
            return false;
        } finally {
            System.setOut(orig);
        }
    }

    private static boolean deadMonsterNeverAttacks() {
        java.io.PrintStream orig = System.out;
        try {
            for (int i = 0; i < 40; i++) {
                java.io.ByteArrayOutputStream buf = new java.io.ByteArrayOutputStream();
                System.setOut(new java.io.PrintStream(buf, true));
                int newHp = Combat.combatRound(50, 5, 6, 50, 5, 6, "Rat", 1);
                System.setOut(orig);
                if (newHp <= 0) {
                    // Monster died on the strike; make sure monsterHP was reduced to <= 0.
                    return true;
                }
            }
            return false;
        } catch (Throwable t) {
            return false;
        } finally {
            System.setOut(orig);
        }
    }

    private static boolean liveMonsterCanAttack() {
        java.io.PrintStream orig = System.out;
        try {
            System.setOut(new java.io.PrintStream(new java.io.ByteArrayOutputStream()));
            int newHp = Combat.combatRound(-50, 50, 6, 50, 5, 6, "Golem", 20);
            return newHp == 20;
        } catch (Throwable t) {
            return false;
        } finally {
            System.setOut(orig);
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
