/**
 * DungeonLoopCheck.java — acceptance test for the 4.6 Dungeon Crawler RPG Build (Days 1 & 2).
 *
 * HOW TO RUN
 *   javac Dice.java DungeonLoop.java DungeonLoopCheck.java
 *   java DungeonLoopCheck
 */
public class DungeonLoopCheck {

    private static int passed = 0;
    private static int failed = 0;

    public static void main(String[] args) {
        System.out.println("DungeonLoop acceptance test (Lessons 4.6a & 4.6b)");
        System.out.println("=================================================");

        testSimulateDuelToDeath();
        testRunCombat();
        testExploreFloorDeterministic();
        testRunMultiFloorCampaign();

        System.out.println();
        System.out.println("=================================================");
        System.out.println(passed + " passed, " + failed + " failed");
        if (failed == 0) {
            System.out.println("All checks passed! Your Dungeon Crawler is complete.");
        } else {
            System.out.println("Day 1 (4.6a) covers Parts 1-2; Day 2 (4.6b) covers Parts 3-4.");
        }
    }

    private static void testSimulateDuelToDeath() {
        section("Part 1 (4.6a): simulateDuelToDeath(playerHP, playerDmgPerHit, monsterHP, monsterDmgPerHit)");

        // Player 20 HP (6 dmg), Monster 12 HP (5 dmg):
        // Round 1: monster 12->6, player 20->15
        // Round 2: monster 6->0 (dead! does not counterattack), player stays 15
        check("player kills monster in 2 hits (20 HP, 6 dmg vs 12 HP, 5 dmg) -> 15 HP remaining",
                DungeonLoop.simulateDuelToDeath(20, 6, 12, 5) == 15);
        check("one-shot kill: player (10 HP, 15 dmg vs 12 HP, 99 dmg) -> monster never swings, 10 HP left",
                DungeonLoop.simulateDuelToDeath(10, 15, 12, 99) == 10);
        check("player defeat clamped to 0: (10 HP, 3 dmg vs 20 HP, 6 dmg) -> returns 0 (not negative!)",
                DungeonLoop.simulateDuelToDeath(10, 3, 20, 6) == 0);
        check("monster already <= 0 HP: loop runs 0 times, returns playerHP unchanged (18 -> 18)",
                DungeonLoop.simulateDuelToDeath(18, 5, 0, 10) == 18);
    }

    private static void testRunCombat() {
        section("Part 2 (4.6a): runCombat(...) live Dice integration");

        check("overpowered hero (100 HP, AC 25, +20 atk) beats weak goblin (6 HP, AC 8, +0 atk, d4) -> true",
                quietCombat("Hero", 100, 25, 20, "Goblin", 6, 8, 0, 4) == true);
        check("doomed hero (1 HP, AC 5, -20 atk) loses to Ancient Dragon (200 HP, AC 30, +25 atk, d12) -> false",
                quietCombat("Hero", 1, 5, -20, "Dragon", 200, 30, 25, 12) == false);
    }

    private static void testExploreFloorDeterministic() {
        section("Part 3 (4.6b): exploreFloorDeterministic(startingHP, numRooms, monsterBaseHP, playerDmg, monsterDmg)");

        // 3 rooms, monsterBaseHP=4, playerDmg=5, monsterDmg=3, startHP=20:
        // r=1: monsterHP = 4 + 2 = 6. R1: m 6->1, p 20->17; R2: m 1->-4 (dead). End r=1: p=17.
        // r=2: monsterHP = 4 + 4 = 8. R1: m 8->3, p 17->14; R2: m 3->-2 (dead). End r=2: p=14.
        // r=3: monsterHP = 4 + 6 = 10. R1: m 10->5, p 14->11; R2: m 5->0 (dead). Shrine in r=3 (+4 HP): 11 + 4 = 15!
        check("3 rooms with Shrine on room 3: 20 HP -> 17 -> 14 -> 11 + 4 shrine = 15 HP",
                DungeonLoop.exploreFloorDeterministic(20, 3, 4, 5, 3) == 15);
        // Death on room 3 BEFORE shrine: startHP=8 -> r1(5) -> r2(2) -> r3(dies, 0 HP -> shrine must NOT heal dead hero!)
        check("DEAD HERO SHRINE TRAP: dying in room 3 returns 0 (shrine on room 3 does NOT heal a dead hero to +4!)",
                DungeonLoop.exploreFloorDeterministic(8, 3, 4, 5, 3) == 0);
        check("dying in room 1 breaks out of floor loop and returns 0",
                DungeonLoop.exploreFloorDeterministic(3, 5, 10, 4, 5) == 0);
    }

    private static void testRunMultiFloorCampaign() {
        section("Part 4 (4.6b): runMultiFloorCampaign(startingHP, maxHP, floors, roomsPerFloor, playerDmg, monsterDmg)");

        // 2 floors, 2 rooms per floor, startHP=25, maxHP=25, playerDmg=6, monsterDmg=4:
        // Floor 1, Room 1: mHP = 4+2 = 6 (1 hit, 0 dmg taken -> 25 HP)
        // Floor 1, Room 2: mHP = 4+4 = 8 (2 hits, 4 dmg taken -> 21 HP)
        // End of Floor 1 campfire: +3 HP -> 24 HP (<= 25 maxHP)
        // Floor 2, Room 1: mHP = 8+2 = 10 (2 hits, 4 dmg taken -> 20 HP)
        // Floor 2, Room 2: mHP = 8+4 = 12 (2 hits, 4 dmg taken -> 16 HP)
        // End of Floor 2 campfire: +6 HP -> 22 HP
        check("survives 2x2 campaign with campfire healing -> 22 HP",
                DungeonLoop.runMultiFloorCampaign(25, 25, 2, 2, 6, 4) == 22);
        // Campfire maxHP cap: Floor 1 takes 0 dmg (playerDmg=20), campfire +3 must cap at maxHP=25 (NOT 28!)
        check("CAMPFIRE OVERHEAL TRAP: resting at full health caps HP at maxHP (25, not 28)",
                DungeonLoop.runMultiFloorCampaign(25, 25, 1, 2, 20, 4) == 25);
        // Dying on Floor 1 returns -1; dying on Floor 2 returns -2
        check("dying on Floor 1 returns -1",
                DungeonLoop.runMultiFloorCampaign(4, 25, 3, 2, 4, 6) == -1);
        check("surviving Floor 1 but dying on Floor 2 returns -2",
                DungeonLoop.runMultiFloorCampaign(10, 25, 3, 2, 5, 4) == -2);
    }

    private static boolean quietCombat(String pName, int pHP, int pAC, int pAtk,
                                       String mName, int mHP, int mAC, int mAtk, int mDie) {
        java.io.PrintStream orig = System.out;
        try {
            System.setOut(new java.io.PrintStream(new java.io.ByteArrayOutputStream()));
            return DungeonLoop.runCombat(pName, pHP, pAC, pAtk, mName, mHP, mAC, mAtk, mDie);
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
