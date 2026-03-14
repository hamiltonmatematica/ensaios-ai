"use client";

import { useState } from "react";

export default function TestMeta() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testApi = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/meugestor/test-meta");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || json.error || "Erro ao buscar dados");
      }
      setData(json.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Teste da API da Meta - Meu Gestor</h1>
      <p className="mb-4 text-gray-600">
        Certifique-se de que adicionou as chaves <code className="bg-gray-200 px-1 rounded">META_ACCESS_TOKEN</code> e <code className="bg-gray-200 px-1 rounded">META_AD_ACCOUNT_ID</code> no seu arquivo <code>.env</code> principal do ensaios.ai. <br />
        Lembrando que o META_AD_ACCOUNT_ID tem que começar com <code className="bg-gray-200 px-1 rounded">act_</code> (ex: act_12345678).
      </p>

      <button
        onClick={testApi}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded disabled:opacity-50"
      >
        {loading ? "Testando..." : "Testar Conexão e Buscar Insights"}
      </button>

      {error && (
        <div className="mt-6 p-4 bg-red-100 text-red-700 rounded border border-red-300">
          <strong>Erro:</strong> {error}
        </div>
      )}

      {data && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-2">Dados da Conta</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-40 border border-gray-300">
            {JSON.stringify(data.account, null, 2)}
          </pre>

          <h2 className="text-xl font-semibold mt-6 mb-2">Insights Recentes (Campanhas)</h2>
          {data.campaignsInsights?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead>
                  <tr className="bg-gray-100 text-left">
                    <th className="py-2 px-4 border-b">Campanha</th>
                    <th className="py-2 px-4 border-b">Gastos</th>
                    <th className="py-2 px-4 border-b">Impressões</th>
                    <th className="py-2 px-4 border-b">Cliques</th>
                    <th className="py-2 px-4 border-b">Conversões</th>
                  </tr>
                </thead>
                <tbody>
                  {data.campaignsInsights.map((camp: any, idx: number) => (
                    <tr key={idx} className="border-b">
                      <td className="py-2 px-4">{camp.campaign_name}</td>
                      <td className="py-2 px-4">R$ {camp.spend}</td>
                      <td className="py-2 px-4">{camp.impressions}</td>
                      <td className="py-2 px-4">{camp.clicks}</td>
                      <td className="py-2 px-4">
                        {camp.conversions ? camp.conversions.reduce((acc: number, c: any) => acc + Number(c.value || 0), 0) : 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">Nenhum dado de campanha encontrado para os últimos 7 dias.</p>
          )}

          <h2 className="text-xl font-semibold mt-6 mb-2">Insights Diários</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96 border border-gray-300">
            {JSON.stringify(data.dailyInsights, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
