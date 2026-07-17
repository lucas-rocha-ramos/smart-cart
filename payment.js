// ================================================================
// PAYMENT.JS - Sistema de pagamento
// ================================================================

class PaymentSystem {
    constructor() {
        this.total = 0;
        this.itens = [];
        this.metodo = null;
        this.isProcessing = false;
        this.chavePix = CONFIG.CHAVE_PIX || 'seu-email@exemplo.com';
    }

    prepararPagamento(itens, total) {
        this.itens = itens;
        this.total = total;
    }

    gerarPIX() {
        if (this.total <= 0) {
            return { erro: 'Carrinho vazio!' };
        }

        const pixData = {
            chave: this.chavePix,
            valor: this.total.toFixed(2),
            descricao: `Compra Smart Cart - ${new Date().toLocaleString()}`,
            qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=00020126580014BR.GOV.BCB.PIX0136${this.chavePix}5204000053039865404${this.total.toFixed(2)}5802BR5913SmartCart6009SaoPaulo6304`
        };

        return pixData;
    }

    async processarPIX(onSuccess, onError) {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            if (Math.random() < 0.95) {
                if (onSuccess) onSuccess({
                    metodo: 'PIX',
                    valor: this.total,
                    data: new Date().toISOString()
                });
            } else {
                throw new Error('Erro no processamento do PIX');
            }
        } catch (error) {
            if (onError) onError(error.message);
        } finally {
            this.isProcessing = false;
        }
    }

    async processarNFC(onSuccess, onError) {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            if (Math.random() < 0.90) {
                if (onSuccess) onSuccess({
                    metodo: 'NFC/Aproximação',
                    valor: this.total,
                    data: new Date().toISOString()
                });
            } else {
                throw new Error('Erro na leitura do cartão');
            }
        } catch (error) {
            if (onError) onError(error.message);
        } finally {
            this.isProcessing = false;
        }
    }

    resetar() {
        this.total = 0;
        this.itens = [];
        this.metodo = null;
        this.isProcessing = false;
    }
}

// ================================================================
// INSTÂNCIA GLOBAL
// ================================================================

const paymentSystem = new PaymentSystem();

// ================================================================
// FUNÇÕES DE INTEGRAÇÃO COM A UI
// ================================================================

function abrirPagamentoPIX(itens, total) {
    paymentSystem.prepararPagamento(itens, total);
    const pixData = paymentSystem.gerarPIX();
    
    if (pixData.erro) {
        alert(pixData.erro);
        return;
    }

    document.getElementById('pixArea').style.display = 'block';
    document.getElementById('nfcArea').style.display = 'none';
    document.getElementById('paymentSuccess').style.display = 'none';
    document.getElementById('pixValue').textContent = `R$ ${total.toFixed(2)}`;
    document.getElementById('pixQRImage').src = pixData.qrCodeUrl;
    
    mostrarTela('paymentScreen');
}

function abrirPagamentoNFC(itens, total) {
    paymentSystem.prepararPagamento(itens, total);
    
    document.getElementById('nfcArea').style.display = 'block';
    document.getElementById('pixArea').style.display = 'none';
    document.getElementById('paymentSuccess').style.display = 'none';
    document.getElementById('nfcValue').textContent = `R$ ${total.toFixed(2)}`;
    
    mostrarTela('paymentScreen');
}

function confirmarPagamentoNFC() {
    if (paymentSystem.isProcessing) return;
    
    const btn = document.getElementById('btnNFCConfirm');
    btn.textContent = 'Processando...';
    btn.disabled = true;

    paymentSystem.processarNFC(
        (resultado) => {
            document.getElementById('nfcArea').style.display = 'none';
            document.getElementById('paymentSuccess').style.display = 'block';
            btn.textContent = 'Confirmar pagamento';
            btn.disabled = false;
            
            salvarPedidoFinalizado(resultado);
        },
        (erro) => {
            alert(`Erro: ${erro}`);
            btn.textContent = 'Confirmar pagamento';
            btn.disabled = false;
        }
    );
}

async function salvarPedidoFinalizado(dadosPagamento) {
    const carrinhoId = localStorage.getItem('carrinhoId') || 'carrinho_teste';
    const usuarioId = localStorage.getItem('usuarioId') || 'usuario_teste';
    
    const pedido = {
        carrinhoId,
        usuarioId,
        itens: paymentSystem.itens,
        total: paymentSystem.total,
        pagamento: dadosPagamento,
        mercado: CONFIG.NOME_MERCADO || 'Supermercado Teste'
    };
    
    try {
        const pedidoId = await salvarPedido(pedido);
        console.log('Pedido salvo com ID:', pedidoId);
        
        document.querySelector('.success-message p').innerHTML += 
            `<br><small style="font-size:12px;">Pedido #${pedidoId.slice(0,8)}</small>`;
    } catch (error) {
        console.error('Erro ao salvar pedido:', error);
    }
}

function mostrarTela(telaId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(telaId).classList.add('active');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        paymentSystem,
        abrirPagamentoPIX,
        abrirPagamentoNFC,
        confirmarPagamentoNFC,
        salvarPedidoFinalizado
    };
}