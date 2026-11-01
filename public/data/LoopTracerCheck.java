/**
 * LoopTracerCheck.java — acceptance test for Lesson 4.5 (LoopTracer.java).
 *
 * HOW TO RUN
 *   javac LoopTracer.java LoopTracerCheck.java
 *   java LoopTracerCheck
 */
public class LoopTracerCheck {

    private static int passed = 0;
    private static int failed = 0;

    public static void main(String[] args) {
        System.out.println("LoopTracer acceptance test (Lesson 4.5)");
        System.out.println("=======================================");

        testCountWhileIterations();
        testBuildRunedFence();
        testFirstTurnReachingMana();
        testCountTriangularSteps();

        System.out.println();
        System.out.println("=======================================");
        System.out.println(passed + " passed, " + failed + " failed");
        if (failed == 0) {
            System.out.println("All checks passed! Your LoopTracer meets the AP spec.");
        } else {
            System.out.println("Fix the FAIL lines above, recompile, and run again.");
        }
    }

    private static void testCountWhileIterations() {
        section("Part 1: countWhileIterations(int start, int limit, int step) for while (val < limit)");

        check("start=0, limit=10, step=1 -> 10 iterations",
                LoopTracer.countWhileIterations(0, 10, 1) == 10);
        check("non-divisible step: start=0, limit=10, step=3 -> 4 iterations (val = 0, 3, 6, 9)",
                LoopTracer.countWhileIterations(0, 10, 3) == 4);
        check("exact boundary: start=2, limit=10, step=4 -> 2 iterations (val = 2, 6; stops at 10)",
                LoopTracer.countWhileIterations(2, 10, 4) == 2);
        check("zero iterations when start >= limit: start=10, limit=10, step=2 -> 0 (even if step <= 0!)",
                LoopTracer.countWhileIterations(10, 10, 2) == 0
                        && LoopTracer.countWhileIterations(12, 10, 0) == 0);
        check("infinite loop guard: start=0, limit=10, step=0 or -2 -> returns -1 without hanging",
                LoopTracer.countWhileIterations(0, 10, 0) == -1
                        && LoopTracer.countWhileIterations(0, 10, -2) == -1);
    }

    private static void testBuildRunedFence() {
        section("Part 2: buildRunedFence(String rune, int pillars) — the Fencepost Trap");

        check("3 pillars of \"*\" -> \"[*]---[*]---[*]\" (3 pillars, 2 dividers, NO trailing ---!)",
                "[*]---[*]---[*]".equals(LoopTracer.buildRunedFence("*", 3)));
        check("1 pillar of \"SOL\" -> \"[SOL]\" (zero dividers!)",
                "[SOL]".equals(LoopTracer.buildRunedFence("SOL", 1)));
        check("0 or negative pillars -> \"\"",
                "".equals(LoopTracer.buildRunedFence("*", 0))
                        && "".equals(LoopTracer.buildRunedFence("*", -2)));
    }

    private static void testFirstTurnReachingMana() {
        section("Part 3: firstTurnReachingMana(startMana, gainPerTurn, drainEveryThirdTurn, targetMana)");

        // Already at or above target before turn 1 -> 0 turns
        check("startMana >= targetMana (20 >= 15) -> 0 turns",
                LoopTracer.firstTurnReachingMana(20, 5, 2, 15) == 0);
        // start=0, gain=5, drainEvery3=4, target=15:
        // Turn 1: +5 -> 5
        // Turn 2: +5 -> 10
        // Turn 3: +5 - 4 -> 11 (did NOT reach 15 because drain happens on turn 3 before end-of-turn check!)
        // Turn 4: +5 -> 16 (>= 15!) -> returns 4
        check("DRAIN-ON-TURN-3 TRAP: start=0, gain=5, drain=4, target=15 -> reaches 15 on turn 4 (turn 3 nets +1 to 11)",
                LoopTracer.firstTurnReachingMana(0, 5, 4, 15) == 4);
        // Never makes net progress over a 3-turn cycle and doesn't reach on turns 1-2:
        // start=0, gain=2, drain=6 (3*2 - 6 = 0 net per 3 turns), target=10 -> returns -1
        check("zero or negative net 3-turn cycle that never reaches target -> returns -1 without hanging",
                LoopTracer.firstTurnReachingMana(0, 2, 6, 10) == -1
                        && LoopTracer.firstTurnReachingMana(0, 2, 8, 10) == -1);
        // Negative 3-turn cycle, BUT reaches target on turn 2 before the turn-3 drain!
        // start=6, gain=2, drain=10, target=10 -> Turn 1: 8, Turn 2: 10 (reached!) -> returns 2 (NOT -1!)
        check("PEAK-BEFORE-DRAIN TRAP: start=6, gain=2, drain=10, target=10 -> reaches 10 on turn 2 before turn-3 drain!",
                LoopTracer.firstTurnReachingMana(6, 2, 10, 10) == 2);
    }

    private static void testCountTriangularSteps() {
        section("Part 4: countTriangularSteps(int n) — nested loop step trace");

        // Counts inner-body executions of:
        // for (int i = 1; i <= n; i++)
        //     for (int j = i; j <= n; j += 2)
        check("n = 1 -> 1 step ((1,1))",
                LoopTracer.countTriangularSteps(1) == 1);
        check("n = 4 -> 6 steps: i=1(1,3), i=2(2,4), i=3(3), i=4(4)",
                LoopTracer.countTriangularSteps(4) == 6);
        check("n = 5 -> 9 steps: i=1(1,3,5), i=2(2,4), i=3(3,5), i=4(4), i=5(5)",
                LoopTracer.countTriangularSteps(5) == 9);
        check("n <= 0 -> 0 steps",
                LoopTracer.countTriangularSteps(0) == 0);
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
