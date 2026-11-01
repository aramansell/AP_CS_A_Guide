/**
 * Character.java — bare-minimum compiling stub for the 2.7 Character Creator build.
 *
 * Compile and run the acceptance test:
 *   javac Dice.java Character.java CharacterCheck.java
 *   java CharacterCheck
 */
public class Character {

    public String name = "Unnamed";
    public int level = 1;

    public int strength, dexterity, constitution;
    public int intelligence, wisdom, charisma;

    public int hp, maxHp, ac, initiative;
    public int proficiencyBonus, passivePerception;

    public int modifier(int score) {
        return 0;
    }

    public void generateStats() {
    }

    public void printCharacterSheet() {
    }

    public int abilityCheck(int dc, int score) {
        return 0;
    }
}
