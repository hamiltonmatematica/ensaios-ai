import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserApiKeys } from "@/lib/automator/api-keys";
import SettingsForm from "./settings-form";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect("/auth/signin");
    }

    const keys = await getUserApiKeys(session.user.id);

    return <SettingsForm initialData={keys} />;
}
