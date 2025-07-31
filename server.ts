// server.js
import express from "express"
import admin from "./firebase"
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv"
import cors from "cors"
dotenv.config()
const app = express();

app.use(express.json());
app.use(cors())


const supabase = createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string);

async function saveToken(userId: string, token: string) {
    console.log('Registering token:', { userId, token });
    await supabase.from('push_tokens')
        .upsert({ user_id: userId, device_token: token })
}

async function getToken(userId: string): Promise<string | null> {
    const { data, error } = await supabase
        .from('push_tokens')
        .select('device_token')
        .eq('user_id', userId)
        .single();

    if (error) {
        console.error('Error fetching token:', error.message);
        return null;
    }

    return data?.device_token || null;
}
// Register device token
app.post('/register', (req, res) => {
    const { userId, token } = req.body;
    saveToken(userId, token)
    res.send({ message: 'Token registered' });
});

// Send notification
app.post('/notify', async (req, res) => {
    const { userId, title, body } = req.body;
    const token = await getToken(userId)

    if (!token) return res.status(404).send('Token not found');

    const message = {
        notification: { title, body },
        token,
    };

    try {
        await admin.messaging().send(message);
        res.send('Notification sent');
    } catch (err) {
        console.error(err);
        res.status(500).send('Failed to send');
    }
});

app.listen(3000, () => console.log('Running on port 3000'));
