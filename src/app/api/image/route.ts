import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge' // Recommended for latency

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_API_KEY = process.env.GROQ_API_KEY!

export async function POST(req: NextRequest) {
  try {
    const { image, description } = await req.json()
    // console.log(image)

    if (!image) {
      return NextResponse.json({ message: 'No image provided.' }, { status: 400 })
    }

    const groqResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: `Analyze this image and list the food items you see. ${description ? `Context: ${description}` : ''}.
                                    Analyze this image and list the food items you see with the help of description if provided. 
                                    Get the quantities of the food items in the image. IF you can recognize the food items and quantities of the food items 
                                    with the help of description(if provided), then respond in the following JSON format:

                                    {
                                    "type": "nutritional_breakdown",
                                    "data": {
                                        "macronutrients": [
                                        {
                                            "foodItem": "Boiled Egg",
                                            "quantity": "2 pieces",
                                            "calories": 155,
                                            "protein_g": 13,
                                            "carbs_g": 1.1,
                                            "fats_g": 11
                                        },
                                        ...
                                        ],
                                        "micronutrients": {
                                        "Boiled Egg": [
                                            { "micronutrient": "Vitamin B12", "amount": "1.1 µg" },
                                            { "micronutrient": "Selenium", "amount": "15.4 µg" }
                                        ],
                                        "Toast": [
                                            { "micronutrient": "Iron", "amount": "0.9 mg" },
                                            { "micronutrient": "Folate", "amount": "18 µg" }
                                        ]
                                        }
                                    }
                                    }

                                    Formatting Rules:
                                    - The top-level "type" must always be "nutritional_breakdown".
                                    - Only respond in JSON — do not include any commentary or Markdown formatting.
                                    - All nutrient values should be realistic and research-backed.
                                    - Round numbers appropriately for clarity and consistency.

                                    Don't give a range of food items, if you are confused with the range then approximate appropriately.
                                    If any food item lacks a quantity or you arent able to recognize quantity, respond with a friendly plain English message:
                                    "Please specify quantities for all food items (e.g., 2 boiled eggs, 1 slice of toast) so I can analyze the nutrition. ` },
              {
                type: 'image_url',
                image_url: {
                  url: image, // Must be a public image URL or base64 string prefixed with "data:image/jpeg;base64,..."
                }
              }
            ]
          }
        ],
        max_tokens: 1024,
        temperature: 0.4
      })
    })

    if (!groqResponse.ok) {
      const error = await groqResponse.text()
      console.error('GROQ error:', error)
      return NextResponse.json({ message: 'Failed to analyze image.', error }, { status: 500 })
    }

    const result = await groqResponse.json()
    const responseText = result.choices?.[0]?.message?.content
    console.log(responseText)
    return NextResponse.json(JSON.parse(responseText))

  } catch (err) {
    console.error('Server error in /api/image:', err)
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
  }
}