
import { CreatePostWizard } from "@/components/automator/create-post/wizard"

export default function CreatePostPage() {
    return (
        <div className="container mx-auto py-10">
            <h1 className="text-3xl font-bold mb-6">Criar Novo Post</h1>
            <CreatePostWizard />
        </div>
    )
}
