
import { GoogleGenAI, Type } from "@google/genai";
import type { AnalysisResult, Recommendation, BacktestResult } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    parameters: {
      type: Type.ARRAY,
      description: "List of extracted configuration parameters from the script.",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "The parameter name (e.g., 'fast')." },
          value: { type: Type.STRING, description: "The current value of the parameter (e.g., '8')." },
          description: { type: Type.STRING, description: "A brief explanation of the parameter's purpose." },
        },
        required: ["name", "value", "description"],
      },
    },
    recommendations: {
      type: Type.ARRAY,
      description: "List of actionable recommendations to enhance the script.",
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "A short, catchy title for the recommendation." },
          description: { type: Type.STRING, description: "A detailed explanation of the recommendation and its potential benefits." },
          pythonCodeSnippet: { type: Type.STRING, description: "A snippet of Python code demonstrating the change. This might be a new function or a modification to an existing one." },
        },
        required: ["title", "description", "pythonCodeSnippet"],
      },
    },
  },
  required: ["parameters", "recommendations"],
};


export async function analyzeCode(code: string): Promise<AnalysisResult> {
    const prompt = `
    You are an expert trading algorithm developer and Python programmer. Your task is to analyze the provided Python trading bot script, extract its parameters, and suggest concrete, actionable enhancements.

    **Analysis Instructions:**

    1.  **Extract Parameters:**
        *   Locate the \`DEFAULT_CFG\` dictionary within the script.
        *   For each key-value pair, extract the parameter's name, its current value, and write a clear, one-sentence description of its function in the trading strategy.

    2.  **Generate Recommendations:**
        *   Critically evaluate the script's logic, risk management, and overall structure.
        *   Formulate three to five distinct, actionable recommendations for improvement. These should be framed as suggestions for experimentation, not guaranteed financial advice.
        *   Focus on sophisticated concepts such as:
            *   **Confirmation Signals:** Adding a secondary indicator (e.g., RSI, Bollinger Bands) to confirm MACD signals and reduce false entries.
            *   **Dynamic Risk Management:** Implementing a trailing stop-loss or a dynamic take-profit based on market volatility (e.g., using ATR).
            *   **Regime Filtering:** Using a long-term moving average to determine the overall market trend and only take trades in that direction.
        *   For each recommendation, provide:
            *   A short, descriptive \`title\`.
            *   A detailed \`description\` explaining the concept and its potential benefits.
            *   A functional Python \`pythonCodeSnippet\` that can be integrated into the script.

    3.  **Output Format:**
        *   You MUST return the entire analysis as a single, valid JSON object.
        *   The JSON object must strictly adhere to the provided response schema.
        *   Do not include any introductory text, closing remarks, or any other content outside of the JSON object itself.

    Here is the Python script to analyze:
    \`\`\`python
    ${code}
    \`\`\`
    `;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: analysisSchema,
        }
    });

    const jsonText = response.text.trim();
    try {
        const result = JSON.parse(jsonText);
        // Basic validation to ensure the response shape is correct.
        if (result.parameters && result.recommendations) {
            return result as AnalysisResult;
        } else {
            throw new Error("API response is missing required fields.");
        }
    } catch(e: any) {
        console.error("Failed to parse Gemini JSON response for analysis:", jsonText);
        throw new Error(`Invalid JSON response from Gemini API: ${e.message}`);
    }
}

const backtestResultSchema = {
    type: Type.OBJECT,
    properties: {
        summary: {
            type: Type.OBJECT,
            description: "The summary statistics of the backtest.",
            properties: {
                final_equity: { type: Type.NUMBER },
                total_return_pct: { type: Type.NUMBER },
                n_trades: { type: Type.NUMBER },
                wins: { type: Type.NUMBER },
                win_rate: { type: Type.NUMBER },
                avg_win: { type: Type.NUMBER },
                avg_loss: { type: Type.NUMBER },
                profit_factor: { type: Type.NUMBER },
                max_consecutive_losses: { type: Type.NUMBER },
                max_drawdown: { type: Type.NUMBER },
                sharpe: { type: Type.NUMBER },
            },
        },
        equity_curve_csv: {
            type: Type.STRING,
            description: "The content of the equity curve CSV file as a single string, including headers."
        },
        error: {
            type: Type.STRING,
            description: "An error message if the backtest script failed to execute."
        }
    }
};

