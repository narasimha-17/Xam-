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
