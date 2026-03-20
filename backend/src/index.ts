import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Безопасное получение Session ID
const getSessionId = (req: Request): string | null => {
    const header = req.headers['x-session-id'];
    if (Array.isArray(header)) return header[0];
    return header || null;
};

// ==========================================
// ENDPOINTS
// ==========================================

app.get('/api/qrcodes', async (req: Request, res: Response): Promise<any> => {
    const sessionId = getSessionId(req);
    if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required' });
    }

    try {
        const qrcodes = await prisma.qRCode.findMany({
            where: { sessionId },
            orderBy: { createdAt: 'desc' },
        });
        res.json(qrcodes);
    } catch (error) {
        console.error('Error fetching QR codes:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/qrcodes', async (req: Request, res: Response): Promise<any> => {
    const sessionId = getSessionId(req);
    if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required' });
    }

    const { type, content, fgColor, bgColor } = req.body;

    if (!content) {
        return res.status(400).json({ error: 'Content is required' });
    }

    try {
        const newQRCode = await prisma.qRCode.create({
            data: {
                sessionId,
                type: type || 'text',
                content: content as string,
                fgColor: (fgColor as string) || '#000000',
                bgColor: (bgColor as string) || '#ffffff',
            },
        });
        res.status(201).json(newQRCode);
    } catch (error) {
        console.error('Error saving QR code:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/api/qrcodes/:id', async (req: Request, res: Response): Promise<any> => {
    const sessionId = getSessionId(req);
    // Явно говорим TypeScript, что это строка, чтобы parseInt не ругался
    const id = parseInt(req.params.id as string, 10);

    if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required' });
    }

    try {
        const qrcode = await prisma.qRCode.findUnique({ where: { id } });
        if (!qrcode || qrcode.sessionId !== sessionId) {
            return res.status(404).json({ error: 'QR code not found or access denied' });
        }

        await prisma.qRCode.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting QR code:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Backend is running on http://localhost:${PORT}`);
});