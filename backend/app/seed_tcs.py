import asyncio

from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.company import Company, CompanyAptitudeQuestion, CompanyTechnicalQuestion

COMPANY_NAME = "TCS"
COMPANY_DESCRIPTION = (
    "TCS NQT / Ninja hiring pattern: a numerical ability, verbal ability, and reasoning ability "
    "test, followed by a technical interview covering OOPs, DBMS, OS, and a coding round."
)

APTITUDE_QUESTIONS = [
    {
        "question_text": "A sum of money doubles itself in 8 years at simple interest. In how many years will it triple?",
        "options": ["12 years", "16 years", "20 years", "24 years"],
        "correct_index": 1,
        "explanation": "Doubling in 8 years means SI over 8 years = principal, so rate gives 100% growth in 8 years. To triple (200% growth), it takes 16 years.",
    },
    {
        "question_text": "Two pipes A and B can fill a tank in 20 and 30 minutes respectively. If both are opened together, how long will it take to fill the tank?",
        "options": ["10 min", "12 min", "15 min", "18 min"],
        "correct_index": 1,
        "explanation": "Combined rate = 1/20 + 1/30 = 5/60 = 1/12. Time = 12 minutes.",
    },
    {
        "question_text": "What is the compound interest on Rs. 10,000 at 10% per annum for 2 years?",
        "options": ["Rs. 2000", "Rs. 2100", "Rs. 2200", "Rs. 2300"],
        "correct_index": 1,
        "explanation": "CI = 10000 × (1.1)^2 − 10000 = 12100 − 10000 = Rs. 2100.",
    },
    {
        "question_text": "Find the missing number in the series: 4, 9, 19, 39, 79, ?",
        "options": ["149", "154", "159", "169"],
        "correct_index": 2,
        "explanation": "Each term is roughly double the previous plus 1: 4×2+1=9, 9×2+1=19, ..., 79×2+1=159.",
    },
    {
        "question_text": "If the word 'FRIEND' is coded as 'HTKGPF', what is the coding logic?",
        "options": ["Each letter shifted forward by 1", "Each letter shifted forward by 2", "Each letter shifted backward by 2", "Reverse the word"],
        "correct_index": 1,
        "explanation": "F→H, R→T, I→K, E→G, N→P, D→F — each letter is shifted forward by 2 positions in the alphabet.",
    },
    {
        "question_text": "In a certain code, 'GO' is written as '715' and 'SO' as '1915'. How is 'SIT' written?",
        "options": ["191920", "192019", "201919", "192090"],
        "correct_index": 0,
        "explanation": "Each letter maps to its alphabet position: S=19, I=9, T=20, concatenated as 191920.",
    },
    {
        "question_text": "A, B, and C invested Rs. 10,000, Rs. 15,000, and Rs. 20,000 respectively in a business. If the total profit is Rs. 9,000, what is C's share?",
        "options": ["Rs. 2000", "Rs. 3000", "Rs. 4000", "Rs. 4500"],
        "correct_index": 2,
        "explanation": "Ratio of investment = 10:15:20 = 2:3:4. Total parts = 9. C's share = (4/9) × 9000 = Rs. 4000.",
    },
    {
        "question_text": "Read the passage logic: All TCS employees are professionals. Some professionals are engineers. Conclusion: Some TCS employees are engineers. Is this conclusion valid?",
        "options": ["Valid", "Invalid", "Cannot be determined without more data", "Only valid if all professionals are engineers"],
        "correct_index": 1,
        "explanation": "The premises only establish an overlap between professionals and engineers generally, not specifically involving TCS employees, so the conclusion doesn't necessarily follow.",
    },
    {
        "question_text": "A boat travels 30 km downstream in 2 hours and returns upstream in 3 hours. What is the speed of the boat in still water?",
        "options": ["10 km/hr", "11 km/hr", "12.5 km/hr", "15 km/hr"],
        "correct_index": 2,
        "explanation": "Downstream speed = 15 km/hr, upstream speed = 10 km/hr. Boat speed = (15+10)/2 = 12.5 km/hr.",
    },
    {
        "question_text": "Choose the option that best completes the sentence: \"Despite the heavy rain, the match ___ as scheduled.\"",
        "options": ["was continue", "continued", "continuing", "had continue"],
        "correct_index": 1,
        "explanation": "\"Continued\" is the correct simple past tense form fitting the sentence structure.",
    },
    {
        "question_text": "A man buys a watch for Rs. 1200 and sells it at a loss of 15%. What is the selling price?",
        "options": ["Rs. 1000", "Rs. 1020", "Rs. 1050", "Rs. 1080"],
        "correct_index": 1,
        "explanation": "SP = CP × (1 − 15/100) = 1200 × 0.85 = Rs. 1020.",
    },
    {
        "question_text": "What is the least number that must be added to 1056 to make it exactly divisible by 23?",
        "options": ["2", "3", "4", "5"],
        "correct_index": 0,
        "explanation": "1056 ÷ 23 = 45 remainder 21. To reach the next multiple (46×23=1058), we need 1058−1056 = 2.",
    },
    {
        "question_text": "The sum of ages of a father and son is 60 years. Six years ago, the father's age was 5 times the son's age. What is the son's current age?",
        "options": ["12", "14", "16", "18"],
        "correct_index": 1,
        "explanation": "Let son = x, father = 60−x. Six years ago: 60−x−6 = 5(x−6) → 54−x = 5x−30 → 84 = 6x → x = 14.",
    },
    {
        "question_text": "Find the odd one out: 121, 144, 169, 200, 225",
        "options": ["121", "144", "200", "225"],
        "correct_index": 2,
        "explanation": "121=11², 144=12², 169=13², 225=15² are all perfect squares; 200 is not.",
    },
    {
        "question_text": "A man walks 10 km north, then turns right and walks 6 km, then turns right again and walks 10 km. How far is he from the starting point?",
        "options": ["4 km", "6 km", "10 km", "16 km"],
        "correct_index": 1,
        "explanation": "The two 10 km legs (north, then south after two right turns) cancel out, leaving only the 6 km eastward displacement.",
    },
    {
        "question_text": "If 20 workers can build a wall in 15 days, how many days will 25 workers take to build the same wall?",
        "options": ["10 days", "11 days", "12 days", "13 days"],
        "correct_index": 2,
        "explanation": "Work is constant: 20×15 = 25×d → d = 300/25 = 12 days.",
    },
    {
        "question_text": "In a mixture of 60 litres, the ratio of milk to water is 2:1. How much water must be added to make the ratio 1:2?",
        "options": ["50 litres", "60 litres", "70 litres", "80 litres"],
        "correct_index": 1,
        "explanation": "Milk = 40L, water = 20L. For ratio 1:2, water needed = 2×40=80L, so additional water = 80−20 = 60L.",
    },
    {
        "question_text": "Find the value of x: 3x + 7 = 2(x + 11)",
        "options": ["10", "12", "15", "18"],
        "correct_index": 2,
        "explanation": "3x + 7 = 2x + 22 → x = 15.",
    },
    {
        "question_text": "Statement: No cats are dogs. All dogs are animals. Conclusion: Some animals are not cats. Does this conclusion follow?",
        "options": ["Yes, it follows", "No, it doesn't follow", "Only if all animals are dogs", "Cannot be determined"],
        "correct_index": 0,
        "explanation": "Since all dogs are animals and no dogs are cats, the dogs form a set of animals that are definitely not cats — so 'some animals are not cats' follows.",
    },
    {
        "question_text": "A alone can do a piece of work in 10 days, B alone in 15 days. They work together for 4 days, then A leaves. In how many more days will B finish the remaining work?",
        "options": ["4 days", "5 days", "6 days", "7 days"],
        "correct_index": 1,
        "explanation": "Combined rate = 1/10 + 1/15 = 1/6 per day. In 4 days they complete 4/6 = 2/3 of the work, leaving 1/3. At B's rate of 1/15 per day, the remaining 1/3 takes (1/3) ÷ (1/15) = 5 days.",
    },
    {
        "question_text": "Choose the correct antonym for 'Meticulous'.",
        "options": ["Careful", "Careless", "Precise", "Thorough"],
        "correct_index": 1,
        "explanation": "'Meticulous' means very careful and precise; its antonym is 'careless'.",
    },
    {
        "question_text": "P, Q, R, S are standing in a line. Q is to the right of P, R is to the left of P, and S is between Q and P. What is the order from left to right?",
        "options": ["R, P, S, Q", "R, S, P, Q", "Q, S, P, R", "P, R, S, Q"],
        "correct_index": 0,
        "explanation": "R is left of P, so R comes before P. S is between P and Q, and Q is right of P, giving the order R, P, S, Q.",
    },
    {
        "question_text": "What is the probability of getting a sum of 9 when two dice are thrown together?",
        "options": ["1/12", "1/6", "4/36", "5/36"],
        "correct_index": 2,
        "explanation": "Pairs summing to 9: (3,6),(4,5),(5,4),(6,3) = 4 outcomes out of 36 total = 4/36 (equivalently 1/9).",
    },
    {
        "question_text": "A shopkeeper marks an item 40% above cost price and gives a 10% discount. What is his profit percentage?",
        "options": ["24%", "26%", "28%", "30%"],
        "correct_index": 1,
        "explanation": "Let CP=100. Marked price=140. After 10% discount, SP=140×0.9=126. Profit% = 26%.",
    },
    {
        "question_text": "Find the missing letter group: AZ, BY, CX, DW, ?",
        "options": ["EV", "EU", "FV", "FU"],
        "correct_index": 0,
        "explanation": "First letters go A,B,C,D (forward); second letters go Z,Y,X,W (backward). Next pair is E, V.",
    },
]

