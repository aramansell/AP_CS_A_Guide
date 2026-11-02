/**
 * CommandParserCheck.java — acceptance test for Lesson 3.4 (CommandParser.java).
 *
 * HOW TO RUN
 *   javac CommandParser.java CommandParserCheck.java
 *   java CommandParserCheck        (runs all 4 parts — 38 checks)
 *   java CommandParserCheck 1      (runs only Part 1)
 *   java CommandParserCheck 2      (runs only Part 2)
 *   java CommandParserCheck 3      (runs only Part 3)
 *   java CommandParserCheck 4      (runs only Part 4)
 */
public class CommandParserCheck {

    private static int passed = 0;
    private static int failed = 0;

    public static void main(String[] args) {
        int part = 0;
        if (args.length > 0) {
            try {
                part = Integer.parseInt(args[0]);
            } catch (NumberFormatException ignored) {
                part = 0;
            }
        }

        System.out.println("CommandParser acceptance test (Lesson 3.4)");
        if (part >= 1 && part <= 4) {
            System.out.println("Running Part " + part + " only (run without args to test all parts)");
        }
        System.out.println("==========================================");

        if (part == 0 || part == 1) testIsSameCommand();
        if (part == 0 || part == 2) testExtractVerbAndTarget();
        if (part == 0 || part == 3) testFirstInTurnOrder();
        if (part == 0 || part == 4) testResolveCombatTurn();

        System.out.println();
        System.out.println("==========================================");
        System.out.println(passed + " passed, " + failed + " failed");
        if (failed == 0) {
            if (part == 0) {
                System.out.println("All 38 checks passed! Now run `java CommandParser` to play your battle!");
            } else {
                System.out.println("Part " + part + " passed! Move on to the next part or run `java CommandParserCheck`.");
            }
        } else {
            System.out.println("Fix the FAIL lines above, recompile, and run again.");
        }
    }

    // =========================================================================
    // PART 1:9 checks (isSameCommand + findEnemy on Enemy[] roster)
    // =========================================================================
    private static void testIsSameCommand() {
        section("Part 1: isSameCommand(String input, String target) & findEnemy(Enemy[], String)");

        String freshAttack = new String("attack");
        String slicedGoblin = "attack goblin".substring(7); // heap String!

        check("literal match: isSameCommand(\"attack\", \"attack\") is true",
                safeSame("attack", "attack", true));
        check("heap String match: isSameCommand(\"attack\", new String(\"attack\")) is true (catches == trap)",
                safeSame("attack", freshAttack, true));
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

        CommandParser.Enemy[] sampleRoster = {
            new CommandParser.Enemy("goblin", 20, 6, false),
            new CommandParser.Enemy("skeleton", 0, 8, false),
            new CommandParser.Enemy("boss", 45, 12, true)
        };
        check("findEnemy matches living \"goblin\" even when targetName is a substring on the heap",
                safeFindEnemy(sampleRoster, slicedGoblin, "goblin"));
        check("findEnemy skips defeated \"skeleton\" (0 HP) and returns null",
                safeFindEnemy(sampleRoster, "skeleton", null));
    }

    // =========================================================================
    // PART 2: 10 checks (extractVerb & extractTarget)
    // =========================================================================
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

