// ================================================================
// CONFIG.JS - Configurações do Sistema
// ================================================================

const CONFIG = {
    TEMPO_CONFIRMACAO: 5000,
    CHAVE_PIX: "seu-email@exemplo.com",
    NOME_MERCADO: "Supermercado Teste",
    VERSAO: "2.0.0",
    DEBUG: true
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG };
}