export async function runBacktest(code: string): Promise<BacktestResult> {
    const prompt = `
    You are a sandboxed Python execution environment. Your task is to execute the provided Python trading bot script and capture its standard output to construct the backtest results.

    **Instructions:**
    1.  Execute the script. The script is designed to run without any external arguments.
    2.  The script will print its results to standard output, formatted with specific markers:
    - It will first print \`---SUMMARY_JSON---\`.
    - The line(s) immediately following will be a single JSON object containing the backtest summary.
    - It will then print \`---EQUITY_CSV---\`.
    - The lines immediately following will be the full content of the equity curve CSV.
    3.  Parse this standard output. The JSON might be split across multiple lines; you must reassemble it into a single valid JSON string before parsing. The CSV content will also be multi-line.
    4.  Return the captured data as a single, valid JSON object that adheres to the provided schema.
    5.  Do not output any text, logs, or explanations outside of the final JSON object. If the script fails to run, return a JSON object with an "error" key detailing the Python exception or parsing failure.

    Here is the Python script to execute:
    \`\`\`python
    ${code}
    \`\`\`
    `;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: backtestResultSchema,
        }
    });
    
    const jsonText = response.text.trim();
    try {
        const result = JSON.parse(jsonText);
        if (result.error) {
            throw new Error(`Backtest execution failed: ${result.error}`);
        }
        if (result.summary && result.equity_curve_csv) {
            return result as BacktestResult;
        }
        throw new Error("Invalid backtest result format from API.");

    } catch(e: any) {
        console.error("Failed to parse Gemini JSON response for backtest:", jsonText, e);
        throw new Error(`Invalid JSON response from Gemini API for backtest: ${e.message}`);
    }
}


export async function generateEnhancedCode(originalCode: string, recommendations: Recommendation[]): Promise<string> {
    const modifications = recommendations.map((rec, index) => `
--- MODIFICATION ${index + 1}: ${rec.title} ---
${rec.description}
\`\`\`python
${rec.pythonCodeSnippet}
\`\`\`
`).join('\n');

    const prompt = `
    You are an expert Python programmer specializing in algorithmic trading.
    Your task is to integrate a series of modifications into an existing Python trading bot script.
    
    **Instructions:**
    1.  Read the 'ORIGINAL SCRIPT' carefully to understand its structure and logic.
    2.  Review each 'MODIFICATION' provided. These contain titles, descriptions, and code snippets for new features or changes.
    3.  Intelligently merge the code from the snippets into the original script. This may involve adding new functions, modifying existing ones, or adding new logic within the main backtesting loop. Ensure the final script is coherent and syntactically correct.
    4.  The final output should be ONLY the complete, modified, and fully functional Python script. Do not include any of your own explanations, comments, or markdown formatting like \`\`\`python. Just provide the raw code.

    --- ORIGINAL SCRIPT ---
    \`\`\`python
    ${originalCode}
    \`\`\`

    --- MODIFICATIONS TO APPLY ---
    ${modifications}
    `;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
    });
    
    let finalCode = response.text.trim();
    if (finalCode.startsWith('```python')) {
      finalCode = finalCode.substring(9);
    }
    if (finalCode.endsWith('```')) {
      finalCode = finalCode.substring(0, finalCode.length - 3);
    }

    return finalCode.trim();
}

export async function getTradingSuggestion(context: string): Promise<string> {
    const prompt = `
    You are an AI Trading Assistant. Based on the provided context about a user's trading bot performance, provide a brief, actionable suggestion.
    Speak directly to the user. Keep it concise (1-2 sentences).
    - If PnL is positive, be encouraging.
    - If PnL is negative, be cautious and suggest reviewing the strategy or market conditions.
    - If there are many open positions, suggest monitoring risk.

    Context:
    ${context}

    Suggestion:
    `;

     const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
    });

    return response.text.trim();
}
