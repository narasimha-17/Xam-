import asyncio

from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.puzzle import Puzzle

NEW_PUZZLES = [
    # Riddles
    {
        "question_text": "The more you take, the more you leave behind. What am I?",
        "options": ["Footsteps", "Time", "Memories", "Money"],
        "correct_index": 0,
        "explanation": "Each step you take leaves a footprint behind you.",
        "difficulty": "easy",
    },
    {
        "question_text": "What has keys but no locks, space but no room, and you can enter but not go inside?",
        "options": ["A piano", "A keyboard", "A map", "A house"],
        "correct_index": 1,
        "explanation": "A keyboard has keys, a space bar, and an Enter key.",
        "difficulty": "easy",
    },
    {
        "question_text": "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?",
        "options": ["A ghost", "An echo", "A shadow", "A whisper"],
        "correct_index": 1,
        "explanation": "An echo is just sound reflecting back — no body needed.",
        "difficulty": "medium",
    },
    {
        "question_text": "What can travel around the world while staying in a corner?",
        "options": ["A satellite", "A stamp", "A map", "A coin"],
        "correct_index": 1,
        "explanation": "A postage stamp sits in the corner of an envelope as it travels the globe.",
        "difficulty": "medium",
    },
    {
        "question_text": "The person who makes it, sells it. The person who buys it never uses it. The person who uses it never knows they're using it. What is it?",
        "options": ["A coffin", "A candle", "A key", "A medicine"],
        "correct_index": 0,
        "explanation": "A coffin is bought by relatives for someone who will never know they're inside it.",
        "difficulty": "hard",
    },
    {
        "question_text": "What gets wetter as it dries?",
        "options": ["A sponge", "A towel", "Rain", "Soap"],
        "correct_index": 1,
        "explanation": "A towel absorbs water (gets wetter) while it's used to dry something else.",
        "difficulty": "easy",
    },
    {
        "question_text": "I am not alive, but I grow. I don't have lungs, but I need air. I don't have a mouth, but water kills me. What am I?",
        "options": ["A plant", "Fire", "A crystal", "A shadow"],
        "correct_index": 1,
        "explanation": "Fire grows, needs oxygen (air) to burn, and is extinguished by water.",
        "difficulty": "medium",
    },
    {
        "question_text": "What has a neck but no head, arms but no hands?",
        "options": ["A bottle", "A shirt", "A guitar", "A river"],
        "correct_index": 2,
        "explanation": "A guitar has a neck and arm-like extensions (the body's curves) but no head or hands.",
        "difficulty": "medium",
    },
    {
        "question_text": "Forward I am heavy, but backward I am not. What am I?",
        "options": ["Ton", "Rock", "Weight", "Lead"],
        "correct_index": 0,
        "explanation": '"Ton" (heavy) spelled backward is "not".',
        "difficulty": "hard",
    },
    {
        "question_text": "What can you catch but not throw?",
        "options": ["A ball", "A cold", "A fish", "A wave"],
        "correct_index": 1,
        "explanation": 'You can "catch a cold" but you can\'t throw one.',
        "difficulty": "easy",
    },
    # Logic / lateral thinking
    {
        "question_text": "A man builds a rectangular house with four walls, each facing south. A bear walks by. What color is the bear?",
        "options": ["Black", "Brown", "White", "Cannot be determined"],
        "correct_index": 2,
        "explanation": "The only place all four walls can face south is the North Pole — so it's a polar bear.",
        "difficulty": "hard",
    },
    {
        "question_text": "Three people check into a hotel room that costs $30. They each pay $10. Later, the clerk realizes the room was only $25 and gives $5 to the bellboy to return. The bellboy keeps $2 and gives $1 back to each guest. Now each guest paid $9 (total $27), plus the bellboy's $2 = $29. Where did the missing dollar go?",
        "options": [
            "It's a false premise — nothing is missing",
            "The clerk kept it",
            "The hotel kept it",
            "Math error in the bill",
        ],
        "correct_index": 0,
        "explanation": "The $27 paid already includes the bellboy's $2 (25 + 2 = 27); adding it again is the trick — there's no missing dollar.",
        "difficulty": "hard",
    },
    {
        "question_text": "You're in a race and you overtake the person in 2nd place. What position are you in now?",
        "options": ["1st", "2nd", "3rd", "Cannot be determined"],
        "correct_index": 1,
        "explanation": "Overtaking the person in 2nd place means you take their spot — 2nd place.",
        "difficulty": "easy",
    },
    {
        "question_text": "A doctor gives you 3 pills and tells you to take one every 30 minutes. How long do the pills last?",
        "options": ["90 minutes", "60 minutes", "30 minutes", "120 minutes"],
        "correct_index": 1,
        "explanation": "Pill 1 at 0 min, pill 2 at 30 min, pill 3 at 60 min — total elapsed time is 60 minutes.",
        "difficulty": "medium",
    },
    {
        "question_text": "If you have 4 apples and you take away 3, how many do you have?",
        "options": ["1", "3", "4", "0"],
        "correct_index": 1,
        "explanation": "You took 3, so you now have the 3 apples you took — not the 1 left behind.",
        "difficulty": "easy",
    },
    {
        "question_text": "A man is pushing his car along a road when he comes to a hotel. He shouts, 'I'm bankrupt!' Why?",
        "options": [
            "He's playing Monopoly",
            "His car broke down near a hotel",
            "He lost his job",
            "He's dreaming",
        ],
        "correct_index": 0,
        "explanation": "He's playing Monopoly — landing on a hotel-owned property just bankrupted him.",
        "difficulty": "medium",
    },
    # Math / number puzzles
    {
        "question_text": "What is the next number in the sequence: 1, 1, 2, 3, 5, 8, 13, ?",
        "options": ["18", "20", "21", "24"],
        "correct_index": 2,
        "explanation": "This is the Fibonacci sequence — each number is the sum of the two before it (8 + 13 = 21).",
        "difficulty": "easy",
    },
    {
        "question_text": "What is the next number in the sequence: 3, 7, 15, 31, 63, ?",
        "options": ["95", "111", "127", "128"],
        "correct_index": 2,
        "explanation": "Each term is double the previous plus 1 (2n+1): 63 * 2 + 1 = 127.",
        "difficulty": "medium",
    },
    {
        "question_text": "A clock shows 3:15. What is the angle between the hour and minute hands?",
        "options": ["0 degrees", "7.5 degrees", "15 degrees", "30 degrees"],
        "correct_index": 1,
        "explanation": "At 3:15 the hour hand has moved a quarter of the way from 3 to 4 (7.5 degrees past the 3), while the minute hand points exactly at the 3 — a 7.5 degree gap.",
        "difficulty": "hard",
    },
    {
        "question_text": "If a train travels 60 miles in 1.5 hours, what is its average speed?",
        "options": ["30 mph", "40 mph", "45 mph", "90 mph"],
        "correct_index": 1,
        "explanation": "60 miles / 1.5 hours = 40 miles per hour.",
        "difficulty": "easy",
    },
    {
        "question_text": "You have two ropes, each takes exactly 60 minutes to burn, but not at a constant rate. How do you measure exactly 45 minutes?",
        "options": [
            "Burn one rope from both ends and the other from one end simultaneously",
            "Burn one rope for 45 minutes",
            "Cut a rope in half and burn it",
            "It's not possible without a clock",
        ],
        "correct_index": 0,
        "explanation": "Light rope A at both ends and rope B at one end. Rope A burns out in 30 minutes; at that moment, light the other end of rope B — it will then burn out in 15 more minutes, totaling 45.",
        "difficulty": "hard",
    },
    {
        "question_text": "What is the missing number: 8, 27, 64, 125, ?",
        "options": ["196", "216", "225", "243"],
        "correct_index": 1,
        "explanation": "These are perfect cubes: 2³, 3³, 4³, 5³, 6³ = 216.",
        "difficulty": "medium",
    },
    {
        "question_text": "A farmer has chickens and cows. Together they have 30 heads and 74 legs. How many chickens are there?",
        "options": ["17", "20", "23", "26"],
        "correct_index": 2,
        "explanation": "Let c = chickens, w = cows: c + w = 30 and 2c + 4w = 74. Solving gives w = 7 and c = 23 "
        "(check: 23 + 7 = 30, 2*23 + 4*7 = 46 + 28 = 74).",
        "difficulty": "hard",
    },
]


async def seed_puzzles() -> None:
    async with AsyncSessionLocal() as db:
        existing_texts = set((await db.scalars(select(Puzzle.question_text))).all())
        added = 0
        for p in NEW_PUZZLES:
            if p["question_text"] in existing_texts:
                continue
            db.add(Puzzle(**p))
            added += 1
        await db.commit()
        total = len((await db.scalars(select(Puzzle))).all())
        print(f"Added {added} new puzzles. Total puzzles in bank: {total}")


if __name__ == "__main__":
    asyncio.run(seed_puzzles())