TECHNICAL_QUESTIONS = [
    {
        "question_text": "What is the difference between a constructor and a method in OOPs?",
        "key_points": [
            "A constructor initializes a new object and shares the class's name; it has no return type",
            "A method defines behavior/logic and is called explicitly, any number of times, after object creation",
            "A constructor runs automatically exactly once when an object is created, unlike regular methods",
        ],
    },
    {
        "question_text": "What is the difference between DELETE, TRUNCATE, and DROP in SQL?",
        "key_points": [
            "DELETE removes specific rows (with optional WHERE), is logged, and can be rolled back",
            "TRUNCATE removes all rows at once, resets identity counters, and is minimally logged",
            "DROP removes the entire table structure along with its data from the database",
        ],
    },
    {
        "question_text": "Explain the ACID properties in database transactions.",
        "key_points": [
            "Atomicity — a transaction is all-or-nothing; partial execution is rolled back",
            "Consistency — a transaction brings the database from one valid state to another",
            "Isolation — concurrent transactions don't interfere with each other's intermediate state",
            "Durability — once committed, changes persist even after a system failure",
        ],
    },
    {
        "question_text": "What is the difference between a stack and a queue?",
        "key_points": [
            "Stack is LIFO (last in, first out) — insertion and removal happen at the same end (top)",
            "Queue is FIFO (first in, first out) — insertion at the rear, removal from the front",
            "Common uses: stack for recursion/undo operations, queue for scheduling/buffering",
        ],
    },
    {
        "question_text": "What is paging in operating systems, and why is it used?",
        "key_points": [
            "Paging divides memory into fixed-size blocks (pages) and process address space into matching frames",
            "Avoids external fragmentation by allowing a process's pages to be scattered non-contiguously in physical memory",
            "A page table maps virtual pages to physical frames for each process",
        ],
    },
    {
        "question_text": "What is the time complexity of binary search, and what precondition does it require?",
        "key_points": [
            "O(log n) time complexity, since the search space halves each step",
            "Requires the input array/list to be sorted beforehand",
            "Works by comparing the target to the middle element and discarding the half that can't contain it",
        ],
    },
    {
        "question_text": "What is method overloading, and can you overload based on return type alone?",
        "key_points": [
            "Method overloading means multiple methods with the same name but different parameter lists (number/type)",
            "No — overloading based on return type alone is not allowed since the compiler resolves calls based on arguments, not the assigned return value",
            "Resolved at compile time (static/early binding)",
        ],
    },
    {
        "question_text": "What is a race condition, and how can it be prevented?",
        "key_points": [
            "A race condition occurs when multiple threads/processes access shared data concurrently and the outcome depends on timing",
            "Prevented using synchronization mechanisms like locks, mutexes, or semaphores to enforce mutual exclusion",
            "Critical sections should be as short as possible to minimize contention",
        ],
    },
    {
        "question_text": "What is the difference between IPv4 and IPv6?",
        "key_points": [
            "IPv4 uses 32-bit addresses (~4.3 billion addresses); IPv6 uses 128-bit addresses, a vastly larger space",
            "IPv6 has built-in support for auto-configuration and improved security (IPsec) compared to IPv4",
            "IPv4 addresses are written in dotted decimal (e.g. 192.168.1.1); IPv6 uses colon-separated hexadecimal groups",
        ],
    },
    {
        "question_text": "Why should we hire you, and what are your strengths and weaknesses?",
        "key_points": [
            "Connect concrete strengths (technical skills, projects, teamwork) directly to what the role needs",
            "Pick a genuine weakness and pair it with a specific step you're taking to improve it — avoid clichés like 'I'm a perfectionist'",
            "Keep the answer structured and confident rather than a rambling list",
        ],
    },
    {
        "question_text": "What is encapsulation, and how is it implemented in a language like Java or C++?",
        "key_points": [
            "Encapsulation bundles data and the methods that operate on it into a single unit (a class)",
            "Implemented by marking fields private and exposing controlled access through public getters/setters",
            "Protects internal state from unintended external modification and hides implementation details",
        ],
    },
    {
        "question_text": "What is the difference between a clustered and a non-clustered index in a database?",
        "key_points": [
            "A clustered index determines the physical order of rows in the table — only one per table",
            "A non-clustered index is a separate structure with pointers back to the actual rows — a table can have several",
            "Clustered index lookups are generally faster since data is stored in that order; non-clustered adds an extra lookup step",
        ],
    },
    {
        "question_text": "What is context switching in operating systems?",
        "key_points": [
            "The process of saving the state of a currently running process/thread and loading the state of another",
            "Enables multitasking on a single CPU by rapidly switching between processes",
            "Has overhead — time spent switching is not spent doing useful work, so excessive switching hurts performance",
        ],
    },
    {
        "question_text": "What are the different types of OS scheduling algorithms? Name a few.",
        "key_points": [
            "First-Come-First-Served (FCFS) — simple but can cause long wait times (convoy effect)",
            "Shortest Job First (SJF) — minimizes average waiting time but needs burst time estimates",
            "Round Robin — each process gets a fixed time slice, good for time-sharing systems",
            "Priority Scheduling — runs higher-priority processes first, risking starvation of low-priority ones",
        ],
    },
    {
        "question_text": "What is the difference between a compiler and an interpreter?",
        "key_points": [
            "A compiler translates the entire source code into machine code before execution, producing a standalone executable",
            "An interpreter translates and executes code line by line at runtime, without a separate compiled output",
            "Compiled programs generally run faster; interpreted programs are easier to debug interactively",
        ],
    },
    {
        "question_text": "What is a hash table, and what is its average time complexity for lookup?",
        "key_points": [
            "A hash table stores key-value pairs using a hash function to map keys to array indices (buckets)",
            "Average-case lookup, insertion, and deletion are all O(1)",
            "Worst case degrades to O(n) if many keys collide into the same bucket",
        ],
    },
    {
        "question_text": "What is the difference between an SQL WHERE clause and a HAVING clause?",
        "key_points": [
            "WHERE filters individual rows before any grouping/aggregation happens",
            "HAVING filters groups after a GROUP BY and aggregate functions have been applied",
            "You can't use aggregate functions like COUNT() or SUM() directly in WHERE, but you can in HAVING",
        ],
    },
    {
        "question_text": "What is thread starvation, and how does priority scheduling cause it?",
        "key_points": [
            "Starvation happens when a low-priority thread/process never gets CPU time because higher-priority ones keep arriving",
            "Pure priority scheduling is prone to this if high-priority work is continuous",
            "Aging — gradually increasing the priority of waiting processes over time — is a common fix",
        ],
    },
    {
        "question_text": "What is the difference between a while loop and a do-while loop?",
        "key_points": [
            "A while loop checks its condition before executing the loop body, so it may run zero times",
            "A do-while loop executes the body first and checks the condition afterward, so it always runs at least once",
            "Use do-while when you need the loop body to execute at least once regardless of the condition (e.g. menu prompts)",
        ],
    },
    {
        "question_text": "What is the difference between synchronous and asynchronous execution?",
        "key_points": [
            "Synchronous execution runs tasks one after another, each blocking until the previous one completes",
            "Asynchronous execution lets a task start and continue other work while waiting for it to complete (e.g. via callbacks/promises)",
            "Asynchronous patterns are common for I/O-bound work (network calls, file access) to avoid blocking the whole program",
        ],
    },
    {
        "question_text": "What is garbage collection, and what problem does it solve?",
        "key_points": [
            "An automatic memory management process that reclaims memory occupied by objects no longer reachable/referenced",
            "Solves the problem of memory leaks and dangling pointers from manual memory management",
            "Comes with a performance trade-off — GC pauses can introduce latency in the running program",
        ],
    },
    {
        "question_text": "What is a firewall, and what basic function does it serve in network security?",
        "key_points": [
            "A firewall monitors and controls incoming/outgoing network traffic based on defined security rules",
            "Acts as a barrier between a trusted internal network and untrusted external networks (like the internet)",
            "Can operate at different levels — packet filtering, stateful inspection, or application-level (proxy) filtering",
        ],
    },
    {
        "question_text": "What is the difference between vertical scaling and horizontal scaling?",
        "key_points": [
            "Vertical scaling adds more resources (CPU/RAM) to an existing single machine",
            "Horizontal scaling adds more machines/instances and distributes load across them",
            "Horizontal scaling generally offers better fault tolerance but adds distributed-systems complexity (load balancing, data consistency)",
        ],
    },
    {
        "question_text": "Describe a time you failed at something and what you learned from it.",
        "key_points": [
            "Pick a genuine, specific failure rather than a disguised humblebrag",
            "Focus most of the answer on what you learned and changed afterward, not on the failure itself",
            "Show accountability — own your part in it rather than blaming external factors",
        ],
    },
    {
        "question_text": "What is the difference between a checked and an unchecked exception in Java?",
        "key_points": [
            "Checked exceptions are verified at compile time — the method must declare or handle them (e.g. IOException)",
            "Unchecked exceptions (RuntimeException and its subclasses) aren't enforced by the compiler and can occur anywhere",
            "Checked exceptions typically represent recoverable conditions; unchecked ones often represent programming bugs",
        ],
    },
]


async def seed_tcs() -> None:
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
    asyncio.run(seed_tcs())
