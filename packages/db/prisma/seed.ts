import { prismaClient } from "../src/index";

async function seed() {
    await prismaClient.user.create({
        data: {
            id: "2",
            email: "test@gmail.com",
        }
    });

    const validator = await prismaClient.validator.create({
        data: {
            publicKey: "0x123456",
            location: "Delhi",
            ip: "127.0.0.1"
        }
    })

    const website = await prismaClient.website.create({
        data: {
            id: "1",
            url: "https://test.com",
            userId: "2"
        }
    });

    await prismaClient.websiteTick.create({
        data: {
            websiteId: website.id,
            status: "Good",
            createdAt: new Date(),
            latency: 100,
            validatorId: validator.id
        }
    })
    await prismaClient.websiteTick.create({
        data: {
            websiteId: website.id,
            status: "Good",
            createdAt: new Date(Date.now() - 1000*60*10),
            latency: 100,
            validatorId: validator.id
        }
    })
    await prismaClient.websiteTick.create({
        data: {
            websiteId: website.id,
            status: "Bad",
            createdAt: new Date(Date.now() - 1000*60*20),
            latency: 100,
            validatorId: validator.id
        }
    })
    await prismaClient.websiteTick.create({
        data: {
            websiteId: website.id,
            status: "Bad",
            createdAt: new Date(Date.now() - 1000*60*30),
            latency: 100,
            validatorId: validator.id
        }
    })
}

seed();