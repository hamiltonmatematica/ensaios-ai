# Análise dos Endpoints RunPod

![Endpoints RunPod](/Users/hamiltonvinicius/.gemini/antigravity/brain/6b01b3a0-1711-47e8-a941-ec04e224c385/uploaded_image_1767123786522.png)

## Endpoints que VOCÊ USA (configurados no .env):

1. ✅ **Face Swap 5.2.0** - Usado para troca de rostos
2. ✅ **ComfyUI 5.5.1** - Usado para Inpaint (remover objetos)
3. ✅ **upscale_interpolation_Runpod_hub** - Usado para Upscale de imagens
4. ✅ **virtual_tryon_idm_vton** - Usado para Provador Virtual
5. ⚠️ **Chatterbox TTS v0.2.6** - Text-to-Speech (você usa isso?)

## Endpoints que você NÃO USA:

1. ❌ **Instareels 1** - Não encontrado em nenhum lugar do código
2. ❌ **vLLM v2.11.0** - Não encontrado em nenhum lugar do código

## Sugestão de Configuração (Total: 5 workers)

### Prioridade Alta (sempre ativo):
- **upscale_interpolation**: Max = 2, Active = 1
- **ComfyUI** (Inpaint): Max = 1, Active = 0

### Prioridade Média:
- **Face Swap**: Max = 1, Active = 0
- **virtual_tryon**: Max = 1, Active = 0

### Desabilitar (Max = 0):
- **Instareels 1**: Max = 0 ❌
- **vLLM v2.11.0**: Max = 0 ❌
- **Chatterbox TTS**: Max = 0 (a menos que você use)

**Total: 2+1+1+1 = 5 workers** ✅

## Ação Recomendada

1. Desabilite **Instareels 1** e **vLLM** (Max = 0)
2. Configure os outros conforme acima
3. Isso libera espaço para o Upscale funcionar
