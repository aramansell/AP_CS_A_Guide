/**
 * ScrollCipher.java — Arcane Scroll Decoder & String Traversal Lab (Lesson 4.3).
 *
 * Run the built-in Arcane Scroll Decoder Bench BEFORE unlocking ScrollCipherCheck:
 *   javac ScrollCipher.java
 *   java ScrollCipher
 */
public class ScrollCipher {

    /**
     * Counts how many adjacent character pairs in {@code spell} match.
     * Used by the Spell Validator to detect stuttered rune syllables (like "oo" or "ee").
     *
     * @param spell non-null incantation string to scan
     * @return count of indices i where character i equals character i + 1
     */
    public static int countAdjacentDoubles(String spell) {
        return 0;
    }

    /**
     * Reverses all characters in {@code scroll} so mirror-written guild messages
     * can be read forward.
     *
     * @param scroll non-null string to reverse
     * @return a new String with characters in reverse order
     */
    public static String reverseRunes(String scroll) {
        return "";
    }

    /**
     * Shifts every uppercase A-Z letter in {@code text} by {@code shift} positions
     * around the 26-letter alphabet (positive encrypts forward, negative decrypts backward),
     * leaving spaces, digits, and punctuation untouched.
     *
     * @param text  non-null message to transform
     * @param shift signed shift distance (may be negative or larger than 26)
     * @return transformed string using wrapped uppercase A-Z characters
     */
    public static String shiftUppercaseCipher(String text, int shift) {
        return "";
    }

    /**
     * Repeatedly splices out every occurrence of {@code glyph} from {@code scroll}
     * until {@code glyph} no longer appears anywhere (including newly formed chained matches).
     *
     * @param scroll non-null text containing possible cursed glyphs
     * @param glyph  non-null, non-empty substring to purge
     * @return cleansed scroll with all occurrences of {@code glyph} removed
     */
    public static String purgeCursedGlyph(String scroll, String glyph) {
        return "";
    }

    // =========================================================================
    // ARCANE SCROLL DECODER BENCH — Run `java ScrollCipher` to test your code!
    // =========================================================================
    public static void main(String[] args) {
        System.out.println("==========================================================");
        System.out.println("   ARCANE SCROLL DECODER BENCH (Lesson 4.3 Sandbox)       ");
        System.out.println("==========================================================");

        System.out.println("\n[Part 1] Adjacent Double-Rune Scanner:");
        showDoubles("bookkeeper");
        showDoubles("aaa");
        showDoubles("dragon");
        showDoubles("x");
        showDoubles("");

        System.out.println("\n[Part 2] Mirror-Scroll Reverser:");
        showReverse("dragon");
        showReverse("A");
        showReverse("");

        System.out.println("\n[Part 3] Caesar Scroll Encrypt / Decrypt:");
        showCipher("ATTACK", 1);
        showCipher("DRAGON Z", 3);
        showCipher("GUDJRQ C", -3);
        showCipher("ABZ!", -2);
        showCipher("HAL", 27);

        System.out.println("\n[Part 4] Cursed Glyph Purger:");
        showPurge("hexed sword of hexes", "hex");
        showPurge("ababab", "ab");
        showPurge("booook", "oo");
        showPurge("fireball", "zzz");
    }

    private static void showDoubles(String spell) {
        try {
            System.out.println("  countAdjacentDoubles(\"" + spell + "\") -> " + countAdjacentDoubles(spell));
        } catch (Throwable t) {
            System.out.println("  countAdjacentDoubles(\"" + spell + "\") -> CRASHED: " + t);
        }
    }

    private static void showReverse(String scroll) {
        try {
            System.out.println("  reverseRunes(\"" + scroll + "\") -> \"" + reverseRunes(scroll) + "\"");
        } catch (Throwable t) {
            System.out.println("  reverseRunes(\"" + scroll + "\") -> CRASHED: " + t);
        }
    }

    private static void showCipher(String text, int shift) {
        try {
            System.out.println("  shiftUppercaseCipher(\"" + text + "\", " + shift + ") -> \""
                    + shiftUppercaseCipher(text, shift) + "\"");
        } catch (Throwable t) {
            System.out.println("  shiftUppercaseCipher(\"" + text + "\", " + shift + ") -> CRASHED: " + t);
        }
    }

    private static void showPurge(String scroll, String glyph) {
        try {
            System.out.println("  purgeCursedGlyph(\"" + scroll + "\", \"" + glyph + "\") -> \""
                    + purgeCursedGlyph(scroll, glyph) + "\"");
        } catch (Throwable t) {
            System.out.println("  purgeCursedGlyph(\"" + scroll + "\", \"" + glyph + "\") -> CRASHED: " + t);
        }
    }
}
