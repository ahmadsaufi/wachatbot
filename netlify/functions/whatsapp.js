const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Client } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const express = require('express');
require('dotenv').config();

const app = express();
const PORT = 3000;

const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
});

// Create a new WhatsApp client instance
const client = new Client();
let qrCodeUrl = ''; // Store the QR code URL
let qrGeneratedAt = null; // Track when QR was last generated

// Generate QR code only if expired or not yet generated
client.on('qr', async (qr) => {
    if (!qrGeneratedAt || Date.now() - qrGeneratedAt > 5 * 60 * 1000) { // Regenerate every 5 minutes
        try {
            qrCodeUrl = await QRCode.toDataURL(qr);
            qrGeneratedAt = Date.now(); // Update generation time
            console.log('QR Code generated successfully');
        } catch (err) {
            console.error('Failed to generate QR Code:', err);
        }
    }
});

client.once('ready', () => {
    console.log('WhatsApp Client is ready!');
});

// Respond to messages
client.on('message_create', async (message) => {
    if (message.body.toString().toLowerCase().startsWith('alya,')) {
        try {
            const result = await model.generateContent(message.body);
            const reply = result.response.text(); // Adjust based on API response structure
            console.log(`Generated response: ${reply}`);
            await client.sendMessage(message.from, reply); // Send response back to WhatsApp
        } catch (error) {
            console.error('Error generating AI response:', error);
        }
    }
});

client.initialize();

exports.handler = async (event, context) => {
    if (!qrCodeUrl) {
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'text/html' },
            body: `
                <html>
                    <head>
                        <title>WhatsApp QR Code</title>
                    </head>
                    <body>
                        <h1>QR Code is not available yet. Please refresh the page.</h1>
                    </body>
                </html>
            `,
        };
    }

    return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: `
            <html>
                <head>
                    <title>WhatsApp QR Code</title>
                </head>
                <body>
                    <h1>Scan QR Code to Connect to WhatsApp</h1>
                    <img src="${qrCodeUrl}" alt="QR Code" />
                </body>
            </html>
        `,
    };
};
