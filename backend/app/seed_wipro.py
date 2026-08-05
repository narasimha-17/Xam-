import asyncio

from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.company import Company, CompanyAptitudeQuestion, CompanyTechnicalQuestion

COMPANY_NAME = "Wipro"
COMPANY_DESCRIPTION = (
    "Wipro Elite NTH hiring pattern: quantitative aptitude, logical reasoning, and verbal ability "
    "(including an essay-writing round in some cycles), followed by technical and HR interviews "
    "covering OOPs, DBMS, OS, and networking."
)

APTITUDE_QUESTIONS = [
    {
        "question_text": "A can do a piece of work in 12 days and B can do it in 24 days. How long will they take working together?",
        "options": ["6 days", "8 days", "10 days", "16 days"],
        "correct_index": 1,
        "explanation": "Combined rate = 1/12 + 1/24 = 2/24 + 1/24 = 3/24 = 1/8. Time = 8 days.",
    },
    {
        "question_text": "What is the difference between the compound interest and simple interest on Rs. 5000 at 10% per annum for 2 years?",
        "options": ["Rs. 40", "Rs. 50", "Rs. 60", "Rs. 100"],
        "correct_index": 1,
        "explanation": "SI = 5000×10×2/100 = 1000. CI = 5000×(1.1²−1) = 5000×0.21 = 1050. Difference = 1050−1000 = Rs. 50.",
    },
    {
        "question_text": "What is 40% of 250?",
        "options": ["90", "95", "100", "105"],
        "correct_index": 2,
        "explanation": "40% of 250 = 0.4 × 250 = 100.",
    },
    {
        "question_text": "Two numbers are in the ratio 5:6. If their sum is 99, what is the larger number?",
        "options": ["45", "50", "54", "60"],
        "correct_index": 2,
        "explanation": "5x+6x=99 → x=9. Larger number = 6×9 = 54.",
    },
    {
        "question_text": "The average of 6 numbers is 15. If a 7th number, 22, is added, what is the new average?",
        "options": ["15", "16", "17", "18"],
        "correct_index": 1,
        "explanation": "Total of 6 = 90. New total = 90+22 = 112. New average = 112/7 = 16.",
    },
    {
        "question_text": "A shopkeeper buys an item for Rs. 250 and sells it for Rs. 300. What is the profit percentage?",
        "options": ["15%", "18%", "20%", "25%"],
        "correct_index": 2,
        "explanation": "Profit = 50. Profit % = (50/250) × 100 = 20%.",
    },
    {
        "question_text": "A car travels at 90 km/hr for 2.5 hours. What distance does it cover?",
        "options": ["200 km", "215 km", "225 km", "240 km"],
        "correct_index": 2,
        "explanation": "Distance = speed × time = 90 × 2.5 = 225 km.",
    },
    {
        "question_text": "Find the next number in the series: 5, 11, 23, 47, 95, ?",
        "options": ["179", "191", "199", "201"],
        "correct_index": 1,
        "explanation": "Each term follows n×2+1: 5×2+1=11, 11×2+1=23, 23×2+1=47, 47×2+1=95, 95×2+1=191.",
    },
    {
        "question_text": "Find the odd one out: 8, 27, 64, 100, 125",
        "options": ["27", "64", "100", "125"],
        "correct_index": 2,
        "explanation": "8=2³, 27=3³, 64=4³, 125=5³ are perfect cubes; 100 is not.",
    },
    {
        "question_text": "If PAPER is coded as QBQFS, how is WATER coded using the same rule?",
        "options": ["XBUFS", "XBUFT", "YBUFS", "XCUFS"],
        "correct_index": 0,
        "explanation": "Each letter shifts forward by 1: W→X, A→B, T→U, E→F, R→S, giving XBUFS.",
    },
    {
        "question_text": "Pointing to a boy, a woman says, 'He is the son of my only daughter.' How is the woman related to the boy?",
        "options": ["Mother", "Aunt", "Grandmother", "Sister"],
        "correct_index": 2,
        "explanation": "The boy is the son of the woman's daughter, making the woman his grandmother.",
    },
    {
        "question_text": "A man walks 4 km south and then 3 km east. How far is he from his starting point?",
        "options": ["4 km", "5 km", "6 km", "7 km"],
        "correct_index": 1,
        "explanation": "By the Pythagorean theorem, distance = √(4² + 3²) = √25 = 5 km.",
    },
    {
        "question_text": "A father is 4 times as old as his daughter. After 5 years, he will be 3 times as old as her. What is the father's current age?",
        "options": ["36", "40", "44", "48"],
        "correct_index": 1,
        "explanation": "Let daughter = x, father = 4x. After 5 years: 4x+5 = 3(x+5) → 4x+5 = 3x+15 → x=10. Father = 40.",
    },
    {
        "question_text": "15 men can build a wall in 20 days. In how many days can 25 men build the same wall?",
        "options": ["10 days", "12 days", "14 days", "16 days"],
        "correct_index": 1,
        "explanation": "Work is constant: 15×20 = 25×d → d = 300/25 = 12 days.",
    },
    {
        "question_text": "What is the probability of drawing a king from a standard deck of 52 cards?",
        "options": ["1/13", "1/12", "1/26", "4/13"],
        "correct_index": 0,
        "explanation": "There are 4 kings in 52 cards. Probability = 4/52 = 1/13.",
    },
    {
        "question_text": "In how many ways can the letters of the word 'LEVEL' be arranged?",
        "options": ["20", "24", "30", "60"],
        "correct_index": 2,
        "explanation": "LEVEL has 5 letters with L repeated twice and E repeated twice. Arrangements = 5!/(2!×2!) = 120/4 = 30.",
    },
    {
        "question_text": "A mixture of 40 litres has milk and water in the ratio 3:1. How much water must be added to make the ratio 1:1?",
        "options": ["15 litres", "20 litres", "25 litres", "30 litres"],
        "correct_index": 1,
        "explanation": "Milk = 30L, water = 10L. For a 1:1 ratio, water must equal milk (30L), so 30−10 = 20L must be added.",
    },
    {
        "question_text": "Two trains 120 m and 180 m long move towards each other at 54 km/hr and 36 km/hr. How long will they take to cross each other?",
        "options": ["10 seconds", "12 seconds", "15 seconds", "18 seconds"],
        "correct_index": 1,
        "explanation": "Relative speed = 54+36 = 90 km/hr = 25 m/s. Total length = 300 m. Time = 300/25 = 12 seconds.",
    },
    {
        "question_text": "Statement: All roses are flowers. Some flowers fade quickly. Conclusion: Some roses fade quickly. Does this conclusion follow?",
        "options": ["Yes, it follows", "No, it doesn't necessarily follow", "Only if all flowers fade quickly", "Cannot be determined without more premises about roses"],
        "correct_index": 1,
        "explanation": "The 'flowers that fade quickly' aren't established to overlap specifically with roses, so the conclusion doesn't necessarily follow from the given premises.",
    },
    {
        "question_text": "Find the next letter in the series: B, D, G, K, P, ?",
        "options": ["T", "U", "V", "W"],
        "correct_index": 2,
        "explanation": "Position gaps increase by 1 each time (+2,+3,+4,+5,+6): B(2)→D(4)→G(7)→K(11)→P(16)→V(22).",
    },
    {
        "question_text": "How many times do the hour and minute hands of a clock overlap in a 24-hour period?",
        "options": ["20", "22", "24", "44"],
        "correct_index": 1,
        "explanation": "The hands overlap 11 times every 12 hours (not 12, since the last overlap near 12:00 coincides with the first of the next cycle), so 22 times in 24 hours.",
    },
    {
        "question_text": "Solve for x: 5x − 3 = 2x + 12",
        "options": ["3", "4", "5", "6"],
        "correct_index": 2,
        "explanation": "5x − 2x = 12 + 3 → 3x = 15 → x = 5.",
    },
    {
        "question_text": "A car covers the first half of a journey at 40 km/hr and the second half at 60 km/hr. What is the average speed for the whole journey?",
        "options": ["45 km/hr", "48 km/hr", "50 km/hr", "52 km/hr"],
        "correct_index": 1,
        "explanation": "For equal distances at two speeds, average speed = 2×40×60/(40+60) = 4800/100 = 48 km/hr.",
    },
    {
        "question_text": "An item marked at Rs. 800 is sold after a 15% discount. What is the selling price?",
        "options": ["Rs. 660", "Rs. 670", "Rs. 680", "Rs. 690"],
        "correct_index": 2,
        "explanation": "SP = 800 × (1 − 0.15) = 800 × 0.85 = Rs. 680.",
    },
    {
        "question_text": "If a:b = 2:3 and b:c = 4:5, what is a:c?",
        "options": ["6:15", "8:15", "2:5", "8:20"],
        "correct_index": 1,
        "explanation": "Scale so b matches: a:b = 2:3 = 8:12, b:c = 4:5 = 12:15. So a:b:c = 8:12:15, giving a:c = 8:15.",
    },
]

