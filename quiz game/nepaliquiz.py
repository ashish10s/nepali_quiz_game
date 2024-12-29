# Quiz Questions
questions = [
    {
        "question": "What is the capital of Nepal?",
        "options": ["1. Kathmandu", "2. Pokhara", "3. Biratnagar", "4. Lalitpur"],
        "answer": 1
    },
    {
        "question": "How many provinces are there in Nepal?",
        "options": ["1. 5", "2. 6", "3. 7", "4. 8"],
        "answer": 3
    },
    {
        "question": "What is the national flower of Nepal?",
        "options": ["1. Sunflower", "2. Rhododendron (Lali Gurans)", "3. Lotus", "4. Jasmine"],
        "answer": 2
    },
    {
        "question": "What is the height of Mount Everest?",
        "options": ["1. 8,844.43 meters", "2. 8,848.86 meters", "3. 8,850 meters", "4. 8,852 meters"],
        "answer": 2
    },
    {
        "question": "What is the national animal of Nepal?",
        "options": ["1. Tiger", "2. Cow", "3. Elephant", "4. Yak"],
        "answer": 2
    },
    {
        "question": "When was the Constitution of Nepal promulgated?",
        "options": [
            "1. 15th August 2015",
            "2. 20th September 2015",
            "3. 25th December 2015",
            "4. 1st January 2016"
        ],
        "answer": 2
    },
    {
        "question": "Where is the capital of Gandaki Province?",
        "options": ["1. Kathmandu", "2. Pokhara", "3. Butwal", "4. Birgunj"],
        "answer": 2
    },
    {
        "question": "When was the first census conducted in Nepal?",
        "options": ["1. 1911 AD (1968 BS)", "2. 1945 AD (2002 BS)", "3. 1951 AD (2008 BS)", "4. 1971 AD (2028 BS)"],
        "answer": 1
    },
    {
        "question": "Where is Tribhuvan International Airport located?",
        "options": ["1. Pokhara", "2. Kathmandu", "3. Biratnagar", "4. Janakpur"],
        "answer": 2
    },
    {
        "question": "What is the title of Nepal's national anthem?",
        "options": [
            "1. Sayaun Thunga Phoolka",
            "2. Resham Firiri",
            "3. Paschim Kohi Purba Kohi",
            "4. Yo Man Ta Mero Nepali Ho"
        ],
        "answer": 1
    }
]

# Function to run the quiz
def run_quiz():
    score = 0
    print("Welcome to the Nepal Quiz!\n")
    
    for idx, q in enumerate(questions, start=1):
        print(f"Question {idx}: {q['question']}")
        for option in q['options']:
            print(option)
        
        # Take user's answer
        try:
            user_answer = int(input("Your answer (Enter the number): "))
            if user_answer == q['answer']:
                print("Correct!\n")
                score += 1
            else:
                print(f"Wrong! The correct answer was {q['answer']}. {q['options'][q['answer'] - 1]}\n")
        except ValueError:
            print("Invalid input! Please enter a number.\n")
    
    print(f"Quiz Complete! Your final score is {score}/{len(questions)}.")
    if score == len(questions):
        print("Excellent work!")
    elif score >= len(questions) // 2:
        print("Good effort!")
    else:
        print("Better luck next time!")

# Run the quiz
if __name__ == "__main__":
    run_quiz()
