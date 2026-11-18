/**
 * Character.java — RPG Character Creator Scaffold & Sandbox (Lessons 2.7a, 2.7b, 2.7c).
 *
 * Run the built-in Character Creator Sandbox BEFORE unlocking CharacterCheck:
 *   javac Dice.java Character.java
 *   java Character
 */
public class Character {

    public String name = "Unnamed";
    public int level = 1;

    public int strength, dexterity, constitution;
    public int intelligence, wisdom, charisma;

    public int hp, maxHp, ac, initiative;
    public int proficiencyBonus, passivePerception;

    /**
     * Part 1 (2.7a): Converts a 5e ability score (e.g., 14 -> +2, 10 -> 0, 8 -> -1)
     * into its ability modifier using {@code (score - 10) / 2}.
     *
     * @param score ability score
     * @return integer ability modifier
     */
    public int modifier(int score) {
        return 0;
    }

    /**
     * Part 3 (2.7a): Rolls all six ability scores via {@code Dice.statRoll()}, computes
     * derived 5e fields (maxHp, ac, initiative, passivePerception, proficiencyBonus),
     * and sets {@code hp = maxHp} without altering {@code name} or {@code level}.
     */
    public void generateStats() {
    }

    /**
     * Part 4 (2.7b): Prints the character's name, level, 10-character ASCII HP bar,
     * six ability scores, and derived combat stats to standard output.
     */
    public void printCharacterSheet() {
    }

    /**
     * Part 6 (2.7c): Performs a d20 ability check against difficulty {@code dc} using
     * {@code score} by delegating to {@code Dice.skillCheck(dc, score)}.
     *
     * @param dc    difficulty class to meet or beat
     * @param score character ability score used for the check
     * @return -1 crit fail, 0 fail, 1 success, or 2 crit success
     */
    public int abilityCheck(int dc, int score) {
        return 0;
    }

    // =========================================================================
    // CHARACTER CREATOR SANDBOX — Run `java Character` while building!
    // =========================================================================
    public static void main(String[] args) {
        System.out.println("==========================================================");
        System.out.println("   CHARACTER CREATOR SANDBOX (Lessons 2.7a - 2.7c)        ");
        System.out.println("==========================================================");

        Character hero = new Character();
        hero.name = "Grog the Mighty";

        System.out.println("\n[2.7a] Modifier Checks (expect +2, 0, -1):");
        System.out.println("  modifier(14) = " + hero.modifier(14));
        System.out.println("  modifier(10) = " + hero.modifier(10));
        System.out.println("  modifier(8)  = " + hero.modifier(8));

        System.out.println("\n[2.7a + 2.7b] Generating Stats & Printing Character Sheet:");
        hero.generateStats();
        hero.printCharacterSheet();

        System.out.println("\n[2.7c] Skill Check Preview (DC 12):");
        System.out.println("  STR check -> code " + hero.abilityCheck(12, hero.strength));
        System.out.println("  INT check -> code " + hero.abilityCheck(12, hero.intelligence));
    }
}
