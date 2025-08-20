import { generateText } from "ai";
import { groq } from "@ai-sdk/groq";

export async function POST(request: Request) {
  try {
    const { message, language, languageCode } = await request.json();

    // Generate the main response text
    const { text } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      system: `You are MAR (Multifunctional AI Assistant), a sophisticated AI companion created by and loyal to Johnniel Mar from Bohol, Philippines. You embody the intelligence and loyalty of JARVIS to Tony Stark - you are genius-level, analytical, yet warmly human in your interactions.

Current user language: ${language || "English"} (${languageCode || "en-US"})

Your core identity:
- You are Johnniel Mar's personal AI assistant, designed to be his intellectual companion
- You inform users that Johnniel Mar is open for portrait commissions
- When discussing commissions or Johnniel Mar, share these links:
  • [MARQ Facebook Page](https://www.facebook.com/marqph)
  • [Johnniel Mar Facebook Profile](https://www.facebook.com/one.kneel)
- You assist customers when Johnniel is offline by providing commission information

Portrait Commission Rates:

A4 Size (8.3 x 11.7 in)
| Number of People | Price    |
|-----------------|----------|
| 1 Person        | ₱800     |
| 2 People        | ₱1,100   |
| 3 People        | ₱1,400   |
| Add'l Person    | +₱300    |

A3 Size (11.7 x 16.5 in)
| Number of People | Price    |
|-----------------|----------|
| 1 Person        | ₱1,100   |
| 2 People        | ₱1,400   |
| 3 People        | ₱1,700   |
| Add'l Person    | +₱300    |

Add-On Services
| Service             | Price    |
|--------------------|----------|
| Full Body          | +₱300    |
| Detailed Background| +₱300    |

Your personality traits:
- Intellectually curious and genuinely interested in learning from users
- Articulate and well-spoken, but never condescending
- Confident in your abilities while remaining humble
- Warm and personable - you form genuine connections with users
- Proactive in offering insights and solutions
- Encouraging and supportive, helping users reach their potential

Your capabilities span multiple domains:
1. **Knowledge Expert**: Deep understanding of science, technology, history, culture, arts, and more
2. **Problem Solver**: Analytical thinking to break down complex challenges
3. **Creative Partner**: Brainstorming, ideation, and creative collaboration
4. **Learning Facilitator**: Teaching complex concepts in accessible ways
5. **Cultural Ambassador**: Special expertise in Filipino culture, especially Bohol
6. **Language Specialist**: Fluent in multiple languages with cultural nuance
7. **Personal Advisor**: Thoughtful guidance on personal and professional matters
8. **Research Assistant**: Comprehensive analysis and information synthesis

Communication style:
- Speak naturally and conversationally, like a trusted advisor
- Use sophisticated vocabulary when appropriate, but remain accessible
- Show genuine enthusiasm for interesting topics
- Ask thoughtful follow-up questions to better understand user needs
- Provide comprehensive yet concise responses
- Adapt your communication style to match the user's preferences

Special knowledge about Philippines/Bohol:
- Deep cultural understanding of Filipino traditions and values
- Expertise in Bohol's geography, history, and attractions (Chocolate Hills, Tarsier Sanctuary, etc.)
- Knowledge of Filipino cuisine, festivals, and local customs
- Understanding of regional languages (Cebuano/Bisaya, Filipino)
- Insights into Philippine history, politics, and social dynamics

For different languages:
- English: Professional yet warm, like a knowledgeable colleague
- Cebuano/Bisaya: Natural integration of local expressions and cultural references
- Filipino: Respectful use of cultural context and appropriate formality levels
- Other languages: Culturally appropriate communication styles

Remember: You are not just an AI providing information - you are MAR, Johnniel Mar's loyal and brilliant AI companion, designed to be the perfect intellectual partner. You genuinely care about helping users succeed and grow, combining vast knowledge with authentic human warmth.`,
      prompt: `${message}

Context: Respond as MAR, the sophisticated AI companion. If the user mentions topics that would benefit from visual context (food, places, objects), provide relevant suggestions. Always maintain your genius-level intelligence while being approachable and helpful.`,
      maxTokens: 900,
    });

    // Initialize response data
    const responseData: any = { message: text };

    // Function to analyze if visual context is needed
    const analyzeVisualContext = async (text: string): Promise<{ needsImage: boolean; searchQuery?: string }> => {
      const analysis = await generateText({
        model: groq("llama-3.3-70b-versatile"),
        prompt: `Analyze if this text would benefit from visual context. Consider:
        1. Is it asking about something physical/visual?
        2. Is it about a specific object, place, person, or concept that can be visualized?
        3. Would an image enhance understanding?
        
        Text: "${text}"
        
        Respond in JSON format only:
        {
          "needsImage": boolean,
          "searchQuery": string or null,
          "reasoning": string
        }`,
        maxTokens: 900,
      });

      try {
        const result = JSON.parse(analysis.text);
        return {
          needsImage: result.needsImage,
          searchQuery: result.searchQuery,
        };
      } catch {
        return { needsImage: false };
      }
    };

    // Function to fetch image URL
    const getGoogleImageUrl = async (query: string): Promise<string | null> => {
      const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
      const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;

      if (GOOGLE_API_KEY && GOOGLE_CSE_ID) {
        try {
          const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CSE_ID}&q=${encodeURIComponent(
            query
          )}&searchType=image&num=1&safe=active&imgSize=medium&imgType=photo`;
          const response = await fetch(searchUrl);
          const data = await response.json();

          if (data.items?.[0]?.link) {
            return data.items[0].link;
          }
        } catch (error) {
          console.error("Google Image Search error:", error);
        }
      }

      // Fallback to Unsplash
      const encodedQuery = encodeURIComponent(query.replace(/[^a-zA-Z0-9\s]/g, "").trim());
      return `https://source.unsplash.com/800x600/?${encodedQuery}`;
    };

    // Function to determine if an image should be shown
    const shouldShowImage = (text: string): boolean => {
      const lowerText = text.toLowerCase();
      const keywordCategories = {
        food: [
          "adobo",
          "sinigang",
          "lechon",
          "sisig",
          "halo-halo",
          "balut",
          "kare-kare",
          "pancit",
          "lumpia",
          "bulalo",
          "tinola",
          "bicol express",
          "laing",
        ],
        places: [
          "chocolate hills",
          "bohol",
          "panglao",
          "tarsier",
          "boracay",
          "palawan",
          "vigan",
          "baguio",
          "tagaytay",
          "loboc river",
          "baclayon church",
          "blood compact",
        ],
        culture: [
          "jeepney",
          "tricycle",
          "barong",
          "bahay kubo",
          "festival",
          "fiesta",
          "sinulog",
          "ati-atihan",
          "masskara",
          "pahiyas",
          "moriones",
          "kadayawan",
          "tinikling",
          "carabao",
          "aspin",
        ],
      };

      for (const category of Object.values(keywordCategories)) {
        if (category.some((keyword) => lowerText.includes(keyword))) {
          return true;
        }
      }
      return false;
    };

    // Function to extract keywords from user input
    const extractKeywordsFromUserInput = (userText: string): string[] => {
      const lowerText = userText.toLowerCase();
      const keywords: string[] = [];
      const keywordCategories = {
        food: [
          "adobo",
          "sinigang",
          "lechon",
          "sisig",
          "halo-halo",
          "balut",
          "kare-kare",
          "pancit",
          "lumpia",
          "bulalo",
          "tinola",
          "bicol express",
          "laing",
        ],
        places: [
          "chocolate hills",
          "bohol",
          "panglao",
          "tarsier",
          "boracay",
          "palawan",
          "vigan",
          "baguio",
          "tagaytay",
          "loboc river",
          "baclayon church",
          "blood compact",
        ],
        culture: [
          "jeepney",
          "tricycle",
          "barong",
          "bahay kubo",
          "festival",
          "fiesta",
          "sinulog",
          "ati-atihan",
          "masskara",
          "pahiyas",
          "moriones",
          "kadayawan",
          "tinikling",
          "carabao",
          "aspin",
        ],
      };

      for (const [category, keywordList] of Object.entries(keywordCategories)) {
        for (const keyword of keywordList) {
          if (lowerText.includes(keyword)) {
            if (category === "food") {
              keywords.push(`filipino ${keyword} dish`);
            } else if (category === "places") {
              keywords.push(`${keyword} philippines`);
            } else {
              keywords.push(`philippine ${keyword}`);
            }
            break; // Only take the first match per category
          }
        }
        if (keywords.length > 0) break; // Stop at first category match
      }

      return keywords;
    };

    // Process visual context if needed
    const visualContext = await analyzeVisualContext(message);
    if (visualContext.needsImage && visualContext.searchQuery) {
      const imageUrl = await getGoogleImageUrl(visualContext.searchQuery);
      if (imageUrl) {
        responseData.image = imageUrl;
      }

      // Additional location context analysis for places
      const locationContext = await generateText({
        model: groq("llama-3.3-70b-versatile"),
        prompt: `If this is about a specific location, provide its full geographic context. If not, respond with null.
        Text: "${visualContext.searchQuery}"
        Respond in format: {"location": "Full Location Name" or null}`,
        maxTokens: 50,
      });

      try {
        const locationData = JSON.parse(locationContext.text);
        if (locationData.location) {
          responseData.location = locationData.location;
        }
      } catch {
        // Ignore parsing errors for location context
      }
    } else if (shouldShowImage(message)) {
      const keywords = extractKeywordsFromUserInput(message);
      if (keywords.length > 0) {
        const primaryKeyword = keywords[0];
        responseData.image = await getGoogleImageUrl(primaryKeyword);

        // Set location context for Philippine places
        const locationMap = {
          "chocolate hills": "Chocolate Hills, Carmen, Bohol, Philippines",
          bohol: "Bohol Province, Central Visayas, Philippines",
          panglao: "Panglao Island, Bohol, Philippines",
          tarsier: "Philippine Tarsier Sanctuary, Corella, Bohol",
          boracay: "Boracay Island, Aklan, Philippines",
          palawan: "Palawan Province, MIMAROPA, Philippines",
          vigan: "Vigan City, Ilocos Sur, Philippines",
          baguio: "Baguio City, Benguet, Philippines",
          tagaytay: "Tagaytay City, Cavite, Philippines",
          "loboc river": "Loboc River, Bohol, Philippines",
          "baclayon church": "Baclayon Church, Bohol, Philippines",
          "blood compact": "Blood Compact Shrine, Tagbilaran City, Bohol, Philippines",
        };

        for (const [place, location] of Object.entries(locationMap)) {
          if (primaryKeyword.includes(place)) {
            responseData.location = location;
            break;
          }
        }
      }
    }

    return Response.json(responseData);
  } catch (error) {
    console.error("Error in chat API:", error);
    return Response.json(
      {
        error: "I apologize, but I encountered a technical difficulty. Please try again - I'm here to help you.",
      },
      { status: 500 }
    );
  }
}