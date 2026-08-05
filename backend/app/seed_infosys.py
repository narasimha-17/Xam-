import asyncio

from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.company import Company, CompanyAptitudeQuestion, CompanyTechnicalQuestion

COMPANY_NAME = "Infosys"
COMPANY_DESCRIPTION = (
    "Infosys hiring pattern: quantitative aptitude, logical reasoning (including puzzles), and "
    "verbal ability, followed by pseudocode-based technical MCQs and a technical + HR interview "
    "with strong emphasis on communication."
)

APTITUDE_QUESTIONS = [
    {
        "question_text": "A clock shows 3:15. What is the angle between the hour and minute hands?",
        "options": ["0 degrees", "7.5 degrees", "15 degrees", "22.5 degrees"],
        "correct_index": 1,
        "explanation": "At 3:15, the hour hand has moved 15/60 of the way from 3 to 4 (7.5 degrees past the 3 mark), while the minute hand points exactly at 3 (90 degrees). The gap works out to 7.5 degrees.",
    },
    {
        "question_text": "A cube is painted red on all faces and then cut into 27 equal smaller cubes. How many small cubes have exactly one face painted?",
        "options": ["4", "6", "8", "12"],
        "correct_index": 1,
        "explanation": "In a 3x3x3 cube, the cubes with exactly one painted face are the center cubes of each face — 6 faces × 1 = 6.",
    },
    {
        "question_text": "If today is Wednesday, what day will it be after 65 days?",
        "options": ["Thursday", "Friday", "Saturday", "Sunday"],
        "correct_index": 1,
        "explanation": "65 = 9 weeks (63 days) + 2 extra days. Two days after Wednesday is Friday.",
    },
    {
        "question_text": "A father is 3 times as old as his son. After 12 years, he will be twice as old as his son. What is the father's current age?",
        "options": ["30", "32", "36", "40"],
        "correct_index": 2,
        "explanation": "Let son = x, father = 3x. After 12 years: 3x+12 = 2(x+12) → 3x+12 = 2x+24 → x=12. Father = 36.",
    },
    {
        "question_text": "In a row of children, Raj is 7th from the left and 12th from the right. How many children are there in total?",
        "options": ["18", "19", "20", "21"],
        "correct_index": 0,
        "explanation": "Total = (position from left) + (position from right) − 1 = 7 + 12 − 1 = 18.",
    },
    {
        "question_text": "What is the next term in the series: 3, 8, 15, 24, 35, ?",
        "options": ["46", "48", "50", "52"],
        "correct_index": 1,
        "explanation": "Differences are 5, 7, 9, 11, 13 (consecutive odd numbers). 35 + 13 = 48.",
    },
    {
        "question_text": "A mixture contains milk and water in the ratio 5:3. If 16 litres of water is added, the ratio becomes 5:7. What was the original quantity of milk?",
        "options": ["15 litres", "20 litres", "25 litres", "30 litres"],
        "correct_index": 1,
        "explanation": "Let milk = 5x, water = 3x. (5x)/(3x+16) = 5/7 → 35x = 15x+80 → 20x=80 → x=4. Milk = 5×4 = 20 litres.",
    },
    {
        "question_text": "The average weight of 8 people increases by 2.5 kg when a new person replaces one weighing 65 kg. What is the new person's weight?",
        "options": ["80 kg", "85 kg", "90 kg", "95 kg"],
        "correct_index": 1,
        "explanation": "Total weight increase = 8 × 2.5 = 20 kg. New person's weight = 65 + 20 = 85 kg.",
    },
    {
        "question_text": "Six friends P, Q, R, S, T, and U sit around a circular table, evenly spaced, facing the center. P sits directly opposite S. If there is exactly one person between P and Q going clockwise, how many people sit between Q and S going clockwise?",
        "options": ["0", "1", "2", "3"],
        "correct_index": 0,
        "explanation": "Number the 6 seats clockwise 1-6 with P at seat 1. 'Opposite' on a 6-seat circle means 3 seats away, so S is at seat 4. One person between P and Q clockwise puts Q at seat 3. Going clockwise from Q (seat 3) to S (seat 4), there are 0 people in between — they're adjacent.",
    },
    {
        "question_text": "Select the correctly spelled word.",
        "options": ["Occassion", "Ocassion", "Occasion", "Occasoin"],
        "correct_index": 2,
        "explanation": "\"Occasion\" is the correct spelling — double 'c', single 's'.",
    },
    {
        "question_text": "A train 150 m long crosses a platform 250 m long in 20 seconds. What is the speed of the train in km/hr?",
        "options": ["54 km/hr", "60 km/hr", "72 km/hr", "80 km/hr"],
        "correct_index": 2,
        "explanation": "Total distance = 150+250 = 400 m in 20 s = 20 m/s = 20 × 18/5 = 72 km/hr.",
    },
    {
        "question_text": "If a person's monthly salary is increased by 20% and then decreased by 20%, what is the net change?",
        "options": ["No change", "4% decrease", "4% increase", "2% decrease"],
        "correct_index": 1,
        "explanation": "Let salary=100. After +20%: 120. After -20% of 120: 120-24=96. Net change = 4% decrease.",
    },
    {
        "question_text": "The sum of three consecutive even numbers is 84. What is the largest number?",
        "options": ["26", "28", "30", "32"],
        "correct_index": 2,
        "explanation": "Let the numbers be x, x+2, x+4. Sum = 3x+6 = 84 → 3x = 78 → x = 26. Largest = x+4 = 30.",
    },
    {
        "question_text": "A is twice as efficient as B. Together they finish a job in 12 days. How long would A alone take?",
        "options": ["16 days", "18 days", "20 days", "24 days"],
        "correct_index": 1,
        "explanation": "Let B's rate=x, A's rate=2x. Combined=3x=1/12 → x=1/36. A's rate=2/36=1/18 → A alone takes 18 days.",
    },
    {
        "question_text": "What comes next in the pattern: 1, 4, 9, 16, 25, 36, ?",
        "options": ["42", "45", "49", "56"],
        "correct_index": 2,
        "explanation": "These are perfect squares (1²...6²). Next is 7² = 49.",
    },
    {
        "question_text": "In a family, A is the brother of B. C is the mother of A. D is the brother of C. How is D related to B?",
        "options": ["Father", "Uncle", "Brother", "Grandfather"],
        "correct_index": 1,
        "explanation": "C is B's mother (since A and B are siblings). D is C's brother, making D the maternal uncle of B.",
    },
    {
        "question_text": "A retailer buys an article for Rs. 800 and marks it up so that after giving a 25% discount, he still makes a 20% profit. What is the marked price?",
        "options": ["Rs. 1200", "Rs. 1280", "Rs. 1300", "Rs. 1350"],
        "correct_index": 1,
        "explanation": "Required SP = 800×1.20 = 960. Marked price × 0.75 = 960 → Marked price = 960/0.75 = 1280.",
    },
    {
        "question_text": "If VXUTQ is coded as WYVUR, what does the same code apply to give for ABCDE?",
        "options": ["BCDEF", "ACBED", "BADCF", "CBAFE"],
        "correct_index": 0,
        "explanation": "Each letter shifts forward by 1: V→W, X→Y, U→V, T→U, Q→R. Applying the same rule to ABCDE gives BCDEF.",
    },
    {
        "question_text": "Two numbers are in the ratio 4:5. If 10 is subtracted from each, the ratio becomes 2:3. What are the numbers?",
        "options": ["20 and 25", "40 and 50", "16 and 20", "24 and 30"],
        "correct_index": 0,
        "explanation": "Let numbers be 4x, 5x. (4x−10)/(5x−10) = 2/3 → 12x−30 = 10x−20 → 2x=10 → x=5. Numbers = 20, 25.",
    },
    {
        "question_text": "A alone can finish a job in 18 days. After working for 6 days, he is joined by B, and together they finish the remaining work in 6 more days. In how many days can B alone finish the job?",
        "options": ["16 days", "18 days", "20 days", "24 days"],
        "correct_index": 1,
        "explanation": "A's rate = 1/18. In 6 days A completes 6/18 = 1/3, leaving 2/3 of the work. Working together, A and B finish that 2/3 in 6 more days, so their combined rate = (2/3)/6 = 1/9 per day. B's rate = 1/9 − 1/18 = 1/18, so B alone would also take 18 days.",
    },
    {
        "question_text": "Choose the word most nearly opposite in meaning to 'Reluctant'.",
        "options": ["Hesitant", "Willing", "Unwilling", "Doubtful"],
        "correct_index": 1,
        "explanation": "'Reluctant' means unwilling or hesitant; its opposite is 'willing'.",
    },
    {
        "question_text": "A, B, and C together earn Rs. 1620 in 9 days. A and B together earn Rs. 800 in 5 days. How much does C earn per day?",
        "options": ["Rs. 20", "Rs. 25", "Rs. 30", "Rs. 40"],
        "correct_index": 0,
        "explanation": "Total per day (A+B+C) = 1620/9 = 180. (A+B) per day = 800/5 = 160. C per day = 180 − 160 = 20.",
    },
    {
        "question_text": "What is the compound interest on Rs. 8000 for 1 year at 10% per annum, compounded half-yearly?",
        "options": ["Rs. 800", "Rs. 820", "Rs. 840", "Rs. 850"],
        "correct_index": 1,
        "explanation": "Half-yearly rate = 5%. A = 8000×(1.05)² = 8000×1.1025 = 8820. CI = 8820−8000 = Rs. 820.",
    },
    {
        "question_text": "Which number should replace the question mark: 7, 26, 63, 124, 215, ?",
        "options": ["320", "332", "342", "350"],
        "correct_index": 2,
        "explanation": "Each term is n³−1 for n=2,3,4,5,6,7: 7,26,63,124,215,342. Next term (n=7): 343−1=342.",
    },
    {
        "question_text": "A wheel makes 1000 revolutions in covering a distance of 88 km. What is the radius of the wheel (in metres)?",
        "options": ["7 m", "14 m", "21 m", "28 m"],
        "correct_index": 1,
        "explanation": "Circumference = distance/revolutions = 88000/1000 = 88 m. Circumference = 2πr → r = 88/(2×22/7) = 88×7/44 = 14 m.",
    },
]

