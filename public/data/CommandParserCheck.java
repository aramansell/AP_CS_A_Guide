/**
 * CommandParserCheck.java — acceptance test for Lesson 3.4 (CommandParser.java).
 *
 * HOW TO RUN
 *   javac CommandParser.java CommandParserCheck.java
 *   java CommandParserCheck
 */
public class CommandParserCheck {

    private static int passed = 0;
    private static int failed = 0;

    public static void main(String[] args) {
        System.out.println("CommandParser acceptance test (Lesson 3.4)");
        System.out.println("==========================================");

        testIsSameCommand();
        testExtractVerbAndTarget();
        testFirstInTurnOrder();
        testResolveCombatTurn();

        System.out.println();
        System.out.println("==========================================");
        System.out.println(passed + " passed, " + failed + " failed");
        if (failed == 0) {
            System.out.println("All checks passed! Your CommandParser meets the AP spec.");
        } else {
            System.out.println("Fix the FAIL lines above, recompile, and run again.");
        }
    }

    private static void testIsSameCommand() {
        section("Part 1: isSameCommand(String input, String target)");

        String freshAttack = new String("attack");
        String builtDefend = "def" + new String("end");

        check("literal match: isSameCommand(\"attack\", \"attack\") is true",
                safeSame("attack", "attack", true));
        check("heap String match: isSameCommand(\"attack\", new String(\"attack\")) is true (catches == trap)",
                safeSame("attack", freshAttack, true));
        check("concatenated heap match: isSameCommand(builtDefend, \"defend\") is true",
                safeSame(builtDefend, "defend", true));
        check("different text: isSameCommand(\"attack\", \"flee\") is false",
                safeSame("attack", "flee", false));
        check("case sensitivity: isSameCommand(\"Attack\", \"attack\") is false",
                safeSame("Attack", "attack", false));
        check("null input guard: isSameCommand(null, \"attack\") returns false without crashing",
                safeSame(null, "attack", false));
        check("null target guard: isSameCommand(\"attack\", null) returns false without crashing",
                safeSame("attack", null, false));
        check("both null guard: isSameCommand(null, null) returns false without crashing",
                safeSame(null, null, false));
    }

    private static void testExtractVerbAndTarget() {
        section("Part 2: extractVerb(String) & extractTarget(String)");

        check("extractVerb(\"attack goblin\") -> \"attack\"",
                safeStr(1, "attack goblin", "attack"));
        check("extractTarget(\"attack goblin\") -> \"goblin\" (no leading space!)",
                safeStr(2, "attack goblin", "goblin"));
        check("extractVerb(\"cast fireball\") -> \"cast\"",
                safeStr(1, "cast fireball", "cast"));
        check("extractTarget(\"cast fireball\") -> \"fireball\"",
                safeStr(2, "cast fireball", "fireball"));
        check("single word: extractVerb(\"defend\") -> \"defend\" (when indexOf(\" \") is -1)",
                safeStr(1, "defend", "defend"));
        check("single word: extractTarget(\"defend\") -> \"\"",
                safeStr(2, "defend", ""));
        check("trailing space: extractVerb(\"attack \") -> \"attack\"",
                safeStr(1, "attack ", "attack"));
        check("trailing space: extractTarget(\"attack \") -> \"\"",
                safeStr(2, "attack ", ""));
        check("empty string: extractVerb(\"\") -> \"\"",
                safeStr(1, "", ""));
        check("null guard: extractVerb(null) and extractTarget(null) -> \"\"",
                safeStr(1, null, "") && safeStr(2, null, ""));
    }

    private static void testFirstInTurnOrder() {
        section("Part 3: firstInTurnOrder(String nameA, String nameB)");

        check("adjacent letters: firstInTurnOrder(\"Bard\", \"Cleric\") -> \"Bard\"",
                safeTurn("Bard", "Cleric", "Bard"));
        check("wide ASCII gap: firstInTurnOrder(\"Aria\", \"Zorg\") -> \"Aria\" (catches compareTo == -1 trap!)",
                safeTurn("Aria", "Zorg", "Aria"));
        check("second arg first: firstInTurnOrder(\"Wizard\", \"Archer\") -> \"Archer\" (catches compareTo == 1 trap!)",
                safeTurn("Wizard", "Archer", "Archer"));
        check("shared prefix: firstInTurnOrder(\"Goblin\", \"GoblinKing\") -> \"Goblin\"",
                safeTurn("Goblin", "GoblinKing", "Goblin"));
        check("ASCII case order: firstInTurnOrder(\"goblin\", \"Boss\") -> \"Boss\" ('B' is 66, 'g' is 103)",
                safeTurn("goblin", "Boss", "Boss"));
        check("identical names: firstInTurnOrder(\"Knight\", \"Knight\") -> \"Knight\"",
                safeTurn("Knight", "Knight", "Knight"));
    }

