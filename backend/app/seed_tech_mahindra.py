import asyncio

from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.company import Company, CompanyAptitudeQuestion, CompanyTechnicalQuestion

COMPANY_NAME = "Tech Mahindra"
COMPANY_DESCRIPTION = (
    "IT services and consulting. Fresher hiring typically runs an aptitude test (quant, logical "
    "reasoning, verbal) followed by a technical/HR round covering OOP, DBMS, OS, and networking basics."
)

APTITUDE_QUESTIONS = [
    {
        "question_text": "A train 100 m long is running at 60 km/hr. In what time will it cross a pole?",
        "options": ["5 seconds", "6 seconds", "8 seconds", "10 seconds"],
        "correct_index": 1,
        "explanation": "Speed = 60 km/hr = 16.67 m/s. Time = distance / speed = 100 / 16.67 ≈ 6 seconds.",
    },
    {
        "question_text": "What is the simple interest on Rs. 5000 at 8% per annum for 3 years?",
        "options": ["Rs. 1000", "Rs. 1200", "Rs. 1500", "Rs. 1800"],
        "correct_index": 1,
        "explanation": "SI = (P × R × T) / 100 = (5000 × 8 × 3) / 100 = Rs. 1200.",
    },
    {
        "question_text": "A student scores 462 marks out of 700. What percentage is this?",
        "options": ["60%", "62%", "64%", "66%"],
        "correct_index": 3,
        "explanation": "462 / 700 × 100 = 66%.",
    },
    {
        "question_text": "The ratio of two numbers is 3:4 and their sum is 63. What is the larger number?",
        "options": ["27", "32", "36", "40"],
        "correct_index": 2,
        "explanation": "3x + 4x = 63 → x = 9. Larger number = 4 × 9 = 36.",
    },
    {
        "question_text": "The average of 5 numbers is 27. If one number is excluded, the average of the remaining 4 becomes 25. What is the excluded number?",
        "options": ["30", "32", "35", "38"],
        "correct_index": 2,
        "explanation": "Total of 5 = 5 × 27 = 135. Total of 4 = 4 × 25 = 100. Excluded number = 135 − 100 = 35.",
    },
    {
        "question_text": "A shopkeeper buys an item for Rs. 400 and sells it for Rs. 460. What is the profit percentage?",
        "options": ["10%", "12%", "15%", "20%"],
        "correct_index": 2,
        "explanation": "Profit = 60. Profit % = (60 / 400) × 100 = 15%.",
    },
    {
        "question_text": "Find the next number in the series: 2, 5, 10, 17, 26, ?",
        "options": ["35", "36", "37", "39"],
        "correct_index": 2,
        "explanation": "Differences are 3, 5, 7, 9, 11 (consecutive odd numbers). 26 + 11 = 37.",
    },
    {
        "question_text": "Which word does not belong with the others?",
        "options": ["Apple", "Banana", "Carrot", "Mango"],
        "correct_index": 2,
        "explanation": "Apple, Banana, and Mango are fruits; Carrot is a vegetable.",
    },
    {
        "question_text": "If CAT is coded as DBU, how is DOG coded using the same rule?",
        "options": ["EPI", "EPH", "FQH", "EQH"],
        "correct_index": 1,
        "explanation": "Each letter is shifted forward by one: D→E, O→P, G→H, giving EPH.",
    },
    {
        "question_text": "Raj walks 5 km east, then 3 km north, then 5 km west. How far is he from his starting point?",
        "options": ["2 km", "3 km", "5 km", "8 km"],
        "correct_index": 1,
        "explanation": "The 5 km east and 5 km west cancel out, leaving only the 3 km north displacement.",
    },
    {
        "question_text": "A can complete a job in 12 days and B can complete it in 15 days. How long will they take working together?",
        "options": ["6 days", "6.67 days", "7 days", "8 days"],
        "correct_index": 1,
        "explanation": "A's rate = 1/12, B's rate = 1/15. Combined = 1/12 + 1/15 = 9/60 = 3/20. Time = 20/3 ≈ 6.67 days.",
    },
    {
        "question_text": "In how many ways can the letters of the word 'MAHINDRA' be arranged (treating repeated letters as identical)?",
        "options": ["20160", "40320", "10080", "5040"],
        "correct_index": 0,
        "explanation": "MAHINDRA has 8 letters with 'A' repeated twice. Arrangements = 8! / 2! = 40320 / 2 = 20160.",
    },
    {
        "question_text": "A bag contains 4 red and 6 blue balls. If one ball is drawn at random, what is the probability it is red?",
        "options": ["0.2", "0.3", "0.4", "0.5"],
        "correct_index": 2,
        "explanation": "P(red) = 4 / (4+6) = 4/10 = 0.4.",
    },
    {
        "question_text": "Pointing to a photograph, a man says, 'She is the daughter of my grandfather's only son.' How is the woman related to the man?",
        "options": ["Sister", "Mother", "Aunt", "Daughter"],
        "correct_index": 0,
        "explanation": "The man's grandfather's only son is the man's own father, so the woman is his father's daughter — his sister.",
    },
    {
        "question_text": "Statement: All pens are books. All books are tables. Conclusion I: All pens are tables. Conclusion II: Some tables are pens. Which conclusion(s) follow?",
        "options": ["Only I follows", "Only II follows", "Both I and II follow", "Neither follows"],
        "correct_index": 2,
        "explanation": "Chaining the two universal statements gives 'all pens are tables' (I), which also implies at least some tables are pens (II).",
    },
    {
        "question_text": "The cost price of 20 articles equals the selling price of 16 articles. What is the profit percentage?",
        "options": ["20%", "25%", "30%", "16%"],
        "correct_index": 1,
        "explanation": "Let CP of 1 article = 1. CP of 20 = 20 = SP of 16, so SP of 1 = 20/16 = 1.25. Profit % = 25%.",
    },
    {
        "question_text": "A car covers 240 km in 4 hours. What speed must it maintain to cover the same distance in 3 hours?",
        "options": ["70 km/hr", "75 km/hr", "80 km/hr", "85 km/hr"],
        "correct_index": 2,
        "explanation": "Required speed = distance / time = 240 / 3 = 80 km/hr.",
    },
]

