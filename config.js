// ================================================================
// CONFIG.JS - Configurações do Sistema (sem Firebase)
// ================================================================

const CONFIG = {
    // Tempo para confirmar o produto (em ms)
    TEMPO_CONFIRMACAO: 5000, // 5 segundos
    
    // Chave PIX (para pagamento)
    CHAVE_PIX: "seu-email@exemplo.com",
    
    // Nome do mercado
    NOME_MERCADO: "Supermercado Teste",
    
    // Versão do sistema
    VERSAO: "1.0.0",
    
    // Modo de desenvolvimento
    DEBUG: true
};

// Exportar para uso
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG };
}
