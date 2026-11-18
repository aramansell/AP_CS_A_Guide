/**
 * RuntimeAnalyzer.java — Instrumented Step-Counting Benchmark (Lesson 4.7).
 *
 * Run the Scaling Benchmark Table BEFORE unlocking RuntimeAnalyzerCheck:
 *   javac RuntimeAnalyzer.java
 *   java RuntimeAnalyzer
 */
public class RuntimeAnalyzer {

    /**
     * Instruments a linear search over indices 0 .. n - 1 looking for {@code targetIndex},
     * counting one step per index inspected (stopping immediately when {@code i == targetIndex}).
     *
     * @param n           number of elements (0 .. n - 1)
     * @param targetIndex index to locate (may be outside 0 .. n - 1)
     * @return total comparisons made before finding targetIndex or exhausting all n elements
     */
    public static int countLinearSearchSteps(int n, int targetIndex) {
        return 0;
    }

    /**
     * Instruments a binary search over sorted indices lo = 0 .. hi = n - 1 looking for
     * {@code targetIndex}, counting one midpoint check per iteration.
     *
     * @param n           number of elements (0 .. n - 1)
     * @param targetIndex index to locate (may be outside 0 .. n - 1)
     * @return total midpoint checks made before finding targetIndex or exhausting lo <= hi
     */
    public static int countBinarySearchSteps(int n, int targetIndex) {
        return 0;
    }

    /**
     * Instruments a full n x n nested loop (0 <= i < n, 0 <= j < n),
     * counting every execution of the inner body.
     *
     * @param n grid dimension (returns 0 if n <= 0)
     * @return total inner-body executions (n * n when n > 0)
     */
    public static int countFullGridSteps(int n) {
        return 0;
    }

    /**
     * Instruments a triangular unique-pair nested loop (0 <= i < n, i + 1 <= j < n),
     * counting every execution of the inner body.
     *
     * @param n number of items (returns 0 if n <= 1)
     * @return total inner-body executions (n * (n - 1) / 2 when n > 1)
     */
    public static int countUniquePairSteps(int n) {
        return 0;
    }

    // =========================================================================
    // ALGORITHM SCALING BENCHMARK TABLE — Run `java RuntimeAnalyzer` to inspect!
    // =========================================================================
    public static void main(String[] args) {
        System.out.println("==========================================================");
        System.out.println("   ALGORITHM SCALING BENCHMARK TABLE (Lesson 4.7)         ");
        System.out.println("==========================================================");

        System.out.println("\n[Parts 1 & 2] Search Scaling (Worst-Case Found vs Not Found):");
        int[] sizes = {15, 100, 1000, 1023, 2047};
        for (int n : sizes) {
            int last = n - 1;
            System.out.println("  n = " + n
                    + " | Linear(last)=" + countLinearSearchSteps(n, last)
                    + " | Binary(last)=" + countBinarySearchSteps(n, last)
                    + " | Binary(missing)=" + countBinarySearchSteps(n, -1));
        }

        System.out.println("\n[Part 3] Nested Loop Scaling (10x input -> 100x work!):");
        int[] gridSizes = {1, 10, 100, 1000};
        for (int n : gridSizes) {
            System.out.println("  n = " + n
                    + " | FullGrid=" + countFullGridSteps(n)
                    + " | UniquePairs=" + countUniquePairSteps(n));
        }
    }
}
