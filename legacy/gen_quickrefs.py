#!/usr/bin/env python3
"""Generate the 10 per-unit Quick Reference pages (docs/reference/*.html).

These are the pages every unit index promises in its Reference Materials
section. Run from repo root: python3 scripts/gen_quickrefs.py
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

TPL = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title} — Quick Reference — Unit {unit_num}</title>
<link rel="stylesheet" href="../style.css">
</head>
<body>

<nav class="top-nav">
    <a href="../../index.html">Dashboard</a>
    <a href="../index.html" class="active">Docs</a>
    <a href="../../projects.html">Projects</a>
    <a href="../../exam/index.html">Exam</a>
</nav>

<div class="page">

<nav>
    <a href="../index.html">Home</a>
    <span class="sep">/</span>
    <a href="../unit-{unit_dir}/index.html">Unit {unit_num}</a>
    <span class="sep">/</span>
    <span class="here">Quick Reference</span>
</nav>

<h1>{title}: Quick Reference</h1>

<p>One page, no story, no lab. The shapes, signatures, and traps of the unit,
compressed. This is the page to keep open during builds and to re-read the
night before a test. Print it and mark it up.</p>

{sections}

<h2>The Unit's Traps, One Line Each</h2>
<ul>
{traps}
</ul>

<h2>See Also</h2>
<ul>
{see_also}
</ul>

</div><!-- .page -->
</body>
</html>
"""

SECT = """<h2>{h}</h2>
{body}
"""
TBL = """<table>
    <tr><th>{headers}</th></tr>
{rows}
</table>
"""

def table(headers, rows):
    r = "".join(f"    <tr><td>{row}</td></tr>\n" for row in rows)
    return TBL.format(headers=headers, rows=r.rstrip())

def tbl2(h1, h2, rows):
    header = f"</th><th>{h2}</th></tr>"
    r = "".join(f"    <tr><td>{a}</td><td>{b}</td></tr>\n" for a, b in rows)
    return f"<table>\n    <tr><th>{h1}{header}\n{r}</table>\n"