    private static void testResolveCombatTurn() {
        section("Part 4: resolveCombatTurn(String rawCommand, int mana, int potions, boolean isShielded)");

        check("null or empty command returns -1",
                safeResolve(null, 20, 2, true, -1) && safeResolve("", 20, 2, true, -1));
        check("attack goblin returns 10",
                safeResolve("attack goblin", 10, 1, false, 10));
        check("attack boss while unshielded returns 10",
                safeResolve("attack boss", 10, 1, false, 10));
        check("attack boss while shielded returns 15",
                safeResolve("attack boss", 10, 1, true, 15));
        check("attack with no target (\"attack\") returns -1",
                safeResolve("attack", 10, 1, true, -1));
        check("cast fireball with 10 mana returns 25",
                safeResolve("cast fireball", 10, 1, false, 25));
        check("cast fireball with 9 mana returns 0 (fizzle)",
                safeResolve("cast fireball", 9, 1, false, 0));
        check("cast heal with 5 mana returns 20, with 4 mana returns 0",
                safeResolve("cast heal", 5, 0, false, 20) && safeResolve("cast heal", 4, 0, false, 0));
        check("cast arcane spell (< \"m\", e.g. \"cast blizzard\") costs 8 -> returns 22 if mana >= 8, else 0",
                safeResolve("cast blizzard", 8, 0, false, 22) && safeResolve("cast blizzard", 7, 0, false, 0));
        check("cast mystic spell (>= \"m\", e.g. \"cast thunder\") costs 12 -> returns 24 if mana >= 12, else 0",
                safeResolve("cast thunder", 12, 0, false, 24) && safeResolve("cast thunder", 11, 0, false, 0));
        check("drink potion with potions > 0 returns 30, with 0 potions returns 0",
                safeResolve("drink potion", 0, 1, false, 30) && safeResolve("drink potion", 0, 0, false, 0));
        check("drink elixir (invalid target) returns -1",
                safeResolve("drink elixir", 0, 3, false, -1));
        check("defend returns 40, defend shield (unexpected target) returns -1",
                safeResolve("defend", 0, 0, false, 40) && safeResolve("defend shield", 0, 0, false, -1));
        check("flee returns 50, unknown verb (\"dance\") returns -1",
                safeResolve("flee", 0, 0, false, 50) && safeResolve("dance", 10, 1, false, -1));
    }

    private static boolean safeSame(String a, String b, boolean expected) {
        try {
            return CommandParser.isSameCommand(a, b) == expected;
        } catch (Throwable t) {
            System.out.println("    [crashed with " + t.getClass().getSimpleName() + "]");
            return false;
        }
    }

    private static boolean safeStr(int which, String raw, String expected) {
        try {
            String actual = (which == 1)
                    ? CommandParser.extractVerb(raw)
                    : CommandParser.extractTarget(raw);
            return expected.equals(actual);
        } catch (Throwable t) {
            System.out.println("    [crashed with " + t.getClass().getSimpleName() + "]");
            return false;
        }
    }

    private static boolean safeTurn(String a, String b, String expected) {
        try {
            String actual = CommandParser.firstInTurnOrder(a, b);
            return expected.equals(actual);
        } catch (Throwable t) {
            System.out.println("    [crashed with " + t.getClass().getSimpleName() + "]");
            return false;
        }
    }

    private static boolean safeResolve(String cmd, int mana, int potions, boolean shielded, int expected) {
        try {
            return CommandParser.resolveCombatTurn(cmd, mana, potions, shielded) == expected;
        } catch (Throwable t) {
            System.out.println("    [crashed with " + t.getClass().getSimpleName() + "]");
            return false;
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
