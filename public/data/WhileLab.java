/**
 * WhileLab.java — Swamp Survival, Digit Extraction & Mana Crystal Lab (Lesson 4.1).
 *
 * Run the built-in Swamp Survival & Rune Decoder Bench BEFORE unlocking WhileLabCheck:
 *   javac WhileLab.java
 *   java WhileLab
 */
public class WhileLab {

    /**
     * Simulates how many rounds a hero with {@code startingHP} survives in a poison swamp.
     * Each round: (1) poison subtracts {@code poisonPerRound}; (2) ONLY if HP > 0 does
     * the amulet add {@code regenPerRound}. Returns 0 if {@code startingHP <= 0}, -1 if
     * the hero survives forever, or the exact round count endured before dying.
     *
     * @param startingHP     initial hero HP
     * @param poisonPerRound damage taken at the start of each round
     * @param regenPerRound  healing received at the end of each round if still alive
     * @return 0 if dead on entry, -1 if infinite survival, or rounds survived
     */
    public static int roundsToSurvivePoison(int startingHP, int poisonPerRound, int regenPerRound) {
        return 0;
    }

    /**
     * Extracts base-10 digits of {@code runeCode} right-to-left using {@code % 10} and
     * {@code / 10} and returns their sum.
     *
     * @param runeCode non-negative rune integer
     * @return sum of all decimal digits in runeCode
     */
    public static int sumRuneDigits(int runeCode) {
        return 0;
    }

    /**
     * Counts how many decimal digits in {@code runeCode} are even (0, 2, 4, 6, 8).
     * Note: the single-digit number 0 has 1 even digit!
     *
     * @param runeCode non-negative rune integer
     * @return count of even digits in runeCode
     */
    public static int countEvenDigits(int runeCode) {
        return 0;
    }

    /**
     * Counts how many Collatz (Hailstone) steps it takes for {@code startingEnergy} to
     * stabilize at 1: while energy > 1, divide even values by 2 and transform odd values
     * to {@code energy * 3 + 1}. Returns 0 if {@code startingEnergy <= 1}.
     *
     * @param startingEnergy initial crystal energy
     * @return transformation steps required to reach 1
     */
    public static int manaCrystalSteps(int startingEnergy) {
        return 0;
    }

    // =========================================================================
    // SWAMP SURVIVAL & RUNE DECODER BENCH — Run `java WhileLab` to test!
    // =========================================================================
    public static void main(String[] args) {
        System.out.println("==========================================================");
        System.out.println("   SWAMP SURVIVAL & RUNE DECODER BENCH (Lesson 4.1)       ");
        System.out.println("==========================================================");

        System.out.println("\n[Part 1] Poison Survival Rounds:");
        System.out.println("  (0, 5, 2)  -> " + roundsToSurvivePoison(0, 5, 2) + " rounds");
        System.out.println("  (15, 4, 0) -> " + roundsToSurvivePoison(15, 4, 0) + " rounds");
        System.out.println("  (10, 4, 2) -> " + roundsToSurvivePoison(10, 4, 2) + " rounds");
        System.out.println("  (5, 5, 10) -> " + roundsToSurvivePoison(5, 5, 10) + " rounds");
        System.out.println("  (10, 4, 4) -> " + roundsToSurvivePoison(10, 4, 4) + " (-1 = forever)");

        System.out.println("\n[Part 2] Sum Rune Digits:");
        System.out.println("  4729 -> " + sumRuneDigits(4729));
        System.out.println("  1005 -> " + sumRuneDigits(1005));
        System.out.println("  0    -> " + sumRuneDigits(0));

        System.out.println("\n[Part 3] Count Even Digits:");
        System.out.println("  4826  -> " + countEvenDigits(4826));
        System.out.println("  20405 -> " + countEvenDigits(20405));
        System.out.println("  0     -> " + countEvenDigits(0));

        System.out.println("\n[Part 4] Mana Crystal Steps:");
        System.out.println("  1  -> " + manaCrystalSteps(1) + " steps");
        System.out.println("  6  -> " + manaCrystalSteps(6) + " steps");
        System.out.println("  16 -> " + manaCrystalSteps(16) + " steps");
        System.out.println("  27 -> " + manaCrystalSteps(27) + " steps");
    }
}
