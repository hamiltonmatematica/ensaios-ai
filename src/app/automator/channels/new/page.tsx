import { CreateChannelWizard } from "@/components/automator/channels/create-channel-wizard"

export default function NewChannelPage() {
    return (
        <div className="container mx-auto py-10">
            <h1 className="text-3xl font-bold mb-6">Criar Novo Canal</h1>
            <CreateChannelWizard />
        </div>
    )
}