TECHNICAL_QUESTIONS = [
    {
        "question_text": "Trace through this pseudocode and explain what it outputs: for i = 1 to 5: print i*i",
        "key_points": [
            "Loop runs for i = 1, 2, 3, 4, 5",
            "At each step it prints i squared: 1, 4, 9, 16, 25",
            "Total output is the sequence of squares from 1 to 25 across 5 lines",
        ],
    },
    {
        "question_text": "What is the difference between call by value and call by reference?",
        "key_points": [
            "Call by value passes a copy of the argument; changes inside the function don't affect the original variable",
            "Call by reference passes the actual memory address, so changes inside the function do affect the caller's variable",
            "Languages like Java pass object references by value (the reference itself is copied, not the object)",
        ],
    },
    {
        "question_text": "What is normalization, and what problem does 2NF specifically solve?",
        "key_points": [
            "Normalization organizes data to minimize redundancy and dependency issues",
            "1NF requires atomic column values with no repeating groups",
            "2NF removes partial dependency — every non-key attribute must depend on the whole composite primary key, not just part of it",
        ],
    },
    {
        "question_text": "What is the difference between an array and a linked list?",
        "key_points": [
            "Array: contiguous memory, O(1) random access, but costly insertion/deletion (shifting elements)",
            "Linked list: nodes scattered in memory linked via pointers, O(n) access but O(1) insertion/deletion once positioned",
            "Arrays have fixed size (in most languages); linked lists grow/shrink dynamically",
        ],
    },
    {
        "question_text": "What is inheritance, and what is the difference between single and multiple inheritance?",
        "key_points": [
            "Inheritance lets a class acquire properties and behavior from another class, promoting code reuse",
            "Single inheritance: a class inherits from exactly one parent class",
            "Multiple inheritance: a class inherits from more than one parent — supported directly in C++ but not in Java (which uses interfaces instead to avoid ambiguity)",
        ],
    },
    {
        "question_text": "What is a foreign key constraint, and what happens if you try to delete a referenced row?",
        "key_points": [
            "A foreign key enforces referential integrity by requiring a column's values to match a primary key in another table",
            "By default, deleting a referenced row is blocked if dependent rows exist",
            "Behavior can be customized with ON DELETE CASCADE (delete dependents too) or ON DELETE SET NULL",
        ],
    },
    {
        "question_text": "What is recursion, and what is the risk of not having a proper base case?",
        "key_points": [
            "Recursion is when a function calls itself to solve smaller instances of the same problem",
            "A base case is the condition that stops further recursive calls",
            "Without a proper base case, the recursion never terminates, causing a stack overflow",
        ],
    },
    {
        "question_text": "What is the difference between compile-time and run-time errors, giving one example of each?",
        "key_points": [
            "Compile-time errors are caught by the compiler before execution — e.g. a syntax error or type mismatch",
            "Run-time errors occur while the program is executing — e.g. division by zero or a null pointer dereference",
            "Compile-time errors prevent the program from running at all; run-time errors crash or misbehave a running program",
        ],
    },
    {
        "question_text": "What is the difference between a shallow copy and a deep copy of an object?",
        "key_points": [
            "A shallow copy duplicates the top-level object but keeps references to the same nested objects",
            "A deep copy recursively duplicates the object and everything it references, so no data is shared",
            "Mutating a nested object through a shallow copy will affect the original, unlike with a deep copy",
        ],
    },
    {
        "question_text": "How do you handle a situation where you disagree with your manager's technical decision?",
        "key_points": [
            "Present your reasoning and evidence calmly and respectfully rather than dismissing their view",
            "Ask clarifying questions to understand their context — they may know constraints you don't",
            "Ultimately support the team's final decision professionally, even if it wasn't your preferred approach",
        ],
    },
    {
        "question_text": "Trace through this pseudocode: sum=0; for i=1 to n step 2: sum=sum+i. What does it compute for n=10?",
        "key_points": [
            "The loop iterates over odd values only: 1, 3, 5, 7, 9 (stepping by 2 up to n=10)",
            "Sum = 1+3+5+7+9 = 25",
            "In general this pattern sums the first k odd numbers, which always equals k²",
        ],
    },
    {
        "question_text": "What is the difference between a class and an object?",
        "key_points": [
            "A class is a blueprint/template defining attributes and behavior",
            "An object is a concrete instance of a class, with its own state (field values) at runtime",
            "Many objects can be created from the same class, each independent of the others",
        ],
    },
    {
        "question_text": "What is the difference between a primary key and a unique key in a database?",
        "key_points": [
            "A primary key uniquely identifies each row and cannot contain NULL values; a table has only one",
            "A unique key also enforces uniqueness but can allow a single NULL value (in most databases) and a table can have several",
            "Primary key is typically used to establish relationships (foreign keys reference it) by convention",
        ],
    },
    {
        "question_text": "What is the time complexity of inserting an element at the beginning of an array versus a linked list?",
        "key_points": [
            "Array: O(n), since every existing element must shift to make room",
            "Linked list: O(1), since it only requires updating the head pointer to a new node",
            "This trade-off is a common reason to prefer linked lists when frequent front-insertions are needed",
        ],
    },
    {
        "question_text": "What is a pointer (or reference) and why is it useful?",
        "key_points": [
            "A pointer stores the memory address of another variable rather than a value directly",
            "Enables efficient passing of large data structures to functions without copying them",
            "Underpins dynamic data structures like linked lists and trees, which rely on nodes referencing each other",
        ],
    },
    {
        "question_text": "What is the difference between an SQL INNER JOIN and a self-join?",
        "key_points": [
            "An INNER JOIN combines rows from two different tables based on a related column",
            "A self-join joins a table to itself, typically using table aliases, to compare rows within the same table",
            "Self-joins are common for hierarchical data, like finding an employee's manager in the same Employee table",
        ],
    },
    {
        "question_text": "What is dynamic programming, and how does it differ from plain recursion?",
        "key_points": [
            "Dynamic programming solves a problem by breaking it into overlapping subproblems and storing their results",
            "Plain recursion may recompute the same subproblem many times, leading to exponential time in some cases",
            "DP uses memoization (top-down) or tabulation (bottom-up) to avoid that redundant recomputation",
        ],
    },
    {
        "question_text": "What is the difference between a stack overflow and a memory leak?",
        "key_points": [
            "Stack overflow happens when the call stack exceeds its size limit, often from deep/infinite recursion",
            "A memory leak happens when allocated memory is never freed even though it's no longer needed, gradually exhausting available memory",
            "Stack overflow crashes immediately; a memory leak degrades performance gradually over time",
        ],
    },
    {
        "question_text": "What is the purpose of an operating system's file system?",
        "key_points": [
            "Organizes and manages how data is stored, named, and retrieved on a storage device",
            "Provides an abstraction (files and directories) over raw disk blocks",
            "Handles access permissions, metadata (size, timestamps), and space allocation",
        ],
    },
    {
        "question_text": "What is the difference between a local variable and a global variable?",
        "key_points": [
            "A local variable is declared within a function/block and is only accessible there, existing only during that call",
            "A global variable is declared outside any function and is accessible throughout the program's lifetime",
            "Overusing global variables makes code harder to reason about and debug due to hidden shared state",
        ],
    },
    {
        "question_text": "What is a null pointer exception, and how can it typically be avoided?",
        "key_points": [
            "It occurs when code tries to use a reference that points to nothing (null/None) as if it were a valid object",
            "Commonly caused by forgetting to initialize a variable or not checking a return value that can be null",
            "Avoided with null checks before use, or by using patterns like Optional types in modern languages",
        ],
    },
    {
        "question_text": "What is the difference between horizontal and vertical partitioning of a database table?",
        "key_points": [
            "Horizontal partitioning splits rows across multiple tables/servers (e.g. by date range or region)",
            "Vertical partitioning splits columns across multiple tables, keeping related columns together",
            "Both aim to improve performance and manageability for very large tables",
        ],
    },
    {
        "question_text": "What are cookies and sessions used for in web applications?",
        "key_points": [
            "Cookies are small pieces of data stored on the client browser, sent with each request to the server",
            "Sessions store user-specific state server-side, typically referenced by a session ID stored in a cookie",
            "Together they let a stateless HTTP protocol maintain a sense of continuity (e.g. staying logged in)",
        ],
    },
    {
        "question_text": "Where do you see yourself in five years?",
        "key_points": [
            "Show ambition that's realistic and tied to growth within the kind of role you're applying for",
            "Mention skills/responsibilities you want to grow into, not just a job title",
            "Avoid answers that suggest you'd leave the company or field soon (e.g. entrepreneurship plans)",
        ],
    },
    {
        "question_text": "What is the difference between an INT and a FLOAT data type, and where does precision loss come from?",
        "key_points": [
            "INT stores whole numbers exactly, with a fixed range depending on its bit width",
            "FLOAT stores an approximation of real numbers using a fixed number of bits split between mantissa and exponent (IEEE 754)",
            "Precision loss happens because not every decimal fraction can be represented exactly in binary floating-point, similar to how 1/3 has no exact finite decimal form",
        ],
    },
]