    // =========================================================================
    // PART 3: 7 checks (firstInTurnOrder + firstLivingEnemy on Enemy[] roster)
    // =========================================================================
    private static void testFirstInTurnOrder() {
        section("Part 3: firstInTurnOrder(String nameA, String nameB) & firstLivingEnemy(Enemy[])");

        check("adjacent letters: firstInTurnOrder(\"Bard\", \"Cleric\") -> \"Bard\"",
                safeTurn("Bard", "Cleric", "Bard"));
        check("wide ASCII gap: firstInTurnOrder(\"goblin\", \"skeleton\") -> \"goblin\" (catches compareTo == -1 trap!)",
                safeTurn("goblin", "skeleton", "goblin"));
        check("second arg first: firstInTurnOrder(\"skeleton\", \"boss\") -> \"boss\" (catches compareTo == 1 trap!)",
                safeTurn("skeleton", "boss", "boss"));
        check("shared prefix: firstInTurnOrder(\"goblin\", \"goblinKing\") -> \"goblin\"",
                safeTurn("goblin", "goblinKing", "goblin"));
        check("ASCII case order: firstInTurnOrder(\"goblin\", \"Boss\") -> \"Boss\" ('B' is 66, 'g' is 103)",
                safeTurn("goblin", "Boss", "Boss"));
        check("identical names: firstInTurnOrder(\"knight\", \"knight\") -> \"knight\"",
                safeTurn("knight", "knight", "knight"));

        CommandParser.Enemy[] turnRoster = {
            new CommandParser.Enemy("skeleton", 25, 8, false),
            new CommandParser.Enemy("boss", 0, 12, true),
            new CommandParser.Enemy("goblin", 20, 6, false)
        };
        check("firstLivingEnemy(roster) picks \"goblin\" over \"skeleton\" (since \"boss\" has 0 HP)",
                safeFirstLiving(turnRoster, "goblin"));
    }

    // =========================================================================
    // PART 4: 12 checks (resolveCombatTurn against Enemy[] & Player stats)
    // =========================================================================
    private static void testResolveCombatTurn() {
        section("Part 4: resolveCombatTurn(String rawCommand, Enemy[] roster)");

        check("null or empty command returns -1 without changing stats",
                checkNullOrEmpty());

        check("\"attack goblin\" deals 12 damage to unarmored goblin (20 HP -> 8 HP) and returns 12",
                checkAttackGoblin());

        check("\"attack boss\" while unshielded deals 6 damage to armored boss (45 HP -> 39 HP) and returns 6",
                checkAttackBossUnshielded());

        check("\"attack boss\" while shielded pierces armor for 15 damage (45 HP -> 30 HP) and returns 15",
                checkAttackBossShielded());

        check("\"attack\" with missing or defeated target returns -1",
                checkAttackInvalid());

        check("\"cast fireball\" with 10+ mana costs 10 mana, deals 25 damage to firstLivingEnemy, and returns 25",
                checkCastFireballSuccess());

        check("\"cast fireball\" with < 10 mana returns 0 (fizzle) without spending mana or damaging enemies",
                checkCastFireballFizzle());

        check("\"cast heal\" with 5+ mana costs 5 mana, heals playerHp by 20 (capped at maxHp), and returns 20",
                checkCastHeal());

        check("\"cast blizzard\" (arcane < \"m\") costs 8 mana, deals 18 dmg to firstLivingEnemy, and returns 18",
                checkCastArcane());

        check("\"cast thunder\" (mystic >= \"m\") costs 12 mana, deals 22 dmg to firstLivingEnemy, and returns 22",
                checkCastMystic());

        check("\"drink potion\" uses 1 potion, heals 25 HP (capped at maxHp) + 10 mana, returns 25 (or 0 if 0 potions)",
                checkDrinkPotion());

        check("\"defend\" sets isShielded=true & +5 mana (returns 5); \"flee\" returns 99; unknown verb returns -1",
                checkDefendFleeUnknown());
    }

    private static CommandParser.Enemy[] freshRoster() {
        return new CommandParser.Enemy[] {
            new CommandParser.Enemy("goblin", 20, 6, false),
            new CommandParser.Enemy("skeleton", 25, 8, false),
            new CommandParser.Enemy("boss", 45, 12, true)
        };
    }

    private static void resetPlayer(int hp, int max, int mp, int pots, boolean shield) {
        CommandParser.playerHp = hp;
        CommandParser.maxHp = max;
        CommandParser.mana = mp;
        CommandParser.potions = pots;
        CommandParser.isShielded = shield;
    }

    private static boolean checkNullOrEmpty() {
        try {
            CommandParser.Enemy[] r = freshRoster();
            resetPlayer(50, 60, 20, 2, false);
            int c1 = CommandParser.resolveCombatTurn(null, r);
            int c2 = CommandParser.resolveCombatTurn("", r);
            return c1 == -1 && c2 == -1 && CommandParser.mana == 20 && r[0].hp == 20;
        } catch (Throwable t) {
            crash(t);
            return false;
        }
    }

