// Script para migrar face-swap e upscale-image pages para Supabase
// Automated migration helper

const fs = require('fs');
const path = require('path');

const files = [
    '/Users/hamiltonvinicius/Library/CloudStorage/Dropbox/Sites/ensaios.ai/src/app/face-swap/page.tsx',
    '/Users/hamiltonvinicius/Library/CloudStorage/Dropbox/Sites/ensaios.ai/src/app/upscale-image/page.tsx'
];

files.forEach(filePath => {
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace imports
    content = content.replace(
        'import { useSession } from "next-auth/react"',
        'import { useAuth } from "@/hooks/useAuth"'
    );

    content = content.replace(
        'import LoginModal from "@/components/LoginModal"',
        ''
    );

    // Replace hook usage
    content = content.replace(
        'const { data: session, status, update: updateSession } = useSession()',
        'const { user, loading, credits, refreshCredits } = useAuth("/login")'
    );

    // Replace status checks
    content = content.replace(/status === "loading"/g, 'loading');
    content = content.replace(/status === "unauthenticated"/g, '!user');
    content = content.replace(/!session/g, '!user');

    // Replace session user checks
    content = content.replace(/!session\?\.user/g, '!user');
    content = content.replace(/session\.user\.credits/g, 'credits');
    content = content.replace(/session\suser\?\.credits/g, 'credits');

    // Replace updateSession calls
    content = content.replace(/await updateSession\(\)/g, 'await refreshCredits()');

    // Remove useEffects for auth redirect (handled by hook)
    content = content.replace(/useEffect\(\(\) => \{\s*if \(status === "unauthenticated"\) \{\s*router\.push\("\/"\)\s*\}\s*\}, \[status, router\]\)/g, '');

    // Replace showLoginModal with router.push
    content = content.replace(/setShowLoginModal\(true\)/g, 'router.push("/login")');
    content = content.replace(/onOpenLogin=\{\(\) => setShowLoginModal\(true\)\}/g, 'onOpenLogin={() => router.push(\'/login\')}');

    // Remove LoginModal state
    content = content.replace(/const \[showLoginModal, setShowLoginModal\] = useState\(false\)/g, '');

    // Remove LoginModal component
    content = content.replace(/<LoginModal\s+isOpen=\{showLoginModal\}\s+onClose=\{\(\) => setShowLoginModal\(false\)\}\s+\/>/g, '');

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Migrated: ${path.basename(filePath)}`);
});

console.log('\n🎉 Migration complete!');
