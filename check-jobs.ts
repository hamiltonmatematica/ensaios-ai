
import { prisma } from "./src/lib/prisma";

async function checkJobs() {
    console.log("Checking last 5 AvatarVideo jobs...");
    const jobs = await prisma.avatarVideo.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' }
    });

    console.log(JSON.stringify(jobs, null, 2));
}

checkJobs()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