TECHNICAL_QUESTIONS = [
    {
        "question_text": "What are the four pillars of Object-Oriented Programming?",
        "key_points": [
            "Encapsulation — bundling data and methods, restricting direct access to internal state",
            "Inheritance — a class acquiring properties/behavior from a parent class",
            "Polymorphism — the same interface behaving differently based on the object (overloading/overriding)",
            "Abstraction — exposing only essential details, hiding implementation complexity",
        ],
    },
    {
        "question_text": "What is the difference between function overloading and function overriding?",
        "key_points": [
            "Overloading: same function name, different parameter lists, resolved at compile time",
            "Overriding: a subclass redefines a parent class method with the same signature, resolved at runtime",
            "Overloading is compile-time (static) polymorphism; overriding is runtime (dynamic) polymorphism",
        ],
    },
    {
        "question_text": "Explain normalization in DBMS and why it's needed.",
        "key_points": [
            "Organizes tables to reduce data redundancy and avoid update/insert/delete anomalies",
            "Progresses through normal forms — 1NF (atomic columns), 2NF (no partial dependency), 3NF (no transitive dependency)",
            "Trade-off: highly normalized schemas can need more joins at query time",
        ],
    },
    {
        "question_text": "What is the difference between a primary key and a foreign key?",
        "key_points": [
            "Primary key uniquely identifies each row in its own table and cannot be null",
            "Foreign key references a primary key in another (or the same) table to enforce a relationship",
            "A table has exactly one primary key but can have multiple foreign keys",
        ],
    },
    {
        "question_text": "What is a deadlock in operating systems, and what are the four necessary conditions for it?",
        "key_points": [
            "A deadlock is a state where processes wait indefinitely for resources held by each other",
            "Mutual exclusion — resources can't be shared",
            "Hold and wait — a process holds one resource while waiting for another",
            "No preemption — resources can't be forcibly taken away",
            "Circular wait — a closed chain of processes each waiting on the next",
        ],
    },
    {
        "question_text": "Explain the difference between a process and a thread.",
        "key_points": [
            "A process has its own independent memory space; threads within a process share the same memory",
            "Context switching between threads is cheaper than between processes",
            "A crash in one thread can bring down the whole process, since they share resources",
        ],
    },
    {
        "question_text": "What is the OSI model? Name its seven layers.",
        "key_points": [
            "A conceptual model standardizing how network communication happens in layers",
            "Physical, Data Link, Network, Transport, Session, Presentation, Application (bottom to top)",
            "Each layer serves the one above it and is served by the one below it",
        ],
    },
    {
        "question_text": "What is the difference between TCP and UDP?",
        "key_points": [
            "TCP is connection-oriented, reliable, and ordered (e.g. web, email)",
            "UDP is connectionless, faster, with no delivery guarantee (e.g. video streaming, gaming)",
            "TCP has handshaking and retransmission overhead; UDP does not",
        ],
    },
    {
        "question_text": "What is polymorphism? Explain with a real-world example.",
        "key_points": [
            "The ability of the same interface/method call to behave differently depending on the object",
            "Example: a 'speak()' method behaves differently for a Dog vs a Cat subclass of Animal",
            "Achieved via method overriding (runtime) or overloading (compile-time)",
        ],
    },
    {
        "question_text": "What is exception handling and why is it important?",
        "key_points": [
            "A mechanism (try/catch/finally) to gracefully handle runtime errors without crashing the program",
            "Separates error-handling logic from normal program flow",
            "Allows cleanup (e.g. closing files/connections) via a finally block regardless of success or failure",
        ],
    },
    {
        "question_text": "What is the difference between an abstract class and an interface (Java/C++ style)?",
        "key_points": [
            "An abstract class can have both implemented and unimplemented methods; an interface traditionally has only method signatures",
            "A class can implement multiple interfaces but extend only one (abstract) class",
            "Use an abstract class for a shared base with common code; use an interface to define a contract across unrelated classes",
        ],
    },
    {
        "question_text": "Write a SQL query to find the second highest salary from an Employee table.",
        "key_points": [
            "SELECT MAX(salary) FROM Employee WHERE salary < (SELECT MAX(salary) FROM Employee)",
            "Alternative: use LIMIT/OFFSET or DENSE_RANK() window function ordered by salary descending",
            "Handles ties correctly only if using DISTINCT or DENSE_RANK, since plain MAX/nested-max approach naturally skips duplicate top values",
        ],
    },
    {
        "question_text": "What are joins in SQL? Explain INNER JOIN vs LEFT JOIN.",
        "key_points": [
            "A join combines rows from two or more tables based on a related column",
            "INNER JOIN returns only rows with matching values in both tables",
            "LEFT JOIN returns all rows from the left table plus matched rows from the right (NULL where there's no match)",
        ],
    },
    {
        "question_text": "Explain the difference between multitasking, multithreading, and multiprocessing.",
        "key_points": [
            "Multitasking: the OS runs multiple processes seemingly at once by time-slicing the CPU",
            "Multithreading: a single process runs multiple threads that share the same memory space",
            "Multiprocessing: multiple CPUs/cores execute processes truly in parallel",
        ],
    },
    {
        "question_text": "What is a virtual function in C++, and why is it needed?",
        "key_points": [
            "A member function declared in a base class and overridden in a derived class, resolved at runtime via the vtable",
            "Enables runtime polymorphism — calling through a base class pointer invokes the derived class's override",
            "Without it, the base class version would always be called regardless of the actual object type (static binding)",
        ],
    },
    {
        "question_text": "What is the difference between == and .equals() in Java (or value vs reference equality generally)?",
        "key_points": [
            "== compares reference/memory address for objects (whether two variables point to the same object)",
            ".equals() compares logical/content equality, and can be overridden to define what 'equal' means for a class",
            "For primitives, == compares actual values directly",
        ],
    },
    {
        "question_text": "Tell me about yourself and why should we hire you for this role?",
        "key_points": [
            "A concise walkthrough of education, relevant projects/skills, and what draws you to this specific role/company",
            "Connect your strengths directly to the job requirements rather than reciting a generic resume summary",
            "End with a clear, confident statement of the value you'd bring in the first few months",
        ],
    },
    {
        "question_text": "Describe a challenging project you worked on and how you handled a conflict within your team.",
        "key_points": [
            "Use a structured answer (situation, task, action, result) rather than a vague summary",
            "Focus on your specific contribution and decision-making, not just what the team did",
            "For the conflict part, emphasize communication and compromise over assigning blame",
        ],
    },
]


async def seed_tech_mahindra() -> None:
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
    asyncio.run(seed_tech_mahindra())