    private static boolean checkAttackGoblin() {
        try {
            CommandParser.Enemy[] r = freshRoster();
            resetPlayer(60, 60, 25, 2, false);
            int code = CommandParser.resolveCombatTurn("attack goblin", r);
            int codeKill = CommandParser.resolveCombatTurn("attack goblin", r);
            return code == 12 && codeKill == 12 && r[0].hp == 0;
        } catch (Throwable t) {
            crash(t);
            return false;
        }
    }

    private static boolean checkAttackBossUnshielded() {
        try {
            CommandParser.Enemy[] r = freshRoster();
            resetPlayer(60, 60, 25, 2, false);
            int code = CommandParser.resolveCombatTurn("attack boss", r);
            return code == 6 && r[2].hp == 39;
        } catch (Throwable t) {
            crash(t);
            return false;
        }
    }

    private static boolean checkAttackBossShielded() {
        try {
            CommandParser.Enemy[] r = freshRoster();
            resetPlayer(60, 60, 25, 2, true);
            int code = CommandParser.resolveCombatTurn("attack boss", r);
            return code == 15 && r[2].hp == 30;
        } catch (Throwable t) {
            crash(t);
            return false;
        }
    }

    private static boolean checkAttackInvalid() {
        try {
            CommandParser.Enemy[] r = freshRoster();
            r[0].hp = 0; // goblin defeated
            resetPlayer(60, 60, 25, 2, false);
            int c1 = CommandParser.resolveCombatTurn("attack", r);
            int c2 = CommandParser.resolveCombatTurn("attack dragon", r);
            int c3 = CommandParser.resolveCombatTurn("attack goblin", r);
            return c1 == -1 && c2 == -1 && c3 == -1;
        } catch (Throwable t) {
            crash(t);
            return false;
        }
    }

    private static boolean checkCastFireballSuccess() {
        try {
            CommandParser.Enemy[] r = freshRoster();
            resetPlayer(60, 60, 25, 2, false);
            // Alphabetically first living enemy in {goblin, skeleton, boss} is "boss" (45 HP)
            int code = CommandParser.resolveCombatTurn("cast fireball", r);
            return code == 25 && CommandParser.mana == 15 && r[2].hp == 20;
        } catch (Throwable t) {
            crash(t);
            return false;
        }
    }

    private static boolean checkCastFireballFizzle() {
        try {
            CommandParser.Enemy[] r = freshRoster();
            resetPlayer(60, 60, 9, 2, false);
            int code = CommandParser.resolveCombatTurn("cast fireball", r);
            return code == 0 && CommandParser.mana == 9 && r[2].hp == 45;
        } catch (Throwable t) {
            crash(t);
            return false;
        }
    }

    private static boolean checkCastHeal() {
        try {
            CommandParser.Enemy[] r = freshRoster();
            resetPlayer(35, 60, 10, 2, false);
            int c1 = CommandParser.resolveCombatTurn("cast heal", r);
            boolean ok1 = (c1 == 20 && CommandParser.playerHp == 55 && CommandParser.mana == 5);
            // Second heal should cap playerHp at maxHp (60)
            int c2 = CommandParser.resolveCombatTurn("cast heal", r);
            boolean ok2 = (c2 == 20 && CommandParser.playerHp == 60 && CommandParser.mana == 0);
            // Third heal with 0 mana should fizzle (return 0)
            int c3 = CommandParser.resolveCombatTurn("cast heal", r);
            return ok1 && ok2 && c3 == 0;
        } catch (Throwable t) {
            crash(t);
            return false;
        }
    }