TECHNICAL_QUESTIONS = [
    {
        "question_text": "What is polymorphism, and what are its two main forms?",
        "key_points": [
            "Polymorphism allows the same interface/method call to behave differently depending on the object",
            "Compile-time (static) polymorphism — achieved via method overloading",
            "Runtime (dynamic) polymorphism — achieved via method overriding, resolved through the object's actual type",
        ],
    },
    {
        "question_text": "What is a deadlock, and what are the four necessary conditions for it to occur?",
        "key_points": [
            "A deadlock is a state where a set of processes are blocked, each waiting for a resource held by another",
            "Mutual exclusion, hold and wait, no preemption, and circular wait must all hold simultaneously",
            "Breaking any one of these four conditions is enough to prevent deadlock",
        ],
    },
    {
        "question_text": "What is normalization in databases? Briefly describe 1NF, 2NF, and 3NF.",
        "key_points": [
            "Normalization reduces data redundancy and avoids update/insert/delete anomalies",
            "1NF: all column values are atomic, no repeating groups",
            "2NF: 1NF plus no partial dependency on part of a composite key",
            "3NF: 2NF plus no transitive dependency (non-key attributes shouldn't depend on other non-key attributes)",
        ],
    },
    {
        "question_text": "What is an index in a database, and what is the trade-off of adding one?",
        "key_points": [
            "An index is a data structure that speeds up row lookups on a given column, similar to a book's index",
            "Speeds up SELECT queries filtering/sorting on the indexed column",
            "Slows down INSERT/UPDATE/DELETE since the index itself must also be maintained, and takes extra storage",
        ],
    },
    {
        "question_text": "What is the difference between TCP and UDP?",
        "key_points": [
            "TCP is connection-oriented and reliable — it guarantees ordered delivery with retransmission",
            "UDP is connectionless and faster, but doesn't guarantee delivery or order",
            "TCP suits things like file transfer/web browsing; UDP suits real-time video/voice/gaming where speed matters more than perfect reliability",
        ],
    },
    {
        "question_text": "What is virtual memory, and what problem does it solve?",
        "key_points": [
            "Virtual memory gives each process the illusion of a large, contiguous private address space",
            "Uses disk space to extend usable memory beyond physical RAM, swapping pages in and out as needed",
            "Solves the problem of running programs larger than physical RAM, and isolates each process's memory from others",
        ],
    },
    {
        "question_text": "What is the difference between a process and a thread?",
        "key_points": [
            "A process has its own isolated memory space; threads within the same process share memory",
            "Creating/switching threads is cheaper than creating/switching processes",
            "Threads communicate easily via shared memory but need synchronization to avoid race conditions",
        ],
    },
    {
        "question_text": "Can a constructor be private? What would be the use case?",
        "key_points": [
            "Yes, a constructor can be private in languages like Java/C++",
            "Used to prevent direct instantiation from outside the class — common in the Singleton design pattern",
            "The class instead exposes a static method that controls how/when an instance is created",
        ],
    },
    {
        "question_text": "What is the difference between method overloading and method overriding?",
        "key_points": [
            "Overloading: same method name, different parameter lists, within the same class, resolved at compile time",
            "Overriding: a subclass redefines a parent class method with the same signature, resolved at runtime",
            "Overloading is static polymorphism; overriding is dynamic polymorphism",
        ],
    },
    {
        "question_text": "What is a foreign key, and what happens when you try to insert a row that violates it?",
        "key_points": [
            "A foreign key enforces that a column's value must match an existing value in another table's primary key",
            "The database rejects the insert/update with a constraint violation error",
            "This maintains referential integrity between related tables",
        ],
    },
    {
        "question_text": "What are the seven layers of the OSI model?",
        "key_points": [
            "Physical, Data Link, Network, Transport, Session, Presentation, Application (from bottom to top)",
            "Each layer provides services to the layer above and relies on the layer below",
            "Real-world protocols map onto these layers, e.g. IP at Network, TCP at Transport, HTTP at Application",
        ],
    },
    {
        "question_text": "What is exception handling, and what is the purpose of a finally block?",
        "key_points": [
            "A mechanism (try/catch) to handle runtime errors gracefully instead of crashing the program",
            "The finally block runs regardless of whether an exception was thrown or caught",
            "Commonly used for cleanup — closing files, releasing connections, freeing resources",
        ],
    },
    {
        "question_text": "What is the difference between stack memory and heap memory?",
        "key_points": [
            "Stack memory stores local variables and function call frames, automatically freed when a function returns",
            "Heap memory stores dynamically allocated objects that persist until explicitly freed (or garbage collected)",
            "Stack access is faster but limited in size; heap is larger but slower and needs explicit/managed cleanup",
        ],
    },
    {
        "question_text": "What is a subquery in SQL? Give a simple example use case.",
        "key_points": [
            "A subquery is a query nested inside another query, often in WHERE, FROM, or SELECT clauses",
            "Example: finding employees whose salary is above the average — SELECT * FROM Employee WHERE salary > (SELECT AVG(salary) FROM Employee)",
            "Can be correlated (referencing the outer query) or uncorrelated (independent of it)",
        ],
    },
    {
        "question_text": "What is thrashing in operating systems?",
        "key_points": [
            "Thrashing occurs when a system spends more time swapping pages in and out of memory than doing actual useful work",
            "Typically caused by too many processes competing for too little physical memory",
            "Fixed by reducing the degree of multiprogramming or increasing available memory",
        ],
    },
    {
        "question_text": "What is encapsulation, and why is it considered good practice?",
        "key_points": [
            "Encapsulation bundles data and the methods operating on it, restricting direct external access to internal state",
            "Fields are usually private, with public getters/setters controlling access",
            "Protects invariants and lets internal implementation change without breaking external code that uses the class",
        ],
    },
    {
        "question_text": "What is the difference between an abstract class and an interface?",
        "key_points": [
            "An abstract class can mix implemented and unimplemented methods, and can hold state (fields)",
            "An interface traditionally declares only method signatures (a pure contract), though modern languages allow default methods",
            "A class can implement multiple interfaces but extend only one class",
        ],
    },
    {
        "question_text": "What is DNS, and what is its role on the internet?",
        "key_points": [
            "DNS (Domain Name System) translates human-readable domain names into IP addresses",
            "Works like a distributed phonebook so users don't need to remember numeric IP addresses",
            "Uses a hierarchy of servers (root, TLD, authoritative) to resolve a name step by step",
        ],
    },
    {
        "question_text": "What is a semaphore, and how does it differ from a mutex?",
        "key_points": [
            "A semaphore is a counter-based synchronization primitive that can allow a set number of concurrent accesses",
            "A mutex (binary semaphore conceptually) allows only one thread to hold it at a time, typically with ownership semantics",
            "Semaphores are often used for signaling between threads; mutexes are used purely for mutual exclusion",
        ],
    },
    {
        "question_text": "What is the difference between HTTP GET and POST methods?",
        "key_points": [
            "GET retrieves data and appends parameters to the URL; it's idempotent and can be cached/bookmarked",
            "POST sends data in the request body, is used to create/modify resources, and is not idempotent by convention",
            "GET requests have practical length limits; POST doesn't have the same URL-length constraint",
        ],
    },
    {
        "question_text": "What is garbage collection, and name one common algorithm used for it.",
        "key_points": [
            "Garbage collection automatically reclaims memory occupied by objects no longer reachable by the program",
            "Mark-and-sweep is a common algorithm: mark all reachable objects, then sweep (free) everything unmarked",
            "Generational GC is another common approach, treating young and old objects differently since most objects die young",
        ],
    },
    {
        "question_text": "What is SQL injection, and how can it be prevented?",
        "key_points": [
            "SQL injection happens when untrusted user input is concatenated directly into a SQL query, letting an attacker alter its logic",
            "Prevented primarily by using parameterized queries / prepared statements instead of string concatenation",
            "Additional layers: input validation, least-privilege database accounts, and ORM libraries that escape input by default",
        ],
    },
    {
        "question_text": "What is the difference between a shallow copy and a deep copy?",
        "key_points": [
            "A shallow copy duplicates the top-level object but still shares references to nested/child objects",
            "A deep copy recursively duplicates every nested object so nothing is shared with the original",
            "Modifying a nested object via a shallow copy will unexpectedly affect the original object too",
        ],
    },
    {
        "question_text": "Describe a time you worked in a team to deliver a project under a tight deadline.",
        "key_points": [
            "Use a structured answer (situation, task, action, result) rather than a vague summary",
            "Highlight your specific contribution and how you coordinated with others under pressure",
            "Mention what the team learned or would do differently next time",
        ],
    },
    {
        "question_text": "Why do you want to join Wipro, and what are your salary expectations?",
        "key_points": [
            "Tie your answer to something specific about the company/role, not a generic 'I want a job' statement",
            "Show you've done some research on what the company does or values",
            "For salary, give a reasonable range based on market research rather than an exact rigid number, and stay flexible/open to discussion",
        ],
    },
]


async def seed_wipro() -> None:
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
    asyncio.run(seed_wipro())
