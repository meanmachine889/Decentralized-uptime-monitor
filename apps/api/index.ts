import express from "express";
import { prismaClient } from "db/client";
import cors from "cors";
import { AuthMiddleware } from "./middleware";

const app = express();
app.use(express.json());
app.use(cors());
app.use(AuthMiddleware);

app.post("/api/v1/websites", async (req, res) => {
    const userId = req.userId!;
    const { url } = req.body;
    const data = await prismaClient.website.create({
        data: {
            userId,
            url
        }
    })
    res.json({
        id: data.id
    })
})

app.get("/api/v1/website/status", (req, res) => {
    const websiteId = req.query.websiteId as unknown as string;
    const userId = req.userId;
    const data = prismaClient.website.findFirst({
        where: {
            id: websiteId,
            disabled: false,
            userId
        },
        include: {
            ticks: true
        }
    })

    res.json(data);
})

app.get("/api/v1/websites", async (req, res) => {
    const userId = req.userId;
    const data = await prismaClient.website.findMany({
        where: {
            userId,
            disabled: false
        },
        include: {
            ticks: true
        }
    })
    res.json({ data });
})

app.delete("/api/v1/websites", async (req, res) => {
    const websiteId = req.body.websiteId;
    const userId = req.userId;

    await prismaClient.website.update({
        where: {
            id: websiteId,
            userId
        },
        data: {
            disabled: true
        }
    })

    res.json({
        message: "Website is deleted!"
    })
})

app.listen(8080);