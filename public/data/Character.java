/**
 * Character.java - starting scaffold for the 2.7 Character Creator build.
 *
 * WHO THIS IS FOR
 * Students who want a clean starting point. This file has every field and
 * every method stub, so CharacterCheck.java COMPILES from the first minute.
 * Your job is to fill in the four TODO bodies, one lesson at a time:
 *
 *   modifier(int score)             2.7a Part 1
 *   generateStats()                 2.7a Part 3
 *   printCharacterSheet()           2.7b Part 4
 *   abilityCheck(int dc, int score) 2.7c Part 6
 *
 * HOW TO CHECK YOURSELF
 *   1. Put this file in the same folder as your Dice.java and
 *      CharacterCheck.java.
 *   2. Compile all three:  javac Dice.java Character.java CharacterCheck.java
 *   3. Run the tests:      java CharacterCheck
 *
 * The scaffold compiles but FAILS most checks - that is expected. Fill in a
 * method, recompile, rerun, and watch the FAIL lines shrink. Finished when
 * the last line reads: 44 passed, 0 failed
 *
 * THE RULES THAT MAKE THIS COMPILE
 *   1. Field NAMES are part of the contract. CharacterCheck reads
 *      hero.strength, hero.maxHp, and friends directly - rename a field and
 *      the test stops compiling.
 *   2. Fields are PUBLIC in this unit on purpose. Unit 5 makes them private
 *      and adds getters to this exact file.
 */
public class Character {

    // ---- identity ----
    public String name = "Unnamed";
    public int level = 1;

    // ---- the six ability scores, rolled by generateStats() ----
    public int strength, dexterity, constitution;
    public int intelligence, wisdom, charisma;

    // ---- the six derived values, recomputed by generateStats() ----
    public int hp, maxHp, ac, initiative;
    public int proficiencyBonus, passivePerception;

    /**
     * The 5e ability modifier: (score - 10) / 2.
     * 14 is +2, 10 is +0, 8 is -1. (2.7a Part 1)
     */
    public int modifier(int score) {
        // TODO: return (score - 10) / 2
        return 0;
    }

    /**
     * Rolls six ability scores with Dice.statRoll() - in the order
     * strength, dexterity, constitution, intelligence, wisdom, charisma -
     * then fills in every derived value and sets hp to maxHp.
     * Must not touch name or level. (2.7a Part 3)
     */
    public void generateStats() {
        // TODO: assign the six scores from Dice.statRoll(), then compute:
        //   maxHp             = 10 + modifier(constitution)
        //   hp                = maxHp
        //   ac                = 10 + modifier(dexterity)
        //   initiative        = modifier(dexterity)
        //   passivePerception = 10 + modifier(wisdom)
        //   proficiencyBonus  = 2 + (level - 1) / 4
    }

    /**
     * Prints the character sheet: the name, a 10-character HP bar between
     * [ ] showing hp/maxHp, and all six ability scores. (2.7b Part 4)
     */
    public void printCharacterSheet() {
        // TODO: print the sheet. Hint for the bar - build it with substring:
        //   String full  = "##########";
        //   String empty = "..........";
        //   int filled = hp * 10 / maxHp;
        //   String bar = full.substring(0, filled) + empty.substring(0, 10 - filled);
    }

    /**
     * A d20 skill check against difficulty dc, using the ability score.
     * Returns the Dice codes: -1 crit fail, 0 fail, 1 success, 2 crit
     * success. (2.7c Part 6)
     */
    public int abilityCheck(int dc, int score) {
        // TODO: return Dice.skillCheck(dc, score);
        return 0;
    }
}
