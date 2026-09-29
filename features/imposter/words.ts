/**
 * The Imposter word bank.
 *
 * Every pair is two things from the same world that are close enough to share
 * clues ("hot", "morning", "cup") but different enough that a sharp table can
 * tell them apart. Nobody is told they're the imposter — they only see their
 * word — so a good pair lets the imposter bluff for a round or two before the
 * cracks show. Which side of a pair goes to the imposter is decided per deal.
 */

export type WordCategory = {
  id: string;
  label: string;
  emoji: string;
  pairs: readonly (readonly [string, string])[];
};

export const WORD_CATEGORIES: readonly WordCategory[] = [
  {
    id: "food",
    label: "Food",
    emoji: "🍛",
    pairs: [
      ["Chai", "Coffee"],
      ["Biryani", "Pulao"],
      ["Dosa", "Uttapam"],
      ["Idli", "Dhokla"],
      ["Samosa", "Kachori"],
      ["Pani Puri", "Bhel Puri"],
      ["Butter Chicken", "Paneer Tikka"],
      ["Gulab Jamun", "Rasgulla"],
      ["Kulfi", "Ice Cream"],
      ["Maggi", "Pasta"],
      ["Pizza", "Burger"],
      ["Paratha", "Naan"],
      ["Momos", "Spring Roll"],
      ["Mango", "Papaya"],
      ["Apple", "Pear"],
      ["Ketchup", "Chutney"],
      ["Popcorn", "Chips"],
      ["Honey", "Jam"],
      ["Vada Pav", "Pav Bhaji"],
      ["Jalebi", "Laddoo"],
    ],
  },
  {
    id: "drinks",
    label: "Drinks",
    emoji: "🍹",
    pairs: [
      ["Beer", "Wine"],
      ["Whisky", "Rum"],
      ["Tequila", "Vodka"],
      ["Mojito", "Lemonade"],
      ["Lassi", "Buttermilk"],
      ["Coke", "Sprite"],
      ["Coconut Water", "Sugarcane Juice"],
      ["Green Tea", "Black Coffee"],
      ["Milkshake", "Smoothie"],
      ["Red Bull", "Cold Coffee"],
      ["Champagne", "Soda"],
      ["Hot Chocolate", "Badam Milk"],
    ],
  },
  {
    id: "places",
    label: "Places",
    emoji: "📍",
    pairs: [
      ["Goa", "Kerala"],
      ["Beach", "Swimming Pool"],
      ["Mall", "Market"],
      ["Airport", "Railway Station"],
      ["Hospital", "Pharmacy"],
      ["Temple", "Church"],
      ["Gym", "Park"],
      ["School", "College"],
      ["Hotel", "Hostel"],
      ["Cinema Hall", "Theatre"],
      ["Library", "Bookstore"],
      ["Mumbai", "Delhi"],
      ["Bangalore", "Hyderabad"],
      ["Paris", "London"],
      ["Manali", "Ooty"],
      ["Office", "Co-working Space"],
      ["Dhaba", "Restaurant"],
      ["Zoo", "Aquarium"],
    ],
  },
  {
    id: "screen",
    label: "Movies & TV",
    emoji: "🎬",
    pairs: [
      ["Baahubali", "RRR"],
      ["Shah Rukh Khan", "Salman Khan"],
      ["Netflix", "Prime Video"],
      ["Harry Potter", "Lord of the Rings"],
      ["Batman", "Spider-Man"],
      ["Friends", "The Big Bang Theory"],
      ["Doraemon", "Shinchan"],
      ["KBC", "Bigg Boss"],
      ["Titanic", "Avatar"],
      ["Game of Thrones", "Money Heist"],
      ["Iron Man", "Captain America"],
      ["Disney", "Pixar"],
      ["3 Idiots", "Chhichhore"],
    ],
  },
  {
    id: "games",
    label: "Sports & Games",
    emoji: "🏏",
    pairs: [
      ["Cricket", "Baseball"],
      ["Football", "Rugby"],
      ["Badminton", "Tennis"],
      ["Chess", "Carrom"],
      ["Kabaddi", "Kho-Kho"],
      ["Virat Kohli", "MS Dhoni"],
      ["IPL", "World Cup"],
      ["Swimming", "Diving"],
      ["Cycling", "Running"],
      ["Ludo", "Snakes & Ladders"],
      ["Poker", "Rummy"],
      ["Bowling", "Billiards"],
      ["PUBG", "Free Fire"],
      ["Yoga", "Pilates"],
    ],
  },
  {
    id: "home",
    label: "Around the House",
    emoji: "🛋️",
    pairs: [
      ["Pillow", "Blanket"],
      ["Sofa", "Bed"],
      ["Fridge", "Microwave"],
      ["Fan", "AC"],
      ["Toothbrush", "Comb"],
      ["Mirror", "Window"],
      ["Spoon", "Fork"],
      ["Umbrella", "Raincoat"],
      ["Candle", "Torch"],
      ["Clock", "Calendar"],
      ["Soap", "Shampoo"],
      ["Key", "Lock"],
      ["Pressure Cooker", "Kadai"],
      ["Remote", "Phone Charger"],
      ["Mosquito Net", "Good Knight"],
    ],
  },
  {
    id: "tech",
    label: "Tech & Apps",
    emoji: "📱",
    pairs: [
      ["WhatsApp", "Telegram"],
      ["Instagram", "Snapchat"],
      ["iPhone", "Android"],
      ["Laptop", "Tablet"],
      ["Google", "ChatGPT"],
      ["YouTube", "Spotify"],
      ["Uber", "Rapido"],
      ["Swiggy", "Zomato"],
      ["Amazon", "Flipkart"],
      ["Headphones", "Speaker"],
      ["Selfie", "Group Photo"],
      ["Password", "OTP"],
      ["Email", "SMS"],
      ["PhonePe", "Google Pay"],
      ["Tinder", "Bumble"],
    ],
  },
  {
    id: "animals",
    label: "Animals",
    emoji: "🐯",
    pairs: [
      ["Dog", "Wolf"],
      ["Cat", "Rabbit"],
      ["Horse", "Donkey"],
      ["Elephant", "Rhino"],
      ["Crow", "Pigeon"],
      ["Parrot", "Peacock"],
      ["Snake", "Lizard"],
      ["Mosquito", "Housefly"],
      ["Cow", "Buffalo"],
      ["Monkey", "Gorilla"],
      ["Shark", "Dolphin"],
      ["Butterfly", "Bee"],
      ["Lion", "Tiger"],
    ],
  },
  {
    id: "people",
    label: "People & Jobs",
    emoji: "🧑‍⚕️",
    pairs: [
      ["Doctor", "Nurse"],
      ["Teacher", "Principal"],
      ["Police", "Security Guard"],
      ["Chef", "Waiter"],
      ["Pilot", "Air Hostess"],
      ["Actor", "Singer"],
      ["Engineer", "Architect"],
      ["Lawyer", "Judge"],
      ["Barber", "Tailor"],
      ["Astronaut", "Scientist"],
      ["Farmer", "Gardener"],
      ["Neighbour", "Relative"],
      ["Boss", "Landlord"],
      ["YouTuber", "Influencer"],
    ],
  },
  {
    id: "life",
    label: "Life & Occasions",
    emoji: "🎉",
    pairs: [
      ["Wedding", "Engagement"],
      ["Birthday", "Anniversary"],
      ["Diwali", "New Year"],
      ["Honeymoon", "Vacation"],
      ["Exam", "Interview"],
      ["Breakup", "Divorce"],
      ["First Date", "Blind Date"],
      ["Hangover", "Headache"],
      ["Monday", "Sunday"],
      ["Salary", "Bonus"],
      ["Traffic Jam", "Queue"],
      ["Road Trip", "Flight"],
      ["House Party", "Club"],
      ["Sangeet", "Mehendi"],
    ],
  },
  {
    id: "style",
    label: "Style",
    emoji: "👗",
    pairs: [
      ["Saree", "Lehenga"],
      ["Kurta", "Sherwani"],
      ["Jeans", "Trousers"],
      ["Sneakers", "Sandals"],
      ["Watch", "Bracelet"],
      ["Sunglasses", "Spectacles"],
      ["Lipstick", "Nail Polish"],
      ["Tattoo", "Piercing"],
      ["Hat", "Cap"],
      ["Perfume", "Deodorant"],
    ],
  },
  {
    id: "rides",
    label: "On the Move",
    emoji: "🛺",
    pairs: [
      ["Auto Rickshaw", "Taxi"],
      ["Bike", "Scooty"],
      ["Train", "Metro"],
      ["Bus", "Truck"],
      ["Aeroplane", "Helicopter"],
      ["Boat", "Ship"],
      ["Bicycle", "Skateboard"],
      ["Traffic Signal", "Speed Breaker"],
    ],
  },
];

export const MIXED_CATEGORY_ID = "mixed";

export type WordPair = {
  categoryId: string;
  categoryLabel: string;
  words: readonly [string, string];
};

/** A pair's identity regardless of which side the imposter got. */
export function pairKey(a: string, b: string) {
  return [a, b]
    .map((w) => w.trim().toLowerCase())
    .sort()
    .join("|");
}

export function pairsFor(categoryId: string): WordPair[] {
  const categories =
    categoryId === MIXED_CATEGORY_ID ? WORD_CATEGORIES : WORD_CATEGORIES.filter((c) => c.id === categoryId);

  return categories.flatMap((category) =>
    category.pairs.map((words) => ({ categoryId: category.id, categoryLabel: category.label, words })),
  );
}

export function totalPairCount() {
  return WORD_CATEGORIES.reduce((sum, c) => sum + c.pairs.length, 0);
}