UNITS = {
 1: dict(
   title="Primitive Types",
   sections=[
     ("The Types", tbl2("Type", "Holds / example", [
       ("int", "whole numbers, -2.1 to 2.1 billion. <code>int hp = 20;</code>"),
       ("double", "decimals, about 15 digits precision. <code>double rate = 0.75;</code>"),
       ("boolean", "true or false only. <code>boolean isCrit = false;</code>"),
     ])),
     ("Operators", tbl2("Operator", "Does", [
       ("+ - * /", "arithmetic. int/int TRUNCATES: 5/2 is 2"),
       ("%", "remainder. 7 % 3 is 1. Even test: n % 2 == 0"),
       ("++ --", "add/subtract 1. Pre uses new value, post uses old"),
       ("+= -= *= /= %=", "x op= y means x = x op y. Whole right side first"),
       ("(int) (double)", "cast. (int) 9.99 is 9: truncates, never rounds"),
     ])),
     ("Math.random() Formulas", tbl2("Need", "Formula", [
       ("0 to n-1", "<code>(int)(Math.random() * n)</code>"),
       ("1 to n", "<code>(int)(Math.random() * n) + 1</code>"),
       ("min to max", "<code>(int)(Math.random() * (max - min + 1)) + min</code>"),
     ])),
     ("Printing", "<pre><code>System.out.println(x);   // newline after\nSystem.out.print(x);    // no newline\n\"HP: \" + hp            // concatenation, left to right\n\"Sum: \" + (a + b)      // parens or a+b glues as text</code></pre>"),
     ("Compile and Run", "<pre><code>javac Hello.java    # compiles, .class appears\njava Hello          # runs; no .java, no .class</code></pre>"),
   ],
   traps=[
     "<code>5 / 2</code> is 2, not 2.5. Integer division truncates.",
     "<code>(int) 9.99</code> is 9. Casts truncate; they do not round.",
     "<code>(int) Math.random() * 6</code> is always 0. The cast grabs the random before the multiply. Parenthesize.",
     "Integer.MAX_VALUE + 1 is negative. Overflow wraps silently.",
     "Filename must match class name, case included.",
   ],
   see_also=[
     '<a href="../unit-01/casting.html">Casting &amp; Integer Division</a>',
     '<a href="../unit-01/compound-assignment.html">Compound Assignment &amp; Range</a>',
     '<a href="../unit-01/arithmetic.html">Arithmetic</a>',
     '<a href="../unit-01/math-random.html">Math.random()</a>',
   ],
 ),
 2: dict(
   title="Using Objects",
   sections=[
     ("String Methods (JQR set)", tbl2("Call", "Returns", [
       ("s.length()", "count of characters"),
       ("s.substring(a, b)", "chars a up to b-1 (end EXCLUSIVE)"),
       ("s.substring(a)", "chars a to the end"),
       ("s.indexOf(t)", "first index of t, or -1"),
       ("s.equals(t)", "content compare. NEVER == for Strings"),
       ("s.compareTo(t)", "negative / 0 / positive, alphabetical"),
       ("s.split(delim)", "String[] of pieces, delimiter removed"),
     ])),
     ("Scanner (keyboard)", "<pre><code>import java.util.Scanner;\nScanner in = new Scanner(System.in);\nString line = in.nextLine();     // whole line\nString word = in.next();        // one token\nint n    = in.nextInt();\ndouble d = in.nextDouble();</code></pre>"),
     ("Math Class (JQR set)", tbl2("Call", "Returns", [
       ("Math.abs(x)", "absolute value (int and double versions)"),
       ("Math.pow(b, e)", "double, b to the e"),
       ("Math.sqrt(x)", "double square root"),
       ("Math.random()", "double, 0.0 up to but not including 1.0"),
     ])),
     ("Wrappers and Parsing", tbl2("Expression", "Value / role", [
       ("Integer.MAX_VALUE", "2147483647 (the int ceiling)"),
       ("Integer.parseInt(\"42\")", "the int 42. Crashes on garbage"),
       ("Double.parseDouble(\"0.5\")", "the double 0.5"),
       ("ArrayList&lt;Integer&gt;", "the wrapper is required; primitives cannot be generic"),
     ])),
   ],
   traps=[
     "substring's second index is exclusive: \"dungeon\".substring(0,3) is \"dun\".",
     "== on Strings compares references. Use .equals, always.",
     "indexOf returns -1, not 0, when absent. 0 means FIRST position.",
     "nextInt then nextLine: nextLine grabs the leftover newline and returns \"\". Pick one style per Scanner.",
     "split pieces are Strings. parseInt them before arithmetic.",
   ],
   see_also=[
     '<a href="../unit-02/string.html">The String Class</a>',
     '<a href="../unit-02/string-split.html">split() &amp; Data Lines</a>',
     '<a href="../unit-02/scanner.html">Scanner</a>',
     '<a href="../unit-02/api-and-libraries.html">APIs &amp; Libraries</a>',
     '<a href="../unit-02/method-signatures.html">Method Signatures</a>',
   ],
 ),
 3: dict(
   title="Boolean Expressions &amp; if",
   sections=[
     ("Relational Operators", tbl2("Op", "True when", [
       ("== !=", "equal / not equal (values for primitives)"),
       ("&lt; &gt; &lt;= &gt;=", "comparisons; &lt;= and &gt;= include the boundary"),
     ])),
     ("Logic", tbl2("Expr", "Means", [
       ("a &amp;&amp; b", "both (short-circuits: b skipped if a false)"),
       ("a || b", "at least one (short-circuits too)"),
       ("!a", "not"),
     ])),
     ("De Morgan", "<pre><code>!(a &amp;&amp; b)  ==  !a || !b\n!(a || b)  ==  !a &amp;&amp; !b</code></pre>"),
     ("The if Family", "<pre><code>if (cond) { ... }                     // maybe\nelse if (other) { ... }               // chain: first true wins\nelse { ... }                          // none matched</code></pre>"),
     ("Comparing Objects", "<pre><code>a.equals(b)      // content. the right way\na == b           // same object? almost never what you mean\ns.compareTo(t)   // ordering: neg / 0 / pos</code></pre>"),
   ],
   traps=[
     "= assigns, == compares. if (x = 5) does not even compile for ints, and the boolean version is worse.",
     "else-if chains: order matters. 90+ must be tested before 70+ in a grade chain.",
     "Double comparisons with == are unreliable (0.1 + 0.2 != 0.3). Compare with a tolerance.",
     "De Morgan flip: AND becomes OR. The operators swap AND the parts negate. All three changes or none.",
   ],
   see_also=[
     '<a href="../unit-03/boolean-logic.html">Boolean Logic</a>',
     '<a href="../unit-03/de-morgan.html">De Morgan\'s Laws</a>',
     '<a href="../unit-03/else-if-chains.html">else-if Chains</a>',
     '<a href="../unit-03/comparing-objects.html">Comparing Objects</a>',
   ],
 ),
 4: dict(
   title="Iteration",
   sections=[
     ("while", "<pre><code>while (cond) { body }   // check FIRST; may run 0 times</code></pre>"),
     ("for", "<pre><code>for (init; cond; update) { body }\nfor (int i = 0; i &lt; n; i++)   // the standard shape, n times\nfor (int i = n - 1; i &gt;= 0; i--)  // backwards: removal-safe</code></pre>"),
     ("Nested", "<pre><code>for (r...) for (c...)   // rows outer. r * c total visits\n// same-n nesting = quadratic work (run-time analysis)</code></pre>"),
     ("String Traversal", "<pre><code>for (int i = 0; i &lt; s.length(); i++) {\n    String ch = s.substring(i, i + 1);   // the exam idiom\n    // or char c = s.charAt(i);\n}</code></pre>"),
     ("The Trace Table", tbl2("Column", "Track", [
       ("iteration", "which pass"),
       ("variables", "every variable that changes"),
       ("condition", "its value at the check"),
       ("output", "exactly what prints, char by char"),
     ])),
   ],
   traps=[
     "Off-by-one: i &lt; n runs n times (0..n-1). i &lt;= n runs n+1. Write the first and last iteration.",
     "Infinite loops: the update must move the condition toward false. Missing i++ is the classic.",
     "Removing while looping forward skips elements. Loop backwards, or build a survivor list.",
     "int counter in a division: (double) total / count, or the average truncates.",
   ],
   see_also=[
     '<a href="../unit-04/while-loops.html">while Loops</a>',
     '<a href="../unit-04/for-loops.html">for Loops</a>',
     '<a href="../unit-04/nested-loops.html">Nested Loops</a>',
     '<a href="../unit-04/loop-analysis.html">Loop Analysis &amp; Tracing</a>',
     '<a href="../unit-04/run-time-analysis.html">Run-Time Analysis</a>',
   ],
 ),
 5: dict(
   title="Writing Classes",
   sections=[
     ("The Skeleton", "<pre><code>public class Player {\n    private String name;        // fields: always private\n    private int hp;\n\n    public Player(String name, int hp) {   // constructor\n        this.name = name;                   // this. resolves shadowing\n        this.hp = hp;\n    }\n\n    public String getName() { return name; }        // accessor\n    public void setHp(int hp) { this.hp = hp; }     // mutator\n    public String toString() { return name + \" (\" + hp + \" hp)\"; }\n}</code></pre>"),
     ("Encapsulation Rules", tbl2("Rule", "Why", [
       ("fields private", "outside code cannot corrupt state"),
       ("accessors public as needed", "read access is a choice, not a default"),
       ("mutators validate", "setHp(-5) must be rejected or clamped"),
       ("toString for printing", "println(obj) calls it automatically"),
     ])),
     ("static vs instance", tbl2("", "static", "instance", []).replace('<tr><th></th><th></th><th></th></tr>', "") if False else tbl2("Question", "Answer", [
       ("belongs to class, no object needed", "static (Math.abs, your Dice.roll)"),
       ("needs this object's data", "instance (getName, length)"),
       ("called how", "ClassName.method() vs obj.method()"),
     ])),
     ("this", "<pre><code>this.name = name;   // field = parameter, when names collide\nthis(...);          // constructor calling another constructor (first line)</code></pre>"),
     ("Scope", tbl2("Variable", "Visible", [
       ("parameter", "its method only"),
       ("local", "from declaration to its block's closing brace"),
       ("field", "everywhere in the class, this's lifetime"),
     ])),
   ],
   traps=[
     "Forgetting this. in a shadowed assignment assigns the parameter to itself. The field stays null/0.",
     "No-arg constructor vanishes the moment you write any constructor. Provide it if you need it.",
     "Mutators without validation let hp go negative. Guard: if (hp &gt;= 0) this.hp = hp;",
     "toString must be exactly public String toString(). Any other signature is just a method.",
     "static method touching an instance field: does not compile. static knows no this.",
   ],
   see_also=[
     '<a href="../unit-05/class-anatomy.html">Anatomy of a Class</a>',
     '<a href="../unit-05/constructors.html">Constructors</a>',
     '<a href="../unit-05/accessors-mutators.html">Accessors &amp; Mutators</a>',
     '<a href="../unit-05/scope-and-access.html">Scope &amp; Access</a>',
     '<a href="../unit-05/design-from-spec.html">Design From a Spec</a>',
   ],
 ),
 6: dict(
   title="Arrays",
   sections=[
     ("Creation", "<pre><code>int[] scores = new int[5];          // 5 zeros\nint[] nums  = {3, 7, 11, 15};       // literal, length 4\nString[] names = new String[3];    // 3 nulls (not \"\" !)</code></pre>"),
     ("Access", "<pre><code>nums[0]            // first. indices run 0..length-1\nnums[nums.length - 1]   // last\nnums.length        // count. NO parentheses (field, not method)</code></pre>"),
     ("The Standard Loops", "<pre><code>for (int i = 0; i &lt; nums.length; i++)   // index loop: need i?\nfor (int v : nums)                        // for-each: read-only tour</code></pre>"),
     ("Algorithm Templates", tbl2("Task", "Shape", [
       ("sum / average", "accumulator += a[i]; average = (double) total / a.length"),
       ("max and where", "track best and bestIndex; update both in one if"),
       ("count matches", "counter++ under the if"),
       ("linear search", "loop, compare, return i on hit; -1 after"),
       ("insert at pos", "shift right from the END backwards, then place"),
       ("remove at pos", "shift left over the hole, count--"),
       ("swap", "temp = a[i]; a[i] = a[j]; a[j] = temp;"),
     ])),
   ],
   traps=[
     "length is a field for arrays, a method for Strings and ArrayLists. nums.length, s.length(), list.size().",
     "0..length-1. nums[length] is the ArrayIndexOutOfBounds you will meet in every bug hunt.",
     "Default values: 0 for numbers, false for booleans, null for objects. null.length() is the NullPointerException.",
     "for-each cannot modify the array (it copies the reference) and hides the index.",
     "Shifting forward while inserting forward overwrites unread values. Shift from the far end.",
   ],
   see_also=[
     '<a href="../unit-06/array-basics.html">Array Basics</a>',
     '<a href="../unit-06/array-traversal.html">Array Traversal</a>',
     '<a href="../unit-06/array-algorithms.html">Array Algorithms</a>',
     '<a href="../unit-06/datasets.html">Working with Data Sets</a>',
   ],
 ),
 7: dict(
   title="ArrayList",
   sections=[
     ("Setup and Core Methods (JQR set)", tbl2("Call", "Does", [
       ("new ArrayList&lt;E&gt;()", "empty list; E is a class, Integer not int"),
       ("list.size()", "count (method! not .length)"),
       ("list.add(obj)", "append; returns true"),
       ("list.add(i, obj)", "insert at i, shifting right; returns void"),
       ("list.get(i)", "element at i"),
       ("list.set(i, obj)", "REPLACE at i; returns the OLD element"),
       ("list.remove(i)", "remove at i, shifting left; returns the REMOVED element"),
     ])),
     ("Loops", "<pre><code>for (int i = 0; i &lt; list.size(); i++)   // index: mutation-safe backwards\nfor (String s : list)                    // read-only tour\n\n// REMOVAL LOOP: backwards only\nfor (int i = list.size() - 1; i &gt;= 0; i--)\n    if (list.get(i) == null || bad(list.get(i))) list.remove(i);</code></pre>"),
     ("Search and Sort", tbl2("Algorithm", "Notes", [
       ("linear search", "any data; about n steps"),
       ("binary search", "SORTED data only; halve each step; about log n"),
       ("selection sort", "find min, swap to front; always ~n²/2 comparisons"),
       ("insertion sort", "insert into sorted prefix; n-1 best case"),
     ])),
     ("Files (7.6)", "<pre><code>import java.util.Scanner; import java.io.File;\nScanner in = new Scanner(new File(\"monsters.txt\"));\nwhile (in.hasNext()) {\n    String[] f = in.nextLine().trim().split(\",\");\n    if (f.length == 5) list.add(new Monster(f[0],\n        Integer.parseInt(f[1]), Integer.parseInt(f[2])));\n}\nin.close();</code></pre>"),
   ],
   traps=[
     "ArrayList&lt;int&gt; is illegal. Integer + autoboxing is the way.",
     "remove(i) and set(i, obj) RETURN values. Ignoring them is legal and usually a bug.",
     "Removing forward skips: after remove(i), the next element slides into i, and i++ jumps it.",
     "Binary search on unsorted data returns confident garbage, not an error.",
     "size() inside the loop condition when the loop removes: cache it or loop backwards.",
   ],
   see_also=[
     '<a href="../unit-07/arraylist-basics.html">ArrayList Basics</a>',
     '<a href="../unit-07/arraylist-traversal.html">ArrayList Traversal</a>',
     '<a href="../unit-07/searching-sorting.html">Searching &amp; Sorting</a>',
     '<a href="../unit-07/reading-files.html">Reading Files</a>',
   ],
 ),
 8: dict(
   title="2D Arrays",
   sections=[
     ("Creation", "<pre><code>int[][] grid = new int[4][5];      // 4 rows, 5 cols, all 0\nint[][] m = {{1,2,3},{4,5,6}};     // 2 rows, 3 cols\nchar[][] map = new char[rows][];   // jagged: rows first, fill later</code></pre>"),
     ("Dimensions", tbl2("Expression", "Is", [
       ("grid.length", "the number of ROWS"),
       ("grid[r].length", "the length of row r (columns, if rectangular)"),
       ("grid[r][c]", "the cell at row r, column c"),
     ])),
     ("The Walks", "<pre><code>// row-major (the default)\nfor (int r = 0; r &lt; grid.length; r++)\n    for (int c = 0; c &lt; grid[r].length; c++)\n        visit(grid[r][c]);\n\n// column-major\nfor (int c = 0; c &lt; grid[0].length; c++)\n    for (int r = 0; r &lt; grid.length; r++)\n        visit(grid[r][c]);</code></pre>"),
     ("Neighbors (4-directional)", "<pre><code>if (r &gt; 0)                  check grid[r-1][c]   // up\nif (r &lt; grid.length-1)       check grid[r+1][c]   // down\nif (c &gt; 0)                  check grid[r][c-1]   // left\nif (c &lt; grid[r].length-1)   check grid[r][c+1]   // right</code></pre>"),
     ("Box traversal (bounded)", "<pre><code>for (int r = Math.max(0, r1); r &lt;= Math.min(grid.length-1, r2); r++)\n    for (int c = Math.max(0, c1); c &lt;= Math.min(grid[r].length-1, c2); c++)\n        visit(grid[r][c]);</code></pre>"),
   ],
   traps=[
     "grid.length is ROWS. Row-first thinking: [row][col], always.",
     "Jagged rows are legal. Use grid[r].length per row; a width constant breaks.",
     "Swapped bounds compile on square grids and crash on rectangles. Match variable to bound.",
     "Negative indices do not exist. Bounds checks BEFORE access, every neighbor, every time.",
   ],
   see_also=[
     '<a href="../unit-08/2d-array-basics.html">2D Array Basics</a>',
     '<a href="../unit-08/2d-array-traversal.html">2D Array Traversal</a>',
     '<a href="../unit-08/2d-algorithms.html">2D Array Algorithms</a>',
     '<a href="../unit-08/neighbors-boundaries.html">Neighbors &amp; Boundaries</a>',
     '<a href="../unit-08/maps-from-files.html">Maps From Files</a>',
   ],
 ),
 9: dict(
   title="Inheritance (Season 2)",
   sections=[
     ("extends", "<pre><code>public class GameCharacter {          // parent\n    protected String name;            // protected: kids can touch\n    public GameCharacter(String name) { this.name = name; }\n    public String attack() { return name + \" swings\"; }\n}\n\npublic class Dragon extends GameCharacter {\n    public Dragon(String name) { super(name); }      // parent constructor FIRST\n    @Override\n    public String attack() { return name + \" breathes fire\"; }\n}</code></pre>"),
     ("The Vocabulary", tbl2("Term", "Means", [
       ("superclass / subclass", "parent / child class"),
       ("super(...)", "call the parent constructor; must be the first line"),
       ("super.method()", "call the parent's version of an overridden method"),
       ("@Override", "annotation: compiler checks you really overrode"),
       ("abstract class", "cannot be instantiated; may declare abstract methods"),
       ("polymorphism", "one variable type, many runtime behaviors"),
       ("downcast", "(Dragon) c after instanceof check"),
     ])),
     ("Polymorphism in One Snippet", "<pre><code>ArrayList&lt;GameCharacter&gt; party = new ArrayList&lt;GameCharacter&gt;();\nparty.add(new Dragon(\"Smaug\"));\nparty.add(new Goblin(\"Grish\"));\nfor (GameCharacter c : party)\n    System.out.println(c.attack());   // each calls ITS OWN attack</code></pre>"),
   ],
   traps=[
     "super(...) must be the constructor's first line, or the compiler inserts super() and fails if the parent lacks a no-arg constructor.",
     "Overriding requires the SAME signature. Different parameters is overloading, a different method.",
     "Protected is visible to subclasses AND the package. Private is invisible to children.",
     "Static methods do not override: they hide. Polymorphism needs instance methods.",
   ],
   see_also=[
     '<a href="../unit-09/extends-and-super.html">extends &amp; super</a>',
     '<a href="../unit-09/overriding.html">Method Overriding</a>',
     '<a href="../unit-09/polymorphism.html">Polymorphism</a>',
     '<a href="../unit-09/abstract-classes.html">Abstract Classes</a>',
   ],
 ),
 10: dict(
   title="Recursion",
   sections=[
     ("The Shape", "<pre><code>public static int fact(int n) {\n    if (n &lt;= 1) return 1;            // BASE CASE: no recursion\n    return n * fact(n - 1);          // RECURSIVE CASE: smaller n\n}</code></pre>"),
     ("The Questions (ask of every recursion)", tbl2("Question", "Why it matters", [
       ("what is the base case?", "no base case = StackOverflowError"),
       ("how does each call get smaller?", "no shrinking = infinite recursion"),
       ("what does the caller do with the answer?", "return it, combine it, or print it"),
     ])),
     ("The Classics", tbl2("Method", "Shape", [
       ("factorial", "n * fact(n-1), base 1"),
       ("fibonacci", "fib(n-1) + fib(n-2), base 0 and 1"),
       ("sum of digits", "n % 10 + sum(n / 10), base n &lt; 10"),
       ("reverse string", "reverse(rest) + first, base length &lt;= 1"),
       ("binary search", "search half, base lo &gt; hi"),
       ("merge sort", "sort halves + merge, base lo &gt;= hi"),
     ])),
     ("Binary Search, Recursive", "<pre><code>public static int bsearch(int[] d, int t, int lo, int hi) {\n    if (lo &gt; hi) return -1;\n    int mid = (lo + hi) / 2;\n    if (d[mid] == t) return mid;\n    if (d[mid] &lt; t) return bsearch(d, t, mid + 1, hi);\n    return bsearch(d, t, lo, mid - 1);\n}</code></pre>"),
   ],
   traps=[
     "Recursive call with mid instead of mid+1 / mid-1: the range never shrinks. Stack overflow.",
     "Missing the second base case in search (found AND not-found are both needed).",
     "Merge sort without the merge: the halves sort, nothing combines, array looks unchanged.",
     "Tracing recursion: draw the calls as a tree going down, answers bubbling up. Never trace sideways.",
     "log n feeling: 1000 items = 10 halvings, a million = 20, a billion = 30.",
   ],
   see_also=[
     '<a href="../unit-10/recursion-basics.html">Recursion Basics</a>',
     '<a href="../unit-10/recursive-search.html">Recursive Search &amp; Merge Sort</a>',
     '<a href="../unit-10/merge-sort.html">Merge Sort</a>',
     '<a href="../unit-10/backtracking.html">Backtracking</a>',
   ],
 ),
}

def main():
    outdir = os.path.join(ROOT, "docs", "reference")
    os.makedirs(outdir, exist_ok=True)
    for num, d in UNITS.items():
        sections = "\n".join(SECT.format(h=h, body=b) for h, b in d["sections"])
        traps = "\n".join(f"    <li>{t}</li>" for t in d["traps"])
        see = "\n".join(f"    <li>{s}</li>" for s in d["see_also"])
        html = TPL.format(
            title=d["title"], unit_num=num, unit_dir=f"{num:02d}",
            sections=sections, traps=traps, see_also=see,
        )
        path = os.path.join(outdir, f"unit-{num:02d}-quickref.html")
        with open(path, "w", encoding="utf-8") as f:
            f.write(html)
        print("wrote", os.path.relpath(path, ROOT))
    print("done:", len(UNITS), "quickref pages")

if __name__ == "__main__":
    main()