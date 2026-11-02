import java.util.Scanner;

/**
 * CommandParser.java — starter stub & playable battle sandbox for Lesson 3.4.
 *
 * TRY YOUR CODE INTERACTIVELY (Sandbox Battle Loop):
 *   javac CommandParser.java
 *   java CommandParser
 *
 * RUN THE AUTOMATED ACCEPTANCE TESTS:
 *   javac CommandParser.java CommandParserCheck.java
 *   java CommandParserCheck        (runs all 4 parts)
 *   java CommandParserCheck 1      (runs only Part 1)
 *   java CommandParserCheck 2      (runs only Part 2)
 *   java CommandParserCheck 3      (runs only Part 3)
 *   java CommandParserCheck 4      (runs only Part 4)
 */
public class CommandParser {

    // =========================================================================
    // ENEMY BLUEPRINT (Early preview of Unit 5 Classes & Objects)
    // Read how each Enemy object stores its own name, hp, attackDamage, and armor.
    // =========================================================================
    public static class Enemy {
        public String name;
        public int hp;
        public int maxHp;
        public int attackDamage;
        public boolean armored;

        public Enemy(String name, int hp, int attackDamage, boolean armored) {
            this.name = name;
            this.hp = hp;
            this.maxHp = hp;
            this.attackDamage = attackDamage;
            this.armored = armored;
        }
    }

    // =========================================================================
    // STARTING PLAYER STATE & ENEMY ROSTER (Early preview of Unit 6 Arrays)
    // =========================================================================
    public static int playerHp = 60;
    public static int maxHp = 60;
    public static int mana = 25;
    public static int potions = 2;
    public static boolean isShielded = false;

    public static Enemy[] enemies = {
        new Enemy("goblin", 20, 6, false),
        new Enemy("skeleton", 25, 8, false),
        new Enemy("boss", 45, 12, true)
    };

    // =========================================================================
    // PROVIDED ROSTER HELPERS (Read these — your methods power them!)
    // =========================================================================

    /**
     * Loops through the enemy array and returns the living Enemy (hp > 0)
     * whose name matches targetName using YOUR isSameCommand method.
     * Returns null if no living enemy matches.
     */
    public static Enemy findEnemy(Enemy[] roster, String targetName) {
        if (roster == null || targetName == null) {
            return null;
        }
        for (Enemy e : roster) {
            if (e != null && e.hp > 0 && isSameCommand(e.name, targetName)) {
                return e;
            }
        }
        return null;
    }

    /**
     * Loops through the enemy array and returns the living Enemy (hp > 0)
     * whose name comes FIRST in turn order using YOUR firstInTurnOrder method.
     * Returns null if all enemies are defeated.
     */
    public static Enemy firstLivingEnemy(Enemy[] roster) {
        if (roster == null) {
            return null;
        }
        Enemy chosen = null;
        for (Enemy e : roster) {
            if (e != null && e.hp > 0) {
                if (chosen == null) {
                    chosen = e;
                } else {
                    String winner = firstInTurnOrder(chosen.name, e.name);
                    if (isSameCommand(winner, e.name)) {
                        chosen = e;
                    }
                }
            }
        }
        return chosen;
    }

    // =========================================================================
    // YOUR BUILD — IMPLEMENT PARTS 1 THROUGH 4 BELOW
    // =========================================================================

    // Part 1
    public static boolean isSameCommand(String input, String target) {
        return false;
    }

    // Part 2
    public static String extractVerb(String rawCommand) {
        return "";
    }

    public static String extractTarget(String rawCommand) {
        return "";
    }

    // Part 3
    public static String firstInTurnOrder(String nameA, String nameB) {
        return "";
    }

    // Part 4
    public static int resolveCombatTurn(String rawCommand, Enemy[] roster) {
        return 0;
    }

    // =========================================================================
    // INTERACTIVE BATTLE SANDBOX (Run `java CommandParser` to play & debug!)
    // =========================================================================
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        System.out.println("==========================================================");
        System.out.println("   DUNGEON ENCOUNTER SANDBOX (Lesson 3.4 CommandParser)   ");
        System.out.println("==========================================================");
        System.out.println("Commands to try as you build Parts 1-4:");
        System.out.println("  attack goblin | attack skeleton | attack boss");
        System.out.println("  cast fireball | cast heal | cast blizzard | cast thunder");
        System.out.println("  drink potion  | defend    | flee          | quit");

        while (playerHp > 0) {
            Enemy nextAttacker = firstLivingEnemy(enemies);
            if (nextAttacker == null && enemies[0].hp <= 0 && enemies[1].hp <= 0 && enemies[2].hp <= 0) {
                System.out.println("\n*** VICTORY! All enemies in the roster are defeated! ***");
                break;
            }

            System.out.println("\n----------------------------------------------------------");
            System.out.println("HERO: " + playerHp + "/" + maxHp + " HP  |  Mana: " + mana
                    + "  |  Potions: " + potions + "  |  Shield: " + (isShielded ? "ACTIVE" : "OFF"));
            System.out.println("ENEMY ROSTER:");
            for (Enemy e : enemies) {
                String state = (e.hp > 0)
                        ? (e.hp + "/" + e.maxHp + " HP, " + e.attackDamage + " ATK" + (e.armored ? ", ARMORED" : ""))
                        : "DEFEATED";
                System.out.println("  - " + e.name + " [" + state + "]");
            }
            if (nextAttacker != null) {
                System.out.println("First enemy in turn order: " + nextAttacker.name);
            }
            System.out.print("\nCommand > ");
            if (!in.hasNextLine()) {
                break;
            }
            String line = in.nextLine();
            if ("quit".equalsIgnoreCase(line.trim())) {
                System.out.println("Exiting sandbox.");
                break;
            }

            String v = extractVerb(line);
            String t = extractTarget(line);
            Enemy matched = findEnemy(enemies, t);
            System.out.println("  [Trace] verb=\"" + v + "\", target=\"" + t + "\", matchedEnemy="
                    + (matched != null ? matched.name : "null"));

            int result = resolveCombatTurn(line, enemies);
            System.out.println("  [Result] resolveCombatTurn returned: " + result);

            if (result == 99) {
                System.out.println("You fled the encounter!");
                break;
            } else if (result == -1) {
                System.out.println("  -> Invalid command or no living target matched. (Turn not consumed)");
                continue;
            } else if (result == 0) {
                System.out.println("  -> Action fizzled! Not enough mana/potions (or no living target).");
            }

            // Living enemy first in turn order counter-attacks!
            Enemy striker = firstLivingEnemy(enemies);
            if (striker != null) {
                int dmg = striker.attackDamage;
                if (isShielded) {
                    dmg = dmg / 2;
                    isShielded = false;
                    System.out.println("  [Enemy Turn] " + striker.name + " strikes! Your shield absorbs half -> "
                            + dmg + " damage taken.");
                } else {
                    System.out.println("  [Enemy Turn] " + striker.name + " strikes you for " + dmg + " damage!");
                }
                playerHp -= dmg;
                if (playerHp <= 0) {
                    playerHp = 0;
                    System.out.println("\n*** DEFEAT! You fell in battle. ***");
                }
            }
        }
    }
}
