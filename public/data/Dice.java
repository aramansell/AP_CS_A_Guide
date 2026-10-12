/**
 * Dice.java - a complete, working dice engine (reference solution).
 *
 * WHO THIS IS FOR
 * Students whose own Dice.java did not pass DiceCheck in Unit 1.7. Download
 * this file and make it pass DiceCheck (30 passed, 0 failed) BEFORE starting
 * the 2.7 Character Creator - generateStats() rolls through this class, and
 * every later unit calls these methods. Do not keep it as a black box: read
 * every method until you could write it yourself.
 *
 * THE CONTRACT (what DiceCheck.java expects)
 *   public static int    roll()
 *   public static int    roll(int sides)
 *   public static int    roll(int num, int sides)
 *   public static int    roll(int num, int sides, int stat)
 *   public static int    skillCheck(int pass)
 *   public static int    skillCheck(int pass, int skill)
 *   public static int[]  statRoll()
 *
 * HOW TO CHECK IT
 *   1. Put this file in the same folder as DiceCheck.java.
 *   2. Compile both:   javac Dice.java DiceCheck.java
 *   3. Run the tests:  java DiceCheck
 *   A correct engine reports: 30 passed, 0 failed
 *
 * DESIGN RULES THIS FILE FOLLOWS
 *   1. roll(int sides) is the ONLY method that contains the Math.random()
 *      formula. Every other method calls it - fix a bug once, not six times.
 *   2. One name, several methods: overloading. The parameter list is what
 *      tells Java which roll you meant.
 *   3. skillCheck returns a CODE (-1 crit fail, 0 fail, 1 success, 2 crit
 *      success), and the natural 1 / natural 20 are read off the DIE,
 *      before any modifier is added.
 */
public class Dice {

    /** roll() - a plain d6. A convenience overload: just call roll(6). */
    public static int roll() {
        return roll(6);
    }

    /**
     * roll(int sides) - one die with the given number of sides.
     * Returns 1 through sides, inclusive. The random formula lives here
     * and nowhere else in the class.
     */
    public static int roll(int sides) {
        return (int) (Math.random() * sides) + 1;
    }

    /**
     * roll(int num, int sides) - roll num dice, each with sides sides,
     * and return the total. roll(2, 6) is 2d6, so 2 through 12.
     */
    public static int roll(int num, int sides) {
        int total = 0;
        for (int i = 0; i < num; i++) {
            total = total + roll(sides);
        }
        return total;
    }

    /**
     * roll(int num, int sides, int stat) - the total above, plus the 5e
     * ability modifier for the score stat: (stat - 10) / 2.
     * A strength of 14 adds +2, a strength of 8 adds -1.
     */
    public static int roll(int num, int sides, int stat) {
        return roll(num, sides) + (stat - 10) / 2;
    }

    /**
     * skillCheck(int pass) - roll a d20 against a difficulty.
     * Returns -1 (natural 1), 0 (fail), 1 (success), or 2 (natural 20).
     * The naturals are checked FIRST: a natural 1 fails even against a
     * difficulty of 2, and a natural 20 succeeds against an impossible one.
     */
    public static int skillCheck(int pass) {
        int die = roll(20);
        if (die == 1) {
            return -1;
        }
        if (die == 20) {
            return 2;
        }
        if (die < pass) {
            return 0;
        }
        return 1;
    }

    /**
     * skillCheck(int pass, int skill) - the same check with an ability
     * modifier added to the die. Call it like skillCheck(14, str): 14 is
     * the difficulty, str is the ability score. The modifier never rescues
     * a natural 1 and never spoils a natural 20, because both are read off
     * the die itself.
     */
    public static int skillCheck(int pass, int skill) {
        int die = roll(20);
        if (die == 1) {
            return -1;
        }
        if (die == 20) {
            return 2;
        }
        if (die + (skill - 10) / 2 < pass) {
            return 0;
        }
        return 1;
    }

    /**
     * statRoll() - a whole set of six ability scores (STR, DEX, CON, INT,
     * WIS, CHA), each a 3d6 roll, so each lands between 3 and 18.
     * Returns a NEW array every call.
     */
    public static int[] statRoll() {
        int[] scores = new int[6];
        for (int i = 0; i < scores.length; i++) {
            scores[i] = roll(3, 6);
        }
        return scores;
    }
}