async def seed_infosys() -> None:
    async with AsyncSessionLocal() as db:
        company = await db.scalar(select(Company).where(Company.name == COMPANY_NAME))
        if company is None:
            company = Company(name=COMPANY_NAME, description=COMPANY_DESCRIPTION)
            db.add(company)
            await db.commit()
            await db.refresh(company)
            print(f"Created company: {COMPANY_NAME}")
        else:
            print(f"Company already exists: {COMPANY_NAME}")

        existing_aptitude = set(
            (
                await db.scalars(
                    select(CompanyAptitudeQuestion.question_text).where(
                        CompanyAptitudeQuestion.company_id == company.id
                    )
                )
            ).all()
        )
        added_aptitude = 0
        for i, q in enumerate(APTITUDE_QUESTIONS):
            if q["question_text"] in existing_aptitude:
                continue
            db.add(CompanyAptitudeQuestion(company_id=company.id, order=i, **q))
            added_aptitude += 1

        existing_technical = set(
            (
                await db.scalars(
                    select(CompanyTechnicalQuestion.question_text).where(
                        CompanyTechnicalQuestion.company_id == company.id
                    )
                )
            ).all()
        )
        added_technical = 0
        for i, q in enumerate(TECHNICAL_QUESTIONS):
            if q["question_text"] in existing_technical:
                continue
            db.add(CompanyTechnicalQuestion(company_id=company.id, order=i, **q))
            added_technical += 1

        await db.commit()
        print(f"Added {added_aptitude} aptitude questions, {added_technical} technical questions.")


if __name__ == "__main__":
    asyncio.run(seed_infosys())
