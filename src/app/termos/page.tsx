import Link from "next/link";

export const metadata = {
    title: "Termos de Serviço — ensaios.ai",
    description: "Termos de uso do ensaios.ai e do Meu Gestor.",
};

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
            <header className="border-b border-zinc-800">
                <div className="container mx-auto px-4 py-4 max-w-3xl flex items-center justify-between">
                    <Link href="/" className="font-bold text-lg">ensaios.ai</Link>
                    <Link href="/support" className="text-sm text-zinc-400 hover:text-white transition-colors">Suporte</Link>
                </div>
            </header>

            <main className="container mx-auto px-4 py-12 max-w-3xl space-y-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Termos de Serviço</h1>
                    <p className="text-zinc-500 text-sm">Última atualização: agosto de 2026</p>
                </div>

                <p className="text-zinc-300 leading-relaxed">
                    Estes termos regem o uso do ensaios.ai, incluindo o Meu Gestor, dashboard de gestão de tráfego pago operado por hvg tech.
                    Ao usar a plataforma, você concorda com os termos abaixo.
                </p>

                <section className="space-y-3">
                    <h2 className="text-xl font-semibold text-white">1. O serviço</h2>
                    <p className="text-zinc-300 leading-relaxed">
                        O ensaios.ai oferece geração de imagens e vídeos com inteligência artificial mediante créditos, e o Meu Gestor, uma ferramenta de
                        leitura (e opcionalmente gestão) de contas de anúncios Meta Ads e Google Ads que você mesmo autoriza a conectar.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-xl font-semibold text-white">2. Conexão com contas de anúncios</h2>
                    <p className="text-zinc-300 leading-relaxed">
                        Ao conectar sua conta Google Ads ou informar um token de acesso Meta, você autoriza o ensaios.ai a ler (e, quando explicitamente
                        habilitado, criar/editar) dados de campanhas nas contas às quais você já tem acesso administrativo. Você é responsável por revisar
                        e revogar esse acesso quando não for mais necessário — veja a{" "}
                        <Link href="/privacidade" className="text-yellow-500 hover:underline">Política de Privacidade</Link> para saber como.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-xl font-semibold text-white">3. Uso responsável</h2>
                    <p className="text-zinc-300 leading-relaxed">
                        Você concorda em usar o Meu Gestor apenas com contas de anúncios que administra ou está autorizado a gerenciar, e em não usar a
                        plataforma para fins ilegais ou que violem os termos de serviço da Meta ou do Google.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-xl font-semibold text-white">4. Limitação de responsabilidade</h2>
                    <p className="text-zinc-300 leading-relaxed">
                        O ensaios.ai é fornecido "como está". Não nos responsabilizamos por decisões de investimento em anúncios tomadas com base nos
                        relatórios exibidos, nem por instabilidades das APIs de terceiros (Meta, Google) das quais dependemos para exibir os dados.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-xl font-semibold text-white">5. Contato</h2>
                    <p className="text-zinc-300 leading-relaxed">
                        Dúvidas sobre estes termos? Fale conosco pelo <Link href="/support" className="text-yellow-500 hover:underline">formulário de suporte</Link>.
                    </p>
                </section>
            </main>
        </div>
    );
}
