// Rota de criação de anúncios Meta Ads: upload de imagem (opcional) + criativo + anúncio (suporta validate_only)
import { NextRequest, NextResponse } from 'next/server';
import { requireWriteToken } from '@/lib/meugestor-write-guard';
import { createAdWithCreative, uploadAdImage, AdInput } from '@/lib/facebook-manage';

// ~10MB decodificados (base64 ocupa ~4/3 do tamanho original)
const MAX_IMAGE_BASE64_CHARS = 14 * 1024 * 1024;

export async function POST(request: NextRequest) {
    try {
        const auth = requireWriteToken(request);
        if (auth.response) return auth.response;
        const accessToken = auth.token;

        const body = await request.json().catch(() => null);
        if (!body) {
            return NextResponse.json({ success: false, error: 'Corpo da requisição inválido (JSON esperado)' }, { status: 400 });
        }

        const { accountId, validateOnly, imageBase64, imageName, ad } = body as {
            accountId?: string; validateOnly?: boolean;
            imageBase64?: string; imageName?: string; ad?: AdInput;
        };

        if (!accountId) {
            return NextResponse.json({ success: false, error: 'accountId é obrigatório' }, { status: 400 });
        }
        if (!ad || typeof ad !== 'object') {
            return NextResponse.json({ success: false, error: 'ad é obrigatório' }, { status: 400 });
        }
        if (!ad.name?.trim()) {
            return NextResponse.json({ success: false, error: 'Nome do anúncio é obrigatório' }, { status: 400 });
        }
        if (!ad.adsetId) {
            return NextResponse.json({ success: false, error: 'adsetId é obrigatório' }, { status: 400 });
        }
        if (!ad.creative || typeof ad.creative !== 'object') {
            return NextResponse.json({ success: false, error: 'creative é obrigatório' }, { status: 400 });
        }

        const hasCreativePath = !!ad.creative.existingCreativeId
            || !!ad.creative.objectStoryId
            || (!!ad.creative.pageId && !!ad.creative.link);
        if (!hasCreativePath) {
            return NextResponse.json(
                { success: false, error: 'Criativo inválido: informe um criativo existente, uma publicação (objectStoryId) ou página + link' },
                { status: 400 }
            );
        }

        if (imageBase64 !== undefined) {
            if (typeof imageBase64 !== 'string' || !imageBase64) {
                return NextResponse.json({ success: false, error: 'imageBase64 inválido: esperada string base64 de uma imagem' }, { status: 400 });
            }
            if (imageBase64.length > MAX_IMAGE_BASE64_CHARS) {
                return NextResponse.json({ success: false, error: 'Imagem muito grande: o limite é 10MB' }, { status: 413 });
            }
            const dataUriMatch = imageBase64.match(/^data:([^;,]+);base64,/);
            if (imageBase64.startsWith('data:') && (!dataUriMatch || !dataUriMatch[1].startsWith('image/'))) {
                return NextResponse.json({ success: false, error: 'imageBase64 inválido: esperado data URI de imagem (data:image/...;base64,)' }, { status: 400 });
            }
            const payload = dataUriMatch ? imageBase64.slice(dataUriMatch[0].length) : imageBase64;
            if (!/^[A-Za-z0-9+/]+={0,2}$/.test(payload)) {
                return NextResponse.json({ success: false, error: 'imageBase64 inválido: conteúdo não é base64 válido' }, { status: 400 });
            }
        }

        const rawAccountId = String(accountId).replace(/^act_/, '');

        const input: AdInput = {
            ...ad,
            name: ad.name.trim(),
            status: ad.status === 'ACTIVE' ? 'ACTIVE' : 'PAUSED',
            creative: { ...ad.creative },
        };

        // Em modo validateOnly não fazemos upload real: a validação não deve ter efeitos colaterais na conta
        if (imageBase64 && !validateOnly) {
            const { hash } = await uploadAdImage(accessToken, rawAccountId, imageBase64, imageName);
            input.creative.imageHash = hash;
        }

        const result = await createAdWithCreative(accessToken, rawAccountId, input, !!validateOnly);

        let data: Record<string, unknown>;
        if (validateOnly) {
            const notes = [
                ...(result?.note ? [String(result.note)] : []),
                ...(imageBase64 ? ['Imagem não verificada: o upload da imagem ocorre apenas na criação real do anúncio.'] : []),
            ];
            data = { validated: true, ...(notes.length ? { note: notes.join(' ') } : {}) };
        } else {
            data = { id: result?.id, ...(result?.creative_id ? { creative_id: result.creative_id } : {}) };
        }

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        const isAuthError = error?.fb?.code === 190 || error?.code === 190 || error?.message?.includes('OAuth') || error?.message?.includes('access token');
        const status = isAuthError ? 401 : (error?.status || 500);
        const errorMsg = isAuthError
            ? 'Token de acesso da Meta (META_ACCESS_TOKEN) está inválido ou expirado.'
            : (error?.fb?.error_user_msg || error?.message || 'Erro ao criar anúncio');

        return NextResponse.json(
            { success: false, error: errorMsg, code: error?.fb?.code || error?.code },
            { status }
        );
    }
}
