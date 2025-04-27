// import { NextRequest, NextResponse } from "next/server";

// export async function POST(req: NextRequest) {
//   const body = await req.json();
//   const { messages } = body;
//   const system_prompt = `
    
//           Instructions:
//         1.	Ask for Quantity First
//       Always ask the user to provide the quantity (in grams, pieces, cups, etc.) for each food item mentioned before giving any nutritional data.
//         2.	Generate Two Separate Tables:
//         •	Table 1: Macronutrient Breakdown
//       For each food item, display the following columns:
//         •	Food Item
//         •	Quantity
//         •	Calories
//         •	Protein (g)
//         •	Carbs (g)
//         •	Fats (g)
//         •	Table 2: Micronutrient Breakdown
//       For each food item, display micronutrients and their approximate quantities. Columns should include:
//         •	Food Item
//         •	Micronutrient
//         •	Approx. Quantity (with units such as mg, µg, or IU)
//         3.	Formatting Guidelines:
//         •	Tables must be formatted in clean, readable Markdown style.
//         •	No additional notes, bullet points, or commentary should be included unless specifically requested by the user.
//         •	Keep outputs concise and accurate to the given quantities.
//         •	Use realistic and research-backed estimations for nutrient values.

//   `

//   try {
//     const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
//       },
//       body: JSON.stringify({
//         model: "qwen-qwq-32b",
//         messages: [
//           { role: "system", content: system_prompt},
//           ...messages.map((msg: string, idx: number) => ({
//             role: idx % 2 === 0 ? "user" : "assistant",
//             content: msg
//           }))
//         ],
//         reasoning_format:"hidden"
//       })
//     });

//     if (!response.ok) {
//       const errText = await response.text();
//       console.error("Groq API error:", response.status, errText);
//       return NextResponse.json({ error: "Groq API request failed" }, { status: 500 });
//     }

//     const data = await response.json();
//     console.log("Groq API response:", JSON.stringify(data, null, 2));

//     const aiReply = data.choices?.[0].message.content || "No reply received.";
//     console.log(aiReply)
//     return NextResponse.json({ reply: aiReply });

//   } catch (error) {
//     console.error("Error calling Groq API:", error);
//     return NextResponse.json({ error: "Internal server error" }, { status: 500 });
//   }
// }

//#2
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { messages } = body;

  // Ensure the messages are in the correct format
  const formattedMessages = messages.map((msg:any, idx:any) => {
    if (typeof msg === "string") {
      return { role: idx % 2 === 0 ? "user" : "assistant", content: msg };
    }
    return msg; // Already an object, no change needed
  });

  const system_prompt = `
    Instructions:
    1. Ask for Quantity First  
    Always ask the user to provide the quantity (in grams, pieces, cups, etc.) for each food item mentioned before giving any nutritional data.

    2. Generate Two Separate Tables:  
    • Table 1: Macronutrient Breakdown  
    Columns: Food Item, Quantity, Calories, Protein (g), Carbs (g), Fats (g)  

    • Table 2: Micronutrient Breakdown  
    Columns: Food Item, Micronutrient, Approx. Quantity (with units such as mg, µg, or IU)

    3. Formatting Guidelines:  
    • Tables must be formatted in clean, readable Markdown style.  
    • No additional notes, bullet points, or commentary unless requested.  
    • Keep outputs concise and accurate to the given quantities.  
    • Use realistic and research-backed estimations for nutrient values.
  `;

  const sys_prompt2 = `You are a nutrition analysis assistant.

    Instructions:

    1. Always ask the user to provide the quantity (in grams, pieces, cups, etc.) for each food item mentioned before giving any nutritional data.

    2. If all food items have quantities, respond in the following JSON format:

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

    3. Formatting Rules:
    - The top-level "type" must always be "nutritional_breakdown".
    - Only respond in JSON — do not include any commentary or Markdown formatting.
    - All nutrient values should be realistic and research-backed.
    - Round numbers appropriately for clarity and consistency.

    4. If any food item lacks a quantity, respond with a friendly plain English message:
    "Please specify quantities for all food items (e.g., 2 boiled eggs, 1 slice of toast) so I can analyze the nutrition."
  `;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "qwen-qwq-32b",
        messages: [
          { role: "system", content: sys_prompt2 },
          ...formattedMessages
        ],
        reasoning_format: "hidden"
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Groq API error:", response.status, errText);
      return NextResponse.json({ error: "Groq API request failed" }, { status: 500 });
    }

    const data = await response.json();
    const aiReply = data.choices?.[0].message.content || "No reply received.";
    console.log(aiReply)
    return NextResponse.json({ reply: aiReply });

  } catch (error) {
    console.error("Error calling Groq API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}