import asyncio

from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.company import Company, CompanyAptitudeQuestion, CompanyTechnicalQuestion

COMPANY_NAME = "Hexaware"
COMPANY_DESCRIPTION = (
    "Hexaware hiring pattern: an aptitude test (quantitative, logical, verbal), a strong "
    "communication/English assessment, a coding round, and a technical + HR interview covering "
    "OOPs, DBMS, and OS fundamentals."
)

APTITUDE_QUESTIONS = [
    {
        "question_text": "What is the simple interest on Rs. 6000 at 12% per annum for 3 years?",
        "options": ["Rs. 1980", "Rs. 2060", "Rs. 2160", "Rs. 2260"],
        "correct_index": 2,
        "explanation": "SI = (P×R×T)/100 = (6000×12×3)/100 = Rs. 2160.",
    },
    {
        "question_text": "What is the compound interest on Rs. 4000 at 5% per annum for 2 years?",
        "options": ["Rs. 390", "Rs. 400", "Rs. 410", "Rs. 420"],
        "correct_index": 2,
        "explanation": "A = 4000×(1.05)² = 4410. CI = 4410−4000 = Rs. 410.",
    },
    {
        "question_text": "320 is what percentage of 400?",
        "options": ["70%", "75%", "80%", "85%"],
        "correct_index": 2,
        "explanation": "320/400 × 100 = 80%.",
    },
    {
        "question_text": "Two numbers are in the ratio 7:9 and their sum is 112. What is the larger number?",
        "options": ["56", "60", "63", "66"],
        "correct_index": 2,
        "explanation": "7x+9x=112 → x=7. Larger number = 9×7 = 63.",
    },
    {
        "question_text": "The average of 4 numbers is 20. If a 5th number, 30, is added, what is the new average?",
        "options": ["21", "22", "23", "24"],
        "correct_index": 1,
        "explanation": "Total of 4 = 80. New total = 80+30 = 110. New average = 110/5 = 22.",
    },
    {
        "question_text": "A trader buys an item for Rs. 180 and sells it for Rs. 225. What is the profit percentage?",
        "options": ["20%", "22%", "25%", "28%"],
        "correct_index": 2,
        "explanation": "Profit = 45. Profit % = (45/180) × 100 = 25%.",
    },
    {
        "question_text": "A vehicle covers 180 km in 3 hours. What is its speed?",
        "options": ["50 km/hr", "55 km/hr", "60 km/hr", "65 km/hr"],
        "correct_index": 2,
        "explanation": "Speed = distance/time = 180/3 = 60 km/hr.",
    },
    {
        "question_text": "Find the next number in the series: 2, 5, 14, 41, 122, ?",
        "options": ["245", "300", "365", "400"],
        "correct_index": 2,
        "explanation": "Each term follows n×3−1: 2×3−1=5, 5×3−1=14, 14×3−1=41, 41×3−1=122, 122×3−1=365.",
    },
    {
        "question_text": "Find the odd one out: 16, 25, 36, 45, 64",
        "options": ["25", "36", "45", "64"],
        "correct_index": 2,
        "explanation": "16=4², 25=5², 36=6², 64=8² are perfect squares; 45 is not.",
    },
    {
        "question_text": "If TIGER is coded as UJHFS, how is LIONS coded using the same rule?",
        "options": ["MJPOT", "MJPPU", "NJPOT", "MJQOT"],
        "correct_index": 0,
        "explanation": "Each letter shifts forward by 1: L→M, I→J, O→P, N→O, S→T, giving MJPOT.",
    },
    {
        "question_text": "Introducing a man, a woman said, 'His wife is the only daughter of my father.' How is the woman related to the man?",
        "options": ["Sister", "Mother", "Wife", "Daughter"],
        "correct_index": 2,
        "explanation": "The woman is the only daughter of her father, and the man's wife is that same person — so the woman is the man's wife.",
    },
    {
        "question_text": "A person walks 6 km north and then 8 km east. How far is he from the starting point?",
        "options": ["8 km", "9 km", "10 km", "12 km"],
        "correct_index": 2,
        "explanation": "By the Pythagorean theorem: √(6² + 8²) = √100 = 10 km.",
    },
    {
        "question_text": "A mother's age is 3 times her daughter's age. After 5 years, the mother will be 2.5 times as old as her daughter. What is the mother's current age?",
        "options": ["36", "40", "45", "48"],
        "correct_index": 2,
        "explanation": "Let daughter=x, mother=3x. After 5 years: 3x+5 = 2.5(x+5) → 3x+5 = 2.5x+12.5 → 0.5x=7.5 → x=15. Mother = 45.",
    },
    {
        "question_text": "8 women can complete a task in 24 days. How many days will 12 women take to complete the same task?",
        "options": ["14 days", "16 days", "18 days", "20 days"],
        "correct_index": 1,
        "explanation": "Work is constant: 8×24 = 12×d → d = 192/12 = 16 days.",
    },
    {
        "question_text": "Two dice are thrown together. What is the probability of getting the same number on both dice?",
        "options": ["1/6", "1/12", "1/3", "1/4"],
        "correct_index": 0,
        "explanation": "Favorable outcomes (1,1),(2,2)...(6,6) = 6 out of 36 total = 6/36 = 1/6.",
    },
    {
        "question_text": "In how many ways can the letters of the word 'APPLE' be arranged?",
        "options": ["48", "60", "90", "120"],
        "correct_index": 1,
        "explanation": "APPLE has 5 letters with P repeated twice. Arrangements = 5!/2! = 120/2 = 60.",
    },
    {
        "question_text": "A mixture of 50 litres has milk and water in the ratio 4:1. How much water must be added to make the ratio 2:1?",
        "options": ["5 litres", "10 litres", "15 litres", "20 litres"],
        "correct_index": 1,
        "explanation": "Milk = 40L, water = 10L. For a 2:1 ratio, water needed = 40/2 = 20L, so 20−10 = 10L must be added.",
    },
    {
        "question_text": "A train 150 m long crosses a stationary pole in 9 seconds. What is its speed in km/hr?",
        "options": ["50 km/hr", "54 km/hr", "60 km/hr", "64 km/hr"],
        "correct_index": 2,
        "explanation": "Speed = 150/9 m/s = 16.67 m/s = 16.67 × 3.6 = 60 km/hr.",
    },
    {
        "question_text": "Statement: All doctors are educated. Some educated people are rich. Conclusion: Some doctors are rich. Does this conclusion follow?",
        "options": ["Yes, it follows", "No, it doesn't necessarily follow", "Only if all rich people are educated", "Cannot be determined without knowing which doctors are educated"],
        "correct_index": 1,
        "explanation": "The 'rich' subset of educated people isn't established to overlap with doctors specifically, so the conclusion doesn't necessarily follow.",
    },
    {
        "question_text": "Find the next letter in the series: A, C, F, J, O, ?",
        "options": ["S", "T", "U", "V"],
        "correct_index": 2,
        "explanation": "Position gaps increase by 1 each time (+2,+3,+4,+5,+6): A(1)→C(3)→F(6)→J(10)→O(15)→U(21).",
    },
    {
        "question_text": "How many times in a 24-hour period do the hour and minute hands of a clock point in exactly opposite directions (180 degrees apart)?",
        "options": ["20", "22", "24", "44"],
        "correct_index": 1,
        "explanation": "The hands are opposite 11 times every 12 hours, so 22 times in 24 hours.",
    },
    {
        "question_text": "Solve for x: 7x + 4 = 3x + 24",
        "options": ["4", "5", "6", "7"],
        "correct_index": 1,
        "explanation": "7x − 3x = 24 − 4 → 4x = 20 → x = 5.",
    },
    {
        "question_text": "A car covers the first half of a journey at 60 km/hr and the second half at 40 km/hr. What is its average speed for the whole journey?",
        "options": ["46 km/hr", "48 km/hr", "50 km/hr", "52 km/hr"],
        "correct_index": 1,
        "explanation": "For equal distances at two speeds, average speed = 2×60×40/(60+40) = 4800/100 = 48 km/hr.",
    },
    {
        "question_text": "An item marked at Rs. 1000 is sold at a 20% discount. What is the selling price?",
        "options": ["Rs. 750", "Rs. 780", "Rs. 800", "Rs. 820"],
        "correct_index": 2,
        "explanation": "SP = 1000 × (1 − 0.20) = Rs. 800.",
    },
    {
        "question_text": "If a:b = 3:4 and b:c = 8:9, what is a:c?",
        "options": ["2:3", "3:4", "6:9", "24:36"],
        "correct_index": 0,
        "explanation": "Scale so b matches: a:b = 3:4 = 6:8, b:c = 8:9. So a:b:c = 6:8:9, giving a:c = 6:9 = 2:3.",
    },
]