    private static boolean checkCastArcane() {
        try {
            CommandParser.Enemy[] r = freshRoster();
            r[2].hp = 0; // boss defeated, so firstLivingEnemy is "goblin" (20 HP)
            resetPlayer(60, 60, 10, 2, false);
            int c1 = CommandParser.resolveCombatTurn("cast blizzard", r);
            boolean ok1 = (c1 == 18 && CommandParser.mana == 2 && r[0].hp == 2);
            int c2 = CommandParser.resolveCombatTurn("cast blizzard", r); // only 2 mana left -> fizzle
            return ok1 && c2 == 0 && CommandParser.mana == 2 && r[0].hp == 2;
        } catch (Throwable t) {
            crash(t);
            return false;
        }
    }

    private static boolean checkCastMystic() {
        try {
            CommandParser.Enemy[] r = freshRoster();
            r[2].hp = 0; // boss defeated, so firstLivingEnemy is "goblin" (20 HP)
            resetPlayer(60, 60, 15, 2, false);
            int c1 = CommandParser.resolveCombatTurn("cast thunder", r);
            // 20 - 22 clamped at 0 HP!
            boolean ok1 = (c1 == 22 && CommandParser.mana == 3 && r[0].hp == 0);
            int c2 = CommandParser.resolveCombatTurn("cast thunder", r); // only 3 mana left -> fizzle
            return ok1 && c2 == 0 && CommandParser.mana == 3;
        } catch (Throwable t) {
            crash(t);
            return false;
        }
    }

    private static boolean checkDrinkPotion() {
        try {
            CommandParser.Enemy[] r = freshRoster();
            resetPlayer(40, 60, 5, 1, false);
            int c1 = CommandParser.resolveCombatTurn("drink potion", r);
            boolean ok1 = (c1 == 25 && CommandParser.playerHp == 60 && CommandParser.mana == 15 && CommandParser.potions == 0);
            int c2 = CommandParser.resolveCombatTurn("drink potion", r); // 0 potions left -> returns 0
            int c3 = CommandParser.resolveCombatTurn("drink water", r);  // invalid target -> returns -1
            return ok1 && c2 == 0 && c3 == -1;
        } catch (Throwable t) {
            crash(t);
            return false;
        }
    }

    private static boolean checkDefendFleeUnknown() {
        try {
            CommandParser.Enemy[] r = freshRoster();
            resetPlayer(60, 60, 10, 1, false);
            int d1 = CommandParser.resolveCombatTurn("defend", r);
            boolean okDef = (d1 == 5 && CommandParser.isShielded && CommandParser.mana == 15);
            int d2 = CommandParser.resolveCombatTurn("defend shield", r);
            int f1 = CommandParser.resolveCombatTurn("flee", r);
            int f2 = CommandParser.resolveCombatTurn("flee now", r);
            int u1 = CommandParser.resolveCombatTurn("dance", r);
            return okDef && d2 == -1 && f1 == 99 && f2 == -1 && u1 == -1;
        } catch (Throwable t) {
            crash(t);
            return false;
        }
    }

    private static boolean safeSame(String a, String b, boolean expected) {
        try {
            return CommandParser.isSameCommand(a, b) == expected;
        } catch (Throwable t) {
            crash(t);
            return false;
        }
    }

    private static boolean safeFindEnemy(CommandParser.Enemy[] roster, String target, String expectedName) {
        try {
            CommandParser.Enemy found = CommandParser.findEnemy(roster, target);
            if (expectedName == null) {
                return found == null;
            }
            return found != null && expectedName.equals(found.name);
        } catch (Throwable t) {
            crash(t);
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
            crash(t);
            return false;
        }
    }

    private static boolean safeTurn(String a, String b, String expected) {
        try {
            String actual = CommandParser.firstInTurnOrder(a, b);
            return expected.equals(actual);
        } catch (Throwable t) {
            crash(t);
            return false;
        }
    }

    private static boolean safeFirstLiving(CommandParser.Enemy[] roster, String expectedName) {
        try {
            CommandParser.Enemy e = CommandParser.firstLivingEnemy(roster);
            return e != null && expectedName.equals(e.name);
        } catch (Throwable t) {
            crash(t);
            return false;
        }
    }

    private static void crash(Throwable t) {
        System.out.println("    [crashed with " + t.getClass().getSimpleName() + "]");
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
