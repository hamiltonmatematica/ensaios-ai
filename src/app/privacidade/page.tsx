import Link from "next/link";

export const metadata = {
    title: "Política de Privacidade — ensaios.ai",
    description: "Como o ensaios.ai coleta, usa e protege seus dados, incluindo o acesso à API do Google Ads usado pelo Meu Gestor.",
};

export default function PrivacyPolicyPage() {
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
                    <h1 className="text-3xl font-bold mb-2">Política de Privacidade</h1>
                    <p className="text-zinc-500 text-sm">Última atualização: agosto de 2026</p>
                </div>

                <p className="text-zinc-300 leading-relaxed">
                    O ensaios.ai ("nós", "nosso") é operado por hvg tech. Esta política descreve quais dados coletamos, como usamos, e como você pode
                    solicitar sua remoção, tanto para a plataforma principal (geração de fotos e vídeos com IA) quanto para o Meu Gestor, nosso
                    dashboard de gestão de tráfego pago que se conecta a contas de anúncios (Meta Ads e Google Ads).
                </p>

                <section className="space-y-3">
                    <h2 className="text-xl font-semibold text-white">1. Dados que coletamos</h2>
                    <ul className="list-disc list-inside space-y-2 text-zinc-300">
                        <li><strong>Conta e uso da plataforma principal:</strong> e-mail, senha (criptografada), créditos, histórico de gerações de imagem/vídeo, dados de pagamento processados pelo Stripe (não armazenamos números de cartão).</li>
                        <li><strong>Meu Gestor — Meta Ads:</strong> um token de acesso à Graph API da Meta, informado manualmente por você, usado para ler e (quando autorizado) gerenciar suas próprias campanhas de anúncios.</li>
                        <li><strong>Meu Gestor — Google Ads:</strong> ao conectar sua conta Google, solicitamos acesso à API do Google Ads (escopo <code className="text-xs bg-zinc-900 px-1.5 py-0.5 rounded">https://www.googleapis.com/auth/adwords</code>) para ler métricas de desempenho (investimento, impressões, cliques, conversões) das contas de anúncios que você já administra. Armazenamos o token de atualização (refresh token) da autorização de forma segura no nosso banco de dados, para renovar o acesso automaticamente sem exigir novo login a cada consulta.</li>
                    </ul>
                </section>

                <section className="space-y-3">
                    <h2 className="text-xl font-semibold text-white">2. Como usamos os dados do Google Ads</h2>
                    <p className="text-zinc-300 leading-relaxed">
                        Os dados obtidos via API do Google Ads são usados exclusivamente para exibir relatórios e métricas dentro do Meu Gestor —
                        investimento, cliques, impressões, conversões e métricas derivadas (CTR, CPC, CPA, ROAS) por conta, campanha e grupo de anúncios,
                        com comparativos entre períodos. Não vendemos, compartilhamos ou usamos esses dados para treinar modelos de IA, publicidade de
                        terceiros, ou qualquer finalidade além de exibi-los a você dentro da própria ferramenta.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-xl font-semibold text-white">3. Armazenamento e segurança</h2>
                    <p className="text-zinc-300 leading-relaxed">
                        Tokens de acesso (Meta e Google) são armazenados de forma criptografada em nosso banco de dados (PostgreSQL, hospedado pelo
                        provedor Supabase) e nunca são expostos publicamente. O acesso à API do Google Ads usa exclusivamente o refresh token para renovar
                        automaticamente o acesso — não pedimos nem armazenamos sua senha do Google.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-xl font-semibold text-white">4. Como revogar o acesso</h2>
                    <p className="text-zinc-300 leading-relaxed">
                        Você pode revogar o acesso do ensaios.ai à sua conta Google a qualquer momento em{" "}
                        <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer" className="text-yellow-500 hover:underline">
                            myaccount.google.com/permissions
                        </a>. Para excluir os dados que armazenamos (incluindo tokens salvos), envie uma solicitação pelo{" "}
                        <Link href="/support" className="text-yellow-500 hover:underline">formulário de suporte</Link>.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-xl font-semibold text-white">5. Compartilhamento com terceiros</h2>
                    <p className="text-zinc-300 leading-relaxed">
                        Não compartilhamos seus dados de anúncios com terceiros. Usamos provedores de infraestrutura (Vercel para hospedagem, Supabase
                        para banco de dados, Stripe para pagamentos) que processam dados estritamente como operadores técnicos, sob os próprios termos de
                        segurança e privacidade de cada um.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-xl font-semibold text-white">6. Contato</h2>
                    <p className="text-zinc-300 leading-relaxed">
                        Dúvidas sobre esta política ou sobre seus dados? Fale conosco pelo{" "}
                        <Link href="/support" className="text-yellow-500 hover:underline">formulário de suporte</Link>.
                    </p>
                </section>
            </main>
        </div>
    );
}