TECHNICAL_QUESTIONS = [
    {
        "question_text": "What is inheritance, and what are the common types of inheritance?",
        "key_points": [
            "Inheritance lets a class (subclass) acquire properties and behavior from another class (superclass)",
            "Common types: single, multilevel, hierarchical, and (in languages that support it directly) multiple inheritance",
            "Promotes code reuse and establishes an 'is-a' relationship between classes",
        ],
    },
    {
        "question_text": "What is a static variable/method, and how does it differ from an instance member?",
        "key_points": [
            "A static member belongs to the class itself, shared across all instances, rather than to any one object",
            "An instance member belongs to a specific object, and each instance has its own copy",
            "Static methods can't access instance members directly since they aren't tied to any particular object",
        ],
    },
    {
        "question_text": "What is a trigger in SQL, and when would you use one?",
        "key_points": [
            "A trigger is a stored procedure that automatically runs in response to certain events (INSERT/UPDATE/DELETE) on a table",
            "Used for enforcing business rules, auditing changes, or keeping derived/summary data in sync automatically",
            "Should be used carefully — overuse can make data flow harder to trace and debug",
        ],
    },
    {
        "question_text": "What is a view in SQL, and how is it different from a regular table?",
        "key_points": [
            "A view is a saved SQL query that behaves like a virtual table when queried",
            "Unlike a table, a view doesn't store data itself (in the simple case) — it computes results from underlying tables each time",
            "Useful for simplifying complex queries and restricting access to specific columns/rows",
        ],
    },
    {
        "question_text": "What is the difference between paging and segmentation in operating system memory management?",
        "key_points": [
            "Paging divides memory into fixed-size blocks (pages), avoiding external fragmentation",
            "Segmentation divides memory into variable-sized logical units (segments) based on program structure (code, data, stack)",
            "Paging is simpler for the OS to manage; segmentation more closely matches how programmers think about memory",
        ],
    },
    {
        "question_text": "What is CPU scheduling, and name two common scheduling algorithms.",
        "key_points": [
            "CPU scheduling decides which process in the ready queue gets the CPU next",
            "First-Come-First-Served (FCFS) — simple, but can cause long average wait times",
            "Round Robin — each process gets a fixed time quantum, good for fair time-sharing systems",
        ],
    },
    {
        "question_text": "What is the difference between a monitor and a semaphore for thread synchronization?",
        "key_points": [
            "A semaphore is a simple counter-based primitive that threads increment/decrement to signal availability",
            "A monitor bundles the shared data, procedures, and synchronization together in one higher-level construct (e.g. a class with synchronized methods)",
            "Monitors are generally considered easier to use correctly since they encapsulate the locking logic",
        ],
    },
    {
        "question_text": "What is the TCP three-way handshake?",
        "key_points": [
            "It's the process to establish a TCP connection: SYN (client requests), SYN-ACK (server acknowledges and responds), ACK (client confirms)",
            "Ensures both sides agree on initial sequence numbers before data transfer begins",
            "Necessary because TCP is connection-oriented, unlike UDP which skips this setup entirely",
        ],
    },
    {
        "question_text": "What is the difference between HTTP and HTTPS?",
        "key_points": [
            "HTTPS is HTTP layered over TLS/SSL, encrypting data in transit between client and server",
            "HTTP sends data in plaintext, making it vulnerable to eavesdropping and tampering",
            "HTTPS also verifies server identity via certificates, protecting against man-in-the-middle impersonation",
        ],
    },
    {
        "question_text": "What is Big-O notation, and what is the average time complexity of a lookup in a hash map versus a sorted array?",
        "key_points": [
            "Big-O describes how an algorithm's running time or space grows relative to input size, in the worst/average case",
            "Hash map lookup: average O(1)",
            "Sorted array lookup (via binary search): O(log n)",
        ],
    },
    {
        "question_text": "What is recursion, and when might you prefer an iterative solution instead?",
        "key_points": [
            "Recursion solves a problem by having a function call itself on smaller subproblems, needing a base case to terminate",
            "Iteration (loops) avoids the overhead of repeated function calls and the risk of stack overflow on deep recursion",
            "Prefer iteration when the recursive depth could be large or when performance/memory overhead of function calls matters",
        ],
    },
    {
        "question_text": "What is the difference between an INNER JOIN, LEFT JOIN, and RIGHT JOIN?",
        "key_points": [
            "INNER JOIN returns only rows with matches in both tables",
            "LEFT JOIN returns all rows from the left table, with NULLs where there's no match in the right table",
            "RIGHT JOIN returns all rows from the right table, with NULLs where there's no match in the left table",
        ],
    },
    {
        "question_text": "What is a NULL value in a database, and how is it different from zero or an empty string?",
        "key_points": [
            "NULL represents an unknown or missing value — it is not the same as zero, false, or an empty string",
            "Comparisons with NULL using = or != always return unknown (not true/false), which is why SQL uses IS NULL / IS NOT NULL",
            "Aggregate functions like SUM/AVG typically ignore NULL values rather than treating them as zero",
        ],
    },
    {
        "question_text": "What is method overloading? Give a simple example.",
        "key_points": [
            "Multiple methods share the same name but differ in the number or type of parameters",
            "Example: add(int, int) and add(double, double) in the same class",
            "The compiler picks the right version based on the arguments passed at the call site",
        ],
    },
    {
        "question_text": "What is the 'this' keyword (or 'self' in Python) used for in object-oriented programming?",
        "key_points": [
            "It refers to the current instance of the class within an instance method",
            "Used to distinguish instance fields from parameters/local variables with the same name",
            "Also used to pass the current object as an argument, or to call another constructor from within a constructor",
        ],
    },
    {
        "question_text": "What is composition, and how is it different from inheritance?",
        "key_points": [
            "Composition builds a class using instances of other classes as fields (a 'has-a' relationship)",
            "Inheritance builds a class by extending another class (an 'is-a' relationship)",
            "Composition is often preferred for flexibility since it avoids tight coupling to a rigid class hierarchy",
        ],
    },
    {
        "question_text": "What is a race condition, and how do locks help prevent it?",
        "key_points": [
            "A race condition occurs when the outcome of concurrent operations depends on unpredictable timing/interleaving",
            "Locks (mutexes) ensure only one thread can execute a critical section at a time",
            "Without proper locking, shared data can end up in an inconsistent state after concurrent updates",
        ],
    },
    {
        "question_text": "What is the difference between a compiled language and an interpreted language? Give one example of each.",
        "key_points": [
            "A compiled language is translated to machine code ahead of time (e.g. C++), producing a standalone executable",
            "An interpreted language is executed line-by-line at runtime by an interpreter (e.g. Python)",
            "Many modern languages (like Java) use a hybrid approach — compiling to bytecode that's then interpreted/JIT-compiled",
        ],
    },
    {
        "question_text": "What is a linked list, and when would you prefer it over an array?",
        "key_points": [
            "A linked list is a sequence of nodes, each pointing to the next, not stored contiguously in memory",
            "Preferred when frequent insertions/deletions happen (especially at the front or middle), since no shifting is needed",
            "Arrays are still better when frequent random access by index is needed, since linked lists only allow sequential access",
        ],
    },
    {
        "question_text": "What is the difference between a primary key, a unique key, and a candidate key?",
        "key_points": [
            "A candidate key is any column (or set of columns) that could uniquely identify a row",
            "The primary key is the candidate key chosen to be the main identifier; it cannot be NULL",
            "Unique keys are the remaining candidate keys enforced for uniqueness but not chosen as primary, and may allow one NULL",
        ],
    },
    {
        "question_text": "What is the difference between internal and external fragmentation?",
        "key_points": [
            "Internal fragmentation is wasted space within an allocated block (e.g. a fixed-size page partially used)",
            "External fragmentation is wasted space between allocated blocks — free memory exists but is too scattered to satisfy a request",
            "Paging tends to cause internal fragmentation; variable-sized allocation (like segmentation) tends to cause external fragmentation",
        ],
    },
    {
        "question_text": "What is an API, and why is it useful in software design?",
        "key_points": [
            "An API (Application Programming Interface) defines how different software components communicate with each other",
            "Lets teams/systems integrate without needing to know each other's internal implementation details",
            "Enables modularity — internal implementation can change freely as long as the API contract stays stable",
        ],
    },
    {
        "question_text": "What is the difference between synchronous and asynchronous communication between services?",
        "key_points": [
            "Synchronous: the caller waits (blocks) for a response before continuing — e.g. a direct REST API call",
            "Asynchronous: the caller continues without waiting, often via a message queue, and processes the response/callback later",
            "Asynchronous patterns improve resilience and throughput but add complexity in tracking request state",
        ],
    },
    {
        "question_text": "Describe your communication style, and how do you handle a misunderstanding with a colleague?",
        "key_points": [
            "Be specific about how you communicate (e.g. direct but collaborative, prefers writing things down for clarity)",
            "For a misunderstanding, emphasize clarifying intent calmly rather than assuming the worst or escalating immediately",
            "Show you take responsibility for making sure your own message was clear, not just blaming the other person",
        ],
    },
    {
        "question_text": "What motivates you at work, and how do you stay engaged with repetitive tasks?",
        "key_points": [
            "Give a genuine, specific motivator (learning, ownership, solving problems, team impact) rather than a generic answer",
            "For repetitive tasks, mention finding ways to improve/automate them or connecting them to the bigger goal they serve",
            "Avoid implying you'd get bored and disengaged easily, since some repetitive work exists in every job",
        ],
    },
]


async def seed_hexaware() -> None:
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
    asyncio.run(seed_hexaware())
