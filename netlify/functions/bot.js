/**
 * Telegram Auto-Filter Bot
 * Copyright (c) 2025, Kaustav Ray
 * Licensed under the MIT License.
 * * Description: Simple bot to respond to /start and 'hello' messages.
 */

// Retrieve the bot token from Netlify Environment Variables
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Ensure the token is set before attempting to build the API URL
if (!BOT_TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN environment variable is not set!");
}

const API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

/**
 * Helper function to send a message back to Telegram
 * @param {number} chatId - The ID of the chat to send the message to.
 * @param {string} text - The message text.
 * @returns {Promise<Response>}
 */
const sendMessage = async (chatId, text) => {
    // Check if the token is available before making the request
    if (!BOT_TOKEN) {
        console.error("Cannot send message: BOT_TOKEN is missing.");
        return; // Exit early
    }
    
    const url = `${API_URL}/sendMessage`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'Markdown', // Allows using bold (*text*) or italics
            }),
        });

        if (!response.ok) {
            console.error('Telegram API Error:', response.status, await response.text());
        }

        return response;
    } catch (error) {
        console.error('Network or Fetch Error:', error);
    }
};

/**
 * Main handler for the Netlify Function
 * @param {object} event - The event object from Netlify (contains the request body).
 * @returns {object} - The response object.
 */
exports.handler = async (event) => {
    // 1. Security Check: Only allow POST requests for webhooks
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: 'Method Not Allowed. Telegram webhooks must be POST requests.',
        };
    }

    // 2. Token Check: Stop execution if token is missing (should be caught by Netlify deployment but good practice)
    if (!BOT_TOKEN) {
        console.error("Critical: BOT_TOKEN is missing on execution.");
        return {
            statusCode: 500,
            body: 'Server Misconfigured: Missing Bot Token.',
        };
    }

    try {
        // Parse the incoming JSON body from Telegram
        const update = JSON.parse(event.body);

        // We are interested in the 'message' object, which contains user input
        const message = update.message;

        // Process the message if it exists
        if (message) {
            const chatId = message.chat.id;
            // Get the text and convert to lowercase for easy filtering
            const text = message.text ? message.text.toLowerCase() : '';

            let responseText = '';

            // --- Auto-Filter Logic Starts Here ---

            if (text.startsWith('/start')) {
                responseText = `Hello! I am an auto-filter bot developed by *Kaustav Ray*. 🤖\n\nTry sending me the word "hello" or "Hi" to test the filter.`;
            } else if (text.includes('hello') || text.includes('hi')) {
                responseText = `👋 Filter Activated! I saw you said "${message.text}". This is my automated response.`;
            } else {
                // Default fallback response
                responseText = `I received your message: "${message.text}". I currently only know how to respond to /start and messages containing 'hello' or 'hi'.`;
            }
            
            // Send the determined response back to the user
            await sendMessage(chatId, responseText);
        }

        // 3. Acknowledge Telegram: It is critical to return a 200 OK status
        // so Telegram knows the update was processed successfully and won't retry.
        return {
            statusCode: 200,
            body: 'OK',
        };

    } catch (error) {
        console.error('Error processing update:', error);
        
        // 4. Handle Errors Gracefully: Still return 200 OK to prevent Telegram retry loops,
        // but log the error for debugging.
        return {
            statusCode: 200, 
            body: 'Error encountered but acknowledged successfully.',
        };
    }
};
